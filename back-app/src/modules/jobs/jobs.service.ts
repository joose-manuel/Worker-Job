import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from './entities/job.entity';
import { ProfilesService } from '../profiles/profiles.service';
import { WorkerConfigsService } from '../worker-configs/worker-configs.service';
import { AiService } from '../ai/ai.service';
import {
  Budget,
  PortalScraper,
  PortalStatus,
  ScrapedJob,
  PORTAL_SCRAPERS,
  normalizePortalName,
  scraperForUrl,
  isRemoteJob,
  parseSalaryToNumber,
  politeFetch,
  clip,
} from './portal-scrapers';

const SCAN_MIN_INTERVAL_MS = 60_000;
const REQUEST_BUDGET = 40;
const MAX_JOBS = 32;
const MAX_PER_PORTAL = 8;
const MAX_DESCRIPTION_FETCHES = 10;
const DEFAULT_MIN_MATCH = 40;

function roundRobin(buckets: ScrapedJob[][], max: number): ScrapedJob[] {
  const result: ScrapedJob[] = [];
  let picked = true;
  while (picked && result.length < max) {
    picked = false;
    for (const bucket of buckets) {
      if (bucket.length) {
        result.push(bucket.shift() as ScrapedJob);
        picked = true;
        if (result.length >= max) break;
      }
    }
  }
  return result;
}

export interface ScanDebug {
  model: string;
  prompt: string;
  rawResponse: string | null;
  portals: PortalStatus[];
}

export interface ScanResult {
  jobs: Job[];
  debug: ScanDebug;
}

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    @InjectRepository(Job)
    private readonly jobsRepository: Repository<Job>,
    private readonly profilesService: ProfilesService,
    private readonly configsService: WorkerConfigsService,
    private readonly aiService: AiService,
  ) {}

  findByUser(userId: number): Promise<Job[]> {
    return this.jobsRepository.find({
      where: { userId },
      order: { lastSeenAt: 'DESC', matchPercent: 'DESC', createdAt: 'DESC' },
    });
  }

  async remove(userId: number, id: number): Promise<void> {
    await this.jobsRepository.delete({ id, userId });
  }

  async checkJob(userId: number, id: number): Promise<{ ok: boolean; status: number; url: string | null; error?: string }> {
    const job = await this.jobsRepository.findOneBy({ id, userId });
    if (!job) {
      throw new HttpException('Empleo no encontrado', HttpStatus.NOT_FOUND);
    }
    const url = job.applyUrl || job.url;
    if (!url) {
      return { ok: true, status: 0, url: null };
    }
    try {
      const response = await politeFetch(url, { minDelay: 400, maxDelay: 900, retries: 0 });
      return { ok: response.ok, status: response.status, url };
    } catch (error) {
      const status = (error as { status?: number })?.status ?? 403;
      const message = error instanceof Error ? error.message : String(error);
      return { ok: false, status, url, error: message };
    }
  }

  async generateLetter(userId: number, jobId: number): Promise<{ letter: string }> {
    const job = await this.jobsRepository.findOneBy({ id: jobId, userId });
    if (!job) {
      throw new Error('Empleo no encontrado');
    }
    const profile = await this.profilesService.get(userId);
    const response = await this.aiService.chat({
      system:
        'Eres un experto redactando mensajes de postulación laboral. Responde SOLO con el texto del mensaje, listo para copiar y pegar. Máximo 120 palabras, tono profesional y directo, en español.',
      message: `Redacta un mensaje de postulación para esta vacante:\n\nVACANTE: ${job.title} en ${job.company ?? 'la empresa'}\nDescripción: ${job.description ?? 'sin detalle'}\n\nCANDIDATO:\n- Resumen: ${profile?.summary ?? 'no definido'}\n- Skills: ${profile?.skills?.join(', ') ?? 'no definidas'}\n- Experiencia: ${profile?.experience ?? 'no definida'}`,
      model: 'llama-3.3-70b-versatile',
    });
    return { letter: response.content.trim() };
  }

  async scan(userId: number): Promise<ScanResult> {
    const profile = await this.profilesService.get(userId);
    const config = await this.configsService.get(userId);
    if (!profile) {
      throw new HttpException('Primero completa tu perfil (hoja de vida)', HttpStatus.BAD_REQUEST);
    }
    if (!config) {
      throw new HttpException('Primero configura el worker IA', HttpStatus.BAD_REQUEST);
    }

    if (config.lastRunAt && Date.now() - new Date(config.lastRunAt).getTime() < SCAN_MIN_INTERVAL_MS) {
      const wait = Math.ceil((SCAN_MIN_INTERVAL_MS - (Date.now() - new Date(config.lastRunAt).getTime())) / 1000);
      throw new HttpException(
        `Espera ${wait}s antes de volver a escanear (para no saturar los portales y evitar bloqueos)`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const role = profile.desiredRole ?? 'desarrollador';
    const keywords = config.keywords?.length
      ? config.keywords.join(' ')
      : (profile.skills?.slice(0, 5).join(' ') || 'desarrollador');
    const location = profile.location ?? 'Colombia';
    const selectedPortals = config.portals?.length
      ? [...new Set(config.portals.map(normalizePortalName))]
      : ['computrabajo', 'elempleo'];

    const queries = await this.expandQueries(role, keywords, profile.location, config.model ?? undefined);
    const model = `scrapers (${selectedPortals.join(', ')}) + IA ${config.model ?? 'llama-3.3-70b-versatile'}`;
    const prompt = `Queries generadas por IA:\n${queries.map((q) => `- ${q}`).join('\n')}\nUbicación: ${location}`;

    this.logger.log(`Scan iniciado para user ${userId} · portales: ${selectedPortals.join(', ')}`);

    const budget: Budget = { used: 0, max: REQUEST_BUDGET };
    const portalStatus: PortalStatus[] = [];
    const seen = new Set<string>();
    const perPortal: ScrapedJob[][] = [];

    for (const name of selectedPortals) {
      const scraper = PORTAL_SCRAPERS[name];
      if (!scraper) {
        portalStatus.push({ name, ok: false, count: 0, error: 'portal no soportado' });
        continue;
      }
      try {
        const portalJobs: ScrapedJob[] = [];
        for (const q of queries) {
          const found = await scraper.search(q, location, budget);
          for (const job of found) {
            const key = this.jobIdentityKey(job.url, job.applyUrl, job.title, job.company);
            if (!key || seen.has(key)) continue;
            seen.add(key);
            portalJobs.push(job);
          }
          if (portalJobs.length >= MAX_PER_PORTAL) break;
        }
        const kept = portalJobs.slice(0, MAX_PER_PORTAL);
        perPortal.push(kept);
        portalStatus.push({ name, ok: true, count: kept.length });
        this.logger.log(`Portal ${name}: ${kept.length} vacantes reales`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes('presupuesto de peticiones agotado')) {
          this.logger.warn(`Presupuesto agotado durante portal ${name}`);
          break;
        }
        portalStatus.push({ name, ok: false, count: 0, error: message });
        this.logger.warn(`Portal ${name} falló: ${message}`);
      }
    }

    const scraped = roundRobin(perPortal, MAX_JOBS);

    const rawResponse = JSON.stringify(
      scraped.map((j) => ({ title: j.title, company: j.company, location: j.location, url: j.url })),
      null,
      2,
    );

    if (scraped.length === 0) {
      throw new HttpException(
        {
          message: 'No se obtuvieron vacantes de ningún portal seleccionado. Revisa el estado de cada portal en debug.',
          debug: { model, prompt, rawResponse: null, portals: portalStatus },
        },
        HttpStatus.BAD_GATEWAY,
      );
    }

    const top = scraped.slice(0, MAX_JOBS);

    // Descripciones reales de las primeras ofertas (con cortesía y presupuesto)
    let described = 0;
    for (const job of top) {
      if (described >= MAX_DESCRIPTION_FETCHES || budget.used >= budget.max) break;
      const scraper = scraperForUrl(job.url);
      if (!scraper?.extractDescription) continue;
      try {
        const desc = await scraper.extractDescription(job.url, budget);
        if (desc) {
          job.description = desc;
          described += 1;
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Descripción omitida para ${job.title}: ${message}`);
      }
    }

    const scored = await this.scoreJobsWithAi(top, profile, keywords);
    const threshold = typeof config.minMatchPercent === 'number' ? config.minMatchPercent : DEFAULT_MIN_MATCH;
    const kept = scored
      .filter((job) => (job.matchPercent ?? 0) >= threshold)
      .sort((a, b) => (b.matchPercent ?? 0) - (a.matchPercent ?? 0));

    this.logger.log(
      `Scoring: ${scored.length} puntuadas, ${kept.length} pasan el umbral ${threshold}%`,
    );

    const { saved, inserted, updated } = await this.upsertJobs(userId, kept);
    const purged = await this.purgeDuplicateJobs(userId);
    await this.configsService.markRun(userId);
    this.logger.log(
      `Scan completado para user ${userId}: ${saved.length} procesados (${inserted} nuevos, ${updated} actualizados, ${purged} duplicados eliminados)`,
    );
    const allJobs = await this.findByUser(userId);
    return {
      jobs: allJobs,
      debug: { model, prompt, rawResponse, portals: portalStatus },
    };
  }

  private async upsertJobs(
    userId: number,
    kept: ScrapedJob[],
  ): Promise<{ saved: Job[]; inserted: number; updated: number }> {
    const existing = await this.jobsRepository.find({ where: { userId } });
    const byUrl = new Map<string, Job>();
    const bySoft = new Map<string, Job>();
    for (const job of existing) {
      const urlKey = this.normalizeJobUrl(job.applyUrl || job.url);
      if (urlKey) byUrl.set(urlKey, job);
      bySoft.set(this.jobSoftKey(job.title, job.company), job);
    }

    const toSave: Job[] = [];
    let inserted = 0;
    let updated = 0;

    for (const job of kept) {
      const urlKey = this.normalizeJobUrl(job.applyUrl || job.url);
      const softKey = this.jobSoftKey(job.title, job.company);
      const entity = (urlKey ? byUrl.get(urlKey) : undefined) ?? bySoft.get(softKey);
      const postedAt = this.parsePostedAt(job.postedAt);
      const lastSeenAt = new Date();

      if (entity) {
        entity.title = job.title;
        entity.company = job.company ?? entity.company;
        entity.location = job.location ?? entity.location;
        entity.url = job.url || entity.url;
        entity.applyUrl = job.applyUrl || job.url || entity.applyUrl;
        if (job.description) entity.description = job.description;
        entity.matchPercent = job.matchPercent ?? entity.matchPercent;
        entity.matchReason = job.matchReason ?? entity.matchReason;
        if (postedAt) entity.postedAt = postedAt;
        entity.lastSeenAt = lastSeenAt;
        toSave.push(entity);
        updated += 1;
      } else {
        const created = this.jobsRepository.create({
          userId,
          title: job.title,
          company: job.company ?? null,
          location: job.location ?? null,
          url: job.url,
          applyUrl: job.applyUrl || job.url,
          description: job.description ?? null,
          matchPercent: job.matchPercent ?? null,
          matchReason: job.matchReason ?? null,
          postedAt,
          lastSeenAt,
        });
        toSave.push(created);
        inserted += 1;
        if (urlKey) byUrl.set(urlKey, created);
        bySoft.set(softKey, created);
      }
    }

    const saved = toSave.length ? await this.jobsRepository.save(toSave) : [];
    return { saved, inserted, updated };
  }

  private async purgeDuplicateJobs(userId: number): Promise<number> {
    const existing = await this.jobsRepository.find({
      where: { userId },
      order: { createdAt: 'ASC' },
    });
    const seen = new Set<string>();
    const removeIds: number[] = [];
    for (const job of existing) {
      const key = this.jobIdentityKey(job.url, job.applyUrl, job.title, job.company);
      if (seen.has(key)) {
        removeIds.push(job.id);
      } else {
        seen.add(key);
      }
    }
    if (removeIds.length) {
      await this.jobsRepository.delete(removeIds);
    }
    return removeIds.length;
  }

  private jobIdentityKey(
    url?: string | null,
    applyUrl?: string | null,
    title?: string,
    company?: string | null,
  ): string {
    const urlKey = this.normalizeJobUrl(applyUrl || url);
    if (urlKey) return `url:${urlKey}`;
    return `soft:${this.jobSoftKey(title ?? '', company)}`;
  }

  private normalizeJobUrl(url?: string | null): string {
    if (!url?.trim()) return '';
    try {
      const parsed = new URL(url.trim());
      parsed.hash = '';
      parsed.hostname = parsed.hostname.toLowerCase();
      parsed.protocol = 'https:';
      for (const key of [...parsed.searchParams.keys()]) {
        const lower = key.toLowerCase();
        if (lower.startsWith('utm_') || ['fbclid', 'gclid', 'ref', 'source', 'mc_cid', 'mc_eid'].includes(lower)) {
          parsed.searchParams.delete(key);
        }
      }
      if (parsed.pathname.length > 1 && parsed.pathname.endsWith('/')) {
        parsed.pathname = parsed.pathname.slice(0, -1);
      }
      return parsed.toString().toLowerCase();
    } catch {
      return url.trim().toLowerCase().replace(/\/+$/, '').split('#')[0];
    }
  }

  private jobSoftKey(title: string, company?: string | null): string {
    const t = title.toLowerCase().replace(/\s+/g, ' ').trim();
    const c = (company ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
    return `${t}|${c}`;
  }

  private async expandQueries(
    role: string,
    keywords: string,
    location: string | null | undefined,
    model: string | undefined,
  ): Promise<string[]> {
    const base = `${role} ${keywords}`.trim();
    try {
      const response = await this.aiService.chat({
        model: model || 'llama-3.3-70b-versatile',
        system:
          'Genera consultas de búsqueda de empleo de TI en español, cortas y específicas. IMPORTANTE: NO incluyas ciudades, departamentos ni países (la ubicación ya se filtra aparte). Solo rol + stack, máximo 4 palabras. Ejemplos: "desarrollador junior angular", "backend node typescript". Responde SOLO con un JSON array de 3 a 4 strings. Sin markdown, sin explicaciones.',
        message: `Rol: ${role}\nSkills/Keywords: ${keywords}\n\nGenera consultas que den buenos resultados en portales colombianos (Computrabajo, El Empleo).`,
      });
      const parsed = this.parseStringArray(response.content);
      const extras = [...new Set(parsed)]
        .map((q) => q.trim())
        .filter((q) => q.length >= 3 && q.length <= 60)
        .slice(0, 4);
      const queries = [base, ...extras.filter((q) => q.toLowerCase() !== base.toLowerCase())];
      this.logger.log(`Queries: ${queries.join(' | ')}`);
      return queries;
    } catch (error) {
      this.logger.warn(`expandQueries falló, usando query base: ${error}`);
    }
    return [base];
  }

  private parseStringArray(content: string): string[] {
    const cleaned = content.replace(/```json|```/g, '').trim();
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      const start = cleaned.indexOf('[');
      const end = cleaned.lastIndexOf(']');
      if (start === -1 || end <= start) return [];
      try {
        parsed = JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        return [];
      }
    }
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  }

  private async scoreJobsWithAi(
    jobs: ScrapedJob[],
    profile: NonNullable<Awaited<ReturnType<ProfilesService['get']>>>,
    keywords: string,
  ): Promise<ScrapedJob[]> {
    const listing = jobs
      .map(
        (j, i) =>
          `${i + 1}. ${j.title} | ${j.company ?? '?'} | ${j.location ?? '?'} | salario: ${j.salary ?? 'no publicado'} | modalidad: ${j.modality ?? 'no publicado'} | ${clip(j.description ?? '', 400)}`,
      )
      .join('\n');

    try {
      const response = await this.aiService.chat({
        model: 'llama-3.3-70b-versatile',
        system:
          'Eres un reclutador. Evalúa afinidad entre un candidato y vacantes REALES usando la descripción completa. Reglas: matchPercent 0-100, donde 40+ significa "vale la pena postularse"; valora stack similar, funciones y rol afín sin exigir coincidencia exacta; penaliza (-10) las vacantes no remotas en una ciudad distinta a la del candidato; penaliza (-10) salarios publicados claramente inferiores al deseado (1 USD ≈ 4100 COP). Sé generoso con candidatos junior con stack amplio. Responde SOLO con un JSON array de objetos {index, matchPercent, matchReason}. index empieza en 1. Sin markdown.',
        message: `CANDIDATO:
- Rol: ${profile.desiredRole ?? 'no definido'}
- Skills: ${profile.skills?.join(', ') || 'no definidas'}
- Keywords: ${keywords}
- Ubicación: ${profile.location ?? 'no definida'}
- Modalidad preferida: ${profile.modality ?? 'cualquiera'}
- Salario deseado (USD/mes): ${profile.desiredSalary ?? 'no definido'}
- Resumen: ${profile.summary ?? 'no definido'}

VACANTES REALES:
${listing}

Devuelve un JSON array con un objeto por vacante: index (1-based), matchPercent (0-100), matchReason (máx 20 palabras).`,
      });

      const scores = this.parseMatchScores(response.content);
      return jobs.map((job, i) => {
        const score = scores.find((s) => s.index === i + 1);
        return {
          ...job,
          matchPercent: score?.matchPercent ?? this.localMatchScore(job, profile, keywords),
          matchReason: score?.matchReason || 'Vacante real con descripción completa',
        };
      });
    } catch (error) {
      this.logger.warn(`Scoring IA falló, usando match local: ${error}`);
      return jobs.map((job) => ({
        ...job,
        matchPercent: this.localMatchScore(job, profile, keywords),
        matchReason: 'Vacante real con descripción completa',
      }));
    }
  }

  private parseMatchScores(content: string): Array<{ index: number; matchPercent: number; matchReason: string }> {
    const cleaned = content.replace(/```json|```/g, '').trim();
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      const start = cleaned.indexOf('[');
      const end = cleaned.lastIndexOf(']');
      if (start === -1 || end <= start) return [];
      try {
        parsed = JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        return [];
      }
    }
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => {
        const row = item as { index?: number; matchPercent?: number; matchReason?: string };
        return {
          index: Number(row.index),
          matchPercent: Math.max(0, Math.min(100, Number(row.matchPercent) || 0)),
          matchReason: String(row.matchReason ?? '').slice(0, 160),
        };
      })
      .filter((s) => s.index > 0);
  }

  private localMatchScore(
    job: ScrapedJob,
    profile: NonNullable<Awaited<ReturnType<ProfilesService['get']>>>,
    keywords: string,
  ): number {
    const hay = `${job.title} ${job.company ?? ''} ${job.description ?? ''}`.toLowerCase();
    const terms = [
      ...(profile.skills ?? []),
      ...keywords.split(/\s+/),
      profile.desiredRole ?? '',
    ]
      .map((t) => t.toLowerCase().trim())
      .filter((t) => t.length > 2);
    if (!terms.length) return 50;
    const hits = terms.filter((t) => hay.includes(t)).length;
    let score = Math.min(95, Math.round(40 + (hits / terms.length) * 55));

    if (!isRemoteJob(job) && job.location && profile.location) {
      const jobCity = job.location.toLowerCase().split(',')[0].trim();
      const profileCity = profile.location.toLowerCase().split(',')[0].trim();
      if (jobCity !== profileCity) score -= 10;
    }
    if (profile.modality === 'remote' && !isRemoteJob(job)) {
      score -= 10;
    }
    const jobSalaryCop = parseSalaryToNumber(job.salary);
    if (jobSalaryCop && profile.desiredSalary) {
      const usd = jobSalaryCop / 4100;
      if (usd < profile.desiredSalary) score -= 10;
    }
    return Math.max(0, score);
  }

  private parsePostedAt(value?: string): Date | null {
    if (!value) return null;
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
}

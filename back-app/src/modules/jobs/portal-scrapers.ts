import { Logger } from '@nestjs/common';

export interface ScrapedJob {
  title: string;
  company?: string;
  location?: string;
  url: string;
  applyUrl: string;
  description?: string;
  salary?: string;
  modality?: string;
  postedAt?: string;
  matchPercent?: number;
  matchReason?: string;
}

export interface Budget {
  used: number;
  max: number;
}

export interface PortalStatus {
  name: string;
  ok: boolean;
  count: number;
  error?: string;
}

export interface PortalScraper {
  name: string;
  search(query: string, location: string, budget: Budget): Promise<ScrapedJob[]>;
  extractDescription?(url: string, budget: Budget): Promise<string | null>;
}

const logger = new Logger('PortalScrapers');
const browserUa =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const randomBetween = (min: number, max: number) => min + Math.floor(Math.random() * (max - min));

// Cola global: serializa todas las peticiones a portales con delay aleatorio
let chain: Promise<unknown> = Promise.resolve();

async function politeFetch(
  url: string,
  opts: { budget?: Budget; minDelay?: number; maxDelay?: number; retries?: number } = {},
): Promise<Response> {
  const { budget, minDelay = 1500, maxDelay = 3000, retries = 1 } = opts;
  if (budget && budget.used >= budget.max) {
    throw new Error('presupuesto de peticiones agotado para este scan');
  }
  const run = chain.then(async () => {
    if (budget) budget.used += 1;
    await sleep(randomBetween(minDelay, maxDelay));
    let lastError: Error & { status?: number } | null = null;
    for (let attempt = 0; attempt <= retries; attempt++) {
      if (attempt > 0) {
        await sleep(randomBetween(3000, 5000));
      }
      const response = await fetch(url, {
        headers: {
          'User-Agent': browserUa,
          Accept: 'text/html,application/xhtml+xml',
          'Accept-Language': 'es-CO,es;q=0.9',
        },
        signal: AbortSignal.timeout(25000),
        redirect: 'follow',
      });
      if (response.ok) return response;
      if (response.status === 403 || response.status === 429 || response.status >= 500) {
        lastError = new Error(`HTTP ${response.status}`) as Error & { status?: number };
        lastError.status = response.status;
        logger.warn(`HTTP ${response.status} (intento ${attempt + 1}): ${url}`);
        continue;
      }
      return response;
    }
    throw lastError ?? new Error('fetch falló');
  });
  chain = run.catch(() => undefined);
  return run as Promise<Response>;
}

export function decodeHtml(value: string): string {
  return value
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function clip(value: string, max: number): string {
  const cleaned = value.replace(/\s+/g, ' ').trim();
  return cleaned.length > max ? cleaned.slice(0, max) : cleaned;
}

export function dedupeParts(value: string): string {
  const parts = value
    .split(',')
    .map((p) => p.trim())
    .filter((p) => p.length > 1 && /[a-záéíóúñ]/i.test(p));
  const seen = new Set<string>();
  const unique = parts.filter((p) => {
    const key = p.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return unique.join(', ');
}

export function isNonTechRole(title: string): boolean {
  const t = title.toLowerCase();
  const devish = /(desarroll|programad|full\s*stack|frontend|front-end|backend|back-end|software|sistemas|ingenier[oa]\s*(de\s*)?sistemas|\bweb\b|\bdev\b|nube|cloud)/i.test(t);
  if (!devish) return true;
  const block = [
    'comercial',
    'ventas',
    'vendedor',
    'optómetra',
    'optometra',
    'enfermer',
    'cnc',
    'negocios clientes',
    'consumo masivo',
    'seo',
    'marketing',
    'recursos humanos',
    'rrhh',
    'contador',
    'auxiliar contable',
    'call center',
    'teleoperador',
    'lavander',
    'operario',
    'promotor',
    'auxiliar de',
    'conductor',
    'mensajero',
    'mesero',
    'cajero',
    'recepcionist',
    'seguridad',
    'vigilante',
    'barbero',
    'esteticista',
    'cocina',
    'chef',
    'doméstica',
    'domestica',
    'aseo',
    'bodega',
    'cargue',
    'técnico en salud',
    'salud ocupacional',
    'administrativo',
    'impuestos',
    'servicio al cliente',
    'mercadeo',
    'gestión humana',
    'gestion humana',
    'logística',
    'logistica',
    'electromecánico',
    'electromecanico',
    'mecanico',
    'mecánico',
    'electrico',
    'eléctrico',
    'soldador',
    'operativo',
    'distribución',
    'distribucion',
    'contabilidad',
    'financiero',
    'auditor',
    'diseñador grafico',
    'diseñador gráfico',
    'de mayoristas',
    'de mercado',
    'de negocios',
    'organizacional',
    'formación',
    'formacion',
    'capacitaci',
    'reclutam',
    'talento humano',
    'investigación y desarrollo',
    'investigacion y desarrollo',
    'analista de proyectos',
    'jardinero',
    'piscinero',
    'droguer',
    'transferenc',
    'automotriz',
    'supervisor',
    'cash management',
    'consultor',
    'representante',
    'soporte',
    'atencion al cliente',
    'atención al cliente',
  ];
  return block.some((w) => t.includes(w));
}

export function parseSalaryToNumber(salary: string | undefined): number | null {
  if (!salary) return null;
  const match = salary.replace(/\./g, '').match(/\$\s*([\d.,]+)/);
  if (!match) return null;
  const raw = parseFloat(match[1].replace(/,/g, '.'));
  if (isNaN(raw)) return null;
  // Rangos tipo "$2 a $2,5" o "$2,5 millones" son millones de COP
  return raw < 200 ? Math.round(raw * 1_000_000) : Math.round(raw);
}

export function isRemoteJob(job: ScrapedJob): boolean {
  return /remoto/i.test(`${job.modality ?? ''} ${job.description ?? ''} ${job.location ?? ''}`);
}

/* ------------------------------------------------------------------ */
/* Computrabajo                                                        */
/* ------------------------------------------------------------------ */

function buildComputrabajoSearchUrl(query: string, location: string): string {
  const firstTerm =
    query
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .split('-')
      .find(Boolean) || 'empleo';
  const city = (location || 'colombia').toLowerCase().split(',')[0].trim();
  return `https://co.computrabajo.com/trabajo-de-${firstTerm}?q=${encodeURIComponent(query)}&l=${encodeURIComponent(city)}`;
}

function parseComputrabajoHtml(html: string): ScrapedJob[] {
  const parts = html.split('data-offers-grid-offer-item-container').slice(1);
  const jobs: ScrapedJob[] = [];
  const seen = new Set<string>();

  for (const part of parts) {
    const linkMatch = part.match(
      /class="js-o-link[^"]*"[^>]*href="([^"]*oferta-de-trabajo[^"#]*)(?:#[^"]*)?"[^>]*>\s*([^<]+)/i,
    );
    if (!linkMatch) continue;

    const path = linkMatch[1].trim();
    const title = clip(decodeHtml(linkMatch[2]), 200);
    if (!title || /b[uú]squeda de empleos/i.test(title) || title.includes('{{')) continue;
    if (isNonTechRole(title)) continue;

    const absoluteUrl = clip(path.startsWith('http') ? path : `https://co.computrabajo.com${path}`, 500);
    if (seen.has(absoluteUrl)) continue;
    seen.add(absoluteUrl);

    const companyMatch = part.match(/class="fc_base t_ellipsis[^"]*"[^>]*>\s*([^<]+)/i);
    const company = companyMatch ? clip(decodeHtml(companyMatch[1]), 200) : null;

    const locationMatch = part.match(/class="mr10"[^>]*>\s*([^<]+)/i);
    const location = locationMatch ? clip(dedupeParts(decodeHtml(locationMatch[1])), 100) : null;

    const text = decodeHtml(part.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<[^>]+>/g, ' '));
    const salaryMatch = text.match(/\$\s*[\d.]+(?:,\d+)?(?:\s*\([^)]+\))?/);
    const modalityMatch = text.match(/(Remoto|Presencial|H[ií]brido|Presencial y remoto)/i);

    jobs.push({
      title,
      company: company || undefined,
      location: location || undefined,
      url: absoluteUrl,
      applyUrl: absoluteUrl,
      description: clip([company, location, salaryMatch?.[0], modalityMatch?.[0]].filter(Boolean).join(' · ') || '', 500) || undefined,
      salary: salaryMatch?.[0],
      modality: modalityMatch?.[1] ?? undefined,
      postedAt: new Date().toISOString().slice(0, 10),
    });
  }

  return jobs;
}

function extractComputrabajoDescription(html: string): string | null {
  const start = html.indexOf('div-link="oferta"');
  if (start === -1) return null;
  const open = html.lastIndexOf('<div', start);
  if (open === -1) return null;
  const tagRe = /<div[\s\S]*?>|<\/div>/g;
  tagRe.lastIndex = open;
  let depth = 0;
  let m: RegExpExecArray | null;
  let end = -1;
  while ((m = tagRe.exec(html))) {
    if (m[0] === '</div>') depth--;
    else depth++;
    if (depth === 0) {
      end = m.index + m[0].length;
      break;
    }
  }
  if (end === -1) return null;
  const raw = html.slice(open, end);
  const cleaned = raw
    .replace(/<h3[^>]*>Descripci[oó]n de la oferta<\/h3>/gi, '')
    .replace(/<span class="tag base mb10">[\s\S]*?<\/span>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ');
  return clip(decodeHtml(cleaned), 1200) || null;
}

export const computrabajoScraper: PortalScraper = {
  name: 'Computrabajo',
  async search(query: string, location: string, budget: Budget): Promise<ScrapedJob[]> {
    const url = buildComputrabajoSearchUrl(query, location);
    logger.log(`Scrape Computrabajo: ${url}`);
    const response = await politeFetch(url, { budget });
    return parseComputrabajoHtml(await response.text());
  },
  async extractDescription(url: string, budget: Budget): Promise<string | null> {
    const response = await politeFetch(url, { budget });
    return extractComputrabajoDescription(await response.text());
  },
};

/* ------------------------------------------------------------------ */
/* El Empleo                                                           */
/* ------------------------------------------------------------------ */

function buildElempleoSearchUrl(query: string, location: string): string {
  const city = (location || 'colombia').toLowerCase().split(',')[0].trim();
  return `https://www.elempleo.com/co/ofertas-empleo/busqueda?q=${encodeURIComponent(query)}&ciudad=${encodeURIComponent(city)}`;
}

function parseElempleoHtml(html: string): ScrapedJob[] {
  const parts = html.split('result-info-container-item').slice(1);
  const jobs: ScrapedJob[] = [];
  const seen = new Set<string>();

  for (const part of parts) {
    const titleMatch = part.match(/data-offer-title="([^"]+)"/);
    const companyMatch = part.match(/data-offer-companyname="([^"]+)"/);
    const urlMatch = part.match(/data-offer-url="([^"]+)"/);
    const salaryMatch = part.match(/data-offer-salary="([^"]+)"/);
    const descMatch = part.match(/data-offer-description="([\s\S]*?)"\s+data-/);
    if (!titleMatch || !urlMatch) continue;

    const title = clip(decodeHtml(titleMatch[1]), 200);
    if (!title || title.includes('{{') || isNonTechRole(title)) continue;

    const url = clip(urlMatch[1], 500);
    if (seen.has(url)) continue;
    seen.add(url);

    const company = companyMatch ? clip(decodeHtml(companyMatch[1]), 200) : null;
    const locationMatch = part.match(/class="[^"]*js-offer-city[^"]*"[^>]*>\s*([^<]+)/i);
    const location = locationMatch ? clip(decodeHtml(locationMatch[1]), 100) : null;
    const text = decodeHtml(part.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<[^>]+>/g, ' '));
    const modalityMatch = text.match(/(Remoto|Presencial|H[ií]brido|Presencial y remoto)/i);
    const description = descMatch ? clip(decodeHtml(descMatch[1]), 1200) : null;

    jobs.push({
      title,
      company: company || undefined,
      location: location || undefined,
      url,
      applyUrl: url,
      description: description || clip([company, location, salaryMatch?.[1], modalityMatch?.[1]].filter(Boolean).join(' · ') || '', 500) || undefined,
      salary: salaryMatch?.[1],
      modality: modalityMatch?.[1] ?? undefined,
      postedAt: new Date().toISOString().slice(0, 10),
    });
  }

  return jobs;
}

export const elempleoScraper: PortalScraper = {
  name: 'El Empleo',
  async search(query: string, location: string, budget: Budget): Promise<ScrapedJob[]> {
    const url = buildElempleoSearchUrl(query, location);
    logger.log(`Scrape El Empleo: ${url}`);
    const response = await politeFetch(url, { budget });
    return parseElempleoHtml(await response.text());
  },
};

/* ------------------------------------------------------------------ */
/* Indeed y LinkedIn (intento; suelen fallar por antibot/login)        */
/* ------------------------------------------------------------------ */

function buildIndeedSearchUrl(query: string, location: string): string {
  const city = (location || 'colombia').toLowerCase().split(',')[0].trim();
  return `https://co.indeed.com/jobs?q=${encodeURIComponent(query)}&l=${encodeURIComponent(city)}`;
}

export const indeedScraper: PortalScraper = {
  name: 'Indeed',
  async search(query: string, location: string, budget: Budget): Promise<ScrapedJob[]> {
    const url = buildIndeedSearchUrl(query, location);
    logger.log(`Intento scrape Indeed: ${url}`);
    const response = await politeFetch(url, { budget, retries: 0 });
    const html = await response.text();
    if (!html.includes('job_seen_beacon') && !html.includes('tapItem')) {
      throw new Error('página sin resultados (Indeed bloquea el acceso automático)');
    }
    return [];
  },
};

function buildLinkedinSearchUrl(query: string, location: string): string {
  const city = (location || 'colombia').toLowerCase().split(',')[0].trim();
  return `https://co.linkedin.com/jobs/search?keywords=${encodeURIComponent(query)}&location=${encodeURIComponent(city)}`;
}

export const linkedinScraper: PortalScraper = {
  name: 'LinkedIn',
  async search(query: string, location: string, budget: Budget): Promise<ScrapedJob[]> {
    const url = buildLinkedinSearchUrl(query, location);
    logger.log(`Intento scrape LinkedIn: ${url}`);
    const response = await politeFetch(url, { budget, retries: 0 });
    const html = await response.text();
    if (!html.includes('/jobs/view/')) {
      throw new Error('LinkedIn exige inicio de sesión (muro de autenticación, sin resultados server-side)');
    }
    return [];
  },
};

export const PORTAL_SCRAPERS: Record<string, PortalScraper> = {
  computrabajo: computrabajoScraper,
  elempleo: elempleoScraper,
  'el empleo': elempleoScraper,
  indeed: indeedScraper,
  linkedin: linkedinScraper,
};

export function scraperForUrl(url: string): PortalScraper | null {
  const u = url.toLowerCase();
  if (u.includes('computrabajo')) return computrabajoScraper;
  if (u.includes('elempleo')) return elempleoScraper;
  return null;
}

export function normalizePortalName(name: string): string {
  return name.toLowerCase().trim();
}

export { politeFetch };

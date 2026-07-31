import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { Application, Job } from '../../core/models/models';

interface ScanDebug {
  model: string;
  prompt: string;
  rawResponse: string | null;
  portals?: PortalStatus[];
}

interface PortalStatus {
  name: string;
  ok: boolean;
  count: number;
  error?: string;
}

interface ScanResult {
  jobs: Job[];
  debug: ScanDebug;
}

@Component({
  selector: 'app-jobs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">
      <div class="flex-between mb">
        <div>
          <h1 class="mono">▸ empleos encontrados <span class="dim">({{ filteredJobs.length }})</span></h1>
          <p class="dim">Vista principal con filtros por portal, fecha, estado, match y link de postulación.</p>
        </div>
        <button class="btn btn-primary" (click)="scan()" [disabled]="scanning">
          {{ scanning ? 'buscando vacantes...' : '⚡ actualizar vacantes' }}
        </button>
      </div>

      <div class="terminal mb" *ngIf="scanning">
        <span class="prompt">$</span> buscando ofertas reales...<span class="cursor">▌</span>
      </div>

      <div class="terminal mb error-terminal" *ngIf="scanError">
        <span class="prompt">$</span> error al escanear:<br>{{ scanError }}
      </div>

      <div class="terminal mb error-terminal" *ngIf="checkError">
        <span class="prompt">$</span> {{ checkError }}
      </div>

      <details class="debug-panel mb" *ngIf="debug">
        <summary class="mono dim">debug: payload enviado + respuesta cruda de la api</summary>
        <div class="terminal debug-terminal">
          <div class="mono label-debug">// payload (prompt) enviado a Groq</div>
          <pre>{{ debug.prompt }}</pre>
          <div class="mono label-debug">// respuesta cruda</div>
          <pre *ngIf="debug.rawResponse !== null">{{ debug.rawResponse }}</pre>
          <p class="dim mono" *ngIf="debug.rawResponse === null">// sin respuesta (la llamada a Groq falló)</p>
          <div class="mono label-debug">// estado por portal</div>
          <div class="portal-status" *ngFor="let p of debug.portals ?? []">
            <span [ngClass]="p.ok ? 'status-ok' : 'status-fail'">{{ p.ok ? '✓' : '✗' }}</span>
            {{ p.name }} — <span *ngIf="p.ok">ok ({{ p.count }} vacantes)</span><span *ngIf="!p.ok">error: {{ p.error }}</span>
          </div>
          <div class="dim mono">modelo: {{ debug.model }}</div>
        </div>
      </details>

      <p class="dim mono" *ngIf="jobs.length === 0 && !scanning">
        // sin resultados. completa tu perfil, configura el worker y presiona actualizar.
      </p>

      <div class="filters" *ngIf="jobs.length > 0">
        <input class="input" [(ngModel)]="pendingFilters.text" placeholder="buscar por título, empresa, ubicación o palabra clave" />
        <select class="input" [(ngModel)]="pendingFilters.status">
          <option value="">estado: todos</option>
          <option value="found">no aplicado</option>
          <option value="applied">aplicado</option>
          <option value="interview">entrevista</option>
          <option value="rejected">rechazado</option>
          <option value="accepted">aceptado</option>
        </select>
        <select class="input" [(ngModel)]="pendingFilters.source">
          <option value="">portal: todos</option>
          <option value="computrabajo">Computrabajo</option>
          <option value="el empleo">El Empleo</option>
          <option value="linkedin">LinkedIn</option>
          <option value="indeed">Indeed</option>
          <option value="other">Otra web</option>
        </select>
        <select class="input" [(ngModel)]="pendingFilters.dateAge">
          <option value="0">fecha: cualquiera</option>
          <option value="7">últimos 7 días</option>
          <option value="14">últimos 14 días</option>
          <option value="30">últimos 30 días</option>
          <option value="60">últimos 60 días</option>
        </select>
        <button class="btn btn-primary btn-search" (click)="applyFilters()">Buscar</button>
      </div>

      <div class="filters" *ngIf="jobs.length > 0">
        <select class="input" [(ngModel)]="pendingFilters.match">
          <option value="0">match: cualquiera</option>
          <option value="60">match ≥ 60%</option>
          <option value="75">match ≥ 75%</option>
          <option value="90">match ≥ 90%</option>
        </select>
        <select class="input" [(ngModel)]="pendingFilters.hasLink">
          <option value="">link: todos</option>
          <option value="yes">con link</option>
          <option value="no">sin link</option>
        </select>
        <select class="input" [(ngModel)]="pendingFilters.sortBy">
          <option value="newest">ordenar: más recientes</option>
          <option value="oldest">ordenar: más antiguas</option>
          <option value="match">ordenar: mejor match</option>
        </select>
        <select class="input" [(ngModel)]="pageSize" (ngModelChange)="page = 1">
          <option [value]="6">6 por página</option>
          <option [value]="12">12 por página</option>
          <option [value]="24">24 por página</option>
        </select>
      </div>

      <p class="dim mono" *ngIf="jobs.length > 0 && filteredJobs.length === 0">
        // sin empleos con esos filtros
      </p>

      <div class="grid" style="grid-template-columns: repeat(auto-fill, minmax(340px, 1fr))">
        <div class="card job-card" *ngFor="let job of pageJobs">
          <div class="card-head">
            <div class="badges">
              <span class="badge score" *ngIf="job.matchPercent" [ngClass]="matchClass(job)">match {{ job.matchPercent }}%</span>
              <span class="badge badge-secondary">{{ sourceLabel(job) }}</span>
              <span class="badge" [ngClass]="statusBadge(job).class">{{ statusBadge(job).label }}</span>
            </div>
            <div class="actions">
              <button
                class="btn btn-sm heart"
                [class.saved]="isSaved(job)"
                (click)="toggleSave(job)"
                [title]="isSaved(job) ? 'quitar de postulaciones' : 'guardar en postulaciones'"
              >
                <span class="heart-icon">{{ isSaved(job) ? '♥' : '♡' }}</span>
                <span>{{ isSaved(job) ? 'guardado' : 'guardar' }}</span>
              </button>
              <button class="btn btn-danger btn-sm" (click)="remove(job.id)" title="eliminar empleo">✕</button>
            </div>
          </div>

          <div class="match-bar" *ngIf="job.matchPercent">
            <div class="match-fill" [style.width.%]="job.matchPercent"></div>
          </div>

          <h3 class="mono title">
            <button type="button" class="title-link" *ngIf="job.url" (click)="openOffer(job)" [disabled]="openCountdown > 0 || openingId !== null">
              {{ job.title }}
            </button>
            <span *ngIf="!job.url">{{ job.title }}</span>
          </h3>

          <div class="meta">
            <span class="company">{{ job.company || 'empresa' }}</span>
            <span class="loc" *ngIf="job.location">⌖ {{ job.location }}</span>
          </div>

          <p class="desc" *ngIf="job.description && previewJob !== job" [title]="job.description">{{ job.description }}</p>
          <p class="mono reason" *ngIf="job.matchReason">// {{ job.matchReason }}</p>

          <div class="preview" *ngIf="previewJob === job">
            <div class="mono label-debug">// vista previa de la oferta</div>
            <p class="preview-desc">{{ job.description || 'sin descripción disponible' }}</p>
            <button class="btn btn-primary btn-sm" (click)="openOffer(job)" [disabled]="openCountdown > 0 || openingId !== null">
              {{ openingId === job.id ? 'verificando...' : 'postularme ↗' }}
            </button>
          </div>

          <div class="card-foot">
            <span class="mono date">
              {{ jobDateLabel(job) }} {{ jobDateValue(job) | date: 'dd MMM yyyy' }} · hace {{ daysSince(jobDateValue(job)) }} d
            </span>
            <div class="actions">
              <button class="btn btn-primary btn-sm" (click)="copyApplyLink(job)" [disabled]="copying === job.id || !(job.applyUrl || job.url)">
                {{ copied[job.id] ? 'link copiado ✓' : (copying === job.id ? 'copiando...' : 'copiar link') }}
              </button>
              <button class="btn btn-sm" (click)="togglePreview(job)" [class.btn-primary]="previewJob === job" [title]="previewJob === job ? 'cerrar vista previa' : 'ver descripción completa'">
                {{ previewJob === job ? '✕ vista' : '👁 vista' }}
              </button>
              <button class="btn btn-secondary btn-sm" (click)="openOffer(job)" [disabled]="openCountdown > 0 || openingId !== null">
                {{ openingId === job.id ? 'verificando...' : openCountdown > 0 ? 'espera ' + openCountdown + 's' : 'abrir oferta ↗' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="flex-between pagination" *ngIf="filteredJobs.length > 0">
        <button class="btn btn-sm" (click)="page = page - 1" [disabled]="page <= 1">‹ prev</button>
        <span class="dim mono">página {{ page }} / {{ totalPages }} · {{ filteredJobs.length }} empleos · mostrando {{ pageJobs.length }}</span>
        <button class="btn btn-sm" (click)="page = page + 1" [disabled]="page >= totalPages">next ›</button>
      </div>
    </div>
  `,
  styles: [`
    .job-card { display: flex; flex-direction: column; gap: 10px; transition: border-color 0.2s, box-shadow 0.2s, transform 0.15s; }
    .job-card:hover { transform: translateY(-2px); }
    .card-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
    .badges { display: flex; flex-wrap: wrap; gap: 6px; }
    .score { font-weight: 700; }
    .score-high { color: var(--neon); border-color: var(--neon); background: var(--neon-dim); }
    .score-mid { color: var(--cyan); border-color: var(--cyan); background: rgba(0, 208, 255, 0.1); }
    .score-low { color: var(--yellow); border-color: var(--yellow); background: rgba(255, 209, 102, 0.1); }
    .match-bar { height: 4px; background: var(--bg-hover); border-radius: 2px; overflow: hidden; }
    .match-fill { height: 100%; background: linear-gradient(90deg, var(--neon), var(--cyan)); border-radius: 2px; }
    .title { font-size: 16px; line-height: 1.35; }
    .title a { color: var(--text); text-decoration: none; transition: color 0.15s; }
    .title a:hover { color: var(--neon); }
    .title-link {
      all: unset;
      cursor: pointer;
      font-family: inherit;
      font-size: inherit;
      line-height: inherit;
      color: var(--text);
      transition: color 0.15s;
    }
    .title-link:hover:not(:disabled) { color: var(--neon); }
    .title-link:disabled { cursor: default; }
    .preview {
      border: 1px dashed var(--border);
      border-radius: 6px;
      padding: 10px;
      background: rgba(0, 208, 255, 0.04);
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .preview-desc {
      font-size: 13px;
      line-height: 1.6;
      color: var(--text);
      max-height: 220px;
      overflow: auto;
      white-space: pre-line;
    }
    .status-ok { color: var(--neon); }
    .status-fail { color: var(--red); }
    .portal-status { font-size: 12px; margin: 4px 0; color: var(--text); }
    .meta { display: flex; align-items: center; gap: 10px; font-size: 13px; color: var(--text-dim); flex-wrap: wrap; }
    .company { font-weight: 600; color: var(--text); }
    .loc { display: inline-flex; align-items: center; gap: 4px; color: var(--cyan); font-size: 12px; }
    .desc { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
    .card-foot { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; padding-top: 12px; border-top: 1px solid var(--border); margin-top: auto; }
    .filters { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 14px; }
    .filters .input { flex: 1; min-width: 180px; }
    .pagination { margin-top: 16px; }
    .error-terminal { color: var(--red); }
    .debug-panel summary { cursor: pointer; font-size: 12px; user-select: none; }
    .debug-panel summary:hover { color: var(--neon); }
    .debug-terminal { margin-top: 10px; max-height: 320px; overflow: auto; }
    .debug-terminal pre {
      font-family: var(--mono);
      font-size: 11px;
      line-height: 1.5;
      color: var(--text);
      background: #070a0f;
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 8px;
      margin: 6px 0 12px;
      white-space: pre-wrap;
      word-break: break-word;
      max-height: 160px;
      overflow: auto;
    }
    .label-debug { color: var(--cyan); font-size: 11px; margin-top: 6px; }
    .cursor { animation: blink 1s infinite; }
    @keyframes blink { 50% { opacity: 0; } }
  `],
})
export class JobsComponent implements OnInit, OnDestroy {
  jobs: Job[] = [];
  applications: Application[] = [];
  scanning = false;
  scanError: string | null = null;
  checkError: string | null = null;
  debug: ScanDebug | null = null;
  copying: number | null = null;
  copied: Record<number, boolean> = {};
  previewJob: Job | null = null;
  openCooldownUntil = 0;
  openCountdown = 0;
  openingId: number | null = null;
  private countdownTimer: ReturnType<typeof setInterval> | null = null;
  filters = {
    text: '',
    status: '',
    match: 0,
    source: '',
    dateAge: 0,
    hasLink: '',
    sortBy: 'newest',
  };
  pendingFilters = { ...this.filters };
  page = 1;
  pageSize = 6;

  constructor(
    private readonly api: ApiService,
    private readonly auth: AuthService,
  ) {}

  ngOnInit() {
    this.load();
    this.api.get<Application[]>('/applications', this.auth.token).subscribe((data) => (this.applications = data));
  }

  ngOnDestroy() {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
  }

  togglePreview(job: Job) {
    this.previewJob = this.previewJob === job ? null : job;
  }

  openOffer(job: Job) {
    if (this.openCountdown > 0 || this.openingId !== null) return;
    const link = job.applyUrl || job.url;
    if (!link) return;
    this.openingId = job.id;
    this.checkError = null;
    this.api.get<{ ok: boolean; status: number; url: string | null; error?: string }>(`/jobs/${job.id}/check`, this.auth.token).subscribe({
      next: (res) => {
        this.openingId = null;
        if (res.ok) {
          window.open(res.url || link, '_blank', 'noopener');
          this.checkError = null;
        } else {
          this.checkError =
            res.status === 403
              ? 'El portal bloqueó la apertura (403): espera 2-5 min entre aperturas o abre en modo incógnito. También puedes copiar el link.'
              : `No se pudo abrir la oferta (${res.status ?? 'error'}). Puedes copiar el link.`;
        }
        this.startCooldown();
      },
      error: (err) => {
        this.openingId = null;
        this.checkError = err?.error?.message ?? 'error al verificar la oferta';
        this.startCooldown();
      },
    });
  }

  private startCooldown() {
    this.openCooldownUntil = Date.now() + 10_000;
    this.updateCountdown();
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
    }
    this.countdownTimer = setInterval(() => {
      if (!this.updateCountdown()) {
        clearInterval(this.countdownTimer!);
        this.countdownTimer = null;
      }
    }, 1000);
  }

  private updateCountdown(): boolean {
    const remaining = Math.max(0, Math.ceil((this.openCooldownUntil - Date.now()) / 1000));
    this.openCountdown = remaining;
    return remaining > 0;
  }

  load() {
    this.api.get<Job[]>('/jobs', this.auth.token).subscribe((data) => (this.jobs = data));
  }

  scan() {
    this.scanning = true;
    this.scanError = null;
    this.debug = null;
    this.api.post<ScanResult>('/jobs/scan', {}, this.auth.token).subscribe({
      next: (res) => {
        this.scanning = false;
        this.debug = res.debug ?? null;
        this.jobs = res.jobs ?? [];
        this.api.get<Application[]>('/applications', this.auth.token).subscribe((data) => (this.applications = data));
      },
      error: (err) => {
        this.scanning = false;
        const body = err.error;
        this.scanError = body?.message ?? err.message ?? 'error desconocido al escanear';
        if (body?.debug) {
          this.debug = body.debug;
        }
      },
    });
  }

  appFor(jobId: number): Application | undefined {
    return this.applications.find((a) => a.jobId === jobId);
  }

  isSaved(job: Job): boolean {
    return !!this.appFor(job.id);
  }

  matchClass(job: Job): string {
    const score = job.matchPercent ?? 0;
    if (score >= 75) return 'score-high';
    if (score >= 50) return 'score-mid';
    return 'score-low';
  }

  toggleSave(job: Job) {
    const app = this.appFor(job.id);
    if (app) {
      this.api.delete(`/applications/${app.id}`, this.auth.token).subscribe(() => {
        this.applications = this.applications.filter((a) => a.id !== app.id);
      });
    } else {
      this.api.post<Application>('/applications', { jobId: job.id }, this.auth.token).subscribe((created) => {
        this.applications = [created, ...this.applications];
      });
    }
  }

  statusBadge(job: Job): { label: string; class: string } {
    const app = this.appFor(job.id);
    if (!app) return { label: 'no aplicado', class: 'badge-dim' };
    const map: Record<string, { label: string; class: string }> = {
      applied: { label: 'aplicado', class: 'badge-cyan' },
      interview: { label: 'entrevista', class: 'badge-yellow' },
      rejected: { label: 'rechazado', class: 'badge-red' },
      accepted: { label: 'aceptado', class: 'badge-neon' },
    };
    return map[app.status] ?? { label: app.status, class: 'badge-dim' };
  }

  sourceLabel(job: Job): string {
    const source = this.jobSource(job).toLowerCase();
    return source === 'other' ? 'Otra web' : source;
  }

  jobSource(job: Job): string {
    const url = (job.applyUrl || job.url || '').toLowerCase();
    if (!url) return 'Sin link';
    if (url.includes('computrabajo')) return 'Computrabajo';
    if (url.includes('elempleo')) return 'El Empleo';
    if (url.includes('linkedin.com')) return 'LinkedIn';
    if (url.includes('indeed')) return 'Indeed';
    if (url.includes('bumeran')) return 'Bumeran';
    if (url.includes('occ')) return 'OCC';
    return 'Other';
  }

  jobDateValue(job: Job): string {
    return job.postedAt || job.createdAt;
  }

  jobDateLabel(job: Job): string {
    return job.postedAt ? 'publicada el' : 'registrada el';
  }

  daysSince(date: string): number {
    return Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000));
  }

  get filteredJobs(): Job[] {
    const q = this.filters.text.trim().toLowerCase();
    return this.jobs
      .filter((job) => {
        const textOk = !q || [job.title, job.company, job.location].some((v) => v?.toLowerCase().includes(q));
        const statusOk = !this.filters.status || (this.appFor(job.id)?.status ?? 'found') === this.filters.status;
        const matchOk = !this.filters.match || (job.matchPercent ?? 0) >= +this.filters.match;
        const source = this.jobSource(job).toLowerCase();
        const sourceOk = !this.filters.source || (this.filters.source === 'other' ? source === 'other' : source === this.filters.source);
        const hasLinkOk = this.filters.hasLink === 'yes' ? !!(job.applyUrl || job.url) : this.filters.hasLink === 'no' ? !(job.applyUrl || job.url) : true;
        const dateAgeOk = !this.filters.dateAge || this.daysSince(this.jobDateValue(job)) <= +this.filters.dateAge;
        return textOk && statusOk && matchOk && sourceOk && hasLinkOk && dateAgeOk;
      })
      .sort((a, b) => {
        if (this.filters.sortBy === 'match') {
          return (b.matchPercent ?? 0) - (a.matchPercent ?? 0);
        }
        const dateA = new Date(this.jobDateValue(a)).getTime();
        const dateB = new Date(this.jobDateValue(b)).getTime();
        return this.filters.sortBy === 'oldest' ? dateA - dateB : dateB - dateA;
      });
  }

  applyFilters() {
    this.filters = { ...this.pendingFilters };
    this.page = 1;
  }

  get totalPages() {
    return Math.max(1, Math.ceil(this.filteredJobs.length / this.pageSize));
  }

  get pageJobs(): Job[] {
    if (this.page > this.totalPages) this.page = this.totalPages;
    const start = (this.page - 1) * this.pageSize;
    return this.filteredJobs.slice(start, start + this.pageSize);
  }

  async copyApplyLink(job: Job) {
    const link = job.applyUrl || job.url;
    if (!link) return;
    this.copying = job.id;
    try {
      await navigator.clipboard.writeText(link);
      this.copied[job.id] = true;
      setTimeout(() => (this.copied[job.id] = false), 1500);
    } catch {
      const el = document.createElement('textarea');
      el.value = link;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      el.remove();
      this.copied[job.id] = true;
      setTimeout(() => (this.copied[job.id] = false), 1500);
    }
    this.copying = null;
  }

  remove(id: number) {
    this.api.delete(`/jobs/${id}`, this.auth.token).subscribe(() => this.load());
  }
}

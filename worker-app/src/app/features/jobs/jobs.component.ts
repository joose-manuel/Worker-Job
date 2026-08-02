import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { Application, Job, WorkerConfig } from '../../core/models/models';

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
  templateUrl: './jobs.component.html',
  styleUrl: './jobs.component.css',
})
export class JobsComponent implements OnInit, OnDestroy {
  jobs: Job[] = [];
  applications: Application[] = [];
  scanning = false;
  scanError: string | null = null;
  loadError: string | null = null;
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
    sortBy: 'smart',
  };
  pendingFilters = { ...this.filters };
  page = 1;
  pageSize = 6;
  filtersOpen = false;
  lastRunAt: string | null = null;

  constructor(
    private readonly api: ApiService,
    private readonly auth: AuthService,
  ) {}

  ngOnInit() {
    this.load();
    this.refreshLastRun();
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
    this.loadError = null;
    this.api.get<Job[]>('/jobs', this.auth.token).subscribe({
      next: (data) => (this.jobs = data),
      error: (err) => {
        this.loadError = err?.error?.message ?? err.message ?? 'error al cargar empleos (¿backend caído?)';
      },
    });
  }

  private refreshLastRun() {
    this.api.get<WorkerConfig>('/worker-config/me', this.auth.token).subscribe((data) => {
      this.lastRunAt = data?.lastRunAt ?? null;
    });
  }

  isNew(job: Job): boolean {
    if (!job.lastSeenAt || !this.lastRunAt) return false;
    return new Date(job.lastSeenAt).getTime() >= new Date(this.lastRunAt).getTime();
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
        this.refreshLastRun();
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
    if (url.includes('trabajo.org')) return 'Trabajo.org';
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
        const textOk =
          !q ||
          [job.title, job.company, job.location, job.applyUrl, job.url].some((v) => v?.toLowerCase().includes(q));
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
        if (this.filters.sortBy === 'smart') {
          const dateDiff =
            new Date(this.jobSeenAt(b)).getTime() - new Date(this.jobSeenAt(a)).getTime();
          if (dateDiff !== 0) return dateDiff;
          return (b.matchPercent ?? 0) - (a.matchPercent ?? 0);
        }
        const dateA = new Date(this.jobDateValue(a)).getTime();
        const dateB = new Date(this.jobDateValue(b)).getTime();
        return this.filters.sortBy === 'oldest' ? dateA - dateB : dateB - dateA;
      });
  }

  private jobSeenAt(job: Job): string {
    return job.lastSeenAt || job.createdAt;
  }

  applyFilters() {
    this.filters = { ...this.pendingFilters };
    this.goToPage(1);
  }

  goToPage(p: number) {
    this.page = Math.max(1, Math.min(p, this.totalPages));
  }

  prevPage() {
    this.goToPage(this.page - 1);
  }

  nextPage() {
    this.goToPage(this.page + 1);
  }

  get totalPages() {
    return Math.max(1, Math.ceil(this.filteredJobs.length / this.pageSize));
  }

  get pageJobs(): Job[] {
    const start = (this.page - 1) * this.pageSize;
    return this.filteredJobs.slice(start, start + this.pageSize);
  }

  get pageRange(): string {
    const total = this.filteredJobs.length;
    if (total === 0) return '0–0';
    const from = (this.page - 1) * this.pageSize + 1;
    const to = Math.min(this.page * this.pageSize, total);
    return `${from}–${to}`;
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

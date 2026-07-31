import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { Application, Job, WorkerConfig } from '../../core/models/models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="page">
      <h1 class="mono mb">▸ dashboard</h1>

      <div class="terminal mb">
        <span class="prompt">$</span> worker-job status --user={{ user?.name || 'anon' }}<br>
        <span class="prompt">$</span> empleos: {{ jobs.length }} | postulaciones: {{ applications.length }} |
        entrevistas: {{ interviews.length }} | worker: {{ config?.enabled ? 'ON' : 'OFF' }}
      </div>

      <div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(220px, 1fr))">
        <div class="card stat">
          <div class="num glow">{{ jobs.length }}</div>
          <div class="dim mono">empleos encontrados</div>
        </div>
        <div class="card stat">
          <div class="num glow">{{ applications.length }}</div>
          <div class="dim mono">postulaciones</div>
        </div>
        <div class="card stat">
          <div class="num glow">{{ interviews.length }}</div>
          <div class="dim mono">entrevistas</div>
        </div>
        <div class="card stat">
          <div class="num" [class.glow]="config?.enabled">{{ config?.enabled ? 'ON' : 'OFF' }}</div>
          <div class="dim mono">worker ia</div>
        </div>
      </div>

      <div class="card mt">
        <h3 class="mono mb"># empleos recientes</h3>

        <div class="filters">
          <input class="input" [(ngModel)]="filters.text" (ngModelChange)="page = 1" placeholder="buscar por título, empresa o ubicación..." />
          <select class="input" [(ngModel)]="filters.status" (ngModelChange)="page = 1">
            <option value="">estado: todos</option>
            <option value="found">found (encontrado)</option>
            <option value="applied">applied (aplicado)</option>
            <option value="interview">interview (entrevista)</option>
            <option value="rejected">rejected</option>
            <option value="accepted">accepted</option>
          </select>
          <select class="input" [(ngModel)]="filters.match" (ngModelChange)="page = 1">
            <option value="0">match: cualquiera</option>
            <option value="60">match ≥ 60%</option>
            <option value="75">match ≥ 75%</option>
            <option value="90">match ≥ 90%</option>
          </select>
        </div>

        <p class="dim mono" *ngIf="filteredJobs.length === 0">// sin empleos con esos filtros</p>

        <div class="job-row" *ngFor="let job of pageJobs">
          <div class="job-info">
            <div class="job-title">
              <span class="badge badge-neon" *ngIf="job.matchPercent">match {{ job.matchPercent }}%</span>
              <span class="badge" [ngClass]="statusBadge(job).class">{{ statusBadge(job).label }}</span>
              <a *ngIf="job.url" [href]="job.url" target="_blank" class="mono">{{ job.title }}</a>
              <span *ngIf="!job.url" class="mono">{{ job.title }}</span>
            </div>
            <div class="dim">{{ job.company || 'empresa' }} · {{ job.location || 'ubicación?' }}</div>
          </div>
          <div class="job-date dim mono" *ngIf="job.postedAt">publicada hace {{ daysSince(job.postedAt) }} días<br>({{ job.postedAt | date: 'dd MMM yyyy' }})</div>
          <div class="job-date dim mono" *ngIf="!job.postedAt">encontrada<br>{{ job.createdAt | date: 'dd MMM yyyy' }}</div>
          <button class="btn btn-danger btn-sm" (click)="remove(job.id)">✕</button>
        </div>

        <div class="flex-between pagination" *ngIf="filteredJobs.length > 0">
          <button class="btn btn-sm" (click)="page = page - 1" [disabled]="page <= 1">‹ prev</button>
          <span class="dim mono">página {{ page }} / {{ totalPages }}</span>
          <button class="btn btn-sm" (click)="page = page + 1" [disabled]="page >= totalPages">next ›</button>
        </div>
      </div>

      <div class="grid mt" style="grid-template-columns: 1fr 1fr">
        <div class="card">
          <h3 class="mono mb"># próximas entrevistas</h3>
          <p class="dim mono" *ngIf="interviews.length === 0">// ninguna agendada</p>
          <div *ngFor="let app of interviews" class="flex-between row">
            <span>{{ app.job?.title ?? 'empleo eliminado' }} · {{ app.job?.company ?? '—' }}</span>
            <span class="badge badge-yellow">{{ app.interviewAt | date: 'MMM d, HH:mm' }}</span>
          </div>
        </div>
        <div class="card">
          <h3 class="mono mb"># accesos rápidos</h3>
          <div class="grid">
            <a routerLink="/jobs" class="btn">⚡ escanear empleos con ia</a>
            <a routerLink="/profile" class="btn">📎 actualizar hoja de vida</a>
            <a routerLink="/ai-worker" class="btn">⚙ configurar worker ia</a>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .stat { text-align: center; }
    .num { font-family: var(--mono); font-size: 42px; font-weight: 700; color: var(--neon); }
    .row { padding: 8px 0; border-bottom: 1px solid var(--border); font-size: 13px; }
    .row:last-child { border-bottom: none; }
    .filters { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 12px; }
    .filters .input { flex: 1; min-width: 180px; }
    .job-row {
      display: flex; align-items: center; gap: 12px;
      padding: 10px 0; border-bottom: 1px solid var(--border); font-size: 13px;
    }
    .job-row:last-child { border-bottom: none; }
    .job-info { flex: 1; min-width: 0; }
    .job-title { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
    .job-title a { color: var(--neon); text-decoration: none; }
    .job-date { white-space: nowrap; font-size: 12px; }
    .pagination { padding-top: 12px; }
  `],
})
export class DashboardComponent implements OnInit {
  jobs: Job[] = [];
  applications: Application[] = [];
  config: WorkerConfig | null = null;
  user: { name: string } | null = null;
  filters = { text: '', status: '', match: 0 };
  page = 1;
  pageSize = 8;

  constructor(
    private readonly api: ApiService,
    private readonly auth: AuthService,
  ) {}

  get interviews() {
    return this.applications.filter((a) => a.status === 'interview' && a.interviewAt);
  }

  appFor(jobId: number): Application | undefined {
    return this.applications.find((a) => a.jobId === jobId);
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

  daysSince(date: string): number {
    return Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000));
  }

  get filteredJobs(): Job[] {
    const q = this.filters.text.trim().toLowerCase();
    return this.jobs.filter((job) => {
      const textOk = !q || [job.title, job.company, job.location, job.status].some((v) => v?.toLowerCase().includes(q));
      const statusOk = !this.filters.status || job.status === this.filters.status;
      const matchOk = !this.filters.match || (job.matchPercent ?? 0) >= +this.filters.match;
      return textOk && statusOk && matchOk;
    });
  }

  get totalPages() {
    return Math.max(1, Math.ceil(this.filteredJobs.length / this.pageSize));
  }

  get pageJobs(): Job[] {
    if (this.page > this.totalPages) this.page = this.totalPages;
    const start = (this.page - 1) * this.pageSize;
    return this.filteredJobs.slice(start, start + this.pageSize);
  }

  ngOnInit() {
    const token = this.auth.token;
    this.api.get<Job[]>('/jobs', token).subscribe((data) => (this.jobs = data));
    this.api.get<Application[]>('/applications', token).subscribe((data) => (this.applications = data));
    this.api.get<WorkerConfig>('/worker-config/me', token).subscribe((data) => (this.config = data));
    this.auth.currentUser$.subscribe((u) => (this.user = u));
  }

  remove(id: number) {
    this.api.delete(`/jobs/${id}`, this.auth.token).subscribe(() => {
      this.jobs = this.jobs.filter((j) => j.id !== id);
    });
  }
}

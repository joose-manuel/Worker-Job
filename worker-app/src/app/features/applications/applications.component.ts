import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { Application, Job } from '../../core/models/models';

const STATUS_LABELS: Record<string, string> = {
  applied: 'postulado',
  interview: 'entrevista',
  rejected: 'rechazado',
  accepted: 'aceptado',
};

@Component({
  selector: 'app-applications',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">
      <h1 class="mono mb">▸ postulaciones y entrevistas <span class="dim">({{ applications.length }})</span></h1>

      <p class="dim mono" *ngIf="applications.length === 0">
        // sin postulaciones. toca el corazón ♡ en "empleos encontrados" para guardar una vacante
      </p>

      <div class="grid">
        <div class="card app-card" *ngFor="let app of applications">
          <div class="flex-between">
            <div class="flex gap" *ngIf="app.job">
              <span class="badge badge-neon" *ngIf="app.job.matchPercent">match {{ app.job.matchPercent }}%</span>
              <span class="badge badge-secondary">{{ sourceLabel(app.job) }}</span>
              <span class="badge" [ngClass]="statusClass(app.status)">{{ statusLabel(app.status) }}</span>
            </div>
            <span class="badge" *ngIf="!app.job" [ngClass]="statusClass(app.status)">{{ statusLabel(app.status) }}</span>
            <button class="btn btn-danger btn-sm" (click)="remove(app.id)">eliminar</button>
          </div>

          <ng-container *ngIf="app.job; else deletedJob">
            <h3 class="mono mt">{{ app.job.title }}</h3>
            <p class="dim">{{ app.job.company }} <span *ngIf="app.job.location">· {{ app.job.location }}</span></p>
            <p class="desc">{{ app.job.description }}</p>
            <p class="mono reason" *ngIf="app.job.matchReason">// {{ app.job.matchReason }}</p>
            <p class="mono date">
              {{ jobDateLabel(app.job) }} {{ jobDateValue(app.job) | date: 'dd MMM yyyy' }}
              (desde {{ daysSince(jobDateValue(app.job)) }} días) · postulado {{ app.appliedAt | date: 'dd MMM yyyy' }}
            </p>
            <div class="flex mt wrap">
              <button class="btn btn-primary" (click)="copyApplyLink(app.job)" [disabled]="copying === app.job.id || !(app.job.applyUrl || app.job.url)">
                {{ copied[app.job.id] ? 'link copiado ✓' : (copying === app.job.id ? 'copiando...' : 'copiar link') }}
              </button>
              <a *ngIf="app.job.applyUrl || app.job.url" [href]="app.job.applyUrl || app.job.url" target="_blank" class="btn btn-secondary">abrir oferta ↗</a>
            </div>
          </ng-container>
          <ng-template #deletedJob>
            <h3 class="mono mt">empleo eliminado</h3>
            <p class="dim">postulado {{ app.appliedAt | date: 'dd MMM yyyy' }}</p>
          </ng-template>

          <div class="flex mt">
            <select class="input" style="width:auto" [ngModel]="app.status" (ngModelChange)="update(app.id, { status: $event })">
              <option value="applied">postulado</option>
              <option value="interview">entrevista</option>
              <option value="rejected">rechazado</option>
              <option value="accepted">aceptado</option>
            </select>
            <input class="input" style="width:auto" type="datetime-local" [ngModel]="toLocal(app.interviewAt)" (ngModelChange)="update(app.id, { interviewAt: $event })" title="Fecha de entrevista" />
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .app-card { display: flex; flex-direction: column; gap: 8px; }
    .app-card h3 { font-size: 15px; }
    .gap { gap: 8px; }
  `],
})
export class ApplicationsComponent implements OnInit {
  applications: Application[] = [];
  copying: number | null = null;
  copied: Record<number, boolean> = {};

  constructor(
    private readonly api: ApiService,
    private readonly auth: AuthService,
  ) {}

  ngOnInit() {
    this.load();
  }

  load() {
    this.api.get<Application[]>('/applications', this.auth.token).subscribe((data) => (this.applications = data));
  }

  update(id: number, dto: Record<string, unknown>) {
    this.api.patch(`/applications/${id}`, dto, this.auth.token).subscribe(() => this.load());
  }

  remove(id: number) {
    this.api.delete(`/applications/${id}`, this.auth.token).subscribe(() => this.load());
  }

  statusLabel(status: string) {
    return STATUS_LABELS[status] ?? status;
  }

  statusClass(status: string) {
    return (
      { applied: 'badge-cyan', interview: 'badge-yellow', rejected: 'badge-red', accepted: 'badge-neon' }[status] ?? ''
    );
  }

  toLocal(iso?: string | null) {
    return iso ? iso.slice(0, 16) : '';
  }

  sourceLabel(job: Job): string {
    const source = this.jobSource(job).toLowerCase();
    return source === 'other' ? 'Otra web' : source;
  }

  jobSource(job: Job): string {
    const url = (job.applyUrl || job.url || '').toLowerCase();
    if (!url) return 'Sin link';
    if (url.includes('computrabajo')) return 'Computrabajo';
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
}

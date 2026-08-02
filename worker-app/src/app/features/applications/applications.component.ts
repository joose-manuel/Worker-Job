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
  templateUrl: './applications.component.html',
  styleUrl: './applications.component.css',
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

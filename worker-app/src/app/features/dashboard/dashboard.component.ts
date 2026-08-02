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
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
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

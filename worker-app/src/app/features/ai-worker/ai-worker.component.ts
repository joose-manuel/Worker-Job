import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { WorkerConfig } from '../../core/models/models';

@Component({
  selector: 'app-ai-worker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ai-worker.component.html',
  styleUrl: './ai-worker.component.css',
})
export class AiWorkerComponent implements OnInit {
  config: WorkerConfig = {
    keywords: [],
    portals: [],
    intervalMinutes: 60,
    model: 'llama-3.3-70b-versatile',
    enabled: false,
    autoApply: false,
    notifyWhatsapp: false,
    minMatchPercent: 40,
  };
  keywordsText = '';
  selectedPortals: string[] = [];
  portalOptions = ['Computrabajo', 'El Empleo', 'Trabajo.org', 'Indeed', 'LinkedIn'];
  newPortal = '';
  portalDropdownOpen = false;
  saving = false;

  constructor(
    private readonly api: ApiService,
    private readonly auth: AuthService,
  ) {}

  ngOnInit() {
    this.api.get<WorkerConfig>('/worker-config/me', this.auth.token).subscribe((data) => {
      if (data) {
        this.config = { ...this.config, ...data };
        this.keywordsText = (data.keywords ?? []).join(', ');
        this.selectedPortals = [...(data.portals ?? [])].map((p) => this.aliasPortal(p));
      }
    });
  }

  copyTopic() {
    if (this.config.ntfyTopic) {
      navigator.clipboard?.writeText(this.config.ntfyTopic);
    }
  }

  private aliasPortal(value: string): string {
    const aliases: Record<string, string> = {
      computrabajo: 'Computrabajo',
      elempleo: 'El Empleo',
      'el empleo': 'El Empleo',
      'trabajo.org': 'Trabajo.org',
      indeed: 'Indeed',
      linkedin: 'LinkedIn',
    };
    return aliases[value.toLowerCase().trim()] ?? value;
  }

  syncKeywords() {
    this.config.keywords = this.keywordsText.split(',').map((s) => s.trim()).filter(Boolean);
  }

  isChecked(event: Event): boolean {
    return (event.target as HTMLInputElement).checked;
  }

  togglePortalSelection(portal: string, checked: boolean) {
    if (checked) {
      this.selectedPortals = Array.from(new Set([...this.selectedPortals, portal]));
    } else {
      this.selectedPortals = this.selectedPortals.filter((item) => item !== portal);
    }
  }

  addPortal() {
    const portal = this.newPortal.trim();
    if (!portal) {
      return;
    }
    if (!this.portalOptions.includes(portal)) {
      this.portalOptions = [...this.portalOptions, portal];
    }
    if (!this.selectedPortals.includes(portal)) {
      this.selectedPortals = [...this.selectedPortals, portal];
    }
    this.newPortal = '';
  }

  save() {
    this.saving = true;
    this.config.portals = [...this.selectedPortals];
    this.api.put<WorkerConfig>('/worker-config/me', this.config, this.auth.token).subscribe(() => {
      this.saving = false;
    });
  }
}

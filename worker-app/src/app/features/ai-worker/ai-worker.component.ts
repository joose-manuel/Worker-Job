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
  template: `
    <div class="page">
      <div class="flex-between mb">
        <h1 class="mono">▸ worker ia / configuración</h1>
        <span class="badge" [ngClass]="config.enabled ? 'badge-neon' : 'badge-red'">
          {{ config.enabled ? 'ACTIVO' : 'INACTIVO' }}
        </span>
      </div>

      <div class="grid" style="grid-template-columns: 1fr 1fr">
        <div class="card">
          <h3 class="mono mb"># qué buscar</h3>
          <div class="grid">
            <div>
              <label class="label">Keywords (separadas por coma)</label>
              <input class="input" [ngModel]="keywordsText" (ngModelChange)="keywordsText = $event; syncKeywords()" placeholder="nestjs, backend, typescript" />
            </div>
            <div>
              <label class="label">Portales</label>
              <div class="portal-selector">
                <button class="btn btn-secondary btn-sm" type="button" (click)="portalDropdownOpen = !portalDropdownOpen">
                  Seleccionar portales
                </button>
                <div class="portal-menu" *ngIf="portalDropdownOpen">
                  <label class="portal-item" *ngFor="let portal of portalOptions">
                    <input type="checkbox" [checked]="selectedPortals.includes(portal)" (change)="togglePortalSelection(portal, isChecked($event))" />
                    {{ portal }}
                  </label>
                  <div class="portal-add">
                    <input class="input" [(ngModel)]="newPortal" placeholder="Agregar otro portal" />
                    <button class="btn btn-primary btn-sm" type="button" (click)="addPortal()">+</button>
                  </div>
                </div>
                <div class="portal-chips">
                  <span class="chip" *ngFor="let portal of selectedPortals">
                    {{ portal }}
                    <button type="button" class="chip-remove" (click)="togglePortalSelection(portal, false)">×</button>
                  </span>
                </div>
                <p class="dim portal-warn">Computrabajo y El Empleo funcionan. Indeed y LinkedIn suelen bloquear el acceso automático (login/antibot): se intentarán y el estado se verá en el panel debug de empleos.</p>
              </div>
            </div>
            <div>
              <label class="label">Salario mínimo (USD/mes)</label>
              <input class="input" type="number" [(ngModel)]="config.minSalary" />
            </div>
            <div>
              <label class="label">Guardar solo con match ≥ (%)</label>
              <input class="input" type="number" [(ngModel)]="config.minMatchPercent" min="0" max="100" />
            </div>
            <div>
              <label class="label">Modalidad</label>
              <select class="input" [(ngModel)]="config.modality">
                <option value="remote">Remoto</option>
                <option value="hybrid">Híbrido</option>
                <option value="onsite">Presencial</option>
                <option value="any">Cualquiera</option>
              </select>
            </div>
          </div>
        </div>

        <div class="card">
          <h3 class="mono mb"># comportamiento del worker</h3>
          <div class="grid">
            <div>
              <label class="label">Modelo IA (Groq)</label>
              <select class="input" [(ngModel)]="config.model">
                <option value="llama-3.3-70b-versatile">llama-3.3-70b-versatile</option>
                <option value="llama-3.1-8b-instant">llama-3.1-8b-instant (más rápido)</option>
              </select>
            </div>
            <div>
              <label class="label">Buscar cada (minutos)</label>
              <input class="input" type="number" [(ngModel)]="config.intervalMinutes" min="5" max="1440" />
            </div>
            <label class="toggle flex">
              <input type="checkbox" [(ngModel)]="config.enabled" />
              <span class="mono">worker activo (búsqueda automática)</span>
            </label>
            <label class="toggle flex">
              <input type="checkbox" [(ngModel)]="config.autoApply" />
              <span class="mono">auto-postular (marcar como aplicado)</span>
            </label>
            <div class="grid">
              <div>
                <label class="label">WhatsApp (con país, ej: +34644519523)</label>
                <input class="input" [(ngModel)]="config.whatsappPhone" placeholder="+34644519523" />
              </div>
              <div>
                <label class="label">CallMeBot API Key</label>
                <input class="input" [(ngModel)]="config.whatsappApiKey" placeholder="1234567" />
              </div>
              <label class="toggle flex">
                <input type="checkbox" [(ngModel)]="config.notifyWhatsapp" />
                <span class="mono">avisarme por WhatsApp al encontrar empleos</span>
              </label>
            </div>
            <div class="terminal" *ngIf="config.lastRunAt">
              <span class="prompt">$</span> última ejecución: {{ config.lastRunAt | date: 'medium' }}
            </div>
          </div>
        </div>
      </div>

      <button class="btn btn-primary mt" (click)="save()" [disabled]="saving">
        {{ saving ? 'guardando...' : '→ guardar configuración' }}
      </button>
    </div>
  `,
  styles: [`
    .toggle { cursor: pointer; gap: 10px; }
    .toggle input { accent-color: var(--neon); width: 16px; height: 16px; }
    .portal-warn { font-size: 12px; margin-top: 6px; max-width: 320px; line-height: 1.5; }
  `],
})
export class AiWorkerComponent implements OnInit {
  config: WorkerConfig & { whatsappPhone?: string | null; whatsappApiKey?: string | null } = {
    keywords: [],
    portals: [],
    intervalMinutes: 60,
    model: 'llama-3.3-70b-versatile',
    enabled: false,
    autoApply: false,
    notifyWhatsapp: false,
    minMatchPercent: 40,
    whatsappPhone: null,
    whatsappApiKey: null,
  };
  keywordsText = '';
  selectedPortals: string[] = [];
  portalOptions = ['Computrabajo', 'El Empleo', 'Indeed', 'LinkedIn'];
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
        this.config = data;
        this.keywordsText = (data.keywords ?? []).join(', ');
        this.selectedPortals = [...(data.portals ?? [])];
      }
    });
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

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { Profile } from '../../core/models/models';

interface ExtractedCv {
  summary?: string;
  skills?: string[];
  experience?: string;
  education?: string;
  location?: string;
  phone?: string;
  desiredRole?: string;
}

interface UploadCvResult {
  profile: Profile;
  extracted: ExtractedCv;
}

const REQUIRED: Array<keyof Profile> = ['summary', 'skills', 'desiredRole', 'location', 'desiredSalary', 'modality'];

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">
      <div class="flex-between mb">
        <h1 class="mono">▸ mi perfil / hoja de vida</h1>
        <span *ngIf="saved" class="badge badge-neon">guardado ✓</span>
      </div>

      <div class="card mb" style="border-color: var(--cyan)">
        <h3 class="mono mb"># hoja de vida (PDF) <span class="badge badge-cyan">la ia llena los campos sola</span></h3>
        <div class="terminal mb" *ngIf="profile.cvOriginalName">
          <span class="prompt">$</span> cv cargado: {{ profile.cvOriginalName }}
        </div>
        <div class="flex">
          <input type="file" accept="application/pdf" (change)="onFileSelected($event)" #fileInput style="display:none" />
          <button class="btn" (click)="fileInput.click()">📎 seleccionar pdf</button>
          <button class="btn btn-primary" (click)="uploadCv()" [disabled]="!selectedFile || uploading">
            {{ uploading ? 'la ia está leyendo tu cv...' : '↑ subir y analizar' }}
          </button>
        </div>
        <p class="dim mono small mt" *ngIf="uploadError" style="color: var(--red)">{{ uploadError }}</p>
      </div>

      <p class="dim mono small mb">* = requerido para que la ia busque bien · resto = opcional</p>

      <div class="grid" style="grid-template-columns: 1fr 1fr">
        <div class="card">
          <h3 class="mono mb"># datos personales</h3>
          <div class="grid">
            <div>
              <label class="label">Resumen profesional *</label>
              <textarea class="input" rows="3" [(ngModel)]="profile.summary" placeholder="Backend dev con 2 años en Node.js..."></textarea>
            </div>
            <div>
              <label class="label">Skills * (separadas por coma)</label>
              <input class="input" [ngModel]="skillsText" (ngModelChange)="skillsText = $event; syncSkills()" placeholder="Node.js, NestJS, PostgreSQL" />
            </div>
            <div>
              <label class="label">Ubicación *</label>
              <input class="input" [(ngModel)]="profile.location" placeholder="Bogotá, Colombia" />
            </div>
            <div>
              <label class="label">Teléfono</label>
              <input class="input" [(ngModel)]="profile.phone" />
            </div>
            <div>
              <label class="label">Experiencia</label>
              <textarea class="input" rows="3" [(ngModel)]="profile.experience"></textarea>
            </div>
            <div>
              <label class="label">Educación</label>
              <textarea class="input" rows="2" [(ngModel)]="profile.education"></textarea>
            </div>
          </div>
        </div>

        <div class="card">
          <h3 class="mono mb"># búsqueda deseada</h3>
          <div class="grid">
            <div>
              <label class="label">Rol deseado *</label>
              <input class="input" [(ngModel)]="profile.desiredRole" placeholder="Backend Developer" />
            </div>
            <div>
              <label class="label">Salario deseado * (USD/mes)</label>
              <input class="input" type="number" [(ngModel)]="profile.desiredSalary" />
            </div>
            <div>
              <label class="label">Modalidad *</label>
              <select class="input" [(ngModel)]="profile.modality">
                <option value="">— elegir —</option>
                <option value="remote">Remoto</option>
                <option value="hybrid">Híbrido</option>
                <option value="onsite">Presencial</option>
                <option value="any">Cualquiera</option>
              </select>
            </div>
          </div>

          <div class="terminal mt" *ngIf="missingRequired().length">
            <span class="prompt">$</span> faltan campos requeridos:<br>
            <span *ngFor="let f of missingRequired()">  - {{ f }}<br></span>
          </div>
        </div>
      </div>

      <button class="btn btn-primary mt" (click)="save()" [disabled]="saving">
        {{ saving ? 'guardando...' : '→ guardar perfil' }}
      </button>
    </div>
  `,
  styles: [`.small { font-size: 11px; }`],
})
export class ProfileComponent implements OnInit {
  profile: Profile = {};
  skillsText = '';
  selectedFile: File | null = null;
  saving = false;
  uploading = false;
  saved = false;
  uploadError = '';

  constructor(
    private readonly api: ApiService,
    private readonly auth: AuthService,
  ) {}

  ngOnInit() {
    this.api.get<Profile>('/profiles/me', this.auth.token).subscribe((data) => {
      if (data) {
        this.profile = data;
        this.skillsText = (data.skills ?? []).join(', ');
      }
    });
  }

  syncSkills() {
    this.profile.skills = this.skillsText.split(',').map((s) => s.trim()).filter(Boolean);
  }

  onFileSelected(event: Event) {
    this.selectedFile = (event.target as HTMLInputElement).files?.[0] ?? null;
    this.uploadError = '';
  }

  missingRequired(): string[] {
    return REQUIRED.filter((field) => {
      const value = this.profile[field];
      if (Array.isArray(value)) return value.length === 0;
      return value === null || value === undefined || value === '';
    });
  }

  save() {
    this.saving = true;
    this.api.put<Profile>('/profiles/me', this.profile, this.auth.token).subscribe(() => {
      this.saving = false;
      this.saved = true;
      setTimeout(() => (this.saved = false), 2000);
    });
  }

  uploadCv() {
    if (!this.selectedFile) return;
    this.uploading = true;
    this.uploadError = '';
    const formData = new FormData();
    formData.append('cv', this.selectedFile);
    this.api.post<UploadCvResult>('/profiles/me/cv', formData, this.auth.token).subscribe({
      next: (result) => {
        this.profile = { ...this.profile, ...result.profile };
        this.applyExtracted(result.extracted);
        this.selectedFile = null;
        this.uploading = false;
      },
      error: (err) => {
        this.uploading = false;
        this.uploadError = err?.error?.message ?? 'Error al subir el PDF';
      },
    });
  }

  private applyExtracted(extracted: ExtractedCv) {
    if (!extracted) return;
    const profile = this.profile;
    if (extracted.summary && !profile.summary) profile.summary = extracted.summary;
    if (extracted.skills?.length && (!profile.skills || profile.skills.length === 0)) {
      profile.skills = extracted.skills;
      this.skillsText = extracted.skills.join(', ');
    }
    if (extracted.experience && !profile.experience) profile.experience = extracted.experience;
    if (extracted.education && !profile.education) profile.education = extracted.education;
    if (extracted.location && !profile.location) profile.location = extracted.location;
    if (extracted.phone && !profile.phone) profile.phone = extracted.phone;
    if (extracted.desiredRole && !profile.desiredRole) profile.desiredRole = extracted.desiredRole;
  }
}

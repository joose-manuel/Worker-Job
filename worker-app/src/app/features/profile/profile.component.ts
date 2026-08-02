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
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css',
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

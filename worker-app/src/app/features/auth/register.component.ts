import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="auth-page">
      <div class="auth-card card">
        <div class="terminal mb">
          <span class="prompt">$</span> crear cuenta --nuevo-usuario
        </div>
        <h1 class="mono glow">worker-job<span class="dim">&#64;</span>ai</h1>
        <p class="dim mb">Crea tu cuenta para empezar</p>

        <form (ngSubmit)="submit()" class="grid">
          <div>
            <label class="label">Nombre</label>
            <input class="input" type="text" [(ngModel)]="name" name="name" required />
          </div>
          <div>
            <label class="label">Email</label>
            <input class="input" type="email" [(ngModel)]="email" name="email" required />
          </div>
          <div>
            <label class="label">Contraseña</label>
            <input class="input" type="password" [(ngModel)]="password" name="password" required minlength="6" />
          </div>
          <div *ngIf="error" class="mono error">{{ error }}</div>
          <button class="btn btn-primary" [disabled]="loading">
            {{ loading ? 'creando...' : '→ crear cuenta' }}
          </button>
        </form>

        <p class="dim mt mono small">¿Ya tienes cuenta? <a routerLink="/login">entra</a></p>
      </div>
    </div>
  `,
  styles: [`
    .auth-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; }
    .auth-card { width: 100%; max-width: 420px; padding: 36px; }
    h1 { font-size: 26px; margin-bottom: 8px; }
    .error { color: var(--red); font-size: 12px; }
    .small { font-size: 12px; }
  `],
})
export class RegisterComponent {
  name = '';
  email = '';
  password = '';
  loading = false;
  error = '';

  constructor(private readonly auth: AuthService, private readonly router: Router) {}

  submit() {
    this.loading = true;
    this.error = '';
    this.auth.register(this.name, this.email, this.password).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (err) => {
        this.error = err?.error?.message ?? 'Error al registrarse';
        this.loading = false;
      },
    });
  }
}

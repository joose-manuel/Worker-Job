import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="shell">
      <aside class="sidebar" [class.collapsed]="collapsed">
        <div class="sidebar-top">
          <div class="brand mono glow" *ngIf="!collapsed">worker-job<span class="dim">&#64;</span>ai</div>
          <button class="collapse-btn" (click)="collapsed = !collapsed" [title]="collapsed ? 'expandir menú' : 'contraer menú'">
            {{ collapsed ? '»' : '«' }}
          </button>
        </div>
        <nav>
          <a routerLink="/dashboard" routerLinkActive="active" [title]="collapsed ? 'dashboard' : null"><span class="icon">🏠</span><span class="label">▸ dashboard</span></a>
          <a routerLink="/jobs" routerLinkActive="active" [title]="collapsed ? 'empleos' : null"><span class="icon">💼</span><span class="label">▸ empleos</span></a>
          <a routerLink="/applications" routerLinkActive="active" [title]="collapsed ? 'postulaciones' : null"><span class="icon">♥</span><span class="label">▸ postulaciones</span></a>
          <a routerLink="/profile" routerLinkActive="active" [title]="collapsed ? 'mi perfil' : null"><span class="icon">👤</span><span class="label">▸ mi perfil</span></a>
          <a routerLink="/ai-worker" routerLinkActive="active" [title]="collapsed ? 'worker ia' : null"><span class="icon">⚙</span><span class="label">▸ worker ia</span></a>
        </nav>
        <div class="user-zone" *ngIf="auth.currentUser$ | async as user">
          <div class="mono dim email" [title]="user.email">// {{ user.email }}</div>
          <button class="btn btn-danger" (click)="logout()" [title]="collapsed ? 'salir' : null">{{ collapsed ? '⏻' : 'salir' }}</button>
        </div>
      </aside>
      <main class="main-content">
        <router-outlet />
      </main>
    </div>
  `,
  styles: [`
    .shell { display: flex; min-height: 100vh; }
    .sidebar {
      width: 240px;
      background: var(--bg-card);
      border-right: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      padding: 24px 16px;
      position: sticky;
      top: 0;
      height: 100vh;
      transition: width 0.2s ease;
    }
    .sidebar.collapsed { width: 64px; padding: 24px 8px; }
    .sidebar-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 32px; gap: 8px; }
    .sidebar.collapsed .sidebar-top { justify-content: center; }
    .brand { font-size: 18px; font-weight: 700; color: var(--neon); white-space: nowrap; }
    .collapse-btn {
      background: var(--bg-hover);
      border: 1px solid var(--border);
      color: var(--text-dim);
      border-radius: 6px;
      font-size: 12px;
      line-height: 1;
      padding: 6px 8px;
      cursor: pointer;
      transition: all 0.15s;
      flex-shrink: 0;
    }
    .collapse-btn:hover { color: var(--neon); border-color: var(--neon); }
    nav { display: flex; flex-direction: column; gap: 4px; flex: 1; }
    nav a {
      display: flex;
      align-items: center;
      gap: 8px;
      font-family: var(--mono);
      font-size: 13px;
      color: var(--text-dim);
      padding: 10px 12px;
      border-radius: 8px;
      transition: all 0.15s;
      text-decoration: none !important;
      white-space: nowrap;
    }
    .sidebar.collapsed nav a { justify-content: center; padding: 12px 0; }
    .icon { display: none; font-size: 16px; line-height: 1; }
    .sidebar.collapsed .icon { display: inline-flex; }
    .sidebar.collapsed .label { display: none; }
    .sidebar.collapsed .icon:hover { transform: scale(1.15); }
    nav a:hover { color: var(--neon); background: var(--neon-dim); }
    nav a.active { color: var(--neon); background: var(--neon-dim); border-left: 2px solid var(--neon); }
    .sidebar.collapsed nav a.active { border-left: none; }
    .user-zone { border-top: 1px solid var(--border); padding-top: 16px; display: flex; flex-direction: column; gap: 10px; }
    .sidebar.collapsed .user-zone { align-items: center; }
    .email {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 11px;
      max-width: 100%;
    }
    .sidebar.collapsed .email { display: none; }
    .main-content { flex: 1; overflow-y: auto; min-width: 0; }
  `],
})
export class ShellComponent {
  collapsed = false;
  constructor(readonly auth: AuthService) {}
  logout() {
    this.auth.logout();
    window.location.href = '/login';
  }
}

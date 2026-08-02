import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/services/auth.guard';
import { ShellComponent } from './layout/shell.component';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/register.component').then((m) => m.RegisterComponent),
  },
  {
    path: 'privacy',
    loadComponent: () => import('./features/privacy/privacy.component').then((m) => m.PrivacyComponent),
  },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', loadComponent: () => import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent) },
      { path: 'jobs', loadComponent: () => import('./features/jobs/jobs.component').then((m) => m.JobsComponent) },
      { path: 'applications', loadComponent: () => import('./features/applications/applications.component').then((m) => m.ApplicationsComponent) },
      { path: 'profile', loadComponent: () => import('./features/profile/profile.component').then((m) => m.ProfileComponent) },
      { path: 'ai-worker', loadComponent: () => import('./features/ai-worker/ai-worker.component').then((m) => m.AiWorkerComponent) },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];

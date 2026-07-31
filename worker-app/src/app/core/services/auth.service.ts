import { isPlatformBrowser } from '@angular/common';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { ApiService } from './api.service';
import { ApiUser, AuthResult } from '../models/models';

const TOKEN_KEY = 'worker_job_token';
const USER_KEY = 'worker_job_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly isBrowser: boolean;
  readonly currentUser$ = new BehaviorSubject<ApiUser | null>(null);

  constructor(
    private readonly api: ApiService,
    @Inject(PLATFORM_ID) platformId: object,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    if (this.isBrowser) {
      const saved = localStorage.getItem(USER_KEY);
      if (saved) this.currentUser$.next(JSON.parse(saved));
    }
  }

  get token(): string | null {
    return this.isBrowser ? localStorage.getItem(TOKEN_KEY) : null;
  }

  get isLoggedIn(): boolean {
    return !!this.token;
  }

  register(name: string, email: string, password: string): Observable<AuthResult> {
    return this.api
      .post<AuthResult>('/auth/register', { name, email, password })
      .pipe(tap((result) => this.saveSession(result)));
  }

  login(email: string, password: string): Observable<AuthResult> {
    return this.api
      .post<AuthResult>('/auth/login', { email, password })
      .pipe(tap((result) => this.saveSession(result)));
  }

  logout(): void {
    if (this.isBrowser) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
    this.currentUser$.next(null);
  }

  private saveSession(result: AuthResult): void {
    if (this.isBrowser) {
      localStorage.setItem(TOKEN_KEY, result.token);
      localStorage.setItem(USER_KEY, JSON.stringify(result.user));
    }
    this.currentUser$.next(result.user);
  }
}

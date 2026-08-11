import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../environments/environment';

/**
 * Hace ping periódico al backend para evitar que Render entre en modo sleep
 * mientras el usuario tiene la app abierta.
 * Solo corre en el navegador (nunca en SSR, un setInterval impediría el render).
 * No reemplaza un ping externo 24/7, pero ayuda durante las sesiones activas.
 */
@Injectable({ providedIn: 'root' })
export class KeepAliveService {
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly intervalMs = 5 * 60 * 1000; // 5 minutos
  private readonly url = `${environment.apiUrl}/health`;
  private readonly isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  start(): void {
    if (!this.isBrowser) return;
    if (this.timer) return;
    this.ping();
    this.timer = setInterval(() => this.ping(), this.intervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private ping(): void {
    fetch(this.url, { method: 'GET', keepalive: true })
      .then(() => {
        // Silencioso: solo mantiene el backend despierto
      })
      .catch(() => {
        // Ignorar errores de red; no queremos spam en consola
      });
  }
}

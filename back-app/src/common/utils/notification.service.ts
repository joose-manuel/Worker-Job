import { Injectable, Logger } from '@nestjs/common';
import { Job } from '../../modules/jobs/entities/job.entity';

/**
 * Notificaciones push vía ntfy (https://ntfy.sh) — gratis, sin API key.
 * Cada usuario tiene un topic fijo: worker-ia-{userId}.
 * El usuario instala la app ntfy y se suscribe a su topic.
 */
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly baseUrl = (process.env.NTFY_BASE_URL ?? 'https://ntfy.sh').trim();

  getTopic(userId: number): string {
    return `worker-ia-${userId}`;
  }

  async sendWelcome(userId: number): Promise<boolean> {
    return this.send(
      userId,
      '¡Listo! A partir de ahora te avisaré cuando encuentre empleos con alto match para ti.',
    );
  }

  async sendJobsNotification(userId: number, jobs: Job[]): Promise<boolean> {
    const HIGH_MATCH_THRESHOLD = 75;
    const highMatchJobs = jobs
      .filter((job) => (job.matchPercent ?? 0) >= HIGH_MATCH_THRESHOLD)
      .sort((a, b) => (b.matchPercent ?? 0) - (a.matchPercent ?? 0));
    if (highMatchJobs.length === 0) {
      this.logger.log('No hay empleos con match alto para notificar');
      return false;
    }
    const top = highMatchJobs.slice(0, 3);
    const lines = [
      `Encontré ${highMatchJobs.length} empleos con alto match para ti:`,
      '',
      ...top.map(
        (job, i) =>
          `${i + 1}. ${job.title} — ${job.company ?? 'empresa'} (${job.matchPercent ?? '?'}% match)\n${job.url ?? ''}`,
      ),
    ];
    return this.send(userId, lines.join('\n'));
  }

  async send(userId: number, text: string): Promise<boolean> {
    const topic = this.getTopic(userId);
    try {
      const response = await fetch(`${this.baseUrl}/${topic}`, {
        method: 'POST',
        headers: {
          Title: 'Worker IA',
          Priority: 'high',
          Tags: 'robot',
        },
        body: text,
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) {
        this.logger.warn(`ntfy respondió ${response.status}`);
        return false;
      }
      this.logger.log(`Notificación enviada al topic ${topic}`);
      return true;
    } catch (error) {
      this.logger.error(`Error enviando notificación ntfy: ${error}`);
      return false;
    }
  }
}

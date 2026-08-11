import { Injectable, Logger } from '@nestjs/common';
import { Job } from '../../modules/jobs/entities/job.entity';

/**
 * WhatsApp vía CallMeBot (API gratuita para uso personal).
 * La API key se configura en la variable de entorno CALLMEBOT_API_KEY.
 * El teléfono siempre se normaliza con prefijo +57.
 */
@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly apiKey = process.env.CALLMEBOT_API_KEY?.trim();

  normalizePhone(phone: string | null | undefined): string | null {
    if (!phone) return null;
    const digits = phone.replace(/\D/g, '');
    if (!digits || digits.length < 10) return null;
    return `+57${digits.slice(-10)}`;
  }

  async sendWelcome(phone: string): Promise<boolean> {
    const normalized = this.normalizePhone(phone);
    if (!normalized) {
      this.logger.warn('Teléfono de WhatsApp no válido');
      return false;
    }
    return this.send(
      normalized,
      '🤖 *Worker IA*: ¡Listo! A partir de ahora te avisaré cuando encuentre empleos con alto match para ti.',
    );
  }

  async sendJobsNotification(phone: string, jobs: Job[]): Promise<boolean> {
    const normalized = this.normalizePhone(phone);
    if (!normalized) {
      this.logger.warn('Teléfono de WhatsApp no válido');
      return false;
    }
    const HIGH_MATCH_THRESHOLD = 75;
    const highMatchJobs = jobs
      .filter((job) => (job.matchPercent ?? 0) >= HIGH_MATCH_THRESHOLD)
      .sort((a, b) => (b.matchPercent ?? 0) - (a.matchPercent ?? 0));
    if (highMatchJobs.length === 0) {
      this.logger.log('No hay empleos con match alto para notificar por WhatsApp');
      return false;
    }
    const top = highMatchJobs.slice(0, 3);
    const lines = [
      `🤖 *Worker IA*: encontré ${highMatchJobs.length} empleos con alto match para ti:`,
      '',
      ...top.map(
        (job, i) =>
          `${i + 1}. *${job.title}* — ${job.company ?? 'empresa'} (${job.matchPercent ?? '?'}% match)\n${job.url ?? ''}`,
      ),
    ];
    return this.send(normalized, lines.join('\n'));
  }

  async send(phone: string, text: string): Promise<boolean> {
    if (!this.apiKey) {
      this.logger.error('CALLMEBOT_API_KEY no está configurada');
      return false;
    }
    try {
      const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(text)}&apikey=${encodeURIComponent(this.apiKey)}`;
      const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (!response.ok) {
        this.logger.warn(`CallMeBot respondió ${response.status}`);
        return false;
      }
      this.logger.log(`WhatsApp enviado a ${phone}`);
      return true;
    } catch (error) {
      this.logger.error(`Error enviando WhatsApp: ${error}`);
      return false;
    }
  }
}

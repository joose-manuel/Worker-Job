import { Injectable, Logger } from '@nestjs/common';
import { Job } from '../../modules/jobs/entities/job.entity';

/**
 * WhatsApp vía CallMeBot (API gratuita para uso personal).
 * Setup: envía "I allow callmebot to send me messages" por WhatsApp a +34 644 51 95 23
 * y te dan un apikey personal.
 */
@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  async sendJobsNotification(
    phone: string,
    apiKey: string,
    jobs: Job[],
  ): Promise<boolean> {
    const top = jobs.slice(0, 3);
    const lines = [
      `🤖 *Worker IA*: encontré ${jobs.length} empleos nuevos para ti:`,
      '',
      ...top.map(
        (job, i) =>
          `${i + 1}. *${job.title}* — ${job.company ?? 'empresa'} (${job.matchPercent ?? '?'}% match)\n${job.url ?? ''}`,
      ),
    ];
    return this.send(phone, apiKey, lines.join('\n'));
  }

  async send(phone: string, apiKey: string, text: string): Promise<boolean> {
    try {
      const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(text)}&apikey=${encodeURIComponent(apiKey)}`;
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

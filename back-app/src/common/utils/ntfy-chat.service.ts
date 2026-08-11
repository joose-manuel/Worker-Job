import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkerConfig } from '../../modules/worker-configs/entities/worker-config.entity';
import { JobsService } from '../../modules/jobs/jobs.service';
import { ApplicationsService } from '../../modules/applications/applications.service';
import { ProfilesService } from '../../modules/profiles/profiles.service';
import { AiService } from '../../modules/ai/ai.service';
import { NotificationService } from './notification.service';

/**
 * Bot de chat vía ntfy: escucha los mensajes que el usuario escribe en su topic
 * (WebSocket de ntfy.sh) y responde con Groq usando sus empleos guardados,
 * postulaciones y perfil como contexto.
 */
@Injectable()
export class NtfyChatService implements OnModuleInit {
  private readonly logger = new Logger(NtfyChatService.name);
  private readonly wsBase = 'wss://ntfy.sh';
  private readonly connected = new Set<string>();

  constructor(
    @InjectRepository(WorkerConfig)
    private readonly configsRepository: Repository<WorkerConfig>,
    private readonly notifications: NotificationService,
    private readonly jobsService: JobsService,
    private readonly applicationsService: ApplicationsService,
    private readonly profilesService: ProfilesService,
    private readonly aiService: AiService,
  ) {}

  async onModuleInit(): Promise<void> {
    const configs = await this.configsRepository.find({
      where: { enabled: true, notifyWhatsapp: true },
    });
    for (const config of configs) {
      this.listen(config.userId, this.notifications.getTopic(config.userId));
    }
    if (configs.length) {
      this.logger.log(`Bot ntfy activo para ${configs.length} usuario(s)`);
    }
  }

  private listen(userId: number, topic: string): void {
    if (this.connected.has(topic)) return;
    this.connected.add(topic);

    const connect = () => {
      let ws: WebSocket;
      try {
        ws = new WebSocket(`${this.wsBase}/${topic}/ws`);
      } catch (error) {
        this.logger.warn(`No se pudo abrir WS para ${topic}: ${error}`);
        this.connected.delete(topic);
        return;
      }

      ws.onopen = () => this.logger.log(`Escuchando mensajes en ${topic}`);
      ws.onerror = () => this.logger.warn(`Error de conexión WS en ${topic}`);
      ws.onclose = () => {
        this.logger.warn(`WS cerrado en ${topic}, reconectando en 10s...`);
        setTimeout(connect, 10_000);
      };
      ws.onmessage = (event: MessageEvent) => {
        let data: Record<string, unknown>;
        try {
          data = JSON.parse(event.data as string);
        } catch {
          return;
        }
        if (data.event !== 'message' || data.title === 'Worker IA' || !data.message) return;
        const text = String(data.message).trim();
        if (!text) return;
        this.handleIncoming(userId, topic, text).catch((error) => {
          this.logger.error(`Error procesando mensaje de ${topic}: ${error}`);
        });
      };
    };

    connect();
  }

  private async handleIncoming(userId: number, topic: string, text: string): Promise<void> {
    this.logger.log(`Mensaje recibido de ${topic}: ${text.slice(0, 60)}`);

    const profile = await this.profilesService.get(userId);
    const jobs = await this.jobsService.findByUser(userId);
    const applications = await this.applicationsService.findByUser(userId);

    const system = [
      'Eres el asistente de Worker IA, un agente de búsqueda de empleo.',
      'Respondes en español, breve y directo (máx 250 palabras).',
      'Cuando te pidan vacantes, lista título, empresa, % de match y el link completo.',
      'NO inventes vacantes, postulaciones ni datos que no estén en el contexto.',
      'Si no hay información suficiente, dilo con honestidad.',
    ].join('\n');

    const ctxLines: string[] = [];

    if (profile) {
      ctxLines.push(
        'PERFIL DEL CANDIDATO:',
        `- Rol: ${profile.desiredRole ?? 'no definido'}`,
        `- Skills: ${profile.skills?.join(', ') ?? 'no definidas'}`,
        `- Ubicación: ${profile.location ?? 'no definida'}`,
        `- Modalidad preferida: ${profile.modality ?? 'cualquiera'}`,
        `- Salario deseado (USD/mes): ${profile.desiredSalary ?? 'no definido'}`,
      );
    } else {
      ctxLines.push('PERFIL DEL CANDIDATO: no definido');
    }

    ctxLines.push('', `EMPLEOS GUARDADOS (${jobs.length}):`);
    if (jobs.length === 0) {
      ctxLines.push('- Ninguno todavía');
    } else {
      for (const job of jobs.slice(0, 20)) {
        ctxLines.push(
          `- ${job.title} | ${job.company ?? 'empresa'} | ${job.matchPercent ?? '?'}% match | ${job.url ?? 'sin link'}`,
        );
      }
    }

    ctxLines.push('', `POSTULACIONES (${applications.length}):`);
    if (applications.length === 0) {
      ctxLines.push('- Ninguna todavía');
    } else {
      for (const app of applications.slice(0, 20)) {
        const job = app.job;
        const interview = app.interviewAt
          ? ` | entrevista: ${new Date(app.interviewAt).toLocaleString('es-CO')}`
          : '';
        ctxLines.push(
          `- [${app.status}] ${job?.title ?? 'vacante'} | ${job?.company ?? 'empresa'} | ${job?.url ?? 'sin link'}${interview}`,
        );
      }
    }

    const response = await this.aiService.chat({
      system,
      message: `${ctxLines.join('\n')}\n\nMENSAJE DEL USUARIO: ${text}`,
    });

    await this.notifications.send(userId, response.content.trim());
  }
}

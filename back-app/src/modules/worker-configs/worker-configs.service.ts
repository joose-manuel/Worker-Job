import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkerConfig } from './entities/worker-config.entity';
import { UpdateWorkerConfigDto } from './dto/update-worker-config.dto';
import { NotificationService } from '../../common/utils/notification.service';

@Injectable()
export class WorkerConfigsService {
  private readonly logger = new Logger(WorkerConfigsService.name);

  constructor(
    @InjectRepository(WorkerConfig)
    private readonly configsRepository: Repository<WorkerConfig>,
    private readonly notifications: NotificationService,
  ) {}

  get(userId: number): Promise<WorkerConfig | null> {
    return this.configsRepository.findOneBy({ userId });
  }

  /** Vista para el frontend: config (si existe) más el topic ntfy del usuario. */
  async getView(userId: number): Promise<Partial<WorkerConfig> & { ntfyTopic: string }> {
    const config = await this.get(userId);
    const ntfyTopic = this.notifications.getTopic(userId);
    return config ? { ...config, ntfyTopic } : { ntfyTopic };
  }

  async upsert(
    userId: number,
    dto: UpdateWorkerConfigDto,
  ): Promise<WorkerConfig & { ntfyTopic: string }> {
    const existing = await this.get(userId);

    if (existing) {
      const notificationsJustEnabled = dto.notifyWhatsapp === true && !existing.notifyWhatsapp;
      Object.assign(existing, dto);
      const saved = await this.configsRepository.save(existing);
      if (notificationsJustEnabled) {
        this.notifications.sendWelcome(userId).catch((error) => {
          this.logger.warn(`No se pudo enviar notificación de bienvenida: ${error}`);
        });
      }
      return { ...saved, ntfyTopic: this.notifications.getTopic(userId) };
    }

    const config = this.configsRepository.create({ ...dto, userId });
    const saved = await this.configsRepository.save(config);
    if (saved.notifyWhatsapp) {
      this.notifications.sendWelcome(userId).catch((error) => {
        this.logger.warn(`No se pudo enviar notificación de bienvenida: ${error}`);
      });
    }
    return { ...saved, ntfyTopic: this.notifications.getTopic(userId) };
  }

  async markRun(userId: number): Promise<void> {
    await this.configsRepository.update({ userId }, { lastRunAt: new Date() });
  }
}

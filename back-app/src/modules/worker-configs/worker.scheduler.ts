import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkerConfig } from '../worker-configs/entities/worker-config.entity';
import { JobsService } from '../jobs/jobs.service';
import { NotificationService } from '../../common/utils/notification.service';

@Injectable()
export class WorkerScheduler {
  private readonly logger = new Logger(WorkerScheduler.name);

  constructor(
    @InjectRepository(WorkerConfig)
    private readonly configsRepository: Repository<WorkerConfig>,
    private readonly jobsService: JobsService,
    private readonly notifications: NotificationService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async tick(): Promise<void> {
    const configs = await this.configsRepository.find({ where: { enabled: true } });
    const now = Date.now();
    for (const config of configs) {
      const due =
        !config.lastRunAt ||
        now - new Date(config.lastRunAt).getTime() >= config.intervalMinutes * 60_000;
      if (!due) continue;
      try {
        this.logger.log(`Ejecutando scan automático para user ${config.userId}`);
        const { jobs } = await this.jobsService.scan(config.userId);
        if (config.notifyWhatsapp && jobs.length > 0) {
          await this.notifications.sendJobsNotification(config.userId, jobs);
        }
      } catch (error) {
        this.logger.error(`Scan automático falló para user ${config.userId}: ${error}`);
      }
    }
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkerConfig } from './entities/worker-config.entity';
import { UpdateWorkerConfigDto } from './dto/update-worker-config.dto';
import { WhatsappService } from '../../common/utils/whatsapp.service';

@Injectable()
export class WorkerConfigsService {
  private readonly logger = new Logger(WorkerConfigsService.name);

  constructor(
    @InjectRepository(WorkerConfig)
    private readonly configsRepository: Repository<WorkerConfig>,
    private readonly whatsappService: WhatsappService,
  ) {}

  get(userId: number): Promise<WorkerConfig | null> {
    return this.configsRepository.findOneBy({ userId });
  }

  async upsert(userId: number, dto: UpdateWorkerConfigDto): Promise<WorkerConfig> {
    const existing = await this.get(userId);

    if (existing) {
      const shouldNotifyWelcome = this.shouldSendWelcome(existing, dto);
      Object.assign(existing, dto);
      const saved = await this.configsRepository.save(existing);
      if (shouldNotifyWelcome) {
        this.whatsappService.sendWelcome(saved.whatsappPhone!).catch((error) => {
          this.logger.warn(`No se pudo enviar mensaje de bienvenida: ${error}`);
        });
      }
      return saved;
    }

    const config = this.configsRepository.create({ ...dto, userId });
    const saved = await this.configsRepository.save(config);
    if (saved.notifyWhatsapp && saved.whatsappPhone) {
      this.whatsappService.sendWelcome(saved.whatsappPhone).catch((error) => {
        this.logger.warn(`No se pudo enviar mensaje de bienvenida: ${error}`);
      });
    }
    return saved;
  }

  async markRun(userId: number): Promise<void> {
    await this.configsRepository.update({ userId }, { lastRunAt: new Date() });
  }

  private shouldSendWelcome(existing: WorkerConfig, dto: UpdateWorkerConfigDto): boolean {
    if (!dto.whatsappPhone && !('whatsappPhone' in dto)) return false;
    const newPhone = this.whatsappService.normalizePhone(dto.whatsappPhone ?? existing.whatsappPhone);
    const oldPhone = this.whatsappService.normalizePhone(existing.whatsappPhone);
    const phoneChanged = newPhone && newPhone !== oldPhone;
    const notificationsEnabled =
      dto.notifyWhatsapp === true && !existing.notifyWhatsapp && newPhone;
    return Boolean(phoneChanged || notificationsEnabled);
  }
}

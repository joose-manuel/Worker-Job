import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkerConfig } from './entities/worker-config.entity';
import { UpdateWorkerConfigDto } from './dto/update-worker-config.dto';

@Injectable()
export class WorkerConfigsService {
  constructor(
    @InjectRepository(WorkerConfig)
    private readonly configsRepository: Repository<WorkerConfig>,
  ) {}

  get(userId: number): Promise<WorkerConfig | null> {
    return this.configsRepository.findOneBy({ userId });
  }

  async upsert(userId: number, dto: UpdateWorkerConfigDto): Promise<WorkerConfig> {
    const existing = await this.get(userId);
    if (existing) {
      Object.assign(existing, dto);
      return this.configsRepository.save(existing);
    }
    const config = this.configsRepository.create({ ...dto, userId });
    return this.configsRepository.save(config);
  }

  async markRun(userId: number): Promise<void> {
    await this.configsRepository.update({ userId }, { lastRunAt: new Date() });
  }
}

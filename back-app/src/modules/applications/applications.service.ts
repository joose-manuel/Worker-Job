import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Application } from './entities/application.entity';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';

@Injectable()
export class ApplicationsService {
  constructor(
    @InjectRepository(Application)
    private readonly applicationsRepository: Repository<Application>,
  ) {}

  findByUser(userId: number): Promise<Application[]> {
    return this.applicationsRepository.find({
      where: { userId },
      order: { appliedAt: 'DESC', job: { matchPercent: 'DESC' } },
      relations: { job: true },
    });
  }

  create(userId: number, dto: CreateApplicationDto): Promise<Application> {
    const application = this.applicationsRepository.create({ ...dto, userId });
    return this.applicationsRepository.save(application);
  }

  async update(userId: number, id: number, dto: UpdateApplicationDto): Promise<Application | null> {
    await this.applicationsRepository.update({ id, userId }, dto as never);
    return this.applicationsRepository.findOneBy({ id, userId });
  }

  async remove(userId: number, id: number): Promise<void> {
    await this.applicationsRepository.delete({ id, userId });
  }
}

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Worker } from './entities/worker.entity';
import { CreateWorkerDto } from './dto/create-worker.dto';
import { UpdateWorkerDto } from './dto/update-worker.dto';

@Injectable()
export class WorkerService {
  constructor(
    @InjectRepository(Worker)
    private readonly workerRepository: Repository<Worker>,
  ) {}

  create(createWorkerDto: CreateWorkerDto): Promise<Worker> {
    const worker = this.workerRepository.create(createWorkerDto);
    return this.workerRepository.save(worker);
  }

  findAll(): Promise<Worker[]> {
    return this.workerRepository.find();
  }

  findOne(id: number): Promise<Worker> {
    return this.workerRepository.findOneByOrFail({ id });
  }

  async update(id: number, updateWorkerDto: UpdateWorkerDto): Promise<Worker> {
    await this.workerRepository.update(id, updateWorkerDto);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    await this.workerRepository.delete(id);
  }
}

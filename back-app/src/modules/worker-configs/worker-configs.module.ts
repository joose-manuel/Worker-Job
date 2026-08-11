import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkerConfigsController } from './worker-configs.controller';
import { WorkerConfigsService } from './worker-configs.service';
import { WorkerConfig } from './entities/worker-config.entity';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthModule } from '../auth/auth.module';
import { WhatsappService } from '../../common/utils/whatsapp.service';

@Module({
  imports: [TypeOrmModule.forFeature([WorkerConfig]), AuthModule],
  controllers: [WorkerConfigsController],
  providers: [WorkerConfigsService, JwtAuthGuard, WhatsappService],
  exports: [WorkerConfigsService, TypeOrmModule],
})
export class WorkerConfigsModule {}

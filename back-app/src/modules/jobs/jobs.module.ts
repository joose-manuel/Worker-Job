import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { Job } from './entities/job.entity';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthModule } from '../auth/auth.module';
import { ProfilesModule } from '../profiles/profiles.module';
import { WorkerConfigsModule } from '../worker-configs/worker-configs.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Job]),
    AuthModule,
    ProfilesModule,
    WorkerConfigsModule,
    AiModule,
  ],
  controllers: [JobsController],
  providers: [JobsService, JwtAuthGuard],
  exports: [JobsService],
})
export class JobsModule {}

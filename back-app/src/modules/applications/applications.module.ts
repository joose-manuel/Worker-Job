import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApplicationsController } from './applications.controller';
import { ApplicationsService } from './applications.service';
import { Application } from './entities/application.entity';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Application]), AuthModule],
  controllers: [ApplicationsController],
  providers: [ApplicationsService, JwtAuthGuard],
  exports: [ApplicationsService],
})
export class ApplicationsModule {}

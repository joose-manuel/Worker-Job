import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfilesController } from './profiles.controller';
import { ProfilesService } from './profiles.service';
import { CvParserService } from './cv-parser.service';
import { Profile } from './entities/profile.entity';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthModule } from '../auth/auth.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [TypeOrmModule.forFeature([Profile]), AuthModule, AiModule],
  controllers: [ProfilesController],
  providers: [ProfilesService, CvParserService, JwtAuthGuard],
  exports: [ProfilesService],
})
export class ProfilesModule {}

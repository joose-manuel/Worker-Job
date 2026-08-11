import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WorkersModule } from '../modules/workers/worker.module';
import { AiModule } from '../modules/ai/ai.module';
import { AuthModule } from '../modules/auth/auth.module';
import { ProfilesModule } from '../modules/profiles/profiles.module';
import { WorkerConfigsModule } from '../modules/worker-configs/worker-configs.module';
import { JobsModule } from '../modules/jobs/jobs.module';
import { ApplicationsModule } from '../modules/applications/applications.module';
import { WorkerScheduler } from '../modules/worker-configs/worker.scheduler';
import { WorkerConfig } from '../modules/worker-configs/entities/worker-config.entity';
import { NotificationService } from '../common/utils/notification.service';
import { NtfyChatService } from '../common/utils/ntfy-chat.service';

@Module({
  imports: [
    ConfigModule.forRoot({ envFilePath: join(__dirname, '..', '..', '.env'), isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const databaseUrl = config.get<string>('DATABASE_URL');
        if (databaseUrl) {
          return {
            type: 'postgres',
            url: databaseUrl,
            autoLoadEntities: true,
            synchronize: false,
          };
        }
        return {
          type: 'postgres',
          host: config.get<string>('DB_HOST'),
          port: config.get<number>('DB_PORT', 5432),
          username: config.get<string>('DB_USER'),
          password: config.get<string>('DB_PASSWORD'),
          database: config.get<string>('DB_NAME'),
          autoLoadEntities: true,
          synchronize: false,
        };
      },
    }),
    ScheduleModule.forRoot(),
    AuthModule,
    ProfilesModule,
    WorkerConfigsModule,
    JobsModule,
    ApplicationsModule,
    WorkersModule,
    AiModule,
    TypeOrmModule.forFeature([WorkerConfig]),
  ],
  controllers: [AppController],
  providers: [AppService, WorkerScheduler, NotificationService, NtfyChatService],
})
export class AppModule {}

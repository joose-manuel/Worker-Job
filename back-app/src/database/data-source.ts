import { config as loadEnv } from 'dotenv';
import { join } from 'path';
import { DataSource } from 'typeorm';
import { Worker } from '../modules/workers/entities/worker.entity';

loadEnv({ path: join(__dirname, '..', '..', '.env') });

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [Worker],
  migrations: [__dirname + '/migrations/*.ts'],
  synchronize: false,
});

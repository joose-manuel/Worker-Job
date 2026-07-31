import { IsIn, IsISO8601, IsOptional, IsString } from 'class-validator';
import { ApplicationStatus } from '../entities/application.entity';

export class UpdateApplicationDto {
  @IsOptional()
  @IsIn(['applied', 'interview', 'rejected', 'accepted'])
  status?: ApplicationStatus;

  @IsOptional()
  @IsISO8601()
  interviewAt?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

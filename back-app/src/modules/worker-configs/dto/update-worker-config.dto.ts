import { IsArray, IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateWorkerConfigDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  portals?: string[];

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(1440)
  intervalMinutes?: number;

  @IsOptional()
  @IsInt()
  minSalary?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  minMatchPercent?: number;

  @IsOptional()
  @IsString()
  modality?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsBoolean()
  autoApply?: boolean;

  @IsOptional()
  @IsString()
  whatsappPhone?: string;

  @IsOptional()
  @IsString()
  whatsappApiKey?: string;

  @IsOptional()
  @IsBoolean()
  notifyWhatsapp?: boolean;
}

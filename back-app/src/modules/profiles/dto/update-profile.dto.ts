import { IsArray, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @IsOptional()
  @IsString()
  experience?: string;

  @IsOptional()
  @IsString()
  education?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  location?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  desiredRole?: string;

  @IsOptional()
  @IsInt()
  desiredSalary?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  modality?: string;
}

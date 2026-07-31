import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ChatDto {
  @IsString()
  @IsNotEmpty()
  message: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  system?: string;
}

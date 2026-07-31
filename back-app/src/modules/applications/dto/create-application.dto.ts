import { IsInt, IsNotEmpty } from 'class-validator';

export class CreateApplicationDto {
  @IsInt()
  @IsNotEmpty()
  jobId: number;
}

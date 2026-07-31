import { Body, Controller, Get, Put, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, AuthRequest } from '../../common/guards/jwt-auth.guard';
import { WorkerConfigsService } from './worker-configs.service';
import { UpdateWorkerConfigDto } from './dto/update-worker-config.dto';

@UseGuards(JwtAuthGuard)
@Controller('worker-config')
export class WorkerConfigsController {
  constructor(private readonly configsService: WorkerConfigsService) {}

  @Get('me')
  get(@Req() req: AuthRequest) {
    return this.configsService.get(req.user.sub);
  }

  @Put('me')
  upsert(@Req() req: AuthRequest, @Body() dto: UpdateWorkerConfigDto) {
    return this.configsService.upsert(req.user.sub, dto);
  }
}

import { Controller, Delete, Get, Param, ParseIntPipe, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, AuthRequest } from '../../common/guards/jwt-auth.guard';
import { JobsService } from './jobs.service';

@UseGuards(JwtAuthGuard)
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get()
  findAll(@Req() req: AuthRequest) {
    return this.jobsService.findByUser(req.user.sub);
  }

  @Post('scan')
  scan(@Req() req: AuthRequest) {
    return this.jobsService.scan(req.user.sub);
  }

  @Get(':id/check')
  check(@Req() req: AuthRequest, @Param('id', ParseIntPipe) id: number) {
    return this.jobsService.checkJob(req.user.sub, id);
  }

  @Post(':id/letter')
  letter(@Req() req: AuthRequest, @Param('id', ParseIntPipe) id: number) {
    return this.jobsService.generateLetter(req.user.sub, id);
  }

  @Delete(':id')
  remove(@Req() req: AuthRequest, @Param('id', ParseIntPipe) id: number) {
    return this.jobsService.remove(req.user.sub, id);
  }
}

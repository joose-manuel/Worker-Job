import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Put,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { JwtAuthGuard, AuthRequest } from '../../common/guards/jwt-auth.guard';
import { ProfilesService } from './profiles.service';
import { CvParserService, ParsedCv } from './cv-parser.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { Profile } from './entities/profile.entity';

const uploadDir = join(process.cwd(), 'uploads');

export interface UploadCvResult {
  profile: Profile;
  extracted: ParsedCv;
}

@UseGuards(JwtAuthGuard)
@Controller('profiles')
export class ProfilesController {
  constructor(
    private readonly profilesService: ProfilesService,
    private readonly cvParser: CvParserService,
  ) {}

  @Get('me')
  get(@Req() req: AuthRequest) {
    return this.profilesService.get(req.user.sub);
  }

  @Put('me')
  upsert(@Req() req: AuthRequest, @Body() dto: UpdateProfileDto) {
    return this.profilesService.upsert(req.user.sub, dto);
  }

  @Post('me/cv')
  @UseInterceptors(
    FileInterceptor('cv', {
      storage: diskStorage({
        destination: uploadDir,
        filename: (_req, file, cb) => cb(null, `${randomUUID()}${extname(file.originalname)}`),
      }),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const isPdf =
          file.mimetype === 'application/pdf' ||
          file.originalname.toLowerCase().endsWith('.pdf');
        cb(null, isPdf);
      },
    }),
  )
  async uploadCv(
    @Req() req: AuthRequest,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<UploadCvResult> {
    if (!file) {
      throw new BadRequestException('Solo se permiten archivos PDF (máx 10MB)');
    }
    const profile = await this.profilesService.setCv(
      req.user.sub,
      file.path,
      file.originalname,
    );
    let extracted: ParsedCv = {};
    try {
      const text = await this.cvParser.extractText(file.path);
      if (text.length > 30) {
        extracted = await this.cvParser.parseWithAi(text);
      }
    } catch {
      // PDF sin texto legible (escaneado): se sube pero no se extrae
    }
    return { profile, extracted };
  }
}

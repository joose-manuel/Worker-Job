import { Body, Controller, HttpException, HttpStatus, Post } from '@nestjs/common';
import { AiService } from './ai.service';
import { ChatDto } from './dto/chat.dto';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('chat')
  async chat(@Body() chatDto: ChatDto) {
    try {
      return await this.aiService.chat(chatDto);
    } catch (error) {
      throw new HttpException(
        error instanceof Error ? error.message : 'Error al contactar Groq',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }
}

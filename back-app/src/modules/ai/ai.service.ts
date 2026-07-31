import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatDto } from './dto/chat.dto';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = 'llama-3.3-70b-versatile';

export interface ChatResponse {
  content: string;
  model: string;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(private readonly config: ConfigService) {}

  async chat(dto: ChatDto): Promise<ChatResponse> {
    const apiKey = this.config.get<string>('GROQ_API_KEY');
    const model = dto.model || DEFAULT_MODEL;

    const messages: Array<{ role: string; content: string }> = [];
    if (dto.system) {
      messages.push({ role: 'system', content: dto.system });
    }
    messages.push({ role: 'user', content: dto.message });

    this.logger.log(`Groq request · modelo ${model} · payload:\n${JSON.stringify(messages, null, 2)}`);

    const response = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, messages }),
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) {
      const body = await response.text();
      this.logger.error(`Groq HTTP ${response.status}: ${body}`);
      throw new Error(`Groq API error ${response.status}: ${body}`);
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
      model: string;
    };

    const content = data.choices[0]?.message?.content ?? '';
    this.logger.log(`Groq response OK · modelo ${data.model} · ${content.length} chars:\n${content}`);

    return {
      content,
      model: data.model,
    };
  }
}

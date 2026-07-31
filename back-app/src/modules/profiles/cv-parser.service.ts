import { Injectable, Logger } from '@nestjs/common';
import { readFile } from 'fs/promises';
import { AiService } from '../ai/ai.service';

export interface ParsedCv {
  summary?: string;
  skills?: string[];
  experience?: string;
  education?: string;
  location?: string;
  phone?: string;
  desiredRole?: string;
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PDFParse } = require('pdf-parse') as {
  PDFParse: new (opts: { data: Buffer }) => {
    load(): Promise<void>;
    getText(): Promise<{ text: string }>;
    destroy(): Promise<void>;
  };
};

@Injectable()
export class CvParserService {
  private readonly logger = new Logger(CvParserService.name);

  constructor(private readonly aiService: AiService) {}

  async extractText(filePath: string): Promise<string> {
    const buffer = await readFile(filePath);
    const parser = new PDFParse({ data: buffer });
    try {
      await parser.load();
      const result = await parser.getText();
      return result.text.trim();
    } finally {
      await parser.destroy();
    }
  }

  async parseWithAi(rawText: string): Promise<ParsedCv> {
    const truncated = rawText.slice(0, 6000);
    try {
      const response = await this.aiService.chat({
        system:
          'Eres un parser de hojas de vida. Responde ÚNICAMENTE con un JSON válido (objeto), sin markdown ni texto adicional.',
        message: `Extrae los datos de esta hoja de vida y devuelve un JSON con exactamente estas claves (usa null si no aparece): summary (resumen profesional de máx 3 líneas), skills (array de strings con las habilidades técnicas), experience (experiencia laboral resumida), education (educación resumida), location (ciudad/país), phone (teléfono), desiredRole (rol al que aspira según su perfil).\n\nHOJA DE VIDA:\n${truncated}`,
        model: 'llama-3.3-70b-versatile',
      });
      const cleaned = response.content.replace(/```json|```/g, '').trim();
      const start = cleaned.indexOf('{');
      const end = cleaned.lastIndexOf('}');
      if (start === -1 || end === -1) return {};
      const parsed = JSON.parse(cleaned.slice(start, end + 1)) as ParsedCv;
      return parsed;
    } catch (error) {
      this.logger.warn(`No se pudo parsear el CV con IA: ${error}`);
      return {};
    }
  }
}

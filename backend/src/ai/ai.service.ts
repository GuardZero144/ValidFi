import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Groq from 'groq-sdk';

@Injectable()
export class AiService {
  private groq: Groq;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('GROQ_API_KEY');
    if (apiKey) {
      this.groq = new Groq({ apiKey });
    }
  }

  async analyzeDocument(documentText: string, documentType: string): Promise<any> {
    try {
      const prompt = this.buildAnalysisPrompt(documentText, documentType);
      
      const completion = await this.groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'You are an expert document verification assistant. Analyze documents for authenticity, completeness, and potential fraud indicators.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        model: 'llama-4-70b',
        temperature: 0.3,
        max_tokens: 1024,
      });

      const response = completion.choices[0]?.message?.content || '{}';
      return JSON.parse(response);
    } catch (error) {
      throw new Error(`AI analysis failed: ${error.message}`);
    }
  }

  async extractTextFromImage(imageBuffer: Buffer): Promise<string> {
    try {
      // In a real implementation, you would use OCR (e.g., Tesseract.js)
      // For now, return a placeholder
      return 'Extracted text from image';
    } catch (error) {
      throw new Error(`OCR extraction failed: ${error.message}`);
    }
  }

  async assessRisk(documentData: any): Promise<{ score: number; level: string; factors: string[] }> {
    try {
      const prompt = `Assess the risk level of the following document data: ${JSON.stringify(documentData)}`;
      
      const completion = await this.groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'You are a fraud detection specialist. Assess document risk and provide a score (0-100), risk level (Low, Medium, High), and key risk factors.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        model: 'llama-4-70b',
        temperature: 0.2,
        max_tokens: 512,
      });

      const response = completion.choices[0]?.message?.content || '{}';
      return JSON.parse(response);
    } catch (error) {
      throw new Error(`Risk assessment failed: ${error.message}`);
    }
  }

  private buildAnalysisPrompt(documentText: string, documentType: string): string {
    const prompts: Record<string, string> = {
      passport: `Analyze this passport document for authenticity. Check for: valid passport number format, expiration date, issuing authority, missing fields, and any signs of tampering. Document text: ${documentText}`,
      'driver-license': `Analyze this driver's license for authenticity. Check for: valid license number format, expiration date, issuing authority, and any signs of tampering. Document text: ${documentText}`,
      'utility-bill': `Analyze this utility bill for authenticity. Check for: address consistency, date validity, issuing utility company, and any signs of tampering. Document text: ${documentText}`,
    };

    return prompts[documentType] || `Analyze this document for authenticity and completeness. Document text: ${documentText}`;
  }
}

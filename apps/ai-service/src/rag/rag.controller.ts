import {
  Body,
  Controller,
  Header,
  Logger,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { RagService } from './rag.service';
import { AskDto } from '@app/contracts/ai/ai.dto';
import type { Request, Response } from 'express';
import type { PhoneVariantDto } from '@app/contracts/phone';

@Controller('v1/ai/rag')
export class RagController {
  private readonly logger = new Logger(RagController.name);

  constructor(private readonly ragService: RagService) {}

  @Post('chat')
  @Header('Content-Type', 'text/event-stream')
  @Header('Cache-Control', 'no-cache')
  @Header('Connection', 'keep-alive')
  async chat(
    @Body() dto: AskDto,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const authHeader = req.headers.authorization;
    let token: string | undefined;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    try {
      res.write('data: ' + JSON.stringify({ status: 'start' }) + '\n\n');

      const streamObservable = await this.ragService.executeStream(
        dto.query,
        token,
      );

      streamObservable.subscribe({
        next: (content) => {
          res.write('data: ' + JSON.stringify(content) + '\n\n');
        },
        error: (err: unknown) => {
          this.logger.error('Streaming error:', err);
          const errorMessage =
            typeof err === 'object' && err !== null && 'message' in err
              ? (err as { message: string }).message
              : String(err);
          res.write(
            'data: ' +
              JSON.stringify({
                error: errorMessage,
                status: 'error',
              }) +
              '\n\n',
          );
          res.end();
        },
        complete: () => {
          res.write('data: ' + JSON.stringify({ status: 'complete' }) + '\n\n');
          res.end();
        },
      });
    } catch (error: unknown) {
      this.logger.error('Error setting up stream:', error);
      const errorMessage =
        typeof error === 'object' && error !== null && 'message' in error
          ? (error as { message: string }).message
          : String(error);
      res.write(
        'data: ' +
          JSON.stringify({
            error: errorMessage,
            status: 'error',
          }) +
          '\n\n',
      );
      res.end();
    }
  }

  @Post('features')
  async getTopFeatures(@Body() dto: PhoneVariantDto): Promise<string> {
    return this.ragService.getTopFeatures(dto);
  }
}

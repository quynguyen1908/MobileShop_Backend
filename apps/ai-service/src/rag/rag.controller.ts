import { Body, Controller, Header, Post, Res } from '@nestjs/common';
import { RagService } from './rag.service';
import { AskDto } from '@app/contracts/ai/ai.dto';
import type { Response } from 'express';

@Controller('v1/ai/rag')
export class RagController {
  constructor(private readonly ragService: RagService) {}

  @Post('chat')
  @Header('Content-Type', 'text/event-stream')
  @Header('Cache-Control', 'no-cache')
  @Header('Connection', 'keep-alive')
  async chat(@Body() dto: AskDto, @Res() res: Response): Promise<void> {
    try {
      res.write('data: ' + JSON.stringify({ status: 'start' }) + '\n\n');

      const streamObservable = await this.ragService.executeStream(dto.query);

      streamObservable.subscribe({
        next: (content) => {
          res.write('data: ' + JSON.stringify(content) + '\n\n');
        },
        error: (err: unknown) => {
          console.error('Streaming error:', err);
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
      console.error('Error setting up stream:', error);
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
}

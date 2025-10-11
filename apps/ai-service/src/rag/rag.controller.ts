import { Body, Controller, Header, Post, Res } from '@nestjs/common';
import { RagService } from './rag.service';
import { AskDto } from '@app/contracts/ai/ai.dto';
import type { Response } from 'express';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('RAG')
@Controller('v1/ai/rag')
export class RagController {
  constructor(private readonly ragService: RagService) {}

  @Post('chat')
  @Header('Content-Type', 'text/event-stream')
  @Header('Cache-Control', 'no-cache')
  @Header('Connection', 'keep-alive')
  @ApiOperation({ summary: 'Chat with RAG model (streaming)' })
  @ApiBody({
    description: 'The query to ask the RAG model',
    schema: {
      type: 'object',
      properties: {
        query: { type: 'string', example: 'Xin chào' },
      },
      required: ['query'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Streamed response from the RAG model',
    content: {
      'text/event-stream': {
        schema: {
          type: 'string',
          example: [
            {
              summary: 'Start event',
              value: 'data: {"status":"start"}\n\n',
            },
            {
              summary: 'Human message',
              value: 'data: {"role":"Human","content":"Xin chào"}\n\n',
            },
            {
              summary: 'Assistant partial message',
              value:
                'data: {"role":"Assistant","content":"Xin chào!","isPartial":true}\n\n',
            },
            {
              summary: 'Assistant partial message (continued)',
              value:
                'data: {"role":"Assistant","content":"Mình có thể giúp gì?","isPartial":true}\n\n',
            },
            {
              summary: 'Assistant complete message',
              value:
                'data: {"role":"Assistant","content":"Xin chào! Mình có thể giúp gì?","isPartial":false}\n\n',
            },
            {
              summary: 'Complete event',
              value: 'data: {"status":"complete"}\n\n',
            },
          ],
        },
      },
    },
  })
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

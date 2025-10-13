import { RemoteAuthGuard } from '@app/contracts/auth';
import { Roles, RoleType } from '@app/contracts/auth/roles.decorator';
import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { catchError, firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { ServiceError } from '../dto/error.dto';
import { ApiResponseDto } from '../dto/response.dto';
import { formatError } from '../utils/error';
import { AskDto } from '@app/contracts/ai/ai.dto';
import type { Readable } from 'stream';

interface IngestResponse {
  success: boolean;
  timestamp: string;
}

@ApiTags('AI Agents')
@Controller('v1/ai')
export class AiController {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  private get aiServiceUrl(): string {
    return this.configService.get<string>(
      'AI_SERVICE_URL',
      'http://localhost:4000/api/v1/ai',
    );
  }

  // Reusable axios error handler
  private handleAxiosError = (defaultMessage: string) => (error: unknown) => {
    const err = error as ServiceError;
    const statusCode = err.statusCode || HttpStatus.BAD_REQUEST;
    const errorMessage = err.logMessage || defaultMessage;
    throw new HttpException(
      new ApiResponseDto(statusCode, errorMessage, null, formatError(error)),
      statusCode,
    );
  };

  @Get('ingest')
  @UseGuards(RemoteAuthGuard)
  @Roles(RoleType.ADMIN)
  @ApiOperation({ summary: 'Trigger document ingestion process' })
  @ApiResponse({
    status: 200,
    description: 'Ingestion process started successfully.',
    content: {
      'application/json': {
        example: {
          statusCode: 200,
          message: 'ETL Ingestion started successfully',
          data: { success: true, timestamp: '2024-10-01T12:00:00.000Z' },
          error: null,
        },
      },
    },
  })
  async ingest(@Res() res: Response) {
    try {
      const { data } = await firstValueFrom(
        this.httpService
          .get<IngestResponse>(`${this.aiServiceUrl}/etl/ingest`)
          .pipe(catchError(this.handleAxiosError('ETL Ingestion failed'))),
      );

      const response = new ApiResponseDto(
        HttpStatus.OK,
        'ETL Ingestion started successfully',
        data,
      );
      return res.status(HttpStatus.OK).json(response);
    } catch (error: unknown) {
      const typedError = error as ServiceError;
      const statusCode = typedError.statusCode || HttpStatus.BAD_REQUEST;
      const errorMessage = typedError.logMessage || 'ETL Ingestion failed';

      const errorResponse = new ApiResponseDto(
        statusCode,
        errorMessage,
        null,
        formatError(error),
      );
      return res.status(statusCode).json(errorResponse);
    }
  }

  @Post('chat')
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
  async chat(@Body() dto: AskDto, @Req() req: Request, @Res() res: Response) {
    try {
      const response = await firstValueFrom(
        this.httpService
          .post(`${this.aiServiceUrl}/rag/chat`, dto, {
            responseType: 'stream',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'text/event-stream',
            },
          })
          .pipe(catchError(this.handleAxiosError('RAG Chat request failed'))),
      );

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      (response.data as Readable).pipe(res);

      req.on('close', () => {
        console.log('Client disconnected, closing stream');
      });
    } catch (error: unknown) {
      const typedError = error as ServiceError;
      const statusCode = typedError.statusCode || HttpStatus.BAD_REQUEST;
      const errorMessage = typedError.logMessage || 'RAG Chat request failed';

      const errorResponse = new ApiResponseDto(
        statusCode,
        errorMessage,
        null,
        formatError(error),
      );
      return res.status(statusCode).json(errorResponse);
    }
  }
}

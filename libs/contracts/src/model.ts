import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

export const ErrPageNumberAtLeast1 = new Error(
  'Page number must be at least 1',
);
export const ErrLimitAtLeast1 = new Error('Limit must be at least 1');

export const pagingDtoSchema = z.object({
  page: z.coerce.number().min(1, ErrPageNumberAtLeast1.message).default(1),
  limit: z.coerce
    .number()
    .min(1, ErrLimitAtLeast1.message)
    .max(100)
    .default(10),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional().default('asc'),
});

export interface PagingDto extends z.infer<typeof pagingDtoSchema> {
  total?: number;
}

export type Paginated<E> = {
  data: E[];
  paging: PagingDto;
  total: number;
};

export abstract class AppEvent<Payload> {
  private readonly _metadata: {
    id: string;
    occurredAt: Date;
    senderId?: string;
    correlationId?: string;
    version: string;
  };

  constructor(
    private readonly _eventName: string,
    private readonly _payload: Payload,
    metadata?: Partial<{
      id: string;
      occurredAt: Date;
      senderId: string;
      correlationId: string;
      version: string;
    }>,
  ) {
    this._metadata = {
      id: metadata?.id ?? uuidv4(),
      occurredAt: metadata?.occurredAt ?? new Date(),
      senderId: metadata?.senderId,
      correlationId: metadata?.correlationId,
      version: metadata?.version ?? '1.0',
    };
  }

  get eventName(): string {
    return this._eventName;
  }

  get payload(): Payload {
    return this._payload;
  }

  get id(): string {
    return this._metadata.id;
  }

  get occurredAt(): Date {
    return this._metadata.occurredAt;
  }

  get senderId(): string | undefined {
    return this._metadata.senderId;
  }

  get correlationId(): string | undefined {
    return this._metadata.correlationId;
  }

  get version(): string {
    return this._metadata.version;
  }

  plainObject() {
    return {
      id: this._metadata.id,
      occurredAt: this._metadata.occurredAt,
      senderId: this._metadata.senderId,
      correlationId: this._metadata.correlationId,
      version: this._metadata.version,
      eventName: this._eventName,
      payload: this._payload,
    };
  }
}

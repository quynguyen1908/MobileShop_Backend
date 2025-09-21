import { z } from 'zod';
import { v4 as uuidv4 } from "uuid";

export const ErrPageNumberAtLeast1 = new Error('Page number must be at least 1');
export const ErrLimitAtLeast1 = new Error('Limit must be at least 1');

export const pagingDtoSchema = z.object({
    page: z
        .coerce.number()
        .min(1, ErrPageNumberAtLeast1.message)
        .default(1),
    limit: z.coerce.number()
        .min(1, ErrLimitAtLeast1.message)
        .max(100).default(10),
    sort: z.string().optional(),
    order: z.enum(['asc', 'desc']).optional().default('asc'),
});

export interface PagingDto extends z.infer<typeof pagingDtoSchema> { total?: number; }

export type Paginated<E> = {
    data: E[];
    paging: PagingDto;
    total: number;
}

export abstract class AppEvent<Payload> {
    private _id: string;
    private _occurredAt: Date;
    private _senderId?: string;

    constructor(
        private readonly _eventName: string,
        private readonly _payload: Payload,
        dtoProps?: {
            id?: string,
            occurredAt?: Date,
            senderId?: string;
        }
    ) {
        this._id = dtoProps?.id ?? uuidv4();
        this._occurredAt = dtoProps?.occurredAt ?? new Date();
        this._senderId = dtoProps?.senderId;
    }

    get eventName(): string {
        return this._eventName;
    }

    get id(): string {
        return this._id;
    }

    get occurredAt(): Date {
        return this._occurredAt;
    }

    get senderId(): string | undefined {
        return this._senderId;
    }

    get payload(): Payload {
        return this._payload;
    }

    plainObject() {
        return {
            id: this._id,
            occurredAt: this._occurredAt,
            senderId: this._senderId,
            eventName: this._eventName,
            payload: this._payload,
        };
    }
}
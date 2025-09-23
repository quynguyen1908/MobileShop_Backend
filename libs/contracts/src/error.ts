import { Response } from "express";
import { ZodError } from "zod";

export class AppError extends Error {
    private statusCode: number = 500;
    private rootCause?: Error;
    private details: Record<string, any> = {};
    private logMessage?: string;

    private constructor(error: Error) {
        super(error.message);
    }

    static from(error: Error, statusCode: number = 500) {
        const appError = new AppError(error);
        appError.statusCode = statusCode;
        return appError;
    }

    getRootCause(): Error | null {
        if (this.rootCause) {
            return this.rootCause instanceof AppError ? this.rootCause.getRootCause() : this.rootCause;
        }
        return null;
    }

    wrap(rootCause: Error): AppError {
        const appError = AppError.from(this, this.statusCode);
        appError.rootCause = rootCause;
        return appError;
    }

    withDetail(key: string, value: any): AppError {
        this.details[key] = value;
        return this;
    }

    withLog(logMessage: string): AppError {
        this.logMessage = logMessage;
        return this;
    }

    withMessage(message: string): AppError {
        this.message = message;
        return this;
    }

    toJson(isProduction: boolean = true) {
        const rootCause = this.getRootCause();

        return isProduction ? {
            message: this.message,
            statusCode: this.statusCode,
            details: this.details,
        } : {
            message: this.message,
            statusCode: this.statusCode,
            rootCause: rootCause ? rootCause.message : this.message,
            details: this.details,
            logMessage: this.logMessage,
        };
    }

    getStatusCode(): number {
        return this.statusCode;
    }
}

export const respondError = (res: Response, error: Error) => {
    const isProduction = process.env.NODE_ENV === 'production';
    !isProduction && console.error(error.stack);

    if (error instanceof AppError) {
        const appError = error as AppError;
        res.status(appError.getStatusCode()).json(appError.toJson(isProduction));
        return;
    }

    if (error instanceof ZodError) {
        const zodError = error as ZodError;
        const appError = ErrInvalidRequest.wrap(zodError);

        zodError.issues.forEach((issue) => {
            appError.withDetail(issue.path.join('.'), issue.message);
        });

        res.status(appError.getStatusCode()).json(appError.toJson(isProduction));
        return;
    }

    const appError = ErrInternalServer.wrap(error);
    res.status(appError.getStatusCode()).json(appError.toJson(isProduction));
}

export const ErrInternalServer = AppError.from(new Error('Something went wrong, please try again later.'), 500);
export const ErrInvalidRequest = AppError.from(new Error('Invalid request'), 400);
export const ErrUnauthorized = AppError.from(new Error('Unauthorized'), 401);
export const ErrForbidden = AppError.from(new Error('Forbidden'), 403);
export const ErrNotFound = AppError.from(new Error('Not found'), 404);
export const ErrMethodNotAllowed = AppError.from(new Error('Method not allowed'), 405);
export const ErrTokenInvalid = AppError.from(new Error('Token is invalid'), 401);
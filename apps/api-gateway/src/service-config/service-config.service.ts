import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientOptions, Transport } from '@nestjs/microservices';

@Injectable()
export class ServiceConfigService {
    constructor(private config: ConfigService) {}

    getAuthServicePort(): number {
        return this.config.get<number>('AUTH_SERVICE_PORT', 3001)!;
    }

    getUserServicePort(): number {
        return this.config.get<number>('USER_SERVICE_PORT', 3002)!;
    }

    get authServiceOptions(): ClientOptions {
        return {
            transport: Transport.TCP,
            options: {
                port: this.getAuthServicePort(),
            },
        }
    }
    
    get userServiceOptions(): ClientOptions {
        return {
            transport: Transport.TCP,
            options: {
                port: this.getAuthServicePort(),
            },
        }
    }
}

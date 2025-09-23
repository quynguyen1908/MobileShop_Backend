import { Module, Global } from '@nestjs/common';
import { JwtTokenService } from './jwt.service';
import { ConfigModule } from '@nestjs/config';
import { TOKEN_PROVIDER } from '..';

@Global()
@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
        }),
    ],
    providers: [
        JwtTokenService,
        {
            provide: TOKEN_PROVIDER,
            useExisting: JwtTokenService,
        },
    ],
    exports: [
        TOKEN_PROVIDER,
    ],
})
export class JwtTokenModule {}

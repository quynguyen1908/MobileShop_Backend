import { Module } from '@nestjs/common';
import { SearchService } from './search.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ElasticsearchModule } from '@nestjs/elasticsearch';

@Module({
  imports: [
    ElasticsearchModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const password = configService.get<string>('ELASTIC_PASSWORD');
        return {
          node:
            configService.get<string>('ELASTICSEARCH_HOSTS') ||
            'http://localhost:9200',
          auth: password ? { username: 'elastic', password } : undefined,
          tls: {
            rejectUnauthorized: false,
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [SearchService],
  exports: [SearchService, ElasticsearchModule],
})
export class SearchModule {}

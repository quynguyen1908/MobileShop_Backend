import { DynamicModule, Module } from '@nestjs/common';
import { PrometheusModule as NestPrometheusModule } from '@willsoto/nestjs-prometheus';

@Module({})
export class PrometheusModule {
  static register(serviceName: string): DynamicModule {
    const safeServiceName = serviceName.replace(/-/g, '_');

    return {
      module: PrometheusModule,
      imports: [
        NestPrometheusModule.register({
          defaultLabels: { service: safeServiceName },
          customMetricPrefix: 'mobile_shop_',
          defaultMetrics: {
            enabled: true,
            config: {
              prefix: `nestjs_${safeServiceName}_`,
              labels: { service: safeServiceName },
            },
          },
          path: '/metrics',
        }),
      ],
      exports: [NestPrometheusModule],
    };
  }
}

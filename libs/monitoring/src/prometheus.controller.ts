import { Controller } from '@nestjs/common';
import { PrometheusController as NestPrometheusController } from '@willsoto/nestjs-prometheus';

@Controller('metrics')
export class MetricsController extends NestPrometheusController {}

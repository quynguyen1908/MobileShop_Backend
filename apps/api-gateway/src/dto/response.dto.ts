import { ApiProperty } from '@nestjs/swagger';

export class ApiResponseDto<T = any> {
  @ApiProperty({ example: 200 })
  status: number;

  @ApiProperty({ example: 'Success' })
  message: string;

  @ApiProperty({
    description: 'Response data, varies based on endpoint',
    nullable: true,
  })
  data?: T;

  @ApiProperty({
    description: 'Error details if any',
    nullable: true,
    example: null,
  })
  errors?: Record<string, any> | null;

  constructor(
    status: number,
    message: string,
    data?: T,
    errors?: Record<string, any> | null,
  ) {
    this.status = status;
    this.message = message;
    this.data = data;
    this.errors = errors || null;
  }
}

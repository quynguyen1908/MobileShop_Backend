import { registerAs } from '@nestjs/config';

export default registerAs('vnpay', () => ({
  tmnCode: process.env.VNPAY_TMN_CODE || '',
  hashSecret: process.env.VNPAY_HASH_SECRET || '',
  apiUrl: process.env.VNPAY_API_URL || '',
  returnUrl: process.env.VNPAY_RETURN_URL || '',
  version: '2.1.0',
  command: 'pay',
  currCode: 'VND',
}));

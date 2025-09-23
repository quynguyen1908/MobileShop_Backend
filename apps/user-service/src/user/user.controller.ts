import { Controller } from '@nestjs/common';
import type { IUserService } from './user.port';

@Controller()
export class UserController {
  constructor(private readonly userService: IUserService) {}


}

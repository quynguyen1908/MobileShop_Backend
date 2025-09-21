import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { UserService } from './user.service';
import type { UserCreateDto, UserUpdateDto, UserUpdateProfileDto } from '@app/contracts/user';
import { USER_PATTERN } from '@app/contracts/user';

@Controller()
export class UserController {
  constructor(private readonly userService: UserService) {}

  // @MessagePattern(USER_PATTERN.CREATE_USER)
  // create(@Payload() userCreateDto: UserCreateDto) {
  //   return this.userService.create(userCreateDto);
  // }

  // @MessagePattern(USER_PATTERN.FIND_ALL_USER)
  // findAll() {
  //   return this.userService.findAll();
  // }

  // @MessagePattern(USER_PATTERN.FIND_ONE_USER)
  // findOne(@Payload() id: number) {
  //   return this.userService.findOne(id);
  // }

  // @MessagePattern(USER_PATTERN.REMOVE_USER)
  // remove(@Payload() id: number) {
  //   return this.userService.remove(id);
  // }
}

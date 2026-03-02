import { Controller, Post, Body, Patch, Param, Delete } from '@nestjs/common';

import { UserService } from '../../modules/users/users.service.js';


@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UserService) { }



  @Post("user")
  async signupUser(@Body() userData: { name?: string; email: string }) {
    return {
      message: 'Success'
    }
  }




}

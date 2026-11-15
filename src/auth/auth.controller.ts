import { Body, Controller, Get, HttpCode, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service.js';
import { LoginDto, RegisterDto } from './auth.dto.js';
import { Public } from './auth.guard.js';
import type { AuthRequest } from './auth.guard.js';

@ApiTags('Sesión') @ApiBearerAuth() @Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  @Public() @Post('login') @HttpCode(200) login(@Body() dto: LoginDto) { return this.auth.login(dto); }
  @Public() @Post('register') register(@Body() dto: RegisterDto) { return this.auth.register(dto); }
  @Get('me') me(@Req() req: AuthRequest) { return req.user; }
}

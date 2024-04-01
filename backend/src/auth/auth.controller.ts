import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    const isValid = await this.authService.validateWallet(
      loginDto.walletAddress,
      loginDto.signature,
      loginDto.message,
    );

    if (!isValid) {
      return { error: 'Invalid signature' };
    }

    return this.authService.login(loginDto.walletAddress);
  }

  @Post('verify')
  async verify(@Body('token') token: string) {
    try {
      return this.authService.verifyToken(token);
    } catch (error) {
      return { error: 'Invalid token' };
    }
  }
}

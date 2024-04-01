import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async validateWallet(walletAddress: string, signature: string, message: string): Promise<boolean> {
    // In a real implementation, you would verify the signature against the wallet address
    // This is a placeholder for the actual verification logic
    return true;
  }

  async login(walletAddress: string) {
    const payload = { walletAddress };
    return {
      access_token: this.jwtService.sign(payload),
      walletAddress,
    };
  }

  async verifyToken(token: string) {
    return this.jwtService.verify(token);
  }
}

import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateWallet', () => {
    it('should validate wallet signature', async () => {
      const walletAddress = 'GABC123...';
      const signature = 'signature123';
      const message = 'message123';

      const result = await service.validateWallet(walletAddress, signature, message);

      expect(result).toBe(true);
    });

    // Note: This is a placeholder implementation
    // In a real implementation, you would test actual signature verification
  });

  describe('login', () => {
    it('should return access token and wallet address', async () => {
      const walletAddress = 'GABC123...';
      const mockToken = 'jwt-token-123';

      mockJwtService.sign.mockReturnValue(mockToken);

      const result = await service.login(walletAddress);

      expect(jwtService.sign).toHaveBeenCalledWith({ walletAddress });
      expect(result).toEqual({
        access_token: mockToken,
        walletAddress,
      });
    });
  });

  describe('verifyToken', () => {
    it('should verify and decode token', async () => {
      const token = 'jwt-token-123';
      const decodedPayload = { walletAddress: 'GABC123...' };

      mockJwtService.verify.mockReturnValue(decodedPayload);

      const result = await service.verifyToken(token);

      expect(jwtService.verify).toHaveBeenCalledWith(token);
      expect(result).toEqual(decodedPayload);
    });
  });
});

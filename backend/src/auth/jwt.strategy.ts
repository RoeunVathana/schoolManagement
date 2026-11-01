import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService, private readonly prisma: PrismaService) {
    super({ jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), secretOrKey: config.getOrThrow('JWT_ACCESS_SECRET'), issuer: config.get('JWT_ISSUER', 'campusflow-api'), audience: config.get('JWT_AUDIENCE', 'campusflow-web') });
  }
  async validate(payload: { sub: string }) {
    // Never attach password hashes or other secrets to the request user object.
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        status: true,
        language: true,
        canCreate: true,
        canEdit: true,
        canDelete: true,
        profileImageUrl: true,
      },
    });
    if (!user || user.status !== 'ACTIVE') throw new UnauthorizedException('This account is not active');
    return user;
  }
}

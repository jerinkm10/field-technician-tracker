import { compare } from 'bcryptjs';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { AuthenticatedUser } from './interfaces/authenticated-user.interface';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  async signAccessToken(payload: JwtPayload): Promise<string> {
    return this.jwtService.signAsync(payload);
  }

  async login(
    loginDto: LoginDto,
  ): Promise<{ accessToken: string; user: AuthenticatedUser }> {
    const userRecord = await this.usersService.findByEmailForAuth(
      loginDto.email.toLowerCase(),
    );

    if (!userRecord) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatches = await compare(loginDto.password, userRecord.password);

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const user: AuthenticatedUser = {
      id: userRecord.id,
      name: userRecord.name,
      email: userRecord.email,
      role: userRecord.role,
    };

    const accessToken = await this.signAccessToken({
      sub: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });

    return {
      accessToken,
      user,
    };
  }
}

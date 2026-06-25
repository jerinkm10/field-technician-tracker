import { compare } from 'bcryptjs';
import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UserStatus } from '@prisma/client';
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
    const username = loginDto.username?.trim();
    const email = loginDto.email?.trim().toLowerCase();

    if (!username && !email) {
      throw new BadRequestException('Username or email is required');
    }

    const userRecord = await this.usersService.findByUsernameOrEmailForAuth({
      username,
      email,
    });

    if (!userRecord) {
      throw new UnauthorizedException('Invalid username or password');
    }

    const passwordMatches = await compare(loginDto.password, userRecord.password);

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid username or password');
    }

    if (userRecord.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('This account is inactive');
    }

    const user: AuthenticatedUser = {
      id: userRecord.id,
      name: userRecord.name,
      username: userRecord.username,
      email: userRecord.email,
      role: userRecord.role,
    };

    const accessToken = await this.signAccessToken({
      sub: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role,
    });

    return {
      accessToken,
      user,
    };
  }
}

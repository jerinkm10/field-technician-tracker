import { Role } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  name: string;
  email: string;
  role: Role;
}

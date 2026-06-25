import { Role } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  name: string;
  username: string;
  email: string | null;
  role: Role;
}

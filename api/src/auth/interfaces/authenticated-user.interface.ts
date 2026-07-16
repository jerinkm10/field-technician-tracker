import { Role } from '@prisma/client';

export interface AuthenticatedUser {
  id: string;
  name: string;
  username: string;
  email: string | null;
  role: Role;
  branchId: string | null;
  branchName: string | null;
}

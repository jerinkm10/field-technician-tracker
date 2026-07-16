import {
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

export function isSuperAdmin(currentUser: JwtPayload | null | undefined): boolean {
  return currentUser?.role === Role.ADMIN_OWNER;
}

export function getScopedBranchId(currentUser: JwtPayload): string | null {
  if (isSuperAdmin(currentUser)) {
    return null;
  }

  if (!currentUser.branchId) {
    throw new ForbiddenException(
      'This account is not assigned to a branch. Contact the super admin.',
    );
  }

  return currentUser.branchId;
}

export function assertBranchAccess(
  currentUser: JwtPayload,
  branchId: string | null | undefined,
  message = 'You do not have permission to access records for another branch.',
): void {
  const scopedBranchId = getScopedBranchId(currentUser);

  if (!scopedBranchId) {
    return;
  }

  if (!branchId || scopedBranchId !== branchId) {
    throw new ForbiddenException(message);
  }
}

export function assertSuperAdmin(
  currentUser: JwtPayload,
  message = 'Only the super admin can perform this action.',
): void {
  if (!isSuperAdmin(currentUser)) {
    throw new ForbiddenException(message);
  }
}

export function notFoundWhenOutOfBranch(
  currentUser: JwtPayload,
  branchId: string | null | undefined,
  entityLabel: string,
): void {
  const scopedBranchId = getScopedBranchId(currentUser);

  if (scopedBranchId && (!branchId || scopedBranchId !== branchId)) {
    throw new NotFoundException(`${entityLabel} not found`);
  }
}

export function branchUserWhereInput(
  currentUser: JwtPayload,
): Prisma.UserWhereInput {
  const scopedBranchId = getScopedBranchId(currentUser);

  if (!scopedBranchId) {
    return {};
  }

  return {
    branchId: scopedBranchId,
  };
}

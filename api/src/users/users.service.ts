import { hash } from 'bcryptjs';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  Role,
  TechnicianStatus,
  UserStatus,
} from '@prisma/client';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import {
  getScopedBranchId,
  isSuperAdmin,
} from '../auth/utils/branch-access.util';
import { createPaginationMeta, normalizePagination } from '../common/utils/pagination.util';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { ListEmployeesQueryDto } from './dto/list-employees-query.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

const authUserSelect = Prisma.validator<Prisma.UserSelect>()({
  id: true,
  name: true,
  username: true,
  email: true,
  phone: true,
  password: true,
  role: true,
  status: true,
  branch: {
    select: {
      id: true,
      supplierName: true,
    },
  },
});

const employeeSelect = Prisma.validator<Prisma.UserSelect>()({
  id: true,
  name: true,
  username: true,
  email: true,
  phone: true,
  role: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  branch: {
    select: {
      id: true,
      supplierName: true,
    },
  },
  technician: {
    select: {
      id: true,
      status: true,
    },
  },
});

type EmployeeRecord = Prisma.UserGetPayload<{
  select: typeof employeeSelect;
}>;

@Injectable()
export class UsersService {
  constructor(private readonly prismaService: PrismaService) {}

  async findByUsernameOrEmailForAuth(params: {
    username?: string;
    email?: string;
  }) {
    const filters: Prisma.UserWhereInput[] = [];

    if (params.username) {
      filters.push({
        username: {
          equals: params.username,
          mode: 'insensitive',
        },
      });
    }

    if (params.email) {
      filters.push({
        email: {
          equals: params.email,
          mode: 'insensitive',
        },
      });
    }

    if (filters.length === 0) {
      return null;
    }

    return this.prismaService.user.findFirst({
      where: {
        OR: filters,
      },
      select: authUserSelect,
    });
  }

  async listEmployees(
    query: ListEmployeesQueryDto,
    currentUser: JwtPayload,
  ) {
    const { page, limit, skip } = normalizePagination(query.page, query.limit);
    const search = query.search?.trim();
    const scopedBranchId = getScopedBranchId(currentUser);
    const where: Prisma.UserWhereInput = {
      AND: [
        {
          role: {
            not: Role.ADMIN_OWNER,
          },
        },
        ...(query.role ? [{ role: query.role }] : []),
        ...(query.status ? [{ status: query.status }] : []),
        ...(scopedBranchId
          ? [
              query.includeCrossBranchTechnicians
                ? {
                    OR: [
                      {
                        branchId: scopedBranchId,
                      },
                      {
                        role: Role.TECHNICIAN,
                      },
                    ],
                  }
                : {
                    branchId: scopedBranchId,
                  },
            ]
          : []),
        ...(search
          ? [
              {
                OR: [
                  {
                    name: {
                      contains: search,
                      mode: 'insensitive',
                    },
                  },
                  {
                    username: {
                      contains: search,
                      mode: 'insensitive',
                    },
                  },
                  {
                    email: {
                      contains: search,
                      mode: 'insensitive',
                    },
                  },
                  {
                    phone: {
                      contains: search,
                      mode: 'insensitive',
                    },
                  },
                  {
                    branch: {
                      supplierName: {
                        contains: search,
                        mode: 'insensitive',
                      },
                    },
                  },
                ],
              },
            ]
          : []),
      ] as Prisma.UserWhereInput[],
    };

    const [total, users] = await Promise.all([
      this.prismaService.user.count({ where }),
      this.prismaService.user.findMany({
        where,
        orderBy: [{ role: 'asc' }, { name: 'asc' }],
        skip,
        take: limit,
        select: employeeSelect,
      }),
    ]);

    return {
      data: users.map((user) => this.toApiEmployee(user)),
      meta: createPaginationMeta(total, page, limit),
    };
  }

  async getEmployeeById(userId: string, currentUser: JwtPayload) {
    return this.toApiEmployee(await this.getEmployeeOrThrow(userId, this.prismaService, currentUser));
  }

  async createEmployee(
    createEmployeeDto: CreateEmployeeDto,
    currentUser: JwtPayload,
  ) {
    await this.assertEmployeeRole(createEmployeeDto.role, currentUser);
    const branchId = await this.resolveManagedBranchId(
      createEmployeeDto.branchId,
      createEmployeeDto.role,
      currentUser,
    );
    await this.ensureUniqueUserFields({
      username: createEmployeeDto.username,
      email: createEmployeeDto.email,
      phone: createEmployeeDto.phone,
    });

    const passwordHash = await hash(createEmployeeDto.password, 10);

    try {
      return await this.prismaService.$transaction(async (transaction) => {
        const createdUser = await transaction.user.create({
          data: {
            name: createEmployeeDto.name.trim(),
            username: createEmployeeDto.username.trim(),
            email: this.normalizeOptionalString(createEmployeeDto.email),
            phone: createEmployeeDto.phone.trim(),
            password: passwordHash,
            role: createEmployeeDto.role,
            branchId,
            status: createEmployeeDto.status ?? UserStatus.ACTIVE,
          },
          select: {
            id: true,
          },
        });

        await this.syncTechnicianProfile(transaction, {
          userId: createdUser.id,
          role: createEmployeeDto.role,
          phone: createEmployeeDto.phone.trim(),
          status: createEmployeeDto.status ?? UserStatus.ACTIVE,
          existingTechnicianId: null,
        });

        return this.toApiEmployee(
          await this.getEmployeeOrThrow(createdUser.id, transaction, currentUser),
        );
      });
    } catch (error) {
      this.rethrowUniqueConstraint(error);
    }
  }

  async updateEmployee(
    userId: string,
    updateEmployeeDto: UpdateEmployeeDto,
    currentUser: JwtPayload,
  ) {
    const existingUser = await this.getEmployeeOrThrow(
      userId,
      this.prismaService,
      currentUser,
    );

    const nextRole = updateEmployeeDto.role ?? existingUser.role;
    const nextStatus = updateEmployeeDto.status ?? existingUser.status;
    const nextUsername = updateEmployeeDto.username?.trim() ?? existingUser.username;
    const nextEmail =
      updateEmployeeDto.email !== undefined
        ? this.normalizeOptionalString(updateEmployeeDto.email)
        : existingUser.email;
    const nextPhone = updateEmployeeDto.phone?.trim() ?? existingUser.phone;
    const nextBranchId = await this.resolveManagedBranchId(
      updateEmployeeDto.branchId ?? existingUser.branch?.id ?? null,
      nextRole,
      currentUser,
    );

    await this.assertEmployeeRole(nextRole, currentUser);
    await this.ensureUniqueUserFields(
      {
        username: nextUsername,
        email: nextEmail,
        phone: nextPhone,
      },
      userId,
    );

    const passwordHash = updateEmployeeDto.password
      ? await hash(updateEmployeeDto.password, 10)
      : undefined;

    try {
      return await this.prismaService.$transaction(async (transaction) => {
        await transaction.user.update({
          where: {
            id: userId,
          },
          data: {
            name: updateEmployeeDto.name?.trim(),
            username: updateEmployeeDto.username?.trim(),
            email:
              updateEmployeeDto.email !== undefined
                ? this.normalizeOptionalString(updateEmployeeDto.email)
                : undefined,
            phone: updateEmployeeDto.phone?.trim(),
            password: passwordHash,
            role: updateEmployeeDto.role,
            branchId: nextBranchId,
            status: updateEmployeeDto.status,
          },
        });

        await this.syncTechnicianProfile(transaction, {
          userId,
          role: nextRole,
          phone: nextPhone,
          status: nextStatus,
          existingTechnicianId: existingUser.technician?.id ?? null,
        });

        return this.toApiEmployee(
          await this.getEmployeeOrThrow(userId, transaction, currentUser),
        );
      });
    } catch (error) {
      this.rethrowUniqueConstraint(error);
    }
  }

  private async getEmployeeOrThrow(
    userId: string,
    transaction: Prisma.TransactionClient | PrismaService = this.prismaService,
    currentUser?: JwtPayload,
  ): Promise<EmployeeRecord> {
    const user = await transaction.user.findFirst({
      where: {
        id: userId,
        role: {
          not: Role.ADMIN_OWNER,
        },
      },
      select: employeeSelect,
    });

    if (!user) {
      throw new NotFoundException('Employee not found');
    }

    if (currentUser && !isSuperAdmin(currentUser)) {
      const scopedBranchId = getScopedBranchId(currentUser);

      if (user.branch?.id !== scopedBranchId) {
        throw new NotFoundException('Employee not found');
      }
    }

    return user;
  }

  private async ensureUniqueUserFields(
    values: {
      username: string;
      email: string | null | undefined;
      phone: string;
    },
    excludeUserId?: string,
  ): Promise<void> {
    const conflicts = await this.prismaService.user.findFirst({
      where: {
        ...(excludeUserId
          ? {
              id: {
                not: excludeUserId,
              },
            }
          : {}),
        OR: [
          {
            username: {
              equals: values.username.trim(),
              mode: 'insensitive',
            },
          },
          {
            phone: values.phone.trim(),
          },
          ...(values.email
            ? [
                {
                  email: {
                    equals: values.email.trim().toLowerCase(),
                    mode: 'insensitive' as const,
                  },
                },
              ]
            : []),
        ],
      },
      select: {
        id: true,
        username: true,
        email: true,
        phone: true,
      },
    });

    if (!conflicts) {
      return;
    }

    if (conflicts.username.toLowerCase() === values.username.trim().toLowerCase()) {
      throw new ConflictException('Username must be unique');
    }

    if (conflicts.phone === values.phone.trim()) {
      throw new ConflictException('Phone number must be unique');
    }

    if (
      values.email &&
      conflicts.email &&
      conflicts.email.toLowerCase() === values.email.trim().toLowerCase()
    ) {
      throw new ConflictException('Email address must be unique');
    }

    throw new ConflictException('Employee details must be unique');
  }

  private async assertEmployeeRole(
    role: Role,
    currentUser: JwtPayload,
  ): Promise<void> {
    if (role === Role.ADMIN_OWNER) {
      throw new ConflictException(
        'Admin owner accounts are seeded separately and cannot be created from Employees',
      );
    }

    if (!isSuperAdmin(currentUser) && role === Role.ADMIN) {
      throw new ConflictException(
        'Only the super admin can create or update branch admin accounts.',
      );
    }
  }

  private async resolveManagedBranchId(
    requestedBranchId: string | null | undefined,
    role: Role,
    currentUser: JwtPayload,
  ): Promise<string | null> {
    if (role === Role.ADMIN_OWNER) {
      return null;
    }

    if (!isSuperAdmin(currentUser)) {
      const scopedBranchId = getScopedBranchId(currentUser);
      if (!scopedBranchId) {
        throw new ConflictException('A branch assignment is required for branch admins.');
      }
      await this.ensureBranchExists(scopedBranchId);
      return scopedBranchId;
    }

    const normalizedBranchId = this.normalizeOptionalId(requestedBranchId);

    if (!normalizedBranchId) {
      throw new ConflictException(
        'Branch selection is required for branch admins, employees, and technicians.',
      );
    }

    await this.ensureBranchExists(normalizedBranchId);

    return normalizedBranchId;
  }

  private async ensureBranchExists(branchId: string): Promise<void> {
    const branch = await this.prismaService.supplier.findUnique({
      where: {
        id: branchId,
      },
      select: {
        id: true,
      },
    });

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }
  }

  private async syncTechnicianProfile(
    transaction: Prisma.TransactionClient,
    params: {
      userId: string;
      role: Role;
      phone: string;
      status: UserStatus;
      existingTechnicianId: string | null;
    },
  ): Promise<void> {
    if (params.role === Role.TECHNICIAN) {
      if (params.existingTechnicianId) {
        await transaction.technician.update({
          where: {
            id: params.existingTechnicianId,
          },
          data: {
            phone: params.phone,
            ...(params.status === UserStatus.INACTIVE
              ? {
                  status: TechnicianStatus.OFFLINE,
                }
              : {}),
          },
        });
        return;
      }

      await transaction.technician.create({
        data: {
          userId: params.userId,
          phone: params.phone,
          status: TechnicianStatus.OFFLINE,
        },
      });
      return;
    }

    if (!params.existingTechnicianId) {
      return;
    }

    const [jobCount, visitCount, locationCount] = await Promise.all([
      transaction.job.count({
        where: {
          technicianId: params.existingTechnicianId,
        },
      }),
      transaction.jobVisit.count({
        where: {
          technicianId: params.existingTechnicianId,
        },
      }),
      transaction.locationLog.count({
        where: {
          technicianId: params.existingTechnicianId,
        },
      }),
    ]);

    if (jobCount > 0 || visitCount > 0 || locationCount > 0) {
      throw new ConflictException(
        'Technician users with jobs or location history cannot be converted to another role',
      );
    }

    await transaction.technician.delete({
      where: {
        id: params.existingTechnicianId,
      },
    });
  }

  private toApiEmployee(user: EmployeeRecord) {
    return {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      phone: user.phone,
      role: user.role,
      branchId: user.branch?.id ?? null,
      branchName: user.branch?.supplierName ?? null,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      technicianProfileId: user.technician?.id ?? null,
      technicianStatus: user.technician?.status ?? null,
    };
  }

  private normalizeOptionalString(value?: string | null): string | null {
    const normalized = value?.trim();
    if (!normalized) {
      return null;
    }

    return normalized.toLowerCase();
  }

  private normalizeOptionalId(value?: string | null): string | null {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }

  private rethrowUniqueConstraint(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Username, email, and phone number must be unique');
    }

    throw error;
  }
}

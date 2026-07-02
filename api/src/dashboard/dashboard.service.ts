import { Injectable } from '@nestjs/common';
import {
  AmcStatus,
  ComplaintStatus,
  JobStatus,
  LeadStatus,
  OutstandingStatus,
  Prisma,
  Role,
  TaskReferenceType,
  TaskStatus,
  TechnicianStatus,
} from '@prisma/client';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { EmployeeTasksService } from '../employee-tasks/employee-tasks.service';
import { PrismaService } from '../prisma/prisma.service';
import { PerformanceDashboardQueryDto } from './dto/performance-dashboard-query.dto';

const overdueOutstandingSelect =
  Prisma.validator<Prisma.OutstandingSelect>()({
    id: true,
    invoiceNumber: true,
    customerName: true,
    dueDate: true,
    outstandingAmount: true,
    status: true,
  });

const amcAlertSelect = Prisma.validator<Prisma.AmcSelect>()({
  id: true,
  amcNumber: true,
  customerName: true,
  endDate: true,
  nextBillingDate: true,
  contractAmount: true,
  status: true,
  branch: {
    select: {
      supplierName: true,
    },
  },
});

const leadAlertSelect = Prisma.validator<Prisma.LeadSelect>()({
  id: true,
  leadName: true,
  customerName: true,
  branchName: true,
  phone: true,
  source: true,
  status: true,
  nextFollowUpDate: true,
});

const complaintAlertSelect = Prisma.validator<Prisma.ComplaintSelect>()({
  id: true,
  customerName: true,
  complaintTitle: true,
  status: true,
  assignedEmployeeId: true,
  createdAt: true,
});

const OPEN_COMPLAINT_STATUSES = [
  ComplaintStatus.PENDING,
  ComplaintStatus.ASSIGNED,
  ComplaintStatus.IN_PROGRESS,
] as const;

@Injectable()
export class DashboardService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly employeeTasksService: EmployeeTasksService,
  ) {}

  async getBusinessSummary() {
    await this.expirePastAmcContracts();
    await this.employeeTasksService.refreshSharedTasks();

    const today = this.startOfDay(new Date());
    const tomorrow = this.addDays(today, 1);
    const nextThirtyDays = this.addDays(today, 30);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const nextMonthStart = new Date(today.getFullYear(), today.getMonth() + 1, 1);

    const [
      totalOutstandingAggregate,
      overdueOutstandingAggregate,
      activeAmcCount,
      amcExpiringWithin30DaysCount,
      expiredAmcCount,
      amcPaymentDueCount,
      overdueAmcPaymentCount,
      leadsThisMonthCount,
      leadsConvertedThisMonthCount,
      followUpsDueTodayCount,
      overdueFollowUpsCount,
      pendingComplaintsCount,
      pendingComplaintsAssignedCount,
      todayJobsCount,
      technicianAvailabilityCounts,
      overdueOutstandingItems,
      amcExpiringItems,
      amcPaymentDueItems,
      leadFollowUpItems,
      pendingComplaintItems,
      performance,
    ] = await Promise.all([
      this.prismaService.outstanding.aggregate({
        where: {
          outstandingAmount: {
            gt: 0,
          },
          status: {
            in: [
              OutstandingStatus.PENDING,
              OutstandingStatus.PARTIAL,
              OutstandingStatus.OVERDUE,
            ],
          },
        },
        _count: {
          _all: true,
        },
        _sum: {
          outstandingAmount: true,
        },
      }),
      this.prismaService.outstanding.aggregate({
        where: {
          outstandingAmount: {
            gt: 0,
          },
          status: OutstandingStatus.OVERDUE,
        },
        _count: {
          _all: true,
        },
        _sum: {
          outstandingAmount: true,
        },
      }),
      this.prismaService.amc.count({
        where: {
          status: AmcStatus.ACTIVE,
        },
      }),
      this.prismaService.amc.count({
        where: {
          status: AmcStatus.ACTIVE,
          endDate: {
            gte: today,
            lte: nextThirtyDays,
          },
        },
      }),
      this.prismaService.amc.count({
        where: {
          status: AmcStatus.EXPIRED,
        },
      }),
      this.prismaService.amc.count({
        where: {
          status: AmcStatus.ACTIVE,
          nextBillingDate: {
            not: null,
            lte: nextThirtyDays,
          },
        },
      }),
      this.prismaService.amc.count({
        where: {
          status: AmcStatus.ACTIVE,
          nextBillingDate: {
            not: null,
            lt: today,
          },
        },
      }),
      this.prismaService.lead.count({
        where: {
          createdAt: {
            gte: monthStart,
            lt: nextMonthStart,
          },
        },
      }),
      this.prismaService.lead.count({
        where: {
          createdAt: {
            gte: monthStart,
            lt: nextMonthStart,
          },
          status: LeadStatus.CONVERTED,
        },
      }),
      this.prismaService.lead.count({
        where: {
          nextFollowUpDate: {
            gte: today,
            lt: tomorrow,
          },
          status: {
            notIn: [LeadStatus.CONVERTED, LeadStatus.LOST],
          },
        },
      }),
      this.prismaService.lead.count({
        where: {
          nextFollowUpDate: {
            lt: today,
          },
          status: {
            notIn: [LeadStatus.CONVERTED, LeadStatus.LOST],
          },
        },
      }),
      this.prismaService.complaint.count({
        where: {
          status: {
            in: [...OPEN_COMPLAINT_STATUSES],
          },
        },
      }),
      this.prismaService.complaint.count({
        where: {
          status: {
            in: [...OPEN_COMPLAINT_STATUSES],
          },
          assignedEmployeeId: {
            not: null,
          },
        },
      }),
      this.prismaService.job.count({
        where: {
          scheduledDate: {
            gte: today,
            lt: tomorrow,
          },
        },
      }),
      this.prismaService.technician.groupBy({
        by: ['status'],
        _count: {
          _all: true,
        },
      }),
      this.prismaService.outstanding.findMany({
        where: {
          outstandingAmount: {
            gt: 0,
          },
          status: OutstandingStatus.OVERDUE,
        },
        orderBy: [{ dueDate: 'asc' }, { invoiceDate: 'asc' }],
        take: 5,
        select: overdueOutstandingSelect,
      }),
      this.prismaService.amc.findMany({
        where: {
          status: AmcStatus.ACTIVE,
          endDate: {
            gte: today,
            lte: nextThirtyDays,
          },
        },
        orderBy: [{ endDate: 'asc' }, { createdAt: 'desc' }],
        take: 5,
        select: amcAlertSelect,
      }),
      this.prismaService.amc.findMany({
        where: {
          status: AmcStatus.ACTIVE,
          nextBillingDate: {
            not: null,
            lte: nextThirtyDays,
          },
        },
        orderBy: [{ nextBillingDate: 'asc' }, { createdAt: 'desc' }],
        take: 5,
        select: amcAlertSelect,
      }),
      this.prismaService.lead.findMany({
        where: {
          nextFollowUpDate: {
            not: null,
            lt: tomorrow,
          },
          status: {
            notIn: [LeadStatus.CONVERTED, LeadStatus.LOST],
          },
        },
        orderBy: [{ nextFollowUpDate: 'asc' }, { createdAt: 'asc' }],
        take: 5,
        select: leadAlertSelect,
      }),
      this.prismaService.complaint.findMany({
        where: {
          status: {
            in: [...OPEN_COMPLAINT_STATUSES],
          },
        },
        orderBy: [{ createdAt: 'desc' }],
        take: 5,
        select: complaintAlertSelect,
      }),
      this.buildPerformanceDashboard(),
    ]);

    const technicianAvailability = {
      available: technicianAvailabilityCounts.find(
        (item) => item.status === TechnicianStatus.AVAILABLE,
      )?._count._all ?? 0,
      onJob: technicianAvailabilityCounts.find(
        (item) => item.status === TechnicianStatus.ON_JOB,
      )?._count._all ?? 0,
      offline: technicianAvailabilityCounts.find(
        (item) => item.status === TechnicianStatus.OFFLINE,
      )?._count._all ?? 0,
    };

    return {
      summary: {
        totalOutstandingAmount: this.roundCurrency(
          totalOutstandingAggregate._sum.outstandingAmount ?? 0,
        ),
        totalOutstandingCount: totalOutstandingAggregate._count._all,
        overdueOutstandingAmount: this.roundCurrency(
          overdueOutstandingAggregate._sum.outstandingAmount ?? 0,
        ),
        overdueOutstandingCount: overdueOutstandingAggregate._count._all,
        activeAmcCount,
        amcExpiringWithin30DaysCount,
        expiredAmcCount,
        amcPaymentDueCount,
        overdueAmcPaymentCount,
        leadsThisMonthCount,
        leadsConvertedThisMonthCount,
        leadConversionPercentage: this.toPercentage(
          leadsConvertedThisMonthCount,
          leadsThisMonthCount,
        ),
        followUpsDueTodayCount,
        overdueFollowUpsCount,
        pendingComplaintsCount,
        pendingComplaintsAssignedCount,
        todayJobsCount,
        technicianAvailability,
      },
      alerts: {
        overdueOutstanding: overdueOutstandingItems.map((item) => ({
          id: item.id,
          invoiceNumber: item.invoiceNumber,
          customerName: item.customerName,
          dueDate: item.dueDate,
          outstandingAmount: this.roundCurrency(item.outstandingAmount),
          status: item.status,
          daysOverdue: this.dayDifference(today, this.startOfDay(item.dueDate)),
        })),
        amcExpiringWithin30Days: amcExpiringItems.map((item) => ({
          id: item.id,
          amcNumber: item.amcNumber,
          customerName: item.customerName,
          branchName: item.branch.supplierName,
          endDate: item.endDate,
          daysUntilExpiry: this.dayDifference(
            this.startOfDay(item.endDate),
            today,
          ),
          status: item.status,
        })),
        amcPaymentDue: amcPaymentDueItems.map((item) => ({
          id: item.id,
          amcNumber: item.amcNumber,
          customerName: item.customerName,
          branchName: item.branch.supplierName,
          nextBillingDate: item.nextBillingDate,
          contractAmount: this.roundCurrency(item.contractAmount),
          daysUntilBilling: item.nextBillingDate
            ? this.dayDifference(this.startOfDay(item.nextBillingDate), today)
            : null,
          isOverdue: item.nextBillingDate
            ? this.startOfDay(item.nextBillingDate) < today
            : false,
          status: item.status,
        })),
        leadsNeedingFollowUp: leadFollowUpItems.map((item) => ({
          id: item.id,
          leadName: item.leadName,
          customerName: item.customerName,
          branchName: item.branchName,
          phone: item.phone,
          source: item.source,
          status: item.status,
          nextFollowUpDate: item.nextFollowUpDate,
          daysUntilFollowUp: item.nextFollowUpDate
            ? this.dayDifference(this.startOfDay(item.nextFollowUpDate), today)
            : null,
        })),
        pendingComplaints: pendingComplaintItems,
      },
      topEmployees: performance.employees.slice(0, 5),
      performanceCharts: performance.charts,
    };
  }

  async getEmployeeSummary(currentUser: JwtPayload) {
    await this.expirePastAmcContracts();
    await this.employeeTasksService.refreshSharedTasks();

    const today = this.startOfDay(new Date());
    const tomorrow = this.addDays(today, 1);
    const taskSummary = await this.employeeTasksService.getTaskSummary(currentUser);

    const [todayFollowUps, assignedLeadsCount, pendingComplaints, outstandingTasks] =
      await Promise.all([
        this.prismaService.lead.findMany({
          where: {
            assignedToEmployeeId: currentUser.sub,
            nextFollowUpDate: {
              gte: today,
              lt: tomorrow,
            },
            status: {
              notIn: [LeadStatus.CONVERTED, LeadStatus.LOST],
            },
          },
          orderBy: [{ nextFollowUpDate: 'asc' }, { createdAt: 'asc' }],
          take: 6,
          select: leadAlertSelect,
        }),
        this.prismaService.lead.count({
          where: {
            assignedToEmployeeId: currentUser.sub,
            status: {
              notIn: [LeadStatus.CONVERTED, LeadStatus.LOST],
            },
          },
        }),
        this.prismaService.complaint.findMany({
          where: {
            assignedEmployeeId: currentUser.sub,
            status: {
              in: [...OPEN_COMPLAINT_STATUSES],
            },
          },
          orderBy: [{ createdAt: 'desc' }],
          take: 6,
          select: complaintAlertSelect,
        }),
        this.prismaService.employeeTask.findMany({
          where: {
            assignedEmployeeId: currentUser.sub,
            referenceType: TaskReferenceType.OUTSTANDING,
            status: {
              in: [TaskStatus.PENDING, TaskStatus.IN_PROGRESS, TaskStatus.OVERDUE],
            },
          },
          orderBy: [{ dueDate: 'asc' }],
          take: 6,
          select: {
            id: true,
            title: true,
            dueDate: true,
            status: true,
            sourceSnapshot: true,
          },
        }),
      ]);

    return {
      summary: {
        todayTasks: taskSummary.todayTasks,
        overdueTasks: taskSummary.overdueTasks,
        completedTasks: taskSummary.completedTasks,
        pendingTasks: taskSummary.pendingTasks,
        todayFollowUps: todayFollowUps.length,
        outstandingCollectionTasks: outstandingTasks.length,
        assignedLeads: assignedLeadsCount,
        pendingComplaintsAssigned: pendingComplaints.length,
      },
      recentTasks: taskSummary.recentTasks,
      todayFollowUps,
      pendingComplaints,
      outstandingTasks,
    };
  }

  async getPerformanceDashboard(query: PerformanceDashboardQueryDto) {
    await this.expirePastAmcContracts();
    await this.employeeTasksService.refreshSharedTasks();

    return this.buildPerformanceDashboard(query);
  }

  private async buildPerformanceDashboard(
    query: PerformanceDashboardQueryDto = {},
  ) {
    const users = await this.prismaService.user.findMany({
      where: {
        role: {
          in: [Role.ADMIN, Role.EMPLOYEE, Role.TECHNICIAN],
        },
        ...(query.employeeId ? { id: query.employeeId } : {}),
      },
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        status: true,
        technician: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    const userIds = users.map((user) => user.id);
    if (userIds.length === 0) {
      return {
        summary: {
          totalLeadsAssigned: 0,
          totalLeadsConverted: 0,
          totalOutstandingCollected: 0,
          totalJobsCompleted: 0,
          totalRevenueGenerated: 0,
          totalAmcRenewals: 0,
          averageResponseTimeHours: 0,
        },
        employees: [],
        charts: {
          leadConversion: [],
          jobsCompleted: [],
          revenueGenerated: [],
        },
        technicianAvailability: [],
      };
    }

    const range = this.buildRange(query.fromDate, query.toDate);
    const today = this.startOfDay(new Date());

    const [leads, complaints, tasks, jobs, invoices, technicians] = await Promise.all([
      this.prismaService.lead.findMany({
        where: {
          assignedToEmployeeId: {
            in: userIds,
          },
        },
        select: {
          assignedToEmployeeId: true,
          assignedAt: true,
          createdAt: true,
          status: true,
          customerName: true,
          statusHistory: {
            orderBy: {
              createdAt: 'asc',
            },
            select: {
              status: true,
              createdAt: true,
            },
          },
        },
      }),
      this.prismaService.complaint.findMany({
        where: {
          assignedEmployeeId: {
            in: userIds,
          },
        },
        select: {
          assignedEmployeeId: true,
          status: true,
        },
      }),
      this.prismaService.employeeTask.findMany({
        where: {
          assignedEmployeeId: {
            in: userIds,
          },
        },
        select: {
          assignedEmployeeId: true,
          referenceType: true,
          status: true,
          dueDate: true,
          sourceSnapshot: true,
        },
      }),
      this.prismaService.job.findMany({
        where: {
          technician: {
            userId: {
              in: userIds,
            },
          },
        },
        select: {
          status: true,
          scheduledDate: true,
          completedAt: true,
          technician: {
            select: {
              userId: true,
              status: true,
            },
          },
        },
      }),
      this.prismaService.invoice.findMany({
        where: range
          ? {
              invoiceDate: range,
            }
          : {},
        select: {
          customerName: true,
          totalAmount: true,
          invoiceDate: true,
        },
      }),
      this.prismaService.technician.groupBy({
        by: ['status'],
        _count: {
          _all: true,
        },
      }),
    ]);

    const employees = users
      .map((user) => {
        const assignedLeads = leads.filter(
          (lead) =>
            lead.assignedToEmployeeId === user.id &&
            this.isWithinRange(lead.assignedAt ?? lead.createdAt, range),
        );
        const convertedLeads = assignedLeads.filter(
          (lead) => lead.status === LeadStatus.CONVERTED,
        );
        const customerNames = [...new Set(convertedLeads.map((lead) => lead.customerName))];
        const revenueGenerated = invoices
          .filter((invoice) => customerNames.includes(invoice.customerName))
          .reduce((sum, invoice) => sum + invoice.totalAmount, 0);
        const responseTimes = assignedLeads
          .map((lead) => {
            const firstAction = lead.statusHistory.find(
              (entry) =>
                entry.status !== LeadStatus.NEW ||
                entry.createdAt.getTime() > lead.createdAt.getTime(),
            );

            if (!firstAction) {
              return null;
            }

            return (
              (firstAction.createdAt.getTime() - lead.createdAt.getTime()) /
              (1000 * 60 * 60)
            );
          })
          .filter((value): value is number => value !== null);
        const userTasks = tasks.filter((task) => task.assignedEmployeeId === user.id);
        const completedOutstandingTasks = userTasks.filter(
          (task) =>
            task.referenceType === TaskReferenceType.OUTSTANDING &&
            task.status === TaskStatus.COMPLETED &&
            this.isWithinRange(task.dueDate, range),
        );
        const completedAmcTasks = userTasks.filter(
          (task) =>
            task.referenceType === TaskReferenceType.AMC_RENEWAL &&
            task.status === TaskStatus.COMPLETED &&
            this.isWithinRange(task.dueDate, range),
        );
        const technicianJobs = jobs.filter(
          (job) =>
            job.technician?.userId === user.id &&
            this.isWithinRange(job.scheduledDate, range),
        );
        const completedJobs = technicianJobs.filter(
          (job) =>
            job.status === JobStatus.COMPLETED &&
            this.isWithinRange(job.completedAt ?? job.scheduledDate, range),
        );
        const openComplaints = complaints.filter(
          (complaint) =>
            complaint.assignedEmployeeId === user.id &&
            complaint.status !== ComplaintStatus.CLOSED &&
            complaint.status !== ComplaintStatus.CANCELLED &&
            complaint.status !== ComplaintStatus.CONVERTED_TO_JOB,
        );
        const todayTasks = userTasks.filter(
          (task) =>
            this.startOfDay(task.dueDate).getTime() === today.getTime() &&
            task.status !== TaskStatus.COMPLETED,
        ).length;
        const completedTasks = userTasks.filter(
          (task) => task.status === TaskStatus.COMPLETED,
        ).length;
        const outstandingCollected = completedOutstandingTasks.reduce((sum, task) => {
          return sum + this.readSnapshotNumber(task.sourceSnapshot, 'outstandingAmount');
        }, 0);

        return {
          employeeId: user.id,
          employeeName: user.name,
          username: user.username,
          role: user.role,
          status: user.status,
          leadsAssigned: assignedLeads.length,
          leadsConverted: convertedLeads.length,
          outstandingCollected: this.roundCurrency(outstandingCollected),
          jobsCompleted: completedJobs.length,
          revenueGenerated: this.roundCurrency(revenueGenerated),
          amcRenewals: completedAmcTasks.length,
          averageResponseTimeHours: this.average(responseTimes),
          pendingComplaintsAssigned: openComplaints.length,
          todayTasks,
          completedTasks,
          technicianPerformance: {
            availability: user.technician?.status ?? null,
            assignedJobs: technicianJobs.length,
            completedJobs: completedJobs.length,
            completionRate: this.toPercentage(
              completedJobs.length,
              technicianJobs.length,
            ),
          },
        };
      })
      .sort((left, right) => {
        return (
          right.leadsConverted +
          right.jobsCompleted -
          (left.leadsConverted + left.jobsCompleted)
        );
      });

    const summary = employees.reduce(
      (totals, employee) => ({
        totalLeadsAssigned: totals.totalLeadsAssigned + employee.leadsAssigned,
        totalLeadsConverted: totals.totalLeadsConverted + employee.leadsConverted,
        totalOutstandingCollected:
          totals.totalOutstandingCollected + employee.outstandingCollected,
        totalJobsCompleted: totals.totalJobsCompleted + employee.jobsCompleted,
        totalRevenueGenerated:
          totals.totalRevenueGenerated + employee.revenueGenerated,
        totalAmcRenewals: totals.totalAmcRenewals + employee.amcRenewals,
      }),
      {
        totalLeadsAssigned: 0,
        totalLeadsConverted: 0,
        totalOutstandingCollected: 0,
        totalJobsCompleted: 0,
        totalRevenueGenerated: 0,
        totalAmcRenewals: 0,
      },
    );

    return {
      summary: {
        ...summary,
        averageResponseTimeHours: this.average(
          employees.map((employee) => employee.averageResponseTimeHours),
        ),
      },
      employees,
      charts: {
        leadConversion: employees.map((employee) => ({
          label: employee.employeeName,
          value: employee.leadsConverted,
        })),
        jobsCompleted: employees.map((employee) => ({
          label: employee.employeeName,
          value: employee.jobsCompleted,
        })),
        revenueGenerated: employees.map((employee) => ({
          label: employee.employeeName,
          value: employee.revenueGenerated,
        })),
      },
      technicianAvailability: technicians.map((item) => ({
        status: item.status,
        count: item._count._all,
      })),
    };
  }

  private async expirePastAmcContracts(): Promise<void> {
    const today = this.startOfDay(new Date());

    await this.prismaService.amc.updateMany({
      where: {
        status: AmcStatus.ACTIVE,
        endDate: {
          lt: today,
        },
      },
      data: {
        status: AmcStatus.EXPIRED,
      },
    });
  }

  private buildRange(
    fromDate?: string,
    toDate?: string,
  ): Prisma.DateTimeFilter | null {
    if (!fromDate && !toDate) {
      return null;
    }

    const range: Prisma.DateTimeFilter = {};
    if (fromDate) {
      range.gte = new Date(fromDate);
    }
    if (toDate) {
      const endDate = new Date(toDate);
      endDate.setHours(23, 59, 59, 999);
      range.lte = endDate;
    }

    return range;
  }

  private startOfDay(value: Date): Date {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  private addDays(value: Date, days: number): Date {
    const next = new Date(value);
    next.setDate(next.getDate() + days);
    return this.startOfDay(next);
  }

  private dayDifference(left: Date, right: Date): number {
    return Math.round((left.getTime() - right.getTime()) / (1000 * 60 * 60 * 24));
  }

  private roundCurrency(value: number): number {
    return Math.round(value * 100) / 100;
  }

  private toPercentage(value: number, total: number): number {
    if (total <= 0) {
      return 0;
    }

    return Math.round((value / total) * 10000) / 100;
  }

  private average(values: number[]): number {
    if (values.length === 0) {
      return 0;
    }

    return Math.round(
      (values.reduce((sum, value) => sum + value, 0) / values.length) * 100,
    ) / 100;
  }

  private isWithinRange(
    value: Date | null,
    range: Prisma.DateTimeFilter | null,
  ): boolean {
    if (!value || !range) {
      return true;
    }

    if (range.gte && value < range.gte) {
      return false;
    }

    if (range.lte && value > range.lte) {
      return false;
    }

    return true;
  }

  private readSnapshotNumber(
    snapshot: Prisma.JsonValue | null,
    key: string,
  ): number {
    if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
      return 0;
    }

    const value = (snapshot as Record<string, unknown>)[key];
    return typeof value === 'number' ? value : 0;
  }
}

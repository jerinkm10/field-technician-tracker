import { Injectable } from '@nestjs/common';
import {
  AmcStatus,
  LeadStatus,
  OutstandingStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

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

@Injectable()
export class DashboardService {
  constructor(private readonly prismaService: PrismaService) {}

  async getBusinessSummary() {
    await this.expirePastAmcContracts();

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
      followUpsDueTodayCount,
      overdueFollowUpsCount,
      overdueOutstandingItems,
      amcExpiringItems,
      amcPaymentDueItems,
      leadFollowUpItems,
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
    ]);

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
        followUpsDueTodayCount,
        overdueFollowUpsCount,
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
      },
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
}

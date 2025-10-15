import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { RolesGuard } from '@shared/guards/roles.guard';
import { Roles } from '@shared/decorators/roles.decorator';
import { UserRole } from '@shared/constants/user-roles.constant';
import { OrderRepository } from '@infrastructure/database/repositories/order.repository';
import { UserRepository } from '@infrastructure/database/repositories/user.repository';
import { CommissionRepository } from '@infrastructure/database/repositories/commission.repository';

@ApiTags('Dashboard')
@Controller('admin/dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class DashboardController {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly userRepository: UserRepository,
    private readonly commissionRepository: CommissionRepository,
  ) {}

  @Get('stats')
  async getDashboardStats() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    // Tổng thành viên
    const allUsersResult = await this.userRepository.findMany({ page: 1, limit: 999999 });
    const totalMembers = allUsersResult.pagination.total;
    const lastMonthMembersCount = allUsersResult.data.filter(
      u => new Date(u.createdAt) <= endOfLastMonth
    ).length;
    const totalMembersGrowth = lastMonthMembersCount > 0 
      ? ((totalMembers - lastMonthMembersCount) / lastMonthMembersCount) * 100 
      : 0;

    // Network depth - tính số cấp tối đa
    const userTree = await this.userRepository.getTree({ maxDepth: 6 });
    const calculateDepth = (nodes: any[], depth = 1): number => {
      if (!nodes || nodes.length === 0) return depth - 1;
      return Math.max(
        ...nodes.map(node => 
          node.children.length > 0 
            ? calculateDepth(node.children, depth + 1) 
            : depth
        )
      );
    };
    const networkDepth = calculateDepth(userTree);
    
    // Tổng downlines (không tính admin)
    const totalDownlines = totalMembers - 1;

    // Tổng hoa hồng
    const allCommissions = await this.commissionRepository.findAll(0, 999999);
    const totalCommission = allCommissions.data.reduce((sum: number, c: any) => sum + Number(c.amount), 0);
    const lastMonthCommissions = allCommissions.data.filter(
      (c: any) => new Date(c.createdAt) < startOfMonth
    );
    const lastMonthCommissionTotal = lastMonthCommissions.reduce((sum: number, c: any) => sum + Number(c.amount), 0);
    const totalCommissionGrowth = lastMonthCommissionTotal > 0
      ? ((totalCommission - lastMonthCommissionTotal) / lastMonthCommissionTotal) * 100
      : 0;

    // Doanh số tháng này
    const allOrders = await this.orderRepository.findAll(0, 999999);
    const thisMonthOrders = allOrders.data.filter(
      o => new Date(o.createdAt) >= startOfMonth && o.status !== 'CANCELLED'
    );
    const monthlySales = thisMonthOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
    
    const lastMonthOrders = allOrders.data.filter(
      o => new Date(o.createdAt) >= startOfLastMonth && 
           new Date(o.createdAt) <= endOfLastMonth &&
           o.status !== 'CANCELLED'
    );
    const lastMonthSales = lastMonthOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
    const monthlySalesGrowth = lastMonthSales > 0
      ? ((monthlySales - lastMonthSales) / lastMonthSales) * 100
      : 0;

    // F1 active (có đơn hàng trong tháng)
    const activeF1Users = new Set(
      thisMonthOrders
        .filter(o => o.user?.role === 'F1')
        .map(o => o.userId)
    );
    const activeF1 = activeF1Users.size;

    // Thành viên mới tháng này
    const newMembersThisMonth = allUsersResult.data.filter(
      u => new Date(u.createdAt) >= startOfMonth
    ).length;

    return {
      success: true,
      data: {
        totalMembers,
        totalMembersGrowth: Number(totalMembersGrowth.toFixed(2)),
        networkDepth,
        totalDownlines,
        totalCommission,
        totalCommissionGrowth: Number(totalCommissionGrowth.toFixed(2)),
        monthlySales,
        monthlySalesGrowth: Number(monthlySalesGrowth.toFixed(2)),
        activeF1,
        newMembersThisMonth,
      }
    };
  }

  @Get('monthly-chart')
  async getMonthlyChart(@Query('year') yearParam?: string) {
    const year = yearParam ? parseInt(yearParam) : new Date().getFullYear();
    
    const allOrders = await this.orderRepository.findAll(0, 999999);
    const allCommissions = await this.commissionRepository.findAll(0, 999999);

    const months = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];
    const revenue: number[] = [];
    const commission: number[] = [];

    for (let month = 0; month < 12; month++) {
      const startOfMonth = new Date(year, month, 1);
      const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59);

      // Doanh số
      const monthOrders = allOrders.data.filter(
        o => {
          const orderDate = new Date(o.createdAt);
          return orderDate >= startOfMonth && 
                 orderDate <= endOfMonth && 
                 o.status !== 'CANCELLED';
        }
      );
      const monthRevenue = monthOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
      revenue.push(monthRevenue);

      // Hoa hồng
      const monthCommissions = allCommissions.data.filter(
        (c: any) => {
          const commDate = new Date(c.createdAt);
          return commDate >= startOfMonth && commDate <= endOfMonth;
        }
      );
      const monthCommission = monthCommissions.reduce((sum: number, c: any) => sum + Number(c.amount), 0);
      commission.push(monthCommission);
    }

    return {
      success: true,
      data: {
        months,
        revenue,
        commission,
      }
    };
  }

  @Get('growth-chart')
  async getGrowthChart(@Query('days') daysParam?: string) {
    const days = daysParam ? parseInt(daysParam) : 30;
    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const allUsersResult = await this.userRepository.findMany({ page: 1, limit: 999999 });
    const allOrders = await this.orderRepository.findAll(0, 999999);
    const allCommissions = await this.commissionRepository.findAll(0, 999999);

    const dates: string[] = [];
    const newMembers: number[] = [];
    const sales: number[] = [];
    const commissions: number[] = [];

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const dateStr = `${date.getDate()}/${date.getMonth() + 1}`;
      dates.push(dateStr);

      const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);

      // Thành viên mới
      const dayUsers = allUsersResult.data.filter(u => {
        const userDate = new Date(u.createdAt);
        return userDate >= startOfDay && userDate <= endOfDay;
      });
      newMembers.push(dayUsers.length);

      // Doanh số
      const dayOrders = allOrders.data.filter(o => {
        const orderDate = new Date(o.createdAt);
        return orderDate >= startOfDay && 
               orderDate <= endOfDay && 
               o.status !== 'CANCELLED';
      });
      const daySales = dayOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
      sales.push(daySales);

      // Hoa hồng
      const dayCommissions = allCommissions.data.filter((c: any) => {
        const commDate = new Date(c.createdAt);
        return commDate >= startOfDay && commDate <= endOfDay;
      });
      const dayCommission = dayCommissions.reduce((sum: number, c: any) => sum + Number(c.amount), 0);
      commissions.push(dayCommission);
    }

    return {
      success: true,
      data: {
        dates,
        newMembers,
        sales,
        commissions,
      }
    };
  }

  @Get('tier-distribution')
  async getTierDistribution() {
    const allUsersResult = await this.userRepository.findMany({ page: 1, limit: 999999 });
    
    const distribution = {
      F1: 0,
      F2: 0,
      F3: 0,
      F4: 0,
      F5: 0,
      F6: 0,
    };

    allUsersResult.data.forEach(user => {
      if (user.role && user.role.startsWith('F') && distribution.hasOwnProperty(user.role)) {
        distribution[user.role as keyof typeof distribution]++;
      }
    });

    return {
      success: true,
      data: distribution,
    };
  }

  @Get('recent-orders')
  async getRecentOrders() {
    // Get 10 most recent orders (skip=0, take=10)
    const ordersResult = await this.orderRepository.findAll(0, 10);

    const ordersWithCommissions = await Promise.all(
      ordersResult.data.map(async (order: any) => {
        // Get commissions for this specific order
        const commissions = await this.commissionRepository.findByOrderId(order.id);

        const totalCommission = commissions.reduce(
          (sum: number, c: any) => sum + Number(c.amount || 0),
          0,
        );

        return {
          id: order.id,
          orderNumber: order.orderNumber,
          customerName: order.user
            ? `${order.user.firstName || ''} ${order.user.lastName || ''}`.trim() ||
              order.user.username ||
              order.user.email
            : 'N/A',
          totalAmount: Number(order.totalAmount),
          commission: totalCommission,
          status: order.status,
          createdAt: order.createdAt,
          items: order.items?.length || 0,
        };
      }),
    );

    return {
      success: true,
      data: ordersWithCommissions,
    };
  }
}


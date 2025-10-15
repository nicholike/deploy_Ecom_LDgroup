import { useEffect, useState } from "react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  GroupIcon,
} from "../../icons";
import Badge from "../ui/badge/Badge";
import { DashboardService, type DashboardStats } from "../../services/dashboard.service";

export default function EcommerceMetrics() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoading(true);
        const data = await DashboardService.getStats();
        setStats(data);
      } catch (error) {
        console.error('Failed to load dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('vi-VN').format(num);
  };

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(num);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 animate-pulse">
            <div className="w-12 h-12 bg-gray-200 rounded-xl dark:bg-gray-700"></div>
            <div className="mt-5 space-y-2">
              <div className="h-4 bg-gray-200 rounded dark:bg-gray-700 w-24"></div>
              <div className="h-6 bg-gray-200 rounded dark:bg-gray-700 w-32"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6">
      {/* Card 1: Tổng thành viên */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
        <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
          <GroupIcon className="text-gray-800 size-6 dark:text-white/90" />
        </div>

        <div className="flex items-end justify-between mt-5">
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Tổng thành viên
            </span>
            <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
              {formatNumber(stats?.totalMembers || 0)}
            </h4>
          </div>
          {stats && stats.totalMembersGrowth !== 0 && (
            <Badge color={stats.totalMembersGrowth > 0 ? "success" : "error"}>
              {stats.totalMembersGrowth > 0 ? <ArrowUpIcon /> : <ArrowDownIcon />}
              {Math.abs(stats.totalMembersGrowth).toFixed(2)}%
            </Badge>
          )}
        </div>
      </div>

      {/* Card 2: Hệ thống downline */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
        <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
          <svg className="text-gray-800 size-6 dark:text-white/90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <div className="flex items-end justify-between mt-5">
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Hệ thống downline
            </span>
            <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
              {formatNumber(stats?.totalDownlines || 0)}
            </h4>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {stats?.networkDepth || 0} cấp
            </p>
          </div>
        </div>
      </div>

      {/* Card 3: Tổng hoa hồng */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
        <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
          <svg className="text-gray-800 size-6 dark:text-white/90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="flex items-end justify-between mt-5">
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Tổng hoa hồng
            </span>
            <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
              {formatCurrency(stats?.totalCommission || 0)}
            </h4>
          </div>
          {stats && stats.totalCommissionGrowth !== 0 && (
            <Badge color={stats.totalCommissionGrowth > 0 ? "success" : "error"}>
              {stats.totalCommissionGrowth > 0 ? <ArrowUpIcon /> : <ArrowDownIcon />}
              {Math.abs(stats.totalCommissionGrowth).toFixed(2)}%
            </Badge>
          )}
        </div>
      </div>

      {/* Card 4: Doanh số tháng */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
        <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
          <svg className="text-gray-800 size-6 dark:text-white/90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
        </div>
        <div className="flex items-end justify-between mt-5">
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Doanh số tháng
            </span>
            <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
              {formatCurrency(stats?.monthlySales || 0)}
            </h4>
          </div>
          {stats && stats.monthlySalesGrowth !== 0 && (
            <Badge color={stats.monthlySalesGrowth > 0 ? "success" : "error"}>
              {stats.monthlySalesGrowth > 0 ? <ArrowUpIcon /> : <ArrowDownIcon />}
              {Math.abs(stats.monthlySalesGrowth).toFixed(2)}%
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

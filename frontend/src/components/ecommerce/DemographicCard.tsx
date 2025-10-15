import { useState, useEffect } from "react";
import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import { DashboardService, type TierDistribution } from "../../services/dashboard.service";

export default function DemographicCard() {
  const [tierData, setTierData] = useState<TierDistribution | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const data = await DashboardService.getTierDistribution();
        setTierData(data);
      } catch (error) {
        console.error('Failed to load tier distribution:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const tiers = ['F1', 'F2', 'F3', 'F4', 'F5', 'F6'];
  const counts = tierData ? [tierData.F1, tierData.F2, tierData.F3, tierData.F4, tierData.F5, tierData.F6] : [];

  const options: ApexOptions = {
    chart: {
      type: 'donut',
      fontFamily: "Outfit, sans-serif",
    },
    colors: ['#465FFF', '#FFA500', '#10B981', '#8B5CF6', '#EC4899', '#F59E0B'],
    labels: tiers,
    legend: {
      show: true,
      position: 'bottom',
    },
    plotOptions: {
      pie: {
        donut: {
          size: '65%',
          labels: {
            show: true,
            total: {
              show: true,
              label: 'Tổng',
              formatter: function(w) {
                const total = w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0);
                return total.toString();
              }
            }
          }
        }
      }
    },
    dataLabels: {
      enabled: true,
      formatter: function(val: number) {
        return val.toFixed(1) + "%";
      }
    },
    tooltip: {
      y: {
        formatter: function(val: number) {
          return val + " thành viên";
        }
      }
    },
  };

  const series = counts;

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
        <div>
          <div className="h-7 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-700 mb-2" />
          <div className="h-4 w-64 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        </div>
        <div className="my-6">
          <div className="h-[300px] animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        </div>
      </div>
    );
  }

  const total = series.reduce((a, b) => a + b, 0);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
      <div className="flex justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Phân bố theo cấp độ
          </h3>
          <p className="mt-1 text-gray-500 text-theme-sm dark:text-gray-400">
            Số lượng thành viên theo từng cấp F1-F6
          </p>
        </div>
      </div>

      <div className="py-6 my-2">
        <Chart 
          options={options} 
          series={series} 
          type="donut" 
          height={300} 
        />
      </div>

      <div className="space-y-3 mt-4">
        {tiers.map((tier, index) => {
          const count = counts[index];
          const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : '0';
          const colors = ['#465FFF', '#FFA500', '#10B981', '#8B5CF6', '#EC4899', '#F59E0B'];
          
          return (
            <div key={tier} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: colors[index] }}
                />
                <div>
                  <p className="font-semibold text-gray-800 text-theme-sm dark:text-white/90">
                    {tier}
                  </p>
                  <span className="block text-gray-500 text-theme-xs dark:text-gray-400">
                    {count} thành viên
                  </span>
                </div>
              </div>

              <div className="flex w-full max-w-[140px] items-center gap-3">
                <div className="relative block h-2 w-full max-w-[100px] rounded bg-gray-200 dark:bg-gray-800">
                  <div 
                    className="absolute left-0 top-0 flex h-full items-center justify-center rounded text-xs font-medium text-white"
                    style={{ 
                      width: `${percentage}%`,
                      backgroundColor: colors[index]
                    }}
                  />
                </div>
                <p className="font-medium text-gray-800 text-theme-sm dark:text-white/90">
                  {percentage}%
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

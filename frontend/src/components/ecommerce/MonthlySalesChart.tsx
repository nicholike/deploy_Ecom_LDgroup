import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import { useState, useEffect } from "react";
import { DashboardService, type MonthlyChartData } from "../../services/dashboard.service";

export default function MonthlySalesChart() {
  const [chartData, setChartData] = useState<MonthlyChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const data = await DashboardService.getMonthlyChart(selectedYear);
        setChartData(data);
      } catch (error) {
        console.error('Failed to load monthly chart:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [selectedYear]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const options: ApexOptions = {
    colors: ["#465fff", "#FFA500"],
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "bar",
      height: 180,
      toolbar: {
        show: false,
      },
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "55%",
        borderRadius: 5,
        borderRadiusApplication: "end",
      },
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      show: true,
      width: 4,
      colors: ["transparent"],
    },
    xaxis: {
      categories: chartData?.months || [],
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
    },
    legend: {
      show: true,
      position: "top",
      horizontalAlign: "left",
      fontFamily: "Outfit",
    },
    yaxis: {
      title: {
        text: undefined,
      },
      labels: {
        formatter: (val: number) => {
          if (val >= 1000000) {
            return (val / 1000000).toFixed(1) + 'M';
          }
          if (val >= 1000) {
            return (val / 1000).toFixed(1) + 'K';
          }
          return val.toFixed(0);
        },
      },
    },
    grid: {
      yaxis: {
        lines: {
          show: true,
        },
      },
    },
    fill: {
      opacity: 1,
    },
    tooltip: {
      x: {
        show: false,
      },
      y: {
        formatter: (val: number) => formatCurrency(val),
      },
    },
  };

  const series = [
    {
      name: "Doanh số",
      data: chartData?.revenue || [],
    },
    {
      name: "Hoa hồng",
      data: chartData?.commission || [],
    },
  ];

  if (loading) {
    return (
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded dark:bg-gray-700 w-48 mb-4"></div>
        <div className="h-[180px] bg-gray-200 rounded dark:bg-gray-700"></div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          Doanh số & Hoa hồng theo tháng
        </h3>
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
        >
          <option value={2024}>2024</option>
          <option value={2025}>2025</option>
        </select>
      </div>

      <div className="max-w-full overflow-x-auto custom-scrollbar">
        <div className="-ml-5 min-w-[650px] xl:min-w-full pl-2">
          <Chart options={options} series={series} type="bar" height={180} />
        </div>
      </div>
    </div>
  );
}

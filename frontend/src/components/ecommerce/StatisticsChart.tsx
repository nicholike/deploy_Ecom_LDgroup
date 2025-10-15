import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import { useState, useEffect } from "react";
import ChartTab from "../common/ChartTab";
import { DashboardService, type GrowthChartData } from "../../services/dashboard.service";

export default function StatisticsChart() {
  const [chartData, setChartData] = useState<GrowthChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDays, setSelectedDays] = useState(30);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const data = await DashboardService.getGrowthChart(selectedDays);
        setChartData(data);
      } catch (error) {
        console.error('Failed to load growth chart:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [selectedDays]);

  const formatCurrency = (val: number) => {
    if (val >= 1000000) {
      return (val / 1000000).toFixed(1) + 'M';
    }
    if (val >= 1000) {
      return (val / 1000).toFixed(1) + 'K';
    }
    return val.toFixed(0);
  };

  const options: ApexOptions = {
    legend: {
      show: true,
      position: "top",
      horizontalAlign: "left",
    },
    colors: ["#465FFF", "#FFA500", "#10B981"],
    chart: {
      fontFamily: "Outfit, sans-serif",
      height: 310,
      type: "line",
      toolbar: {
        show: false,
      },
    },
    stroke: {
      curve: "smooth",
      width: [2, 2, 2],
    },
    fill: {
      type: "gradient",
      gradient: {
        opacityFrom: 0.55,
        opacityTo: 0,
      },
    },
    markers: {
      size: 0,
      strokeColors: "#fff",
      strokeWidth: 2,
      hover: {
        size: 6,
      },
    },
    grid: {
      xaxis: {
        lines: {
          show: false,
        },
      },
      yaxis: {
        lines: {
          show: true,
        },
      },
    },
    dataLabels: {
      enabled: false,
    },
    tooltip: {
      enabled: true,
      x: {
        show: true,
      },
      y: {
        formatter: (val: number, opts: any) => {
          const seriesName = opts.w.config.series[opts.seriesIndex].name;
          if (seriesName === "Thành viên mới") {
            return val.toString() + " người";
          }
          return formatCurrency(val) + " đ";
        },
      },
    },
    xaxis: {
      type: "category",
      categories: chartData?.dates || [],
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
      tooltip: {
        enabled: false,
      },
    },
    yaxis: {
      labels: {
        style: {
          fontSize: "12px",
          colors: ["#6B7280"],
        },
        formatter: formatCurrency,
      },
      title: {
        text: "",
        style: {
          fontSize: "0px",
        },
      },
    },
  };

  const series = [
    {
      name: "Thành viên mới",
      data: chartData?.newMembers || [],
    },
    {
      name: "Doanh số",
      data: chartData?.sales || [],
    },
    {
      name: "Hoa hồng",
      data: chartData?.commissions || [],
    },
  ];

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white px-5 pb-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
        <div className="flex flex-col gap-5 mb-6 sm:flex-row sm:justify-between">
          <div className="h-7 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-7 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        </div>
        <div className="max-w-full overflow-x-auto custom-scrollbar">
          <div className="min-w-[1000px] xl:min-w-full">
            <div className="h-[310px] animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-5 pb-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
      <div className="flex flex-col gap-5 mb-6 sm:flex-row sm:justify-between">
        <div className="w-full">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Biểu đồ tăng trưởng {selectedDays} ngày
          </h3>
          <p className="mt-1 text-gray-500 text-theme-sm dark:text-gray-400">
            Theo dõi sự tăng trưởng về thành viên, doanh số và hoa hồng
          </p>
        </div>
        <div className="flex items-start w-full gap-3 sm:justify-end">
          <select
            value={selectedDays}
            onChange={(e) => setSelectedDays(Number(e.target.value))}
            className="rounded border border-stroke bg-transparent px-3 py-1.5 text-sm outline-none dark:border-strokedark"
          >
            <option value={7}>7 ngày</option>
            <option value={30}>30 ngày</option>
            <option value={90}>90 ngày</option>
          </select>
        </div>
      </div>

      <div className="max-w-full overflow-x-auto custom-scrollbar">
        <div className="min-w-[1000px] xl:min-w-full">
          <Chart options={options} series={series} type="area" height={310} />
        </div>
      </div>
    </div>
  );
}

const TreeLegend: React.FC = () => {
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-lg border border-gray-200 bg-white p-4 text-xs shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
      <div className="flex items-center gap-2">
        <div className="h-6 w-px bg-gray-300 dark:bg-gray-700" />
        <span>Liên kết dọc</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-px w-10 bg-gray-300 dark:bg-gray-700" />
        <span>Liên kết ngang</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="inline-flex rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold uppercase text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
          F*
        </span>
        <span>Vai trò / cấp</span>
      </div>
    </div>
  );
};

export default TreeLegend;

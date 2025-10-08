export class DateUtil {
  /**
   * Get current period in YYYY-MM format
   */
  static getCurrentPeriod(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  /**
   * Get period from date
   */
  static getPeriodFromDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  /**
   * Parse period string to date range
   */
  static parsePeriod(period: string): { start: Date; end: Date } {
    const [year, month] = period.split('-').map(Number);
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59, 999);
    return { start, end };
  }

  /**
   * Check if date is in period
   */
  static isInPeriod(date: Date, period: string): boolean {
    const { start, end } = this.parsePeriod(period);
    return date >= start && date <= end;
  }

  /**
   * Get previous period
   */
  static getPreviousPeriod(period: string): string {
    const [year, month] = period.split('-').map(Number);
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    return `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
  }

  /**
   * Get next period
   */
  static getNextPeriod(period: string): string {
    const [year, month] = period.split('-').map(Number);
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    return `${nextYear}-${String(nextMonth).padStart(2, '0')}`;
  }
}

export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const dayOfWeek = d.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getCurrentWeekMonday(): string {
  return formatDate(getMondayOfWeek(new Date()));
}

export function getWeekDates(mondayStr: string): string[] {
  const monday = parseDate(mondayStr);
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(formatDate(d));
  }
  return dates;
}

export function addWeeks(mondayStr: string, weeks: number): string {
  const d = parseDate(mondayStr);
  d.setDate(d.getDate() + weeks * 7);
  return formatDate(d);
}

export function isWeekend(dateStr: string): boolean {
  const d = parseDate(dateStr);
  const day = d.getDay();
  return day === 0 || day === 6;
}

export function getDateDisplay(dateStr: string): { month: number; day: number; weekday: string } {
  const d = parseDate(dateStr);
  const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  return {
    month: d.getMonth() + 1,
    day: d.getDate(),
    weekday: weekdays[d.getDay()],
  };
}

export function getWeekRangeStr(mondayStr: string): string {
  const dates = getWeekDates(mondayStr);
  const start = parseDate(dates[0]);
  const end = parseDate(dates[6]);
  return `${start.getFullYear()}年${start.getMonth() + 1}月${start.getDate()}日 - ${end.getMonth() + 1}月${end.getDate()}日`;
}

export function formatDateCompact(dateStr: string): string {
  const d = parseDate(dateStr);
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}

export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
}

export function getShortName(fullName: string): string {
  const trimmed = fullName.trim();
  if (trimmed.length <= 2) return trimmed;
  return trimmed.slice(0, 2);
}

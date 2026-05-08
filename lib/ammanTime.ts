export const AMMAN_TIME_ZONE = "Asia/Amman";

type DateTimeParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

const ammanDateTimeFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: AMMAN_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

const ammanWeekdayFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: AMMAN_TIME_ZONE,
  weekday: "long",
});

function readParts(date: Date): DateTimeParts {
  const parts = ammanDateTimeFormatter.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => {
    const value = Number(parts.find((part) => part.type === type)?.value);
    return Number.isFinite(value) ? value : 0;
  };
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

function getAmmanOffsetMs(date: Date): number {
  const parts = readParts(date);
  const wallClockAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  return wallClockAsUtc - date.getTime();
}

function parseDateKey(dateKey: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateKey || "").trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}

function parseClock(clock: string): { hour: number; minute: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(clock || "").trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

export function parseAmmanDateTime(dateKey: string, clock: string): Date | null {
  const date = parseDateKey(dateKey);
  const time = parseClock(clock);
  if (!date || !time) return null;

  const wallClockAsUtc = Date.UTC(
    date.year,
    date.month - 1,
    date.day,
    time.hour,
    time.minute,
    0,
    0,
  );
  const firstPass = new Date(wallClockAsUtc - getAmmanOffsetMs(new Date(wallClockAsUtc)));
  const corrected = new Date(wallClockAsUtc - getAmmanOffsetMs(firstPass));
  return Number.isNaN(corrected.getTime()) ? null : corrected;
}

export function formatAmmanDateKey(date: Date): string {
  const parts = readParts(date);
  return [
    String(parts.year).padStart(4, "0"),
    String(parts.month).padStart(2, "0"),
    String(parts.day).padStart(2, "0"),
  ].join("-");
}

export function formatAmmanTimeKey(date: Date): string {
  const parts = readParts(date);
  return `${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}`;
}

export function ammanWeekdayKey(dateKey: string): string {
  const date = parseDateKey(dateKey);
  if (!date) return "";
  const noonUtc = new Date(Date.UTC(date.year, date.month - 1, date.day, 12, 0, 0, 0));
  return ammanWeekdayFormatter.format(noonUtc).toUpperCase();
}

export function addDaysToDateKey(dateKey: string, days: number): string {
  const date = parseDateKey(dateKey);
  if (!date) return dateKey;
  const next = new Date(Date.UTC(date.year, date.month - 1, date.day + days, 12, 0, 0, 0));
  return next.toISOString().slice(0, 10);
}

export function parseAmmanDayStart(dateKey: string): Date | null {
  return parseAmmanDateTime(dateKey, "00:00");
}

export function parseAmmanDayEnd(dateKey: string): Date | null {
  const nextStart = parseAmmanDayStart(addDaysToDateKey(dateKey, 1));
  return nextStart ? new Date(nextStart.getTime() - 1) : null;
}

export function isAmmanDateBeforeToday(dateKey: string): boolean {
  return dateKey < formatAmmanDateKey(new Date());
}

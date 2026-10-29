import { isWeekday, wibToday } from "./time.js";
export function calendarStatus(date: string, saved: boolean, now?: Date) {
  const today = wibToday(now);
  if (saved) return { status: "green", reason: "saved" };
  if (!isWeekday(date)) return { status: "gray", reason: "weekend" };
  if (date < today) return { status: "red", reason: "missed" };
  return { status: "gray", reason: date === today ? "today_unfilled" : "future" };
}

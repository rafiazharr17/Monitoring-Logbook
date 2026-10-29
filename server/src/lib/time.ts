const parts = (date = new Date()) => Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit", weekday: "short", hour: "2-digit", hourCycle: "h23" }).formatToParts(date).filter(x => x.type !== "literal").map(x => [x.type, x.value]));
export const wibToday = (date?: Date) => { const p = parts(date); return `${p.year}-${p.month}-${p.day}`; };
export const isWeekday = (date: string) => { const day = new Date(`${date}T12:00:00Z`).getUTCDay(); return day > 0 && day < 6; };
export const wibHour = (date?: Date) => Number(parts(date).hour);

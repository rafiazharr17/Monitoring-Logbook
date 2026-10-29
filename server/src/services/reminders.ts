import { db } from "../lib/db.js";
import { isWeekday, wibToday } from "../lib/time.js";
type Channel = "email" | "whatsapp";
async function send(channel: Channel, user: any, date: string) {
  const url = process.env.APP_BASE_URL || "";
  if (channel === "email") { if (!process.env.EMAIL_API_KEY) throw new Error("EMAIL_NOT_CONFIGURED"); const r = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${process.env.EMAIL_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ from: process.env.EMAIL_FROM, to: user.email, subject: "Pengingat logbook harian", html: `<p>Logbook ${date} belum diisi.</p><p><a href="${url}">Buka Logbook</a></p>` }) }); if (!r.ok) throw new Error("EMAIL_PROVIDER_ERROR"); return (await r.json() as { id: string }).id; }
  if (!process.env.WHATSAPP_ACCESS_TOKEN || !process.env.WHATSAPP_PHONE_NUMBER_ID) throw new Error("WHATSAPP_NOT_CONFIGURED"); const r = await fetch(`https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, { method: "POST", headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`, "Content-Type": "application/json" }, body: JSON.stringify({ messaging_product: "whatsapp", to: user.whatsapp_number.replace(/^\+/, ""), type: "template", template: { name: process.env.WHATSAPP_TEMPLATE_NAME, language: { code: process.env.WHATSAPP_TEMPLATE_LANGUAGE || "id" }, components: [{ type: "body", parameters: [{ type: "text", text: date }, { type: "text", text: url }] }] } }) }); if (!r.ok) throw new Error("WHATSAPP_PROVIDER_ERROR"); return (await r.json() as { messages: { id: string }[] }).messages[0]?.id;
}
export async function runReminders(slot: "15:00" | "19:00") {
  const date = wibToday(); if (!isWeekday(date)) return { date, skipped: "weekend" };
  const [users] = await db.query<any[]>(`SELECT u.* FROM users u LEFT JOIN logbooks l ON l.user_id=u.id AND l.entry_date=? WHERE l.id IS NULL AND (u.email_verified_at IS NOT NULL OR (u.whatsapp_verified_at IS NOT NULL AND u.whatsapp_opt_in_at IS NOT NULL))`, [date]);
  const result = { date, eligible: users.length, sent: 0, failed: 0, skipped: 0 };
  for (const user of users) for (const channel of ["email", "whatsapp"] as Channel[]) {
    if (channel === "email" && !user.email_verified_at || channel === "whatsapp" && (!user.whatsapp_verified_at || !user.whatsapp_opt_in_at)) continue;
    const [reserve] = await db.query<any>("INSERT IGNORE INTO notification_deliveries (user_id,entry_date,slot,channel,status) VALUES (?,?,?,?, 'pending')", [user.id, date, slot, channel]); if (!reserve.affectedRows) continue;
    const [logs] = await db.query<any[]>("SELECT id FROM logbooks WHERE user_id=? AND entry_date=?", [user.id, date]);
    if (logs.length) { await db.query("UPDATE notification_deliveries SET status='skipped' WHERE user_id=? AND entry_date=? AND slot=? AND channel=?", [user.id, date, slot, channel]); result.skipped++; continue; }
    await db.query("UPDATE notification_deliveries SET status='sending',attempt_count=attempt_count+1 WHERE user_id=? AND entry_date=? AND slot=? AND channel=?", [user.id, date, slot, channel]);
    try { const id = await send(channel, user, date); await db.query("UPDATE notification_deliveries SET status='sent',provider_message_id=?,sent_at=UTC_TIMESTAMP() WHERE user_id=? AND entry_date=? AND slot=? AND channel=?", [id, user.id, date, slot, channel]); result.sent++; } catch (e) { await db.query("UPDATE notification_deliveries SET status='failed',last_error_code=? WHERE user_id=? AND entry_date=? AND slot=? AND channel=?", [e instanceof Error ? e.message : "UNKNOWN", user.id, date, slot, channel]); result.failed++; }
  } return result;
}

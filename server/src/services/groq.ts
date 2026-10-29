import { z } from "zod";
const output = z.object({ learning: z.string().min(1).max(2000), obstacles: z.string().min(1).max(2000) });
export async function generateLogbook(activity: string) {
  if (!process.env.GROQ_API_KEY) throw new Error("Layanan AI belum dikonfigurasi.");
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 15_000);
  try { const response = await fetch("https://api.groq.com/openai/v1/chat/completions", { method: "POST", signal: controller.signal, headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile", response_format: { type: "json_object" }, messages: [{ role: "system", content: "Bahasa Indonesia formal ringkas. Balas JSON {learning,obstacles}. Hanya simpulkan dari aktivitas. Jangan mengarang fakta atau kendala. Jika tidak disebut, obstacles: Tidak ada kendala yang dilaporkan." }, { role: "user", content: activity }] }) }); if (!response.ok) throw new Error("Groq tidak dapat memproses permintaan."); const json = await response.json() as { choices?: { message?: { content?: string } }[] }; return output.parse(JSON.parse(json.choices?.[0]?.message?.content || "")); } finally { clearTimeout(timer); }
}

function text(value: string) { return value.replace(/[&<>"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character]!); }

export async function sendVerificationEmail(email: string, token: string) {
  if (!process.env.EMAIL_API_KEY || !process.env.EMAIL_FROM || !process.env.APP_BASE_URL) throw new Error("EMAIL_NOT_CONFIGURED");
  const link = `${process.env.APP_BASE_URL.replace(/\/$/, "")}/api/auth/verify-email?token=${encodeURIComponent(token)}`;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.EMAIL_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: "Verifikasi email Logbook Harian",
      html: `<p>Verifikasi alamat email Anda untuk mengaktifkan pengingat logbook.</p><p><a href="${link}">Verifikasi email</a></p><p>Tautan berlaku 24 jam. Abaikan email ini jika Anda tidak membuat akun.</p>`,
      text: `Verifikasi email Anda: ${link}\n\nTautan berlaku 24 jam. Abaikan email ini jika Anda tidak membuat akun.`
    })
  });
  if (!response.ok) throw new Error(`EMAIL_PROVIDER_${response.status}`);
  return (await response.json() as { id: string }).id;
}

export function verificationResultPage(message: string, success: boolean) {
  const title = success ? "Email terverifikasi" : "Verifikasi gagal";
  return `<!doctype html><html lang="id"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><body style="font-family:Arial,sans-serif;max-width:560px;margin:64px auto;padding:24px;color:#17221d"><h1>${title}</h1><p>${text(message)}</p><p><a href="/">Kembali ke Logbook Harian</a></p></body></html>`;
}

import type { NextFunction, Request, Response } from "express";
const hits = new Map<string, { count: number; reset: number }>();
export const rateLimit = (limit: number, windowMs = 60_000) => (req: Request, res: Response, next: NextFunction) => { const key = `${req.ip}:${req.path}`; const now = Date.now(); const hit = hits.get(key); if (!hit || hit.reset < now) { hits.set(key, { count: 1, reset: now + windowMs }); return next(); } if (++hit.count > limit) return res.status(429).json({ error: "Terlalu banyak permintaan. Coba lagi nanti." }); next(); };

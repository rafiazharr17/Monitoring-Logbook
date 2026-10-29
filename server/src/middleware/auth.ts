import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
declare global { namespace Express { interface Request { userId?: number } } }
export function setSession(res: Response, userId: number) { res.cookie("session", jwt.sign({ userId }, process.env.SESSION_SECRET!, { expiresIn: "7d" }), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/" }); }
export function requireAuth(req: Request, res: Response, next: NextFunction) { try { req.userId = Number((jwt.verify(req.cookies.session || "", process.env.SESSION_SECRET!) as { userId: number }).userId); next(); } catch { res.status(401).json({ error: "Sesi tidak valid." }); } }

import dotenv from "dotenv"; import mysql from "mysql2/promise";
dotenv.config({ path: new URL("../../../.env", import.meta.url) });

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL wajib diatur.");
export const db = mysql.createPool({ uri: process.env.DATABASE_URL, connectionLimit: 5, waitForConnections: true, ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: true } : undefined });

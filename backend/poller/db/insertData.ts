import type { Ticker } from "../types";
import { pool } from "./db";

export async function insertTrade(dbData: Ticker ) {
    await pool.query(
        `INSERT INTO trades (E, s, t, p, q, T)
        VALUES ($1, $2, $3, $4, $5, $6)`,
        [dbData.E, dbData.s, dbData.t, dbData.p, dbData.q, dbData.T]
    );
}

import type { Ticker } from "../types";
import { pool } from '@exchange/db';

export async function insertTrade(dbData: Ticker ) {
    await pool.query(
        `INSERT INTO trades (e, s, trade_id, p, q, t)
        VALUES ($1, $2, $3, $4, $5, $6)`,
        [dbData.E, dbData.s, dbData.t, dbData.p, dbData.q, dbData.T]
    );
}

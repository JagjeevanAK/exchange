import { Pool } from "pg";

export const pool = new Pool({
    connectionString: process.env.DATABASE_URL
})

const timeframes = [
    { name: '1s', interval: '1 second' },
    { name: '1m', interval: '1 minute' },
    { name: '5m', interval: '5 minutes' },
    { name: '15m', interval: '15 minutes' },
    { name: '30m', interval: '30 minutes' },
    { name: '1H', interval: '1 hour' },
    { name: '1D', interval: '1 day' },
    { name: '1W', interval: '1 week' },
];

const initDB = async () => {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        await client.query(`
            CREATE TABLE IF NOT EXISTS trades (
                E TIMESTAMPTZ NOT NULL,
                s TEXT NOT NULL,
                t BIGINT NOT NULL,
                p NUMERIC NOT NULL,
                q NUMERIC NOT NULL,
                T TIMESTAMPTZ NOT NULL
            );
        `);

        await client.query(`
            SELECT create_hypertable('trades', 'T', if_not_exists => TRUE);
        `);

        await client.query(`
            CREATE INDEX IF NOT EXISTS trades_symbol_time_idx ON trades (s, T DESC);
        `);

        for (const tf of timeframes) {
            const viewName = `trades_${tf.name}`;

            await client.query(`
                CREATE MATERIALIZED VIEW IF NOT EXISTS ${viewName}
                WITH (timescaledb.continuous) AS
                SELECT
                    time_bucket('${tf.interval}', T) AS bucket,
                    s AS symbol,
                    FIRST(p, T) AS open,
                    MAX(p) AS high,
                    MIN(p) AS low,
                    LAST(p, T) AS close,
                    SUM(q) AS volume
                FROM trades
                GROUP BY bucket, s;
            `);

            await client.query(`
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM timescaledb_information.continuous_aggregates
                        WHERE view_name = '${viewName}'
                    ) THEN
                        PERFORM add_continuous_aggregate_policy(
                            '${viewName}',
                            start_offset => INTERVAL '1 day',
                            end_offset   => INTERVAL '${tf.interval}',
                            schedule_interval => INTERVAL '${tf.interval}'
                        );
                    END IF;
                END
            `);
        }
        
        await client.query("COMMIT");
        console.log("DB initialized with all timeframes!");
    } catch (e) {
        await client.query('ROLLBACK');
        console.error("DB init failed:", e);
    } finally {
        client.release();
    }
}

initDB();

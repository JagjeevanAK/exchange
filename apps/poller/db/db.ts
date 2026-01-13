import { pool, timeframes } from '@exchange/db';

const initDB = async () => {
  const client = await pool.connect();

  try {
    // Create table and hypertable first (can be in transaction)
    await client.query('BEGIN');

    await client.query(`
            CREATE TABLE IF NOT EXISTS trades (
                e TIMESTAMPTZ NOT NULL,
                s TEXT NOT NULL,
                trade_id TEXT NOT NULL,
                p NUMERIC NOT NULL,
                q NUMERIC NOT NULL,
                t TIMESTAMPTZ NOT NULL
            );
        `);

    await client.query(`
            SELECT create_hypertable('trades', 't', if_not_exists => TRUE);
        `);

    await client.query(`
            CREATE INDEX IF NOT EXISTS trades_symbol_time_idx ON trades (s, t DESC);
        `);

    await client.query('COMMIT');
    console.log('Basic table structure created!');

    // Create materialized views outside transaction
    for (const tf of timeframes) {
      const viewName = `trades_${tf.name}`;

      try {
        await client.query(`
                    CREATE MATERIALIZED VIEW IF NOT EXISTS ${viewName}
                    WITH (timescaledb.continuous) AS
                    SELECT
                        time_bucket('${tf.interval}', t) AS bucket,
                        s AS symbol,
                        FIRST(p, t) AS open,
                        MAX(p) AS high,
                        MIN(p) AS low,
                        LAST(p, t) AS close,
                        SUM(q) AS volume
                    FROM trades
                    GROUP BY bucket, s;
                `);
        console.log(`Created view: ${viewName}`);
      } catch (e) {
        console.log(
          `View ${viewName} might already exist:`,
          e instanceof Error ? e.message : String(e)
        );
      }

      try {
        let startOffset, endOffset, scheduleInterval;

        switch (tf.name) {
          case '1s':
            startOffset = "INTERVAL '1 hour'";
            endOffset = "INTERVAL '1 second'";
            scheduleInterval = "INTERVAL '10 seconds'";
            break;
          case '1m':
            startOffset = "INTERVAL '2 hours'";
            endOffset = "INTERVAL '1 minute'";
            scheduleInterval = "INTERVAL '1 minute'";
            break;
          case '5m':
            startOffset = "INTERVAL '6 hours'";
            endOffset = "INTERVAL '5 minutes'";
            scheduleInterval = "INTERVAL '5 minutes'";
            break;
          case '15m':
            startOffset = "INTERVAL '1 day'";
            endOffset = "INTERVAL '15 minutes'";
            scheduleInterval = "INTERVAL '15 minutes'";
            break;
          case '30m':
            startOffset = "INTERVAL '2 days'";
            endOffset = "INTERVAL '30 minutes'";
            scheduleInterval = "INTERVAL '30 minutes'";
            break;
          case '1h':
            startOffset = "INTERVAL '3 days'";
            endOffset = "INTERVAL '1 hour'";
            scheduleInterval = "INTERVAL '1 hour'";
            break;
          case '1d':
            startOffset = "INTERVAL '7 days'";
            endOffset = "INTERVAL '1 day'";
            scheduleInterval = "INTERVAL '1 day'";
            break;
          case '1w':
            startOffset = "INTERVAL '30 days'";
            endOffset = "INTERVAL '1 week'";
            scheduleInterval = "INTERVAL '1 week'";
            break;
          default:
            startOffset = "INTERVAL '1 day'";
            endOffset = `INTERVAL '${tf.interval}'`;
            scheduleInterval = `INTERVAL '${tf.interval}'`;
        }

        await client.query(`
                    SELECT add_continuous_aggregate_policy(
                        '${viewName}',
                        start_offset => ${startOffset},
                        end_offset => ${endOffset},
                        schedule_interval => ${scheduleInterval}
                    );
                `);
        console.log(`Created refresh policy for ${viewName}`);
      } catch (e) {
        console.log(
          `Policy for ${viewName} might already exist:`,
          e instanceof Error ? e.message : String(e)
        );

        // If policy already exists, try to manually refresh the view
        try {
          await client.query(`CALL refresh_continuous_aggregate('${viewName}', NULL, NULL);`);
          console.log(`Manually refreshed ${viewName}`);
        } catch (refreshError) {
          console.log(
            `Could not refresh ${viewName}:`,
            refreshError instanceof Error ? refreshError.message : String(refreshError)
          );
        }
      }
    }

    console.log('DB initialized with all timeframes!');
  } catch (e) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('Rollback failed:', rollbackError);
    }
    console.error('DB init failed:', e);
  } finally {
    client.release();
  }
};

initDB();

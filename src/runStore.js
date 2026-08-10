import { pool as defaultPool } from "./db.js";
const parse = (value) => typeof value === "string" ? JSON.parse(value) : value;
const json = (value) => JSON.stringify(value);
const hydrate = (row) => row && ({ ...row, runId: row.run_id, pendingAction: parse(row.pending_action), input: parse(row.input), messages: parse(row.messages), ctx: parse(row.ctx), attempts: parse(row.attempts), artifact: parse(row.artifact), error: parse(row.error) });

export function createRunStore(pool = defaultPool) {
  return {
    async create(run) {
      await pool.execute("INSERT INTO runs (run_id,status,input,messages,ctx,attempts,pending_action,step) VALUES (?,?,?,?,?,?,?,?)", [run.runId, "running", json(run.input), json(run.messages), json(run.ctx), json(run.attempts), null, 0]);
      return run;
    },
    async load(runId) { const [rows] = await pool.execute("SELECT * FROM runs WHERE run_id = ?", [runId]); return hydrate(rows[0]); },
    async savePending(runId, { messages, pendingAction, attempts }) {
      await pool.execute("UPDATE runs SET messages=?, pending_action=?, attempts=? WHERE run_id=? AND status='running'", [json(messages), json(pendingAction), json(attempts), runId]);
    },
    async completeAction(runId, { messages, ctx, status = "running", artifact = null, error = null }) {
      await pool.execute("UPDATE runs SET messages=?,ctx=?,pending_action=NULL,step=step+1,status=?,artifact=?,error=? WHERE run_id=? AND status='running'", [json(messages), json(ctx), status, artifact === null ? null : json(artifact), error === null ? null : json(error), runId]);
    },
    async fail(runId, error) {
      await pool.execute("UPDATE runs SET status='failed', error=? WHERE run_id=? AND status='running'", [json(error), runId]);
    },
    async staleRunning(seconds) {
      const [rows] = await pool.execute("SELECT * FROM runs WHERE status='running' AND updated_at < DATE_SUB(NOW(3), INTERVAL ? SECOND)", [seconds]);
      return rows.map(hydrate);
    }
  };
}
export const runStore = createRunStore();

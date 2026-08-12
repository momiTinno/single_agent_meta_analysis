import { pool as defaultPool } from "../../../db/mysql/connection.js";
import { withTransaction } from "../../../db/mysql/transaction.js";
import { RUN_QUERIES } from "../queries/run.query.js";
const parse = (value) => (typeof value === "string" ? JSON.parse(value) : value);
const json = (value) => JSON.stringify(value);
const usage = (row) => ({
  inputTokens: Number(row.input_tokens_total || 0),
  outputTokens: Number(row.output_tokens_total || 0),
  totalTokens: Number(row.total_tokens || 0),
  modelCallCount: Number(row.model_call_count || 0),
});
const hydrate = (row) =>
  row && {
    ...row,
    runId: row.run_id,
    pendingAction: parse(row.pending_action),
    input: parse(row.input),
    messages: parse(row.messages),
    ctx: parse(row.ctx),
    attempts: parse(row.attempts),
    artifact: parse(row.artifact),
    error: parse(row.error),
    usage: usage(row),
  };
const hydrateModelCall = (row) => ({
  id: Number(row.id),
  callId: row.call_id,
  runId: row.run_id,
  workflowStep: Number(row.workflow_step),
  callType: row.call_type,
  phaseName: row.phase_name,
  phaseAttempt: row.phase_attempt === null ? null : Number(row.phase_attempt),
  model: row.model,
  inputTokens: Number(row.input_tokens),
  outputTokens: Number(row.output_tokens),
  thoughtsTokens: Number(row.thoughts_tokens),
  cachedTokens: Number(row.cached_tokens),
  toolUsePromptTokens: Number(row.tool_use_prompt_tokens),
  totalTokens: Number(row.total_tokens),
  usageAvailable: Boolean(row.usage_available),
  durationMs: Number(row.duration_ms),
  createdAt: row.created_at,
});

export function createRunStore(pool = defaultPool) {
  return {
    async create(run) {
      await pool.execute(
        "INSERT INTO runs (run_id,status,input,messages,ctx,attempts,pending_action,step) VALUES (?,?,?,?,?,?,?,?)",
        [run.runId, "running", json(run.input), json(run.messages), json(run.ctx), json(run.attempts), null, 0]
      );
      return run;
    },
    async load(runId) {
      const [rows] = await pool.execute(RUN_QUERIES.findById, [runId]);
      return hydrate(rows[0]);
    },
    async savePending(runId, { messages, pendingAction, attempts }) {
      await pool.execute(
        "UPDATE runs SET messages=?, pending_action=?, attempts=? WHERE run_id=? AND status='running'",
        [json(messages), json(pendingAction), json(attempts), runId]
      );
    },
    async completeAction(runId, { messages, ctx, status = "running", artifact = null, error = null }) {
      await pool.execute(
        "UPDATE runs SET messages=?,ctx=?,pending_action=NULL,step=step+1,status=?,artifact=?,error=? WHERE run_id=? AND status='running'",
        [
          json(messages),
          json(ctx),
          status,
          artifact === null ? null : json(artifact),
          error === null ? null : json(error),
          runId,
        ]
      );
    },
    async fail(runId, error) {
      await pool.execute("UPDATE runs SET status='failed', error=? WHERE run_id=? AND status='running'", [
        json(error),
        runId,
      ]);
    },
    async staleRunning(seconds) {
      const [rows] = await pool.execute(RUN_QUERIES.stale, [seconds]);
      return rows.map(hydrate);
    },
    async recordModelCall(call) {
      return withTransaction(pool, async (connection) => {
        await connection.execute(
          `INSERT INTO run_model_calls
            (call_id,run_id,workflow_step,call_type,phase_name,phase_attempt,model,input_tokens,output_tokens,thoughts_tokens,cached_tokens,tool_use_prompt_tokens,total_tokens,usage_available,duration_ms)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [
            call.callId,
            call.runId,
            call.workflowStep,
            call.callType,
            call.phaseName,
            call.phaseAttempt,
            call.model,
            call.inputTokens,
            call.outputTokens,
            call.thoughtsTokens,
            call.cachedTokens,
            call.toolUsePromptTokens,
            call.totalTokens,
            call.usageAvailable,
            call.durationMs,
          ]
        );
        await connection.execute(
          `UPDATE runs
             SET input_tokens_total = input_tokens_total + ?,
                 output_tokens_total = output_tokens_total + ?,
                 total_tokens = total_tokens + ?,
                 model_call_count = model_call_count + 1
           WHERE run_id = ?`,
          [call.inputTokens, call.outputTokens, call.totalTokens, call.runId]
        );
        const [rows] = await connection.execute(
          "SELECT input_tokens_total, output_tokens_total, total_tokens, model_call_count FROM runs WHERE run_id = ?",
          [call.runId]
        );
        return usage(rows[0]);
      });
    },
    async listModelCalls(runId) {
      const [rows] = await pool.execute(RUN_QUERIES.usage, [runId]);
      return rows.map(hydrateModelCall);
    },
  };
}
export const runStore = createRunStore();

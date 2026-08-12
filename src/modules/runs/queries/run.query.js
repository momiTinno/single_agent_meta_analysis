export const RUN_QUERIES = Object.freeze({
  findById: "SELECT * FROM runs WHERE run_id = ?",
  stale: "SELECT * FROM runs WHERE status='running' AND updated_at < DATE_SUB(NOW(3), INTERVAL ? SECOND)",
});

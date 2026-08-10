import { readFile } from "node:fs/promises";
import { pool } from "../connection.js";

export async function applyRunsMigration() {
  const sql = await readFile(new URL("./001-create-runs.sql", import.meta.url), "utf8");
  await pool.query(sql);
}

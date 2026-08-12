import { readFile } from "node:fs/promises";
import { pool } from "../connection.js";

export async function applyRunsMigrations() {
  for (const file of ["001-create-runs.sql", "002-add-model-usage.sql"]) {
    const sql = await readFile(new URL(`./${file}`, import.meta.url), "utf8");
    await pool.query(sql);
  }
}

export const applyRunsMigration = applyRunsMigrations;

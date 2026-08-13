ALTER TABLE runs
  ADD COLUMN input_tokens_total BIGINT UNSIGNED NOT NULL DEFAULT 0,
  ADD COLUMN output_tokens_total BIGINT UNSIGNED NOT NULL DEFAULT 0,
  ADD COLUMN total_tokens BIGINT UNSIGNED NOT NULL DEFAULT 0,
  ADD COLUMN model_call_count INT UNSIGNED NOT NULL DEFAULT 0;

CREATE TABLE run_model_calls (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  call_id CHAR(36) NOT NULL,
  run_id CHAR(36) NOT NULL,
  workflow_step INT UNSIGNED NOT NULL,
  call_type VARCHAR(32) NOT NULL,
  phase_name VARCHAR(24) NULL,
  phase_attempt INT UNSIGNED NULL,
  model VARCHAR(128) NOT NULL,
  input_tokens BIGINT UNSIGNED NOT NULL DEFAULT 0,
  output_tokens BIGINT UNSIGNED NOT NULL DEFAULT 0,
  thoughts_tokens BIGINT UNSIGNED NOT NULL DEFAULT 0,
  cached_tokens BIGINT UNSIGNED NOT NULL DEFAULT 0,
  tool_use_prompt_tokens BIGINT UNSIGNED NOT NULL DEFAULT 0,
  total_tokens BIGINT UNSIGNED NOT NULL DEFAULT 0,
  usage_available TINYINT(1) NOT NULL DEFAULT 0,
  duration_ms INT UNSIGNED NOT NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_run_model_calls_call_id (call_id),
  INDEX idx_run_model_calls_run_created_at (run_id, created_at),
  CONSTRAINT fk_run_model_calls_run_id FOREIGN KEY (run_id) REFERENCES runs(run_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

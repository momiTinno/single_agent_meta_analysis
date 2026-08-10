CREATE TABLE runs (
  run_id CHAR(36) NOT NULL,
  status VARCHAR(24) NOT NULL,
  input JSON NOT NULL,
  messages JSON NOT NULL,
  ctx JSON NOT NULL,
  attempts JSON NOT NULL,
  pending_action JSON NULL,
  step INT UNSIGNED NOT NULL DEFAULT 0,
  artifact JSON NULL,
  error JSON NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (run_id),
  INDEX idx_runs_status_updated_at (status, updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

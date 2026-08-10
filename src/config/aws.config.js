import { config } from "./app.config.js";
export const awsConfig = { region: config.AWS_REGION, queueUrl: config.SQS_QUEUE_URL, visibilityTimeoutSeconds: config.SQS_VISIBILITY_TIMEOUT_SECONDS, heartbeatSeconds: config.SQS_HEARTBEAT_SECONDS, longPollSeconds: config.SQS_LONG_POLL_SECONDS };

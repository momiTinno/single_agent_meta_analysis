#!/usr/bin/env bash
set -euo pipefail

endpoint_url="${SQS_ENDPOINT_URL:-http://localhost:4566}"
aws_region="${AWS_REGION:-us-east-1}"
aws_account_id="000000000000"
export AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID:-test}"
export AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY:-test}"

aws --endpoint-url "$endpoint_url" --region "$aws_region" sqs create-queue \
  --queue-name meta-analysis-runs-dlq \
  --attributes VisibilityTimeout=300,ReceiveMessageWaitTimeSeconds=20 >/dev/null

dlq_arn="arn:aws:sqs:$aws_region:$aws_account_id:meta-analysis-runs-dlq"

aws --endpoint-url "$endpoint_url" --region "$aws_region" sqs create-queue \
  --queue-name meta-analysis-runs \
  --attributes VisibilityTimeout=300,ReceiveMessageWaitTimeSeconds=20 >/dev/null

main_queue_url="$endpoint_url/queue/$aws_region/$aws_account_id/meta-analysis-runs"
redrive_policy="{\"deadLetterTargetArn\":\"$dlq_arn\",\"maxReceiveCount\":\"3\"}"
escaped_redrive_policy="${redrive_policy//\"/\\\"}"
redrive_attributes="{\"RedrivePolicy\":\"$escaped_redrive_policy\"}"
aws --endpoint-url "$endpoint_url" --region "$aws_region" sqs set-queue-attributes \
  --queue-url "$main_queue_url" \
  --attributes "$redrive_attributes"

printf 'SQS_QUEUE_URL=%s\n' "$main_queue_url"
printf 'SQS_ENDPOINT_URL=%s\n' "$endpoint_url"

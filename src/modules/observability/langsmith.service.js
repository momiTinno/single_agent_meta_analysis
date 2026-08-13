import { traceable } from "langsmith/traceable";
import { config } from "../../config/app.config.js";

export const langSmithTracingEnabled = () => config.LANGSMITH_TRACING && Boolean(config.LANGSMITH_API_KEY);

/**
 * Trace a workflow operation in LangSmith. Nested calls automatically become
 * child runs of the current workflow trace.
 */
export async function traceOperation({ name, runType = "chain", input, metadata, summarize }, operation) {
  if (!langSmithTracingEnabled()) return operation();

  let result;
  const traced = traceable(
    async () => {
      result = await operation();
      return summarize ? summarize(result) : { completed: true };
    },
    {
      name,
      run_type: runType,
      project_name: config.LANGSMITH_PROJECT,
      metadata,
      tracingEnabled: true,
    }
  );

  await traced(input);
  return result;
}

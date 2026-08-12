export function errorMiddleware(error, _request, response, _next) {
  const invalid = error.name === "ZodError";
  response
    .status(invalid ? 400 : 500)
    .json({ error: invalid ? "invalid request" : "internal error", details: invalid ? error.issues : undefined });
}

export const notFoundMiddleware = (_request, response) => response.status(404).json({ error: "not found" });

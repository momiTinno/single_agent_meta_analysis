import { runInputSchema } from "../../../config/app.config.js";
export function validateRunInput(request, _response, next) { try { request.validatedInput = runInputSchema.parse(request.body); next(); } catch (error) { next(error); } }

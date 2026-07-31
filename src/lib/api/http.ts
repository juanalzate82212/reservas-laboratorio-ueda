import { NextResponse } from "next/server";
import type { ZodError } from "zod";

/*
 * Formato de error uniforme de toda la API (§6 del plan):
 *   { "error": { "code": "...", "message": "..." } }
 * Un solo helper para no reinventar la forma en cada Route Handler.
 */
export function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

/** 400 a partir del primer problema que reportó Zod. */
export function validationErrorResponse(error: ZodError) {
  const primero = error.issues[0];
  return errorResponse(
    400,
    "VALIDATION_ERROR",
    primero?.message ?? "Los datos enviados no son válidos.",
  );
}

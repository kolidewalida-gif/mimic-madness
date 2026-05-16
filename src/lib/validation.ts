import { z } from "zod";

/**
 * Centralized input validation schemas.
 * Used to harden user inputs against empty payloads, oversized strings,
 * control characters and obvious abuse vectors.
 */

// Strip ASCII control chars (except \n and \t) which can break UI rendering.
const stripControlChars = (s: string) => s.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "");

const safeText = (max: number) =>
  z
    .string()
    .transform((s) => stripControlChars(s).trim())
    .pipe(z.string().min(1, "Vide").max(max, `Max ${max} caractères`));

export const chatMessageSchema = safeText(500);
export const dmMessageSchema = safeText(1000);

export const playerNameSchema = z
  .string()
  .transform((s) => stripControlChars(s).trim())
  .pipe(z.string().min(1, "Nom requis").max(24, "Max 24 caractères"));

export const lobbyCodeSchema = z
  .string()
  .transform((s) => s.trim().toUpperCase())
  .pipe(z.string().regex(/^[A-Z0-9]{4,8}$/, "Code invalide"));

export const guessSchema = z
  .string()
  .transform((s) => stripControlChars(s).trim())
  .pipe(z.string().min(1, "Vide").max(80, "Max 80 caractères"));

/**
 * Validate and return either the cleaned value or null on failure.
 * Convenience helper for fire-and-forget client validation.
 */
export function safeParse<T>(schema: z.ZodType<T>, value: unknown): T | null {
  const r = schema.safeParse(value);
  return r.success ? r.data : null;
}
import { z } from "zod";

export const RawDailyUsageSchema = z.object({
  date: z.string(),
  input_tokens: z.number(),
  output_tokens: z.number(),
  cache_tokens: z.number(),
});

export const RawModelStatSchema = z.object({
  name: z.string(),
  input_tokens: z.number(),
  output_tokens: z.number(),
  cache_tokens: z.number(),
  cost_usd: z.number(),
});

export const RawProjectStatSchema = z.object({
  name: z.string(),
  tokens: z.number(),
});

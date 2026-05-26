import { z } from "zod";

export const EnvSchema = z.object({
  XDG_CONFIG_HOME: z.string().optional(),
  NO_COLOR: z.string().optional(),
  FORCE_COLOR: z.string().optional(),
  DEBUG: z.string().optional(),
});

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  return EnvSchema.parse(source);
}

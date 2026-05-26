import { z } from "zod";

export const TokenSchema = z.object({
  access_token: z.string().min(1, "access_token is required."),
  id_token: z.string().min(1, "id_token is required."),
  refresh_token: z.string().min(1, "refresh_token is required."),
  token_type: z.string().min(1, "token_type is required."),
  expires_in: z
    .number()
    .int("expires_in must be an integer.")
    .positive("expires_in must be positive."),
});

export type Token = z.infer<typeof TokenSchema>;

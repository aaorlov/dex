import { z } from "zod";

export const CognitoConfigSchema = z.object({
  clientId: z.string().trim().min(1, "clientId is required."),
  cognitoDomain: z.string().trim().min(1, "cognitoDomain is required."),
  userPoolId: z.string().trim().min(1, "userPoolId is required."),
});

export type CognitoConfig = z.infer<typeof CognitoConfigSchema>;

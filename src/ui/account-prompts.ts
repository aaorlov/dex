import { group, text } from "@clack/prompts";
import { EXIT } from "../constants/index.ts";
import {
  AccountConfigSchema,
  type AccountConfig,
} from "../schemas/index.ts";

type FieldKey = Exclude<keyof AccountConfig, "preApprovals">;

const PLACEHOLDERS: Record<FieldKey, string> = {
  name: "Rivian-VW JV",
  alias: "rivw",
  apiUrl: "https://api.example.com",
  configUrl: "https://example.com/cli-config.json",
  cognitoDomain: "auth.example.com",
};

function validateField(
  field: FieldKey,
  value: string | undefined,
): string | undefined {
  const result = AccountConfigSchema.shape[field].safeParse(value ?? "");
  if (result.success) return undefined;
  return result.error.issues[0]?.message ?? "Invalid value.";
}

function askField(
  field: FieldKey,
  message: string,
): () => Promise<string | symbol> {
  return () =>
    text({
      message,
      placeholder: PLACEHOLDERS[field],
      validate: (value) => validateField(field, value),
    });
}

export async function promptAccount(): Promise<AccountConfig> {
  const answers = await group(
    {
      name: askField("name", "Account name"),
      alias: askField("alias", "Alias (short identifier)"),
      apiUrl: askField("apiUrl", "API URL"),
      configUrl: askField("configUrl", "Config URL (cli-config.json)"),
      cognitoDomain: askField("cognitoDomain", "Cognito domain URL"),
    },
    {
      onCancel: () => process.exit(EXIT.SigInt),
    },
  );

  return AccountConfigSchema.parse(answers);
}

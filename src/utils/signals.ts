import { cancel } from "@clack/prompts";
import { EXIT } from "../constants/index.ts";

export function installSignalHandlers(): void {
  const onSignal = (code: number, message: string): void => {
    cancel(message);
    process.exit(code);
  };

  process.once("SIGINT", () => onSignal(EXIT.SigInt, "Interrupted"));
  process.once("SIGTERM", () => onSignal(EXIT.SigTerm, "Terminated"));
}

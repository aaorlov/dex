import { log } from "@clack/prompts";
import { EXIT, type ExitCode } from "../constants/index.ts";
import { CliError } from "./errors.ts";

export function handleCliError(err: unknown): ExitCode {
  if (err instanceof CliError) {
    log.error(err.message);
    return err.exitCode;
  }
  if (err instanceof Error) {
    log.error(err.message);
    if (process.env.DEBUG) {
      process.stderr.write(`${err.stack ?? ""}\n`);
    }
    return EXIT.Failure;
  }
  log.error(String(err));
  return EXIT.Failure;
}

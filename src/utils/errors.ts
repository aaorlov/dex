import { EXIT, type ExitCode } from "../constants/index.ts";

export class CliError extends Error {
  readonly exitCode: ExitCode;

  constructor(message: string, exitCode: ExitCode = EXIT.Failure, options?: ErrorOptions) {
    super(message, options);
    this.name = "CliError";
    this.exitCode = exitCode;
  }
}

export class UsageError extends CliError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, EXIT.ExUsage, options);
    this.name = "UsageError";
  }
}

export class DataError extends CliError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, EXIT.ExDataErr, options);
    this.name = "DataError";
  }
}

export class NotFoundError extends CliError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, EXIT.ExUsage, options);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends CliError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, EXIT.ExUsage, options);
    this.name = "ConflictError";
  }
}

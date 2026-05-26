import { describe, expect, test } from "bun:test";
import { EXIT } from "../../src/constants/index.ts";
import { CliError, DataError, UsageError } from "../../src/utils/index.ts";

describe("CliError", () => {
  test("defaults to generic failure exit code", () => {
    const err = new CliError("boom");
    expect(err.exitCode).toBe(EXIT.Failure);
    expect(err.name).toBe("CliError");
    expect(err.message).toBe("boom");
  });

  test("accepts a custom exit code", () => {
    const err = new CliError("bad data", EXIT.ExDataErr);
    expect(err.exitCode).toBe(EXIT.ExDataErr);
  });

  test("forwards the cause", () => {
    const cause = new Error("upstream");
    const err = new CliError("wrap", EXIT.Failure, { cause });
    expect(err.cause).toBe(cause);
  });
});

describe("typed error subclasses", () => {
  test("UsageError uses EX_USAGE", () => {
    const err = new UsageError("missing flag");
    expect(err.exitCode).toBe(EXIT.ExUsage);
    expect(err.name).toBe("UsageError");
    expect(err).toBeInstanceOf(CliError);
  });

  test("DataError uses EX_DATAERR", () => {
    const err = new DataError("invalid input");
    expect(err.exitCode).toBe(EXIT.ExDataErr);
    expect(err.name).toBe("DataError");
    expect(err).toBeInstanceOf(CliError);
  });
});

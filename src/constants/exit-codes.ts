export const EXIT = {
  Success: 0,
  Failure: 1,
  Usage: 2,
  ExUsage: 64,
  ExDataErr: 65,
  ExUnavailable: 69,
  SigInt: 130,
  SigTerm: 143,
} as const;

export type ExitCode = (typeof EXIT)[keyof typeof EXIT];

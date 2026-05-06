export class AwsService {
  static async ssoLogin(profile: string) {
    await Bun.$`aws sso login --profile ${profile}`;
  }

  static async whoami(profile: string) {
    const result =
      await Bun.$`aws sts get-caller-identity --profile ${profile}`.json();
    return result as { UserId: string; Account: string; Arn: string };
  }
}

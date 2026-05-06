import { Command } from 'commander';
import { intro, outro, spinner } from '@clack/prompts';
import chalk from 'chalk';
import { AwsService } from '../services/aws';

const DEFAULT_PROFILE = 'default';

export function registerLogin(program: Command) {
  program
    .command('login')
    .description('Authenticate with AWS SSO')
    .option('-p, --profile <name>', 'AWS SSO profile name', DEFAULT_PROFILE)
    .action(async (options) => {
      intro(chalk.bgYellow.black(` AWS SSO Login `));

      const s = spinner();
      s.start(`Logging in with profile ${chalk.bold(options.profile)}...`);

      try {
        await AwsService.ssoLogin(options.profile);
        s.stop('SSO login complete.');

        const identity = await AwsService.whoami(options.profile);
        console.log(
          chalk.dim(`  Account: ${identity.Account}\n  ARN:     ${identity.Arn}`),
        );

        outro(chalk.green('Authenticated successfully.'));
      } catch (err: any) {
        s.stop('Login failed.');
        console.error(chalk.red(`Error: ${err.message}`));
        process.exit(1);
      }
    });
}

import { Command } from 'commander';
import { registerLogin } from './commands/login';

const program = new Command()
  .name('dex')
  .version('1.0.0')
  .description('DevEx CLI — streamline your development workflow')
  .option('-v, --verbose', 'Verbose output');

registerLogin(program);

program.parse();

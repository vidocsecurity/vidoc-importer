// import { fetchAllSources } from './sources/index.js';
import { Command } from 'commander';
import chalk from 'chalk';

interface Options {
    url: string;
    disableScanner: boolean;
    debug: boolean;
    disableSetup: boolean;
    testId: string;
}

const main = async () => {
    const program = new Command();
    program.version('0.0.1');

    program
        .option('-u, --url <string>', 'ngrok url', '')
        .option('-s --disable-scanner', 'will not start scanner', false)
        .option('-d --debug', 'Debug', false)
        .option('--disable-setup', 'Disable test setup', false);

    program.parse(process.argv);

    const options: Options = program.opts();

    // if no options are passed, show help
    if (Object.keys(options).length === 0) {
        program.help();
        return;
    }

    console.log(chalk.yellow('[Warn] Elo ziomek.'));

    // await fetchAllSources();
};

main();

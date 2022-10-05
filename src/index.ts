import { Command } from 'commander';
import chalk from 'chalk';
import Configstore from 'configstore';
import { ClientAPIOptions } from './client/client.js';
import { handleLogin, LoginOptions } from './commands/login.js';
import {
    HackeronePrivateProgramsImportOptions,
    handleHackeronePrivateProgramsImport,
} from './commands/hackeronePrivate.js';
import { handleAllPublicImport } from './commands/allPublic.js';
import {
    handleIntigritiPrivateProgramsImport,
    IntigritiPrivateProgramsImportOptions,
} from './commands/intigritiPrivate.js';

const getAPIConfig = (config: Configstore): ClientAPIOptions => ({
    apiHost: 'https://client-dev.vidocsecurity.com',
    token: config.get('token'),
});

const main = async () => {
    const program = new Command();
    const config = new Configstore('@vidocsecurity/vidoc-bb-importer', {
        token: '',
    });

    console.log(
        chalk.whiteBright(`
_   _ _     _             ______                              _
| | | (_)   | |            | ___ \\                            | |
| | | |_  __| | ___   ___  | |_/ /___  ___  ___  __ _ _ __ ___| |__
| | | | |/ _\` |/ _ \\ / __| |    // _ \\/ __|/ _ \\/ _\` | '__/ __| '_ \\
\\ \\_/ / | (_| | (_) | (__  | |\\ \\  __/\\__ \\  __/ (_| | | | (__| | | |
 \\___/|_|\\__,_|\\___/ \\___| \\_| \\_\\___||___/\\___|\\__,_|_|  \\___|_| |_|
                    Bug bounty programs importer
        `),
    );
    console.log('_'.repeat(80));
    console.log(
        'This tool will import all the bug bounty programs from the sources you choose.',
    );
    console.log(
        chalk.yellow(
            "If something did not work as expected, don't hesitate to open an issue on https://github.com/vidocsecurity/vidoc-importer",
        ),
    );

    if (config.get('token') && config.get('user')) {
        console.log(chalk.green(`You are logged in as ${config.get('user')}`));
    }
    console.log('\n\n');

    program.version('0.0.1');

    program
        .action(() => {
            console.log('No command provided\n');

            program.help();
        })
        .command('login')
        .requiredOption(
            '--token <string>',
            'Vidoc Research personal access token. You generate it in your profile settings.',
        )
        .action(({ token }: LoginOptions) =>
            handleLogin({
                token,
                config,
                apiClientOptions: getAPIConfig(config),
            }),
        );

    const importCommand = program
        .command('import')
        .addHelpText(
            'before',
            chalk.yellow('Import all the programs from the sources you choose'),
        );

    importCommand
        .command('hackerone-private')
        .requiredOption('--session-cookie <string>', 'Hackerone session cookie')
        .action(({ sessionCookie }: HackeronePrivateProgramsImportOptions) =>
            handleHackeronePrivateProgramsImport({
                sessionCookie,
                config,
                apiClientOptions: getAPIConfig(config),
            }),
        );

    importCommand
        .command('intigriti-private')
        .requiredOption('--email <string>', 'Intigriti account email')
        .requiredOption('--password <string>', 'Intigriti account password')
        .action((params: IntigritiPrivateProgramsImportOptions) =>
            handleIntigritiPrivateProgramsImport({
                ...params,
                config,
                apiClientOptions: getAPIConfig(config),
            }),
        );

    importCommand.command('all-public').action(() =>
        handleAllPublicImport({
            config,
            apiClientOptions: getAPIConfig(config),
        }),
    );

    program.parse(process.argv);

    return 0;
};

main();

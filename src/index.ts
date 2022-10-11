import { Command } from 'commander';
import chalk from 'chalk';
import Configstore from 'configstore';
import fetch from 'node-fetch';
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
import jsonPackage from '../package.json';
import { fetchProfile } from './client/profile.js';

const getAPIConfig = (config: Configstore): ClientAPIOptions => {
    let apiHost = 'https://app.vidocsecurity.com';
    if (process.env.ENV === 'dev') {
        apiHost = 'https://client-dev.vidocsecurity.com';
    }

    if (process.env.ENV === 'local') {
        apiHost = 'http://localhost:3000';
    }

    return {
        apiHost,
        token: config.get('token'),
    };
};

const checkVersion = async () => {
    const response = await fetch(
        'https://registry.npmjs.org/-/package/@vidocsecurity/vidoc-importer/dist-tags',
    );
    const text = await response.json();

    const { version } = jsonPackage;

    if (version !== text.latest) {
        console.log(
            chalk.yellow(
                `You are using an outdated version of the importer. Please update it. Your version is ${version} and the latest is ${text}`,
            ),
        );
    }
};

const main = async () => {
    const program = new Command();
    const config = new Configstore('@vidocsecurity/vidoc-importer', {
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

    await checkVersion();

    if (config.get('token') && config.get('user')) {
        try {
            await fetchProfile(getAPIConfig(config));
        } catch {
            console.log('\n\n');
            console.log(
                chalk.red(
                    'Your token is invalid or it expired. Please log in again using the login command.',
                ),
            );

            config.set('token', '');
            return;
        }

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
};

main();

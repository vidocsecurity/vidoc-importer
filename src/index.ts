// import { fetchAllSources } from './sources/index.js';
import { Command } from 'commander';
import chalk from 'chalk';
import Configstore from 'configstore';
import { fetchProfile } from './client/profile.js';
// import cliSpinners from 'cli-spinners';
import ora from 'ora';
import { ClientAPIOptions } from './client/client.js';
import { fetchBountyTargetsHackerOneProgramList } from './sources/hackerone/bountyTargetsHackerOne.js';
import { saveResultsAndMakeSureTheyAreUnique } from './saveResults.js';

const program = new Command();
const config = new Configstore('@vidocsecurity/vidoc-bb-importer', {
    token: '',
});

const main = async () => {
    console.log(
        chalk.whiteBright(`
_   _ _     _             ______                              _
| | | (_)   | |            | ___ \\                            | |
| | | |_  __| | ___   ___  | |_/ /___  ___  ___  __ _ _ __ ___| |__
| | | | |/ _\` |/ _ \\ / __| |    // _ \\/ __|/ _ \\/ _\` | \'__/ __| \'_ \\
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
            "If something did not work as expected, don't hesitate to open an issue on https://github.com/vidocsecurity/vidoc-bb-importer\n\n",
        ),
    );

    if (config.get('token') && config.get('user')) {
        console.log(chalk.green(`You are logged in as ${config.get('user')}`));
    }

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
        .action(handleLogin);

    program
        .command('import-hackerone-private')
        .requiredOption('--session-cookie <string>', 'Hackerone session cookie')
        .action(handleHackeronePrivateProgramsImport);

    program
        .command('import-hackerone-public')
        .action(handleHackeronePublicProgramsImport);

    program.parse(process.argv);
};

const handleHackeronePublicProgramsImport = async () => {
    if (!config.get('token') || !config.get('user')) {
        console.log(chalk.red('You need to login first'));
        return;
    }

    console.log('Importing public programs from Hackerone...');
    const spinner = ora('Fetching programs').start();

    const parsedPrograms = await fetchBountyTargetsHackerOneProgramList();
    spinner.stop();

    console.log(
        `Found ${chalk.green(
            parsedPrograms.length,
        )} PUBLIC programs on Hackerone`,
    );

    const spinner2 = ora('Saving programs').start();

    if (!config.get('project-id')) {
        spinner2.stop();
        console.log(`You need to login again. Run 'vidoc login'`);
        return;
    }

    await saveResultsAndMakeSureTheyAreUnique(
        getAPIConfig(),
        'Hackerone',
        config.get('project-id'),
        parsedPrograms,
    );

    spinner2.stop();
};

type HackeronePrivateProgramsImportOptions = {
    sessionCookie: string;
};

const handleHackeronePrivateProgramsImport = async ({
    sessionCookie,
}: HackeronePrivateProgramsImportOptions) => {
    if (!config.get('token') || !config.get('user')) {
        console.log(chalk.red('You need to login first'));
        return;
    }

    console.log('Importing private programs from Hackerone...');
    const spinner = ora('Fetching programs...').start();

    console.log(sessionCookie);

    setTimeout(() => {
        spinner.stop();
    }, 5000);
};

const getAPIConfig = (): ClientAPIOptions => {
    return {
        apiHost: 'https://client-dev.vidocsecurity.com',
        token: config.get('token'),
    };
};

interface LoginOptions {
    token: string;
}

const handleLogin = async ({ token }: LoginOptions) => {
    if (!token || token.length === 0) {
        console.log(
            chalk.yellow(
                '[Error] You need to provide a token value with --token <token>',
            ),
        );
        return;
    }

    const response = await fetchProfile(getAPIConfig());

    if (response.user) {
        console.log(
            chalk.green(
                `[Success] You are logged in as ${response.user.email}!!`,
            ),
        );
        config.set('token', token);
        config.set('user', response.user.email);

        config.set('project-id', response.projects[0].id);
        config.set('project-name', response.projects[0].name);
        return;
    }
};

main();

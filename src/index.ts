import { Command } from 'commander';
import chalk from 'chalk';
import Configstore from 'configstore';
import ora from 'ora';
import { fetchProfile } from './client/profile.js';
import { ClientAPIOptions } from './client/client.js';
import { fetchBountyTargetsHackerOneProgramList } from './sources/hackerone/bountyTargetsHackerOne.js';
import {
    ParsedProgram,
    saveResultsAndMakeSureTheyAreUnique,
} from './saveResults.js';
import { fetchBountyTargetsBugcrowdProgramList } from './sources/bountyTargetsBugcrowd.js';
import { fetchBountyTargetsHackenProofProgramList } from './sources/bountyTargetsHackenProof.js';
import { fetchBountyTargetsYESWEHACKProgramList } from './sources/bountyTargetsYESWEHACK.js';
import { fetchBountyTargetsIntigritiProgramList } from './sources/intigriti/bountyTargetsIntigriti.js';
import { fetchPrivateProgramsFromHackerOneProgram } from './sources/hackerone/privateProgramsHackerOne.js';
import { fetchPrivateProgramsFromIntigritiProgram } from './sources/intigriti/privateProgramsIntigriti.js';

const program = new Command();
const config = new Configstore('@vidocsecurity/vidoc-bb-importer', {
    token: '',
});

const getAPIConfig = (): ClientAPIOptions => ({
    apiHost: 'https://client-dev.vidocsecurity.com',
    token: config.get('token'),
});

const handleAllPublicImport = async () => {
    if (!config.get('token') || !config.get('user')) {
        console.log(chalk.red('You need to login first'));
        return;
    }

    if (!config.get('project-id')) {
        console.log(`You need to login again. Run 'vidoc login'`);
        return;
    }

    console.log(
        `Importing public programs from ALL platforms: Hackerone, Bugcrowd, Intigriti, HackenProof, YESWEHACK.`,
    );

    const spinner = ora('Fetching programs').start();

    const parsedPrograms: ParsedProgram[] = [];

    parsedPrograms.push(...(await fetchBountyTargetsBugcrowdProgramList()));
    parsedPrograms.push(...(await fetchBountyTargetsHackerOneProgramList()));
    parsedPrograms.push(...(await fetchBountyTargetsHackenProofProgramList()));
    parsedPrograms.push(...(await fetchBountyTargetsYESWEHACKProgramList()));
    parsedPrograms.push(...(await fetchBountyTargetsIntigritiProgramList()));

    spinner.stop();

    console.log(
        `Found ${chalk.green(parsedPrograms.length)} PUBLIC programs to import`,
    );

    await saveResultsAndMakeSureTheyAreUnique(
        getAPIConfig(),
        config.get('project-id'),
        parsedPrograms,
    );
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

    console.log();

    const parsedPrograms = await fetchPrivateProgramsFromHackerOneProgram({
        sessionCookie,
    });

    spinner.stop();

    console.log(
        `Found ${chalk.green(
            parsedPrograms.length,
        )} PRIVATE Hackerone programs to import`,
    );

    await saveResultsAndMakeSureTheyAreUnique(
        getAPIConfig(),
        config.get('project-id'),
        parsedPrograms,
    );
};

type IntigritiPrivateProgramsImportOptions = {
    email: string;
    password: string;
};

const handleIntigritiPrivateProgramsImport = async ({
    email,
    password,
}: IntigritiPrivateProgramsImportOptions) => {
    if (!config.get('token') || !config.get('user')) {
        console.log(chalk.red('You need to login first'));
        return;
    }

    console.log('Importing private programs from Intigriti...');
    const spinner = ora('Fetching programs...').start();

    console.log();

    const parsedPrograms = await fetchPrivateProgramsFromIntigritiProgram({
        email,
        password,
    });

    spinner.stop();

    console.log(
        `Found ${chalk.green(
            parsedPrograms.length,
        )} PRIVATE Intigriti programs to import`,
    );

    await saveResultsAndMakeSureTheyAreUnique(
        getAPIConfig(),
        config.get('project-id'),
        parsedPrograms,
    );
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
    }
};

const main = async () => {
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
        .action(handleLogin);

    const importCommand = program
        .command('import')
        .addHelpText(
            'before',
            chalk.yellow('Import all the programs from the sources you choose'),
        );

    importCommand
        .command('hackerone-private')
        .requiredOption('--session-cookie <string>', 'Hackerone session cookie')
        .action(handleHackeronePrivateProgramsImport);

    importCommand
        .command('intigriti-private')
        .requiredOption('--email <string>', 'Intigriti account email')
        .requiredOption('--password <string>', 'Intigriti account password')
        .action(handleIntigritiPrivateProgramsImport);

    importCommand.command('all-public').action(() => handleAllPublicImport());

    program.parse(process.argv);

    return 0;
};

main();

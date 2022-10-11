import chalk from 'chalk';
import Configstore from 'configstore';
import ora from 'ora';
import { ClientAPIOptions } from '../client/client.js';
import { saveResultsAndMakeSureTheyAreUnique } from '../saveResults.js';
import { fetchPrivateProgramsFromHackerOneProgram } from '../sources/hackerone/privateProgramsHackerOne.js';

export type HackeronePrivateProgramsImportOptions = {
    sessionCookie: string;
    apiClientOptions: ClientAPIOptions;
    config: Configstore;
};

const handleHackeronePrivateProgramsImport = async ({
    sessionCookie,
    config,
    apiClientOptions,
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
        apiClientOptions,
        config.get('project-id'),
        parsedPrograms,
    );
};

export { handleHackeronePrivateProgramsImport };

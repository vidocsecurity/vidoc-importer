import Configstore from 'configstore';
import ora from 'ora';
import chalk from 'chalk';
import { ClientAPIOptions } from '../client/client.js';
import { saveResultsAndMakeSureTheyAreUnique } from '../saveResults.js';
import { fetchPrivateProgramsFromIntigritiProgram } from '../sources/intigriti/privateProgramsIntigriti.js';

export type IntigritiPrivateProgramsImportOptions = {
    email: string;
    password: string;
    apiClientOptions: ClientAPIOptions;
    config: Configstore;
};

const handleIntigritiPrivateProgramsImport = async ({
    email,
    password,
    config,
    apiClientOptions,
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
        apiClientOptions,
        config.get('project-id'),
        parsedPrograms,
    );
};

export { handleIntigritiPrivateProgramsImport };

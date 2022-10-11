import { fetchBountyTargetsBugcrowdProgramList } from '../sources/bountyTargetsBugcrowd.js';
import { fetchBountyTargetsYESWEHACKProgramList } from '../sources/bountyTargetsYESWEHACK.js';
import { fetchBountyTargetsIntigritiProgramList } from '../sources/intigriti/bountyTargetsIntigriti.js';
import chalk from 'chalk';
import {
    ParsedProgram,
    saveResultsAndMakeSureTheyAreUnique,
} from '../saveResults.js';
import { ClientAPIOptions } from '../client/client.js';
import Configstore from 'configstore';
import { fetchBountyTargetsHackerOneProgramList } from '../sources/hackerone/bountyTargetsHackerOne.js';
import ora from 'ora';

export type AllPublicImportOptions = {
    apiClientOptions: ClientAPIOptions;
    config: Configstore;
};

const handleAllPublicImport = async ({
    apiClientOptions,
    config,
}: AllPublicImportOptions) => {
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
    parsedPrograms.push(...(await fetchBountyTargetsYESWEHACKProgramList()));
    parsedPrograms.push(...(await fetchBountyTargetsIntigritiProgramList()));

    spinner.stop();

    console.log(
        `Found ${chalk.green(parsedPrograms.length)} PUBLIC programs to import`,
    );

    await saveResultsAndMakeSureTheyAreUnique(
        apiClientOptions,
        config.get('project-id'),
        parsedPrograms,
    );
};

export { handleAllPublicImport };

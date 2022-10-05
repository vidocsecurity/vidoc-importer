import chalk from 'chalk';
import cliProgress from 'cli-progress';
import {
    IApplication,
    IEndpoint,
    IDomain,
    IIPRange,
    IParameter,
    ISourceCodeRepository,
    ISubdomain,
    IDirectory,
} from './sources/types/index.js';
import { ClientAPIOptions } from './client/client.js';
import { createDirectory, fetchAllDirectories } from './client/directories.js';
import { addDomainToDirectory } from './client/domains.js';
import { processInChunks } from './common.js';

export interface ParsedProgram {
    organization: IDirectory;
    ipRanges: IIPRange[];
    subdomains: ISubdomain[];
    domains: IDomain[];
    endpoints: IEndpoint[];
    applications: IApplication[];
    sourceCodeRepositories: ISourceCodeRepository[];
    parameters: IParameter[];
}

const saveResultsAndMakeSureTheyAreUnique = async (
    clientAPIOptions: ClientAPIOptions,
    projectId: string,
    programs: ParsedProgram[],
) => {
    console.log(chalk.blue(`Saving results for ${programs.length} programs`));
    const progressBar = new cliProgress.SingleBar(
        {},
        cliProgress.Presets.shades_classic,
    );

    const directories = await fetchAllDirectories(clientAPIOptions, projectId);

    let numberOfAllDomains = 0;

    programs.forEach((program) => {
        numberOfAllDomains += program.domains.length;
    });

    progressBar.start(numberOfAllDomains, 0);

    // we need to make sure that the results are unique
    // to do that we check if organization id or programURL is in the directory tags
    // if it is, we don't create another directory, we add all the data to it

    await processInChunks(programs, 10, async (programsChunk) => {
        const promises = programsChunk.map(async (program) => {
            const {
                organization: { id, name, programURL, platform },
                domains,
            } = program;
            let directory = directories.find(
                (directory) =>
                    directory.tags.includes(id) ||
                    directory.tags.includes(programURL) ||
                    directory.tags.includes(name),
            );

            if (!directory) {
                try {
                    // create a new directory
                    directory = await createDirectory(
                        clientAPIOptions,
                        projectId,
                        {
                            name: name
                                .replace(/[^a-zA-Z0-9_-\s]+/g, '')
                                .trim()
                                .slice(0, 100), // name can't be longer than 100 characters
                            bounty: false,
                            tags: [id, programURL, name],
                            description: `Bug bounty program imported from ${platform}. Program URL is: ${programURL}`,
                        },
                    );
                } catch (error) {
                    console.log(
                        chalk.redBright(`
                            Error while creating directory for program "${name}" with id "${id}" and programURL "${programURL}".`),
                    );
                }
            }

            if (directory === undefined) {
                console.log(
                    chalk.redBright(
                        `Directory not created for program "${name}"`,
                    ),
                );
                return;
            }

            const { id: directoryId } = directory;

            await processInChunks(domains, 2, async (domainsChunk) => {
                // add all the data to the directory
                const domainPromises = domainsChunk.map(async (domain) => {
                    const { domainId } = domain;
                    await addDomainToDirectory(
                        clientAPIOptions,
                        projectId,
                        directoryId,
                        {
                            name: domainId,
                            forceManualReview: true, // always force manual review since it's being imported by tool
                        },
                    );

                    progressBar.increment();
                });

                await Promise.all(domainPromises);
            });

            // TODO add other data to directory
        });

        await Promise.all(promises);
    });

    progressBar.stop();
};

export { saveResultsAndMakeSureTheyAreUnique };

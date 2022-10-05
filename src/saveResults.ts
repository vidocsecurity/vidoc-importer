import {
    IApplication,
    IEndpoint,
    IDomain,
    IIPRange,
    IOrganization,
    IParameter,
    ISourceCodeRepository,
    ISubdomain,
} from '@boosted-bb/backend-interfaces';
import { ClientAPIOptions } from './client/client.js';
import { createDirectory, fetchAllDirectories } from './client/directories.js';
import { addDomainToDirectory } from './client/domains.js';
import { processInChunks } from './common.js';
import chalk from 'chalk';

export interface ParsedProgram {
    organization: IOrganization;
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
    platform: string,
    projectId: string,
    programs: ParsedProgram[],
) => {
    const directories = await fetchAllDirectories(clientAPIOptions, projectId);

    // we need to make sure that the results are unique
    // to do that we check if organization id or programURL is in the directory tags
    // if it is, we don't create another directory, we add all the data to it

    await processInChunks(programs, 10, async (programsChunk) => {
        const promises = programsChunk.map(async (program) => {
            const {
                organization: { id, name, programURL },
                domains,
            } = program;
            let directory = directories.find((directory) => {
                return (
                    directory.tags.includes(id) ||
                    directory.tags.includes(programURL) ||
                    directory.tags.includes(name)
                );
            });

            if (!directory) {
                try {
                    // create a new directory
                    directory = await createDirectory(
                        clientAPIOptions,
                        projectId,
                        {
                            name: name.trim().slice(0, 100), // name can't be longer than 100 characters
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
                throw new Error(`Directory not created for program "${name}"`);
            }

            const { id: directoryId } = directory;

            // add all the data to the directory
            const domainPromises = domains.map(async (domain) => {
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
            });

            // TODO add other data to directory

            await Promise.all(domainPromises);
        });

        await Promise.all(promises);
    });
};

export { saveResultsAndMakeSureTheyAreUnique };

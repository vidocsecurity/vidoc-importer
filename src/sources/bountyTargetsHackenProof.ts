import {
    ApplicationType,
    IApplication,
    IEndpoint,
    IDomain,
    IIPRange,
    IOrganization,
    IParameter,
    ISourceCodeRepository,
    ISubdomain,
} from '@boosted-bb/backend-interfaces';
import fetch from 'node-fetch';
import {
    cleanPath,
    deduplicateApplications,
    deduplicateDomains,
    deduplicateSubdomains,
    getSourceCodeRepositoriesFromText,
    nameToOrganizationID,
    parseTextForIPs,
} from '../common.js';
import { parseEndpointOrDescriptionForMobileApplications } from '../mobileApplicationParser.js';
import { getURLsFromText, parseURLsForScopeItems } from '../urlScopeParser.js';
import { ParsedProgram } from './../saveResults.js';

enum IBountyTargetsHackenProofScopeType {
    Web = 'Web',
    WEB = 'WEB',
    API = 'API',
    Android = 'Android',
    iOS = 'iOS',
    Extension = 'Extension',
    Blockchain = 'Blockchain',
    blockchain = 'blockchain',
    OutOfScope = 'Out of scope',
    SDK = 'SDK',
    Mac = 'Mac',
    Windows = 'Windows',
    Solidity = 'Solidity',
}

interface IBountyTargetsHackenProofScopeEntry {
    target: string;
    instruction: string;
    type: IBountyTargetsHackenProofScopeType;
}

interface IBountyTargetsHackenProofEntry {
    name: string;
    url: string;
    archived: boolean;
    targets: {
        in_scope: IBountyTargetsHackenProofScopeEntry[];
        out_of_scope: IBountyTargetsHackenProofScopeEntry[];
    };
}

const parseOutOfScope = (
    organizationId: string,
    scope: IBountyTargetsHackenProofScopeEntry[],
) => {
    const domains: IDomain[] = [];
    const subdomains: ISubdomain[] = [];
    const endpoints: IEndpoint[] = [];

    scope.forEach((entry) => {
        const { target: endpoint, instruction: description } = entry;
        const {
            domains: parsedDomains,
            subdomains: parsedSubdomains,
            endpoints: parsedendpoints,
        } = parseURLsForScopeItems(
            organizationId,
            endpoint,
            description,
            false, // mark it out of scope
        );

        domains.push(...parsedDomains);
        subdomains.push(...parsedSubdomains);
        endpoints.push(...parsedendpoints);
    });

    return {
        domains: deduplicateDomains(domains),
        subdomains: deduplicateSubdomains(subdomains),
        endpoints,
    };
};

const ASSET_TYPE_TO_APPLICATION_TYPE: {
    [key in IBountyTargetsHackenProofScopeType]?: ApplicationType;
} = {
    [IBountyTargetsHackenProofScopeType.Mac]: ApplicationType.executable,
    [IBountyTargetsHackenProofScopeType.Windows]:
        ApplicationType.windowsAppStore,
    [IBountyTargetsHackenProofScopeType.Extension]:
        ApplicationType.browserExtension,
};

const parseScope = (
    organizationId: string,
    scope: IBountyTargetsHackenProofScopeEntry[],
) => {
    const domains: IDomain[] = [];
    const subdomains: ISubdomain[] = [];
    const sourceCodeRepositories: ISourceCodeRepository[] = [];
    const applications: IApplication[] = [];
    const ipRanges: IIPRange[] = [];
    const endpoints: IEndpoint[] = [];
    const otherApplications: IApplication[] = [];
    const parameters: IParameter[] = [];

    scope.forEach((entry) => {
        const { target: endpoint, type, instruction: description } = entry;

        ipRanges.push(...parseTextForIPs(organizationId, endpoint));

        if (
            [
                IBountyTargetsHackenProofScopeType.iOS,
                IBountyTargetsHackenProofScopeType.Android,
            ].includes(type)
        ) {
            const applicationsFromDescriptionAndEndpoint = parseEndpointOrDescriptionForMobileApplications(
                organizationId,
                endpoint,
                description,
                type === IBountyTargetsHackenProofScopeType.iOS,
            );

            applications.push(...applicationsFromDescriptionAndEndpoint);

            return;
        }

        // we check if given asset_type is mapped to application type to parse it
        if (Object.keys(ASSET_TYPE_TO_APPLICATION_TYPE).includes(type)) {
            const urls = getURLsFromText(description);

            applications.push({
                url: endpoint,
                organizationId,
                type:
                    ASSET_TYPE_TO_APPLICATION_TYPE[type] ||
                    ApplicationType.mobileUnknown,
                name: endpoint,
                ...(urls.length > 0 && { url: cleanPath(urls[0]) }),
                description,
            });

            // if there is no urls present there is no point in doing next parsing steps
            if (urls.length === 0) {
                return;
            }
        }

        const sourceCodes = getSourceCodeRepositoriesFromText(
            organizationId,
            endpoint,
        );

        if (sourceCodes.length > 0) {
            sourceCodeRepositories.push(...sourceCodes);
        } else {
            sourceCodeRepositories.push(
                ...getSourceCodeRepositoriesFromText(
                    organizationId,
                    description,
                ),
            );
        }

        getURLsFromText(endpoint).forEach((url) => {
            const {
                domains: domainsFromIdentifier,
                subdomains: subdomainsFromIdentifier,
                endpoints: endpointsFromIdentifier,
                ipRanges: ipRangesFromIdentifier,
                applications: applicationsFromIdentifier,
                parameters: parametersFromIdentifier,
            } = parseURLsForScopeItems(
                organizationId,
                url,
                description,
                true,
                false,
            );

            applications.push(...applicationsFromIdentifier);
            domains.push(...domainsFromIdentifier);
            subdomains.push(...subdomainsFromIdentifier);
            ipRanges.push(...ipRangesFromIdentifier);
            endpoints.push(...endpointsFromIdentifier);
            parameters.push(...parametersFromIdentifier);
        });

        // try parsing lines of instruction
        // the instruction contains a lot of urls, but some of them are out of scope
        // we will have to validate it manually
        if (description.length > 5) {
            description.split('\\n').forEach((line) =>
                getURLsFromText(line).forEach((maybeDomain) => {
                    const {
                        domains: domainsFromDescription,
                        subdomains: subdomainsFromDescription,
                        endpoints: endpointsFromDescription,
                        applications: applicationsFromDescription,
                        parameters: parametersFromFromDescription,
                    } = parseURLsForScopeItems(
                        organizationId,
                        maybeDomain,
                        description,
                        true,
                        true, // force manual review of assets, its not trustworthy source
                    );

                    applications.push(...applicationsFromDescription);
                    domains.push(...domainsFromDescription);
                    subdomains.push(...subdomainsFromDescription);
                    endpoints.push(...endpointsFromDescription);
                    parameters.push(...parametersFromFromDescription);
                }),
            );
        }
    });

    return {
        domains: deduplicateDomains(domains),
        subdomains: deduplicateSubdomains(subdomains),
        applications,
        ipRanges,
        endpoints,
        otherApplications: deduplicateApplications(otherApplications),
        sourceCodeRepositories,
        parameters,
    };
};

const parseProgram = (
    program: IBountyTargetsHackenProofEntry,
): ParsedProgram => {
    const { name, url, targets } = program;
    const organizationId = nameToOrganizationID(name);

    const {
        domains,
        subdomains,
        applications,
        sourceCodeRepositories,
        ipRanges,
        endpoints,
        parameters,
    } = parseScope(organizationId, targets.in_scope);

    const {
        subdomains: outOfScopeSubdomains,
        domains: outOfScopeDomains,
        endpoints: endpointsFromOutOfScope,
    } = parseOutOfScope(organizationId, targets.out_of_scope);

    const organization: IOrganization = {
        id: organizationId,
        bounty: true,
        name,
        programURL: url,
    };

    return {
        organization,
        domains: [...outOfScopeDomains, ...domains],
        subdomains: [...outOfScopeSubdomains, ...subdomains],
        ipRanges,
        endpoints: [...endpointsFromOutOfScope, ...endpoints],
        parameters,
        applications,
        sourceCodeRepositories,
    };
};

const fetchBountyTargetsHackenProofProgramList = async () => {
    const response = await fetch(
        'https://raw.githubusercontent.com/arkadiyt/bounty-targets-data/master/data/hackenproof_data.json',
    );
    const programs: IBountyTargetsHackenProofEntry[] = await response.json();

    const programsThatPay = programs.filter(({ archived }) => !archived);
    console.log(
        'fetchBountyTargetsHackenProofProgramList: fetched ',
        programsThatPay.length,
    );

    return programsThatPay.map((program) => parseProgram(program));
};

export {
    fetchBountyTargetsHackenProofProgramList,
    parseScope,
    parseOutOfScope,
    parseProgram,
    IBountyTargetsHackenProofScopeEntry,
    IBountyTargetsHackenProofEntry,
    IBountyTargetsHackenProofScopeType,
};

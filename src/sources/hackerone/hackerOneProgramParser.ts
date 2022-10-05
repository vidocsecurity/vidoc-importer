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
import {
    cleanPath,
    deduplicateDomains,
    deduplicateSubdomains,
    getSourceCodeRepositoriesFromText,
    nameToOrganizationID,
    parseTextForIPs,
} from '../../common.js';
import { parseEndpointOrDescriptionForMobileApplications } from '../../mobileApplicationParser.js';
import {
    getURLsFromText,
    parseURLsForScopeItems,
} from '../../urlScopeParser.js';
import { ParsedProgram } from '../../saveResults.js';

interface IHackerOneProgramScopeEntry {
    asset_identifier: string;
    asset_type:
        | 'URL'
        | 'CIDR'
        | 'OTHER'
        | 'SOURCE_CODE'
        | 'APPLE_STORE_APP_ID'
        | 'GOOGLE_PLAY_APP_ID'
        | 'DOWNLOADABLE_EXECUTABLES'
        | 'WINDOWS_APP_STORE_APP_ID'
        | 'OTHER_APK'
        | 'OTHER_IPA'
        | 'HARDWARE';
    instruction: string | null;
}

interface IHackerOneProgram {
    id: string;
    name: string;
    url: string;
    offers_bounties: boolean;
    submission_state: 'open' | 'disabled';
    targets: {
        in_scope: IHackerOneProgramScopeEntry[];
        out_of_scope: IHackerOneProgramScopeEntry[];
    };
}

const ASSET_TYPE_TO_APPLICATION_TYPE: { [key: string]: ApplicationType } = {
    DOWNLOADABLE_EXECUTABLES: ApplicationType.executable,
    WINDOWS_APP_STORE_APP_ID: ApplicationType.windowsAppStore,
    OTHER_APK: ApplicationType.mobileUnknown,
    OTHER_IPA: ApplicationType.mobileUnknown,
};

const parseScope = (
    organizationId: string,
    scope: IHackerOneProgramScopeEntry[],
) => {
    const domains: IDomain[] = [];
    const subdomains: ISubdomain[] = [];
    const applications: IApplication[] = [];
    const ipRanges: IIPRange[] = [];
    const endpoints: IEndpoint[] = [];
    const parameters: IParameter[] = [];
    const sourceCodeRepositories: ISourceCodeRepository[] = [];

    scope.forEach((entry) => {
        const {
            asset_identifier: endpoint,
            asset_type: type,
            instruction: description,
        } = entry;

        if (type === 'CIDR') {
            ipRanges.push(...parseTextForIPs(organizationId, endpoint));
        }

        if (['APPLE_STORE_APP_ID', 'GOOGLE_PLAY_APP_ID'].includes(type)) {
            const applicationsFromDescriptionAndEndpoint = parseEndpointOrDescriptionForMobileApplications(
                organizationId,
                endpoint,
                description ?? '',
                type === 'APPLE_STORE_APP_ID',
            );

            applications.push(...applicationsFromDescriptionAndEndpoint);
            return;
        }

        // we check if given asset_type is mapped to application type to parse it
        if (Object.keys(ASSET_TYPE_TO_APPLICATION_TYPE).includes(type)) {
            const urls = getURLsFromText(description ?? '');

            applications.push({
                url: endpoint,
                type: ASSET_TYPE_TO_APPLICATION_TYPE[type],
                name: endpoint,
                ...(urls.length > 0 && { url: cleanPath(urls[0]) }),
                description: description ?? '',
                organizationId,
            });

            // if there is no urls present there is no point in doing next parsing steps
            if (urls.length === 0) {
                return;
            }

            if (['OTHER_IPA', 'OTHER_APK'].includes(type)) {
                return;
            }
        }

        // if instruction is not present in types "OTHER_IPA", "OTHER_APK"] (that relay only on parsing it)
        // there is no point in trying do next parsing stages
        if (
            ['OTHER_IPA', 'OTHER_APK'].includes(type) &&
            description?.length === 0
        ) {
            return;
        }

        // usually in type OTHER_APK, DOWNLOADABLE_EXECUTABLES or OTHER_APK cope items have something similar to: "com.unibet.casino"
        // and sometimes its getting recognized as valid subdomain. Which is not.
        if (
            !['OTHER_APK', 'DOWNLOADABLE_EXECUTABLES', 'OTHER_IPA'].includes(
                type,
            )
        ) {
            // endpoint is trusty source only if its from type SOURCE_CODE
            // we do not force manual review in that case
            const sourceCodes = getSourceCodeRepositoriesFromText(
                organizationId,
                endpoint,
            );

            if (sourceCodes.length > 0) {
                sourceCodeRepositories.push(...sourceCodes);
            } else {
                // instruction is always not trusty source
                sourceCodeRepositories.push(
                    ...getSourceCodeRepositoriesFromText(
                        organizationId,
                        description ?? '',
                    ),
                );
            }

            getURLsFromText(endpoint).forEach((url) => {
                const {
                    domains: domainsFromIdentifier,
                    subdomains: subdomainsFromIdentifier,
                    endpoints: endpointsFromIdentifier,
                    applications: applicationsFromIdentifier,
                    parameters: parametersFromIdentifier,
                } = parseURLsForScopeItems(
                    organizationId,
                    url,
                    description ?? '',
                    true,
                    type === 'OTHER',
                );

                applications.push(...applicationsFromIdentifier);
                domains.push(...domainsFromIdentifier);
                subdomains.push(...subdomainsFromIdentifier);
                endpoints.push(...endpointsFromIdentifier);
                parameters.push(...parametersFromIdentifier);
            });
        }

        // try parsing lines of instruction
        // the instruction contains a lot of urls, but some of them are out of scope
        // we will have to validate it manually
        if (description && description.length > 5) {
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
        sourceCodeRepositories,
        parameters,
    };
};

const parseOutOfScope = (
    organizationId: string,
    scope: IHackerOneProgramScopeEntry[],
) => {
    const domains: IDomain[] = [];
    const subdomains: ISubdomain[] = [];
    const endpoints: IEndpoint[] = [];
    const parameters: IParameter[] = [];

    scope.forEach((entry) => {
        const { asset_identifier: endpoint, instruction: description } = entry;
        const {
            domains: parsedDomains,
            subdomains: parsedSubdomains,
            endpoints: parsedendpoints,
            parameters: parsedParameters,
        } = parseURLsForScopeItems(
            organizationId,
            endpoint,
            description ?? '',
            false, // mark it out of scope
        );

        domains.push(...parsedDomains);
        subdomains.push(...parsedSubdomains);
        endpoints.push(...parsedendpoints);
        parameters.push(...parsedParameters);

        // try parsing lines of instruction
        // the instruction contains a lot of urls, but some of them are out of scope
        // we will have to validate it manually
        if (description && description.length > 5) {
            description.split('\\n').forEach((line) =>
                getURLsFromText(line).forEach((maybeDomain) => {
                    const {
                        domains: domainsFromDescription,
                        subdomains: subdomainsFromDescription,
                        endpoints: endpointsFromDescription,
                        parameters: parametersFromDescription,
                    } = parseURLsForScopeItems(
                        organizationId,
                        maybeDomain,
                        description,
                        false, // mark it out of scope
                        true, // force manual review of assets, its not trustworthy source
                    );

                    domains.push(...domainsFromDescription);
                    subdomains.push(...subdomainsFromDescription);
                    endpoints.push(...endpointsFromDescription);
                    parameters.push(...parametersFromDescription);
                }),
            );
        }
    });

    return {
        domains: deduplicateDomains(domains),
        subdomains: deduplicateSubdomains(subdomains),
        endpoints,
        parameters,
    };
};

const parseProgram = (program: IHackerOneProgram): ParsedProgram => {
    const { name, url, targets } = program;
    const organizationId = nameToOrganizationID(name);

    const {
        domains,
        subdomains,
        ipRanges,
        endpoints,
        applications,
        sourceCodeRepositories,
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

export {
    parseProgram,
    parseScope,
    parseOutOfScope,
    IHackerOneProgram,
    IHackerOneProgramScopeEntry,
};

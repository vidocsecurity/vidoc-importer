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
import {
    deduplicateApplications,
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

interface IBountyTargetsIntigritiScopeEntry {
    endpoint: string;
    type: 'iprange' | 'url' | 'ios' | 'android' | 'other' | 'device';
    description: string | null;
}
interface IIntigritiProgram {
    id: string;
    name: string;
    url: string;
    status: 'open';
    min_bounty: number;
    max_bounty: number;
    disabled: boolean;
    targets: {
        in_scope: IBountyTargetsIntigritiScopeEntry[];
    };
}

const parseScope = (
    organizationId: string,
    scope: IBountyTargetsIntigritiScopeEntry[],
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
        const { endpoint, type, description } = entry;

        if (type === 'iprange') {
            ipRanges.push(...parseTextForIPs(organizationId, endpoint));
            return;
        }

        if (['ios', 'android'].includes(type)) {
            const applicationsFromDescriptionAndEndpoint = parseEndpointOrDescriptionForMobileApplications(
                organizationId,
                endpoint,
                description ?? '',
                type === 'ios',
            );

            applications.push(...applicationsFromDescriptionAndEndpoint);

            return;
        }

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
                ipRanges: ipRangesFromIdentifier,
                applications: applicationsFromIdentifier,
                parameters: parametersFromIdentifier,
            } = parseURLsForScopeItems(
                organizationId,
                url,
                description ?? '',
                true,
                type === 'other', // force manual review, strange things might happen
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
        if (description && description.length > 5) {
            description.split('\\n').forEach((line) =>
                getURLsFromText(line).forEach((maybeDomain) => {
                    const {
                        domains: domainsFromDescription,
                        subdomains: subdomainsFromDescription,
                        endpoints: endpointsFromDescription,
                        applications: applicationsFromDescription,
                        ipRanges: ipRangesFromDescription,
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
                    ipRanges.push(...ipRangesFromDescription);
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

const parseProgram = (program: IIntigritiProgram): ParsedProgram => {
    const { name, url, targets } = program;
    const organizationId = nameToOrganizationID(name);

    const {
        domains,
        subdomains,
        sourceCodeRepositories,
        applications,
        ipRanges,
        endpoints,
        parameters,
    } = parseScope(organizationId, targets.in_scope);

    const organization: IOrganization = {
        id: organizationId,
        bounty: true,
        name,
        programURL: url,
    };

    return {
        organization,
        domains,
        subdomains,
        ipRanges,
        endpoints,
        parameters,
        sourceCodeRepositories,
        applications,
    };
};

export {
    parseScope,
    parseProgram,
    IBountyTargetsIntigritiScopeEntry,
    IIntigritiProgram,
};

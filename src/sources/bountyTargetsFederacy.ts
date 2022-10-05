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
import fetch from 'node-fetch';
import {
    deduplicateDomains,
    deduplicateSubdomains,
    getSourceCodeRepositoriesFromText,
    nameToOrganizationID,
    parseTextForIPs,
} from '../common.js';
import { parseEndpointOrDescriptionForMobileApplications } from '../mobileApplicationParser.js';
import { getURLsFromText, parseURLsForScopeItems } from '../urlScopeParser.js';
import { ParsedProgram } from './../saveResults.js';

enum IBountyTargetsFederacyScopeType {
    website = 'website',
    mobile = 'mobile',
    api = 'api',
}

interface IBountyTargetsFederacyScopeEntry {
    target: string;
    type: IBountyTargetsFederacyScopeType;
}

interface IBountyTargetsFederacyEntry {
    name: string;
    url: string;
    targets: {
        in_scope: IBountyTargetsFederacyScopeEntry[];
        out_of_scope: IBountyTargetsFederacyScopeEntry[];
    };
}

const parseScope = (
    organizationId: string,
    scope: IBountyTargetsFederacyScopeEntry[],
) => {
    const domains: IDomain[] = [];
    const subdomains: ISubdomain[] = [];
    const sourceCodeRepositories: ISourceCodeRepository[] = [];
    const applications: IApplication[] = [];
    const ipRanges: IIPRange[] = [];
    const endpoints: IEndpoint[] = [];
    const parameters: IParameter[] = [];

    scope.forEach((entry) => {
        const { target: endpoint, type } = entry;

        ipRanges.push(...parseTextForIPs(organizationId, endpoint));

        if ([IBountyTargetsFederacyScopeType.mobile].includes(type)) {
            const applicationsFromDescriptionAndEndpoint = parseEndpointOrDescriptionForMobileApplications(
                organizationId,
                endpoint,
                '',
                false,
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
        }

        getURLsFromText(endpoint).forEach((url) => {
            const {
                domains: domainsFromIdentifier,
                subdomains: subdomainsFromIdentifier,
                endpoints: endpointsFromIdentifier,
                ipRanges: ipRangesFromIdentifier,
                applications: applicationsFromIdentifier,
                parameters: parametersFromIdentifier,
            } = parseURLsForScopeItems(organizationId, url, '', true);

            applications.push(...applicationsFromIdentifier);
            domains.push(...domainsFromIdentifier);
            subdomains.push(...subdomainsFromIdentifier);
            ipRanges.push(...ipRangesFromIdentifier);
            endpoints.push(...endpointsFromIdentifier);
            parameters.push(...parametersFromIdentifier);
        });
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
    scope: IBountyTargetsFederacyScopeEntry[],
) => {
    const domains: IDomain[] = [];
    const subdomains: ISubdomain[] = [];
    const endpoints: IEndpoint[] = [];

    scope.forEach((entry) => {
        const { target: endpoint } = entry;
        const {
            domains: parsedDomains,
            subdomains: parsedSubdomains,
            endpoints: parsedendpoints,
        } = parseURLsForScopeItems(
            organizationId,
            endpoint,
            '',
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

const parseProgram = (program: IBountyTargetsFederacyEntry): ParsedProgram => {
    const { name, url, targets } = program;
    const organizationId = nameToOrganizationID(name);

    const {
        domains,
        subdomains,
        applications,
        ipRanges,
        endpoints,
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
        endpoints: [...endpoints, ...endpointsFromOutOfScope],
        parameters,
        applications,
        sourceCodeRepositories,
    };
};

const fetchBountyTargetsFederacyProgramList = async () => {
    const response = await fetch(
        'https://raw.githubusercontent.com/arkadiyt/bounty-targets-data/master/data/federacy_data.json',
    );
    const programs: IBountyTargetsFederacyEntry[] = await response.json();
    console.log(
        'fetchBountyTargetsFederacyProgramList: fetched ',
        programs.length,
    );

    return programs.map((program) => parseProgram(program));
};

export {
    fetchBountyTargetsFederacyProgramList,
    parseScope,
    parseOutOfScope,
    parseProgram,
    IBountyTargetsFederacyScopeEntry,
    IBountyTargetsFederacyEntry,
    IBountyTargetsFederacyScopeType,
};

/* eslint-disable camelcase */

import fetch from 'node-fetch';
import {
    IApplication,
    IEndpoint,
    IIPRange,
    IParameter,
    ISourceCodeRepository,
    ISubdomain,
    IDirectory,
    IDomain,
} from './types/index.js';
import {
    deduplicateApplications,
    deduplicateDomains,
    deduplicateSubdomains,
    getSourceCodeRepositoriesFromText,
    nameToOrganizationID,
    parseTextForIPs,
} from '../common.js';
import { parseEndpointOrDescriptionForMobileApplications } from '../mobileApplicationParser.js';
import { getURLsFromText, parseURLsForScopeItems } from '../urlScopeParser.js';
import { ParsedProgram } from '../saveResults.js';

interface IBountyTargetsBugcrowdScopeEntry {
    target: string;
    type: 'website' | 'other' | 'api' | 'iot' | 'android' | 'ios' | 'hardware';
}

interface IBountyTargetsBugcrowdEntry {
    name: string;
    url: string;
    max_payout: number;
    disabled: boolean;
    targets: {
        in_scope: IBountyTargetsBugcrowdScopeEntry[];
        out_of_scope: IBountyTargetsBugcrowdScopeEntry[];
    };
}

const parseScope = (
    organizationId: string,
    scope: IBountyTargetsBugcrowdScopeEntry[],
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

        if (['ios', 'android'].includes(type)) {
            const applicationsFromDescriptionAndEndpoint = parseEndpointOrDescriptionForMobileApplications(
                organizationId,
                endpoint,
                '',
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
                '',
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
    });

    return {
        domains: deduplicateDomains(domains),
        subdomains: deduplicateSubdomains(subdomains),
        ipRanges,
        endpoints,
        applications: deduplicateApplications(applications),
        sourceCodeRepositories,
        parameters,
    };
};

const parseOutOfScope = (
    organizationId: string,
    scope: IBountyTargetsBugcrowdScopeEntry[],
) => {
    const domains: IDomain[] = [];
    const subdomains: ISubdomain[] = [];
    const endpoints: IEndpoint[] = [];

    scope.forEach((entry) => {
        const { target: endpoint } = entry;
        const {
            domains: parsedDomains,
            subdomains: parsedSubdomains,
            endpoints: parsedEndpoints,
        } = parseURLsForScopeItems(
            organizationId,
            endpoint,
            '',
            false, // mark it out of scope
        );

        domains.push(...parsedDomains);
        subdomains.push(...parsedSubdomains);
        endpoints.push(...parsedEndpoints);
    });

    return {
        domains: deduplicateDomains(domains),
        subdomains: deduplicateSubdomains(subdomains),
        endpoints,
    };
};

const parseProgram = (program: IBountyTargetsBugcrowdEntry): ParsedProgram => {
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

    const organization: IDirectory = {
        id: organizationId,
        bounty: true,
        name,
        programURL: url,
        platform: 'Bugcrowd Pubic',
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

const fetchBountyTargetsBugcrowdProgramList = async () => {
    const response = await fetch(
        'https://raw.githubusercontent.com/arkadiyt/bounty-targets-data/master/data/bugcrowd_data.json',
    );
    const programs: IBountyTargetsBugcrowdEntry[] = await response.json();

    const programsThatPay = programs.filter(({ max_payout }) => max_payout > 0);

    console.log(
        'fetchBountyTargetsBugcrowdProgramList: fetched ',
        programsThatPay.length,
    );

    return programsThatPay.map((program) => parseProgram(program));
};

export {
    fetchBountyTargetsBugcrowdProgramList,
    parseScope,
    parseOutOfScope,
    parseProgram,
    IBountyTargetsBugcrowdScopeEntry,
    IBountyTargetsBugcrowdEntry,
};

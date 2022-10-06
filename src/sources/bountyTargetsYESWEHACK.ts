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
    deduplicateDomains,
    deduplicateSubdomains,
    getSourceCodeRepositoriesFromText,
    nameToOrganizationID,
    parseTextForIPs,
} from '../common.js';
import { parseEndpointOrDescriptionForMobileApplications } from '../mobileApplicationParser.js';
import { getURLsFromText, parseURLsForScopeItems } from '../urlScopeParser.js';
import { ParsedProgram } from "../saveResults.js";

interface IBountyTargetsYESWEHACKScopeEntry {
    target: string;
    type:
        | 'api'
        | 'web-application'
        | 'other'
        | 'mobile-application'
        | 'mobile-application-android'
        | 'mobile-application-ios'
        | 'application'
        | 'ip-address';
}

interface IBountyTargetsYESWEHACKEntry {
    id: string;
    name: string;
    public: boolean;
    min_bounty: number;
    max_bounty: number;
    disabled: boolean;
    targets: {
        in_scope: IBountyTargetsYESWEHACKScopeEntry[];
    };
}

const parseScope = (
    organizationId: string,
    scope: IBountyTargetsYESWEHACKScopeEntry[],
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

        if (
            [
                'mobile-application-android',
                'mobile-application-ios',
                'mobile-application',
            ].includes(type)
        ) {
            const applicationsFromDescriptionAndEndpoint = parseEndpointOrDescriptionForMobileApplications(
                organizationId,
                endpoint,
                '',
                type === 'mobile-application-ios',
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
        applications,
        ipRanges,
        endpoints,
        sourceCodeRepositories,
        parameters,
    };
};

const parseProgram = (program: IBountyTargetsYESWEHACKEntry): ParsedProgram => {
    const { id, name, targets } = program;
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

    const url = `https://yeswehack.com/programs/${id}`;

    const organization: IDirectory = {
        id: organizationId,
        bounty: true,
        name,
        programURL: url,
        platform: 'YESWEHACK Public',
    };

    return {
        organization,
        domains,
        subdomains,
        ipRanges,
        endpoints,
        parameters,
        applications,
        sourceCodeRepositories,
    };
};

const fetchBountyTargetsYESWEHACKProgramList = async () => {
    const response = await fetch(
        'https://raw.githubusercontent.com/arkadiyt/bounty-targets-data/master/data/yeswehack_data.json',
    );
    const programs: IBountyTargetsYESWEHACKEntry[] = await response.json();

    const programsThatPay = programs.filter(
        ({ disabled, min_bounty, max_bounty }) =>
            disabled === false && (min_bounty > 0 || max_bounty > 0),
    );

    return programsThatPay.map((program) => parseProgram(program));
};

export {
    fetchBountyTargetsYESWEHACKProgramList,
    parseScope,
    parseProgram,
    IBountyTargetsYESWEHACKScopeEntry,
    IBountyTargetsYESWEHACKEntry,
};

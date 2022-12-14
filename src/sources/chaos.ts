import fetch from 'node-fetch';
import { ISubdomain } from '../../src/sources/types/index.js';
import {
    nameToOrganizationID,
    parseHostnameToDomainAndSubdomain,
} from '../common.js';
import { ParsedProgram } from "../saveResults.js";
import { IDirectory } from './types/directory.js';
import { IDomain } from './types/domain.js';

interface IChaosBugBountyEntry {
    name: string;
    url: string;
    bounty: boolean;
    domains: string[];
}

interface IChaosBugBountyList {
    programs: IChaosBugBountyEntry[];
}

const parseProgram = (program: IChaosBugBountyEntry): ParsedProgram => {
    const { name, url } = program;
    let hostnames = program.domains;
    const organizationId = nameToOrganizationID(name);

    // edge case
    if (typeof hostnames === 'string') {
        hostnames = [hostnames];
    }

    const organization: IDirectory = {
        id: organizationId,
        bounty: true,
        name,
        programURL: url,
        platform: '(unknown)',
    };

    const domains: IDomain[] = [];
    const subdomains: ISubdomain[] = [];

    hostnames.forEach((hostname) => {
        const { domain, subdomain } = parseHostnameToDomainAndSubdomain(
            organizationId,
            hostname,
        );

        if (domain) {
            domains.push({
                ...domain,
                forceManualReview: true,
            });
        }

        if (subdomain) {
            subdomains.push(subdomain);
        }
    });

    return {
        organization,
        domains,
        subdomains,
        ipRanges: [],
        endpoints: [],
        parameters: [],
        applications: [],
        sourceCodeRepositories: [],
    };
};

const fetchChaosProgramList = async () => {
    const response = await fetch(
        'https://raw.githubusercontent.com/projectdiscovery/public-bugbounty-programs/master/chaos-bugbounty-list.json',
    );
    const { programs }: IChaosBugBountyList = await response.json();

    const programsThatPay = programs.filter((program) => program.bounty);
    console.log('fetchChaosProgramList: fetched ', programsThatPay.length);

    return programsThatPay.map((program) => parseProgram(program));
};

export { fetchChaosProgramList };

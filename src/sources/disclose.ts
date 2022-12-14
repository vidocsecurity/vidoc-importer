/* eslint-disable camelcase */

import fetch from 'node-fetch';
import { nameToOrganizationID } from '../common.js';
import { IDirectory } from './types/directory.js';

interface IDiscloseBugBountyEntry {
    program_name: string;
    policy_url: string;
    offers_bounty: 'no' | 'yes' | '';
}

type IDiscloseBugBountyList = IDiscloseBugBountyEntry[];

const parseProgram = (program: IDiscloseBugBountyEntry) => {
    const { program_name, policy_url } = program;
    const organizationId = nameToOrganizationID(program_name);

    const organization: IDirectory = {
        id: organizationId,
        bounty: true,
        name: program_name,
        programURL: policy_url,
        platform: '(unknown)',
    };

    return {
        organization,
        domains: [],
        subdomains: [],
        ipRanges: [],
        endpoints: [],
        parameters: [],
        applications: [],
        sourceCodeRepositories: [],
    };
};

const fetchDiscloseProgramList = async () => {
    const response = await fetch(
        'https://raw.githubusercontent.com/disclose/diodb/master/program-list.json',
    );
    const programs: IDiscloseBugBountyList = await response.json();

    const programsThatPay = programs.filter(
        (program) => program.offers_bounty === 'yes',
    );
    console.log('fetchDiscloseProgramList: fetched ', programsThatPay.length);

    return programsThatPay.map((program) => parseProgram(program));
};

export { fetchDiscloseProgramList };

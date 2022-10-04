/* eslint-disable camelcase */

import fetch from 'node-fetch';
import { processInChunks } from '../../common.js';
import {
    IBountyTargetsIntigritiScopeEntry,
    IIntigritiProgram,
    parseProgram,
} from './intigritiProgramParser.js';
import { getAuthorizationHeader } from './intigritiSSO.js';

const SCOPE_TYPES_MAPPED: {
    [key: number]: 'iprange' | 'url' | 'ios' | 'android' | 'other' | 'device';
} = {
    1: 'url',
    2: 'android',
    3: 'ios',
    4: 'iprange',
    5: 'device',
    6: 'other',
};

const fetchScope = async (
    headers: { authorization: string },
    companyHandle: string,
    handle: string,
): Promise<IBountyTargetsIntigritiScopeEntry[]> => {
    const response = await fetch(
        `https://api.intigriti.com/core/researcher/program/${encodeURIComponent(
            companyHandle,
        )}/${encodeURIComponent(handle)}`,
        {
            headers,
        },
    );

    if (response.status === 403) {
        console.log(
            `https://app.intigriti.com/researcher/programs/${companyHandle}/${handle}/tac/detail requires something more program`,
        );
        return [];
    }

    if (response.status !== 200) {
        throw new Error(
            `Something went wrong while fetching Intigriti private programs, status code: ${
                response.status
            }, for ${handle} ${companyHandle}, response text: ${await response.text()}`,
        );
    }

    const scope = await response.json();

    if (scope.domains === undefined) {
        return [];
    }
    const in_scope: IBountyTargetsIntigritiScopeEntry[] = [];

    scope.domains.forEach((domain: any) => {
        const { content } = domain;

        if (!Array.isArray(content)) {
            throw new Error(
                `content is not an array for ${handle} ${companyHandle}, ${JSON.stringify(
                    domain,
                )}`,
            );
        }

        content.forEach(
            (endpoints: {
                description: string;
                endpoint: string;
                type: number;
            }) => {
                const { description, endpoint, type } = endpoints;
                in_scope.push({
                    description,
                    endpoint: endpoint ?? '',
                    type: SCOPE_TYPES_MAPPED[type] ?? 'other',
                });
            },
        );
    });

    return in_scope;
};

const fetchProgramsAndParseThem = async (headers: {
    authorization: string;
}) => {
    const response = await fetch(
        'https://api.intigriti.com/core/researcher/program',
        {
            headers,
        },
    );

    if (response.status !== 200) {
        throw new Error(
            `Something went wrong while fetching Intigriti private programs, status code: ${
                response.status
            }, response text: ${await response.text()}`,
        );
    }

    const programs = await response.json();
    const programIDsOfProgramsThatPay: IIntigritiProgram[] = [];

    await processInChunks(programs, 50, async (chunk) => {
        const promises = chunk.map(async (program: any) => {
            const {
                name,
                companyHandle,
                handle,
                programId,
                maxBounty,
                minBounty,
            } = program;

            if (maxBounty === 0 && minBounty === 0) {
                return;
            }

            const intigritiProgram: IIntigritiProgram = {
                id: programId,
                name,
                min_bounty: minBounty,
                max_bounty: maxBounty,
                status: 'open',
                disabled: false,
                url: `https://app.intigriti.com/researcher/programs/${companyHandle}/${handle}/detail`,
                targets: {
                    in_scope: await fetchScope(headers, companyHandle, handle),
                },
            };

            programIDsOfProgramsThatPay.push(intigritiProgram);
        });

        await Promise.all(promises);
    });

    return programIDsOfProgramsThatPay;
};

export interface IntigritiConfig {
    email: string;
    password: string;
}

const fetchPrivateProgramsFromIntigritiProgram = async ({
    email,
    password,
}: IntigritiConfig) => {
    const authorizationHeaders = await getAuthorizationHeader(email, password);

    const programIDsOfProgramsThatPay: IIntigritiProgram[] = await fetchProgramsAndParseThem(
        authorizationHeaders,
    );

    console.log(
        'fetchPrivateProgramsFromIntigritiProgram: fetched ',
        programIDsOfProgramsThatPay.length,
    );

    return programIDsOfProgramsThatPay.map((program) => parseProgram(program));
};

export { fetchPrivateProgramsFromIntigritiProgram };

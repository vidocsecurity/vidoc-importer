/* eslint-disable camelcase */

import { getAllTeams } from './hackerOneClient.js';
import {
    IHackerOneProgram,
    IHackerOneProgramScopeEntry,
    parseProgram,
} from './hackerOneProgramParser.js';

const teamsToListOfPrograms = (teams: any): IHackerOneProgram[] => {
    if (!Array.isArray(teams)) {
        throw new Error('teamsToListOfPrograms: teams is not an array');
    }

    return teams.map((edge: any) => {
        const {
            name,
            handle,
            in_scope_assets,
            out_scope_assets,
            submission_state,
        } = edge;

        if (!Array.isArray(in_scope_assets.edges)) {
            throw new Error('in_scope_assets.edges is not an array');
        }

        const parsedInScope: IHackerOneProgramScopeEntry[] = in_scope_assets.edges.map(
            (edge: any) => {
                const {
                    node: { asset_identifier, asset_type, instruction },
                } = edge;
                return {
                    asset_identifier,
                    asset_type,
                    instruction,
                };
            },
        );

        if (!Array.isArray(out_scope_assets.edges)) {
            throw new Error('out_scope_assets.edges is not an array');
        }

        const parsedOutOfScope: IHackerOneProgramScopeEntry[] = out_scope_assets.edges.map(
            (edge: any) => {
                const {
                    node: { asset_identifier, asset_type, instruction },
                } = edge;
                return {
                    asset_identifier,
                    asset_type,
                    instruction,
                };
            },
        );

        const program: IHackerOneProgram = {
            id: '',
            name,
            url: `https://hackerone.com/${handle}`,
            offers_bounties: true,
            submission_state,
            targets: {
                in_scope: parsedInScope,
                out_of_scope: parsedOutOfScope,
            },
        };

        return program;
    });
};

interface HackeroneConfig {
    sessionCookie: string;
}

const fetchPrivateProgramsFromHackerOneProgram = async ({
    sessionCookie,
}: HackeroneConfig) => {
    const teams = await getAllTeams(sessionCookie);

    const programs = teamsToListOfPrograms(teams);

    console.log(
        'fetchPrivateProgramsFromHackerOneProgram: fetched ',
        programs.length,
    );

    return programs.map((program) => parseProgram(program));
};

export { fetchPrivateProgramsFromHackerOneProgram };

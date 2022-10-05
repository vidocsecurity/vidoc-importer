import { GraphQLClient } from 'graphql-request';
import retry from 'async-retry';
import {
    HACKERONE_ASSETS_QUERY,
    HACKERONE_PROGRAMS_QUERY,
    HACKERONE_PROGRAMS_QUERY_VARIABLES,
} from './hackerOneGraphql.js';
import { processInChunks } from '../../common.js';
import fetch from 'node-fetch';

const CSRF_REGEX = /(?<="csrf-token"\s+content=")([^"]+)/gi;

const getAllTeams = async (sessionCookie: string) => {
    let nextCursor = '';
    const variables = {
        ...HACKERONE_PROGRAMS_QUERY_VARIABLES,
    };

    const teams: any[] = [];

    const response = await fetch('https://hackerone.com/directory/programs', {
        headers: {
            Cookie: `__Host-session=${sessionCookie};`,
        },
    });

    if (response.status !== 200) {
        throw new Error('Invalid session cookie');
    }

    const text = await response.text();

    const csrfToken = text.match(CSRF_REGEX)?.[0];

    if (!csrfToken) {
        throw new Error('Invalid session cookie');
    }

    const client = new GraphQLClient('https://hackerone.com/graphql', {
        headers: {
            Cookie: `__Host-session=${sessionCookie};`,
            'x-csrf-token': csrfToken,
        },
    });
    const handles: string[] = [];
    /* eslint-disable no-await-in-loop */
    while (true) {
        if (nextCursor.length > 0) {
            variables.cursor = nextCursor;
        }

        const data = await retry(
            async () => client.request(HACKERONE_PROGRAMS_QUERY, variables),
            {
                retries: 2,
            },
        );

        data.teams.edges.forEach((team) => {
            handles.push(team.node.handle);
        });

        if (data.teams.pageInfo && data.teams.pageInfo.hasNextPage) {
            nextCursor = data.teams.pageInfo.endCursor;
        } else {
            break;
        }
    }

    await processInChunks(handles, 50, async (chunk) => {
        const promises = chunk.map(async (handle) => {
            const data = await retry(
                async () =>
                    client.request(HACKERONE_ASSETS_QUERY, {
                        handle,
                    }),
                {
                    retries: 2,
                },
            );

            return data.team;
        });

        const data = await Promise.all(promises);

        teams.push(...data);
    });

    return teams;
};

export { getAllTeams };

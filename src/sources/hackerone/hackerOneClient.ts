import { GraphQLClient } from 'graphql-request';
// import fetch from 'node-fetch';
import retry from 'async-retry';
import {
    HACKERONE_ASSETS_QUERY,
    HACKERONE_PROGRAMS_QUERY,
    HACKERONE_PROGRAMS_QUERY_VARIABLES,
} from './hackerOneGraphql.js';
import { processInChunks } from '../../common.js';

// const fetchToken = async (sessionCookie: string): Promise<string> => {
//     const response = await fetch(
//         'https://hackerone.com/current_user/graphql_token.json',
//         {
//             headers: {
//                 Cookie: `__Host-session=${sessionCookie};`,
//             },
//         },
//     );

//     if (response.status !== 200) {
//         throw new Error(
//             `Something went wrong while fetching Hackerone token, status code: ${
//                 response.status
//             }, response text: ${await response.text()}`,
//         );
//     }

//     const { graphql_token: graphqlToken } = await response.json();

//     return graphqlToken;
// };

const getAllTeams = async (sessionCookie: string) => {
    let nextCursor = '';
    const variables = {
        ...HACKERONE_PROGRAMS_QUERY_VARIABLES,
    };

    const teams: any[] = [];

    const client = new GraphQLClient('https://hackerone.com/graphql', {
        headers: {
            Cookie: `__Host-session=${sessionCookie};`,
        },
    });
    let handles: string[] = [];
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

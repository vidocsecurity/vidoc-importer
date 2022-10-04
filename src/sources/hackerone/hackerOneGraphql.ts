import { gql } from 'graphql-request';

export const HACKERONE_ASSETS_QUERY = gql`
    query TeamAssets($handle: String!) {
        team(handle: $handle) {
            id
            handle
            name
            submission_state
            in_scope_assets: structured_scopes(
                first: 650
                archived: false
                eligible_for_submission: true
            ) {
                edges {
                    node {
                        id
                        asset_type
                        asset_identifier
                        instruction
                        max_severity
                        eligible_for_bounty
                        labels(first: 100) {
                            edges {
                                node {
                                    id
                                    name
                                    __typename
                                }
                                __typename
                            }
                            __typename
                        }
                        __typename
                    }
                    __typename
                }
                __typename
            }
            out_scope_assets: structured_scopes(
                first: 650
                archived: false
                eligible_for_submission: false
            ) {
                edges {
                    node {
                        id
                        asset_type
                        asset_identifier
                        instruction
                        __typename
                    }
                    __typename
                }
                __typename
            }
            __typename
        }
    }
`;

export const HACKERONE_PROGRAMS_QUERY = gql`
    query DirectoryQuery(
        $cursor: String
        $secureOrderBy: FiltersTeamFilterOrder
        $where: FiltersTeamFilterInput
    ) {
        teams(
            first: 100
            after: $cursor
            secure_order_by: $secureOrderBy
            where: $where
        ) {
            pageInfo {
                endCursor
                hasNextPage
                __typename
            }
            edges {
                node {
                    id
                    handle
                    __typename
                }
                __typename
            }
            __typename
        }
    }
`;

export const HACKERONE_PROGRAMS_QUERY_VARIABLES: any = {
    where: {
        _and: [
            {
                _or: [
                    {
                        offers_bounties: {
                            _eq: true,
                        },
                    },
                    {
                        external_program: {
                            offers_rewards: {
                                _eq: true,
                            },
                        },
                    },
                ],
            },
            {
                _or: [
                    {
                        submission_state: {
                            _eq: 'open',
                        },
                    },
                    {
                        submission_state: {
                            _eq: 'api_only',
                        },
                    },
                    {
                        external_program: {},
                    },
                ],
            },
            {
                _not: {
                    external_program: {},
                },
            },
            {
                _or: [
                    {
                        _and: [
                            {
                                state: {
                                    _neq: 'sandboxed',
                                },
                            },
                            {
                                state: {
                                    _neq: 'soft_launched',
                                },
                            },
                        ],
                    },
                    {
                        external_program: {},
                    },
                ],
            },
        ],
    },
    first: 50,
    secureOrderBy: {
        launched_at: {
            _direction: 'DESC',
        },
    },
};

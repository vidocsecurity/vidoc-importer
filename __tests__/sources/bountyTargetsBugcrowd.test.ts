import { ApplicationType } from '@boosted-bb/backend-interfaces';
import {
    IBountyTargetsBugcrowdScopeEntry,
    parseOutOfScope,
    parseScope,
    parseProgram,
    IBountyTargetsBugcrowdEntry,
} from '../../src/sources/bountyTargetsBugcrowd.js';

describe('parseProgram', () => {
    it('parses program', () => {
        const program: IBountyTargetsBugcrowdEntry = {
            name: 'test',
            url: 'https://bugcrowd.com/foo',
            max_payout: 2000,
            disabled: false,
            targets: {
                in_scope: [
                    {
                        type: 'other',
                        target: 'lrswitch-access-2.kulnet.kuleuven.be',
                    },
                ],
                out_of_scope: [
                    {
                        type: 'other',
                        target: 'ad.nl',
                    },
                ],
            },
        };

        const parsedProgram = parseProgram(program);
        const expectedProgram = {
            organization: {
                id: 'test',
                bounty: true,
                name: 'test',
                programURL: 'https://bugcrowd.com/foo',
            },
            domains: [
                {
                    domainId: 'ad.nl',
                    organizationId: 'test',
                    forceManualReview: false,
                    isInScope: false,
                },
                {
                    domainId: 'kuleuven.be',
                    organizationId: 'test',
                    forceManualReview: true,
                },
            ],
            subdomains: [
                {
                    subdomainId: 'lrswitch-access-2.kulnet.kuleuven.be',
                    root: 'kuleuven.be',
                    organizationId: 'test',
                },
            ],
            ipRanges: [],
            endpoints: [],
            applications: [],
            sourceCodeRepositories: [],
        };

        expect(parsedProgram).toMatchObject(expectedProgram);
    });
});

describe('parseScope - type OTHER', () => {
    it('parses endpoints for domains and subdomains', () => {
        const scopeEntries: IBountyTargetsBugcrowdScopeEntry[] = [
            {
                type: 'other',
                target: 'lrswitch-access-2.kulnet.kuleuven.be',
            },
            {
                type: 'other',
                target: '.ad.nl',
            },
            {
                type: 'other',
                target: 'https://app.acorns.com',
            },
            {
                type: 'other',
                target: 'some bullshit',
            },
        ];

        const result = parseScope('test', scopeEntries);

        const expectedResult = {
            domains: [
                {
                    domainId: 'kuleuven.be',
                    organizationId: 'test',
                    forceManualReview: true,
                },
                {
                    domainId: 'ad.nl',
                    organizationId: 'test',
                    forceManualReview: true,
                },
                {
                    domainId: 'acorns.com',
                    organizationId: 'test',
                    forceManualReview: true,
                },
            ],
            subdomains: [
                {
                    subdomainId: 'lrswitch-access-2.kulnet.kuleuven.be',
                    root: 'kuleuven.be',
                    organizationId: 'test',
                },
                {
                    subdomainId: 'app.acorns.com',
                    root: 'acorns.com',
                    organizationId: 'test',
                },
            ],
            ipRanges: [],
            endpoints: [],
            applications: [],
            sourceCodeRepositories: [],
        };

        expect(result).toMatchObject(expectedResult);
    });

    it('parses endpoints for source codes', () => {
        const scopeEntries: IBountyTargetsBugcrowdScopeEntry[] = [
            {
                type: 'other',
                target:
                    'Algorand Golang SDK - https://github.com/algorand/go-algorand-sdk',
            },
            {
                type: 'other',
                target: 'https://github.com/algorand/java-algorand-sdk',
            },
        ];

        const result = parseScope('test', scopeEntries);

        const expectedResult = {
            domains: [],
            subdomains: [],
            applications: [],
            ipRanges: [],
            endpoints: [],
            sourceCodeRepositories: [
                {
                    url: 'https://github.com/algorand/go-algorand-sdk',
                    type: 'github',
                },
                {
                    url: 'https://github.com/algorand/java-algorand-sdk',
                    type: 'github',
                },
            ],
        };

        expect(result).toMatchObject(expectedResult);
    });
});

describe('parseScope - type ios and android', () => {
    it('parses endpoints for android app', () => {
        const scopeEntries: IBountyTargetsBugcrowdScopeEntry[] = [
            {
                type: 'android',
                target: 'Confluence Cloud Android',
            },
            {
                type: 'android',
                target:
                    'https://play.google.com/store/apps/details?id=com.atlassian.confluence.server',
            },
            {
                type: 'android',
                target: 'com.blockfi.android',
            },
        ];

        const result = parseScope('test', scopeEntries);

        const expectedResult = {
            domains: [],
            subdomains: [],
            applications: [
                {
                    name: 'Confluence Cloud Android',
                    type: ApplicationType.androidMobile,
                },
                {
                    url:
                        'https://play.google.com/store/apps/details?id=com.atlassian.confluence.server',
                    type: ApplicationType.androidMobile,
                },
                {
                    url:
                        'https://play.google.com/store/apps/details?id=com.blockfi.android',
                    type: ApplicationType.androidMobile,
                },
            ],
            ipRanges: [],
            endpoints: [],
            sourceCodeRepositories: [],
        };

        expect(result).toMatchObject(expectedResult);
    });

    it('parses endpoints for ios app', () => {
        const scopeEntries: IBountyTargetsBugcrowdScopeEntry[] = [
            {
                type: 'ios',
                target: 'Confluence Cloud Android',
            },
            {
                type: 'ios',
                target:
                    'https://apps.apple.com/us/app/confluence-server/id1288365159',
            },
            {
                type: 'ios',
                target: 'com.blockfi.android',
            },
        ];

        const result = parseScope('test', scopeEntries);

        const expectedResult = {
            domains: [],
            subdomains: [],
            applications: [
                {
                    name: 'Confluence Cloud Android',
                    type: ApplicationType.iosMobile,
                },
                {
                    url:
                        'https://apps.apple.com/us/app/confluence-server/id1288365159',
                    type: ApplicationType.iosMobile,
                },
                {
                    url: 'https://apps.apple.com/app/com.blockfi.android',
                    type: ApplicationType.iosMobile,
                },
            ],
            ipRanges: [],
            endpoints: [],
            sourceCodeRepositories: [],
        };

        expect(result).toMatchObject(expectedResult);
    });
});

describe('parseOutOfScope', () => {
    it('parses endpoints for domains and subdomains', () => {
        const scopeEntries: IBountyTargetsBugcrowdScopeEntry[] = [
            {
                type: 'other',
                target: 'lrswitch-access-2.kulnet.kuleuven.be',
            },
            {
                type: 'website',
                target: 'ad.nl',
            },
            {
                type: 'api',
                target: 'https://app.acorns.com',
            },
            {
                type: 'other',
                target: 'some bullshit',
            },
        ];

        const result = parseOutOfScope('test', scopeEntries);

        const expectedResult = {
            domains: [
                {
                    domainId: 'kuleuven.be',
                    organizationId: 'test',
                    forceManualReview: false,
                },
                {
                    domainId: 'ad.nl',
                    organizationId: 'test',
                    forceManualReview: false,
                    isInScope: false,
                },
                {
                    domainId: 'acorns.com',
                    organizationId: 'test',
                    forceManualReview: false,
                },
            ],
            subdomains: [
                {
                    subdomainId: 'lrswitch-access-2.kulnet.kuleuven.be',
                    root: 'kuleuven.be',
                    organizationId: 'test',
                },
                {
                    subdomainId: 'app.acorns.com',
                    root: 'acorns.com',
                    organizationId: 'test',
                },
            ],
            endpoints: [],
        };

        expect(result).toMatchObject(expectedResult);
    });
});

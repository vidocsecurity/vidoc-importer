import { ApplicationType } from '@boosted-bb/backend-interfaces';
import {
    IBountyTargetsFederacyEntry,
    parseOutOfScope,
    parseScope,
    parseProgram,
    IBountyTargetsFederacyScopeEntry,
    IBountyTargetsFederacyScopeType,
} from '../../src/sources/bountyTargetsFederacy.js';

describe('parseProgram', () => {
    it('parses program', () => {
        const program: IBountyTargetsFederacyEntry = {
            name: 'test',
            url: 'https://bugcrowd.com/foo',
            targets: {
                in_scope: [
                    {
                        type: IBountyTargetsFederacyScopeType.api,
                        target: 'lrswitch-access-2.kulnet.kuleuven.be',
                    },
                ],
                out_of_scope: [
                    {
                        type: IBountyTargetsFederacyScopeType.website,
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
                    forceManualReview: false,
                },
            ],
            applications: [],
            subdomains: [
                {
                    subdomainId: 'lrswitch-access-2.kulnet.kuleuven.be',
                    root: 'kuleuven.be',
                    organizationId: 'test',
                },
            ],
            ipRanges: [],
            endpoints: [],
        };

        expect(parsedProgram).toMatchObject(expectedProgram);
    });
});

describe('parseScope - type ios and android', () => {
    it('parses endpoints for android app', () => {
        const scopeEntries: IBountyTargetsFederacyScopeEntry[] = [
            {
                type: IBountyTargetsFederacyScopeType.mobile,
                target: 'Confluence Cloud Android',
            },
            {
                type: IBountyTargetsFederacyScopeType.mobile,
                target:
                    'https://play.google.com/store/apps/details?id=com.atlassian.confluence.server',
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
            ],
            ipRanges: [],
            endpoints: [],
            sourceCodeRepositories: [],
        };

        expect(result).toMatchObject(expectedResult);
    });

    it('parses endpoints for ios app', () => {
        const scopeEntries: IBountyTargetsFederacyScopeEntry[] = [
            {
                type: IBountyTargetsFederacyScopeType.mobile,
                target:
                    'https://apps.apple.com/us/app/confluence-server/id1288365159',
            },
        ];

        const result = parseScope('test', scopeEntries);

        const expectedResult = {
            domains: [],
            subdomains: [],
            applications: [
                {
                    url:
                        'https://apps.apple.com/us/app/confluence-server/id1288365159',
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

describe('parseScope - subdomains and domains', () => {
    it('parses endpoints for domains and subdomains', () => {
        const scopeEntries: IBountyTargetsFederacyScopeEntry[] = [
            {
                type: IBountyTargetsFederacyScopeType.api,
                target: 'sandbox.checkhq.com',
            },
        ];

        const result = parseScope('test', scopeEntries);

        const expectedResult = {
            domains: [
                {
                    domainId: 'checkhq.com',
                    organizationId: 'test',
                    forceManualReview: false,
                    isInScope: true,
                },
            ],
            subdomains: [
                {
                    subdomainId: 'sandbox.checkhq.com',
                    organizationId: 'test',
                    root: 'checkhq.com',
                },
            ],
            endpoints: [],
        };

        expect(result).toMatchObject(expectedResult);
    });
});

describe('parseOutOfScope', () => {
    it('parses endpoints for domains and subdomains', () => {
        const scopeEntries: IBountyTargetsFederacyScopeEntry[] = [
            {
                type: IBountyTargetsFederacyScopeType.website,
                target: 'lrswitch-access-2.kulnet.kuleuven.be',
            },
            {
                type: IBountyTargetsFederacyScopeType.website,
                target: 'ad.nl',
            },
            {
                type: IBountyTargetsFederacyScopeType.api,
                target: 'https://app.acorns.com',
            },
            {
                type: IBountyTargetsFederacyScopeType.api,
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
                    organizationId: 'test',
                    root: 'acorns.com',
                },
            ],
            endpoints: [],
        };

        expect(result).toMatchObject(expectedResult);
        expect(result.domains[0].isInScope).toBeUndefined();
        expect(result.domains[2].isInScope).toBeUndefined();
    });
});

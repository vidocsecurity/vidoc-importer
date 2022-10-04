import { ApplicationType } from '@boosted-bb/backend-interfaces';
import {
    IBountyTargetsHackenProofScopeEntry,
    parseOutOfScope,
    parseScope,
    parseProgram,
    IBountyTargetsHackenProofEntry,
    IBountyTargetsHackenProofScopeType,
} from '../../src/sources/bountyTargetsHackenProof.js';

describe('parseProgram', () => {
    it('parses program', () => {
        const program: IBountyTargetsHackenProofEntry = {
            name: 'test',
            url: 'https://hackenproof.com/bitforex/bitforex-exchange-1',
            archived: false,
            targets: {
                in_scope: [
                    {
                        type: IBountyTargetsHackenProofScopeType.Web,
                        target: 'lrswitch-access-2.kulnet.kuleuven.be',
                        instruction: '',
                    },
                    {
                        type: IBountyTargetsHackenProofScopeType.WEB,
                        target: '*.bitforex.com',
                        instruction: '',
                    },
                ],
                out_of_scope: [
                    {
                        type: IBountyTargetsHackenProofScopeType.API,
                        instruction: '',
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
                programURL:
                    'https://hackenproof.com/bitforex/bitforex-exchange-1',
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
                {
                    domainId: 'bitforex.com',
                    organizationId: 'test',
                    forceManualReview: false,
                },
            ],
            subdomains: [
                {
                    subdomainId: 'lrswitch-access-2.kulnet.kuleuven.be',
                    organizationId: 'test',
                    root: 'kuleuven.be',
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
        const scopeEntries: IBountyTargetsHackenProofScopeEntry[] = [
            {
                type: IBountyTargetsHackenProofScopeType.Android,
                instruction: '',
                target: 'Confluence Cloud Android',
            },
            {
                type: IBountyTargetsHackenProofScopeType.Android,
                instruction: '',
                target:
                    'https://play.google.com/store/apps/details?id=com.atlassian.confluence.server',
            },
            {
                type: IBountyTargetsHackenProofScopeType.Android,
                instruction: 'aaa',
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
                    description: 'aaa',
                },
            ],
            ipRanges: [],
            endpoints: [],
            sourceCodeRepositories: [],
        };

        expect(result).toMatchObject(expectedResult);
    });

    it('parses endpoints for ios app', () => {
        const scopeEntries: IBountyTargetsHackenProofScopeEntry[] = [
            {
                type: IBountyTargetsHackenProofScopeType.iOS,
                instruction: '',
                target: 'Confluence Cloud Android',
            },
            {
                type: IBountyTargetsHackenProofScopeType.iOS,
                instruction: 'ccc',
                target:
                    'https://apps.apple.com/us/app/confluence-server/id1288365159',
            },
            {
                type: IBountyTargetsHackenProofScopeType.iOS,
                instruction: 'bbb',
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
                    description: 'ccc',
                    type: ApplicationType.iosMobile,
                },
                {
                    url: 'https://apps.apple.com/app/com.blockfi.android',
                    description: 'bbb',
                    type: ApplicationType.iosMobile,
                },
            ],
            ipRanges: [],
            endpoints: [],
            sourceCodeRepositories: [],
        };

        expect(result).toMatchObject(expectedResult);
    });

    it('parses description with URL as mobile application for google play', () => {
        const scopeEntries: IBountyTargetsHackenProofScopeEntry[] = [
            {
                type: IBountyTargetsHackenProofScopeType.Android,
                target: 'com.foo.aa',
                instruction:
                    'sakdkas https://play.google.com/store/apps/details?id=be.basecompany.base.mybase',
            },
        ];

        const result = parseScope('test', scopeEntries);

        const expectedResult = {
            domains: [],
            subdomains: [],
            applications: [
                {
                    url:
                        'https://play.google.com/store/apps/details?id=be.basecompany.base.mybase',
                    type: ApplicationType.androidMobile,
                },
            ],
            ipRanges: [],
            endpoints: [],
            sourceCodeRepositories: [],
        };

        expect(result).toMatchObject(expectedResult);
    });

    it('parses description with URL as mobile application for apple', () => {
        const scopeEntries: IBountyTargetsHackenProofScopeEntry[] = [
            {
                type: IBountyTargetsHackenProofScopeType.iOS,
                target: 'com.foo.aa',
                instruction:
                    'sakdkas https://apps.apple.com/nl/app/speakap/id713925262',
            },
        ];

        const result = parseScope('test', scopeEntries);

        const expectedResult = {
            domains: [],
            subdomains: [],
            applications: [
                {
                    url: 'https://apps.apple.com/nl/app/speakap/id713925262',
                    description:
                        'sakdkas https://apps.apple.com/nl/app/speakap/id713925262',
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

describe('parseScope', () => {
    it('parses description for domain, subdomain and content', () => {
        const description =
            'Unibet Casino - Slots & Games\n\nhttps://cdn.unicdn.net/apk/UnibetCasino.apk';
        const scopeEntries: IBountyTargetsHackenProofScopeEntry[] = [
            {
                target: 'a',
                type: IBountyTargetsHackenProofScopeType.API,
                instruction: description,
            },
        ];
        const result = parseScope('test', scopeEntries);

        const expectedResult = {
            domains: [
                {
                    domainId: 'unicdn.net',
                    organizationId: 'test',
                    forceManualReview: true,
                },
            ],
            subdomains: [
                {
                    subdomainId: 'cdn.unicdn.net',
                    organizationId: 'test',
                    root: 'unicdn.net',
                },
            ],
            applications: [],
            ipRanges: [],
            endpoints: [
                {
                    path: '/apk/UnibetCasino.apk',
                    subdomainId: 'unicdn.net',
                    organizationId: 'test',
                },
                {
                    path: '/apk/UnibetCasino.apk',
                    subdomainId: 'cdn.unicdn.net',
                    organizationId: 'test',
                },
            ],
            parameters: [],
            sourceCodeRepositories: [],
        };

        expect(result).toMatchObject(expectedResult);
    });

    it('parses description for mobile applications, other applications and source codes', () => {
        const description =
            'Element Android is a popular open-source client for Matrix.\nIt is published in the [Google Play Store](https://play.google.com/store/apps/details?id=im.vector.app) and on [F-Droid](https://f-droid.org/en/packages/im.vector.app/).\n\nSource available on GitHub at [vector-im/element-android](https://github.com/vector-im/element-android)';
        const scopeEntries: IBountyTargetsHackenProofScopeEntry[] = [
            {
                type: IBountyTargetsHackenProofScopeType.API,
                target: '(Client) Element Android',
                instruction: description,
            },
        ];
        const result = parseScope('test', scopeEntries);

        const expectedResult = {
            domains: [],
            subdomains: [],
            applications: [
                {
                    type: ApplicationType.androidMobile,
                    url:
                        'https://play.google.com/store/apps/details?id=im.vector.app',
                    description,
                    organizationId: 'test',
                },
                {
                    type: ApplicationType.mobileUnknown,
                    url: 'https://f-droid.org/en/packages/im.vector.app/',
                    description,
                    organizationId: 'test',
                },
            ],
            ipRanges: [],
            endpoints: [],
            sourceCodeRepositories: [
                {
                    type: 'github',
                    url: 'https://github.com/vector-im/element-android',
                    description,
                    organizationId: 'test',
                },
            ],
        };

        expect(result).toMatchObject(expectedResult);
    });

    it('parses target other applications and source codes', () => {
        const scopeEntries: IBountyTargetsHackenProofScopeEntry[] = [
            {
                type: IBountyTargetsHackenProofScopeType.API,
                target: 'https://github.com/kalmar-io/leverage-yield-contracts',
                instruction: '',
            },
        ];
        const result = parseScope('test', scopeEntries);

        const expectedResult = {
            domains: [],
            subdomains: [],
            applications: [],
            ipRanges: [],
            endpoints: [],
            otherApplications: [],
            sourceCodeRepositories: [
                {
                    type: 'github',
                    url:
                        'https://github.com/kalmar-io/leverage-yield-contracts',
                },
            ],
        };

        expect(result).toMatchObject(expectedResult);
    });

    it('parses instruction other applications', () => {
        const scopeEntries: IBountyTargetsHackenProofScopeEntry[] = [
            {
                type: IBountyTargetsHackenProofScopeType.Extension,
                target: 'Chrome Extension',
                instruction:
                    'https://chrome.google.com/webstore/detail/coingecko-bitcoin-cryptoc/ofmoicejmilkphppeoekfhbpkleppdlb',
            },
        ];
        const result = parseScope('test', scopeEntries);

        const expectedResult = {
            domains: [],
            subdomains: [],
            ipRanges: [],
            endpoints: [],
            applications: [
                {
                    type: 'browserExtension',
                    name: 'Chrome Extension',
                    organizationId: 'test',
                    url:
                        'https://chrome.google.com/webstore/detail/coingecko-bitcoin-cryptoc/ofmoicejmilkphppeoekfhbpkleppdlb',
                },
            ],
            sourceCodeRepositories: [],
        };

        expect(result).toMatchObject(expectedResult);
    });

    it('parses target other applications and source codes chrome extension', () => {
        const scopeEntries: IBountyTargetsHackenProofScopeEntry[] = [
            {
                type: IBountyTargetsHackenProofScopeType.Extension,
                target: 'Chrome Extension',
                instruction: 'aa',
            },
        ];
        const result = parseScope('test', scopeEntries);

        const expectedResult = {
            domains: [],
            subdomains: [],
            ipRanges: [],
            endpoints: [],
            applications: [
                {
                    type: 'browserExtension',
                    name: 'Chrome Extension',
                    description: 'aa',
                    organizationId: 'test',
                },
            ],
            sourceCodeRepositories: [],
        };

        expect(result).toMatchObject(expectedResult);
    });
});

describe('parseOutOfScope', () => {
    it('parses endpoints for domains and subdomains', () => {
        const scopeEntries: IBountyTargetsHackenProofScopeEntry[] = [
            {
                type: IBountyTargetsHackenProofScopeType.API,
                instruction: 'ccc',
                target: 'lrswitch-access-2.kulnet.kuleuven.be',
            },
            {
                type: IBountyTargetsHackenProofScopeType.Web,
                instruction: '',
                target: 'ad.nl',
            },
            {
                type: IBountyTargetsHackenProofScopeType.OutOfScope,
                instruction: '',
                target: 'https://app.acorns.com',
            },
            {
                type: IBountyTargetsHackenProofScopeType.Blockchain,
                instruction: '',
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
                    forceManualReview: false,
                },
            ],
            subdomains: [
                {
                    subdomainId: 'lrswitch-access-2.kulnet.kuleuven.be',
                    organizationId: 'test',
                    root: 'kuleuven.be',
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
    });
});

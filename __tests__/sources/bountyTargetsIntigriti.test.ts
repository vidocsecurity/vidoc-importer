import { ApplicationType, IPRangeType } from '@boosted-bb/backend-interfaces';
import {
    IIntigritiProgram,
    IBountyTargetsIntigritiScopeEntry,
    parseProgram,
    parseScope,
} from '../../src/sources/intigriti/intigritiProgramParser.js';

describe('parseProgram', () => {
    it('parses program', () => {
        const program: IIntigritiProgram = {
            id: 'a',
            name: 'test',
            url: 'https://bugcrowd.com/foo',
            min_bounty: 1,
            max_bounty: 2000,
            status: 'open',
            disabled: false,
            targets: {
                in_scope: [
                    {
                        type: 'other',
                        endpoint: 'lrswitch-access-2.kulnet.kuleuven.be',
                        description: '',
                    },
                    {
                        type: 'other',
                        endpoint: '.ad.nl',
                        description: '',
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
                    domainId: 'kuleuven.be',
                    organizationId: 'test',
                    forceManualReview: true,
                },
                {
                    domainId: 'ad.nl',
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
        };

        expect(parsedProgram).toMatchObject(expectedProgram);
    });
});

describe('parseScope - type URL', () => {
    it('parses endpoints for domains and subdomains', () => {
        const scopeEntries: IBountyTargetsIntigritiScopeEntry[] = [
            {
                endpoint: 'lrswitch-access-2.kulnet.kuleuven.be',
                type: 'url',
                description: '',
            },
            {
                endpoint: '.ad.nl',
                type: 'url',
                description: null,
            },
        ];

        const result = parseScope('test', scopeEntries);

        const expectedResult = {
            domains: [
                {
                    domainId: 'kuleuven.be',
                    organizationId: 'test',
                    forceManualReview: false,
                    isInScope: true,
                },
                {
                    domainId: 'ad.nl',
                    organizationId: 'test',
                    forceManualReview: false,
                    isInScope: true,
                },
            ],
            subdomains: [
                {
                    subdomainId: 'lrswitch-access-2.kulnet.kuleuven.be',
                    root: 'kuleuven.be',
                    organizationId: 'test',
                },
            ],
            applications: [],
            ipRanges: [],
            endpoints: [],
            sourceCodeRepositories: [],
        };

        expect(result).toMatchObject(expectedResult);
    });
});

describe('parseScope - type IPRANGE', () => {
    it('parses endpoints for ipranges', () => {
        const scopeEntries: IBountyTargetsIntigritiScopeEntry[] = [
            {
                type: 'iprange',
                endpoint: '193.190.253.188',
                description: null,
            },
            {
                type: 'iprange',
                endpoint: '2a02:2c40:300:5::2',
                description: null,
            },
        ];

        const result = parseScope('test', scopeEntries);

        const expectedResult = {
            domains: [],
            subdomains: [],
            applications: [],
            ipRanges: [
                {
                    ipRange: '193.190.253.188',
                    organizationId: 'test',
                    type: IPRangeType.ipv4,
                },
                {
                    ipRange: '2a02:2c40:300:5::2',
                    organizationId: 'test',
                    type: IPRangeType.ipv6,
                },
            ],
            endpoints: [],
            sourceCodeRepositories: [],
        };

        expect(result).toMatchObject(expectedResult);
    });

    it('parses endpoints for ipranges with CIDR format', () => {
        const scopeEntries: IBountyTargetsIntigritiScopeEntry[] = [
            {
                type: 'iprange',
                endpoint: '188.118.8.0/25',
                description: null,
            },
            {
                type: 'iprange',
                endpoint: '94.107.237.192/26',
                description: null,
            },
        ];

        const result = parseScope('test', scopeEntries);

        const expectedResult = {
            domains: [],
            subdomains: [],
            applications: [],
            ipRanges: [
                {
                    ipRange: '188.118.8.0/25',
                    organizationId: 'test',
                    type: IPRangeType.ipv4,
                },
                {
                    ipRange: '94.107.237.192/26',
                    organizationId: 'test',
                    type: IPRangeType.ipv4,
                },
            ],
            endpoints: [],
            sourceCodeRepositories: [],
        };

        expect(result).toMatchObject(expectedResult);
    });
});

describe('parseScope - type IOS', () => {
    it('parses endpoints for IOS mobile applications', () => {
        const scopeEntries: IBountyTargetsIntigritiScopeEntry[] = [
            {
                type: 'ios',
                endpoint: '1016513055',
                description: null,
            },
            {
                type: 'ios',
                endpoint: 'delen/id1064839588',
                description: null,
            },
        ];

        const result = parseScope('test', scopeEntries);

        const expectedResult = {
            domains: [],
            subdomains: [],
            applications: [
                {
                    url: 'https://apps.apple.com/app/1016513055',
                    type: ApplicationType.iosMobile,
                },
                {
                    url: 'https://apps.apple.com/app/delen/id1064839588',
                    type: ApplicationType.iosMobile,
                },
            ],
            ipRanges: [],
            endpoints: [],
            sourceCodeRepositories: [],
        };

        expect(result).toMatchObject(expectedResult);
    });

    it('parses endpoints with URL as mobile application', () => {
        const scopeEntries: IBountyTargetsIntigritiScopeEntry[] = [
            {
                type: 'ios',
                endpoint: 'https://apps.apple.com/nl/app/speakap/id713925262',
                description: null,
            },
        ];

        const result = parseScope('test', scopeEntries);

        const expectedResult = {
            domains: [],
            subdomains: [],
            applications: [
                {
                    url: 'https://apps.apple.com/nl/app/speakap/id713925262',
                    type: ApplicationType.iosMobile,
                },
            ],
            ipRanges: [],
            endpoints: [],
            sourceCodeRepositories: [],
        };

        expect(result).toMatchObject(expectedResult);
    });

    it('parses description with URL as mobile application', () => {
        const scopeEntries: IBountyTargetsIntigritiScopeEntry[] = [
            {
                type: 'ios',
                endpoint: 'com.foo.aa',
                description:
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

describe('parseScope - type ANDROID', () => {
    it('parses endpoints for IOS mobile applications', () => {
        const scopeEntries: IBountyTargetsIntigritiScopeEntry[] = [
            {
                type: 'android',
                endpoint: 'be.telenet.safespot',
                description: 'The entire Telenet SafeSpot product is in scope.',
            },
            {
                type: 'android',
                endpoint: 'be.basecompany.base.mybase',
                description: null,
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
                        'https://play.google.com/store/apps/details?id=be.telenet.safespot',
                    description:
                        'The entire Telenet SafeSpot product is in scope.',
                },
                {
                    type: ApplicationType.androidMobile,
                    url:
                        'https://play.google.com/store/apps/details?id=be.basecompany.base.mybase',
                },
            ],
            ipRanges: [],
            endpoints: [],
            sourceCodeRepositories: [],
        };

        expect(result).toMatchObject(expectedResult);
    });

    it('parses endpoints with URL as mobile application', () => {
        const scopeEntries: IBountyTargetsIntigritiScopeEntry[] = [
            {
                type: 'android',
                endpoint:
                    'https://play.google.com/store/apps/details?id=be.basecompany.base.mybase',
                description: null,
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

    it('parses description with URL as mobile application', () => {
        const scopeEntries: IBountyTargetsIntigritiScopeEntry[] = [
            {
                type: 'android',
                endpoint: 'com.foo.aa',
                description:
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
});

describe('parseScope - type OTHER', () => {
    it('parses description for other application', () => {
        const description =
            'Sign up on Microsoft AppCenter and download the special app for BugBounty testing:\nhttps://install.appcenter.ms/orgs/innogames-gmbh/apps/elvenar-bugbounty-ios/distribution_groups/bugbounty';
        const scopeEntries: IBountyTargetsIntigritiScopeEntry[] = [
            {
                endpoint: 'com.innogames.enterprise.elvenar',
                type: 'other',
                description,
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
                    url:
                        'https://install.appcenter.ms/orgs/innogames-gmbh/apps/elvenar-bugbounty-ios/distribution_groups/bugbounty',
                    type: ApplicationType.mobileUnknown,
                    description,
                },
            ],
            sourceCodeRepositories: [],
        };

        expect(result).toMatchObject(expectedResult);
    });

    it('parses description for source codes', () => {
        const description =
            '[vector-im/element-android](https://github.com/vector-im/element-android)';
        const scopeEntries: IBountyTargetsIntigritiScopeEntry[] = [
            {
                endpoint: '(Client) Element Android',
                type: 'other',
                description,
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
                    type: 'github',
                    url: 'https://github.com/vector-im/element-android',
                    description,
                },
            ],
        };

        expect(result).toMatchObject(expectedResult);
    });

    it('parses description for other application for mobile unknown', () => {
        const description =
            '[F-Droid](https://f-droid.org/en/packages/im.vector.app/)';
        const scopeEntries: IBountyTargetsIntigritiScopeEntry[] = [
            {
                endpoint: '(Client) Element Android',
                type: 'other',
                description,
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
                    type: ApplicationType.mobileUnknown,
                    url: 'https://f-droid.org/en/packages/im.vector.app/',
                    description,
                },
            ],
            sourceCodeRepositories: [],
        };

        expect(result).toMatchObject(expectedResult);
    });

    it('parses description for mobile applications, other applications and source codes', () => {
        const description =
            'Element Android is a popular open-source client for Matrix.\nIt is published in the [Google Play Store](https://play.google.com/store/apps/details?id=im.vector.app) and on [F-Droid](https://f-droid.org/en/packages/im.vector.app/).\n\nSource available on GitHub at [vector-im/element-android](https://github.com/vector-im/element-android)';
        const scopeEntries: IBountyTargetsIntigritiScopeEntry[] = [
            {
                endpoint: '(Client) Element Android',
                type: 'other',
                description,
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
                },
                {
                    type: ApplicationType.mobileUnknown,
                    url: 'https://f-droid.org/en/packages/im.vector.app/',
                    description,
                },
            ],
            ipRanges: [],
            endpoints: [],
            sourceCodeRepositories: [
                {
                    type: 'github',
                    url: 'https://github.com/vector-im/element-android',
                    description,
                },
            ],
        };

        expect(result).toMatchObject(expectedResult);
    });

    it('parses endpoint for domain', () => {
        const scopeEntries: IBountyTargetsIntigritiScopeEntry[] = [
            {
                endpoint: '.dpgmedia.nl',
                type: 'other',
                description: null,
            },
        ];
        const result = parseScope('test', scopeEntries);

        const expectedResult = {
            domains: [
                {
                    domainId: 'dpgmedia.nl',
                    organizationId: 'test',
                },
            ],
            subdomains: [],
            applications: [],
            ipRanges: [],
            endpoints: [],
            sourceCodeRepositories: [],
        };

        expect(result).toMatchObject(expectedResult);
    });

    it('parses endpoint for iprange', () => {
        const scopeEntries: IBountyTargetsIntigritiScopeEntry[] = [
            {
                endpoint: '134.58.179.82',
                type: 'other',
                description: null,
            },
        ];
        const result = parseScope('test', scopeEntries);

        const expectedResult = {
            domains: [],
            subdomains: [],
            applications: [],
            ipRanges: [
                {
                    ipRange: '134.58.179.82',
                    organizationId: 'test',
                    type: 'ipv4',
                },
            ],
            endpoints: [],
            sourceCodeRepositories: [],
        };

        expect(result).toMatchObject(expectedResult);
    });

    it('parses description for domain, subdomain and content', () => {
        const description =
            'Unibet Casino - Slots & Games\n\nhttps://cdn.unicdn.net/apk/UnibetCasino.apk';
        const scopeEntries: IBountyTargetsIntigritiScopeEntry[] = [
            {
                endpoint: 'com.unibet.casino',
                type: 'other',
                description,
            },
        ];
        const result = parseScope('test', scopeEntries);

        const expectedResult = {
            domains: [
                {
                    domainId: 'unibet.casino',
                    organizationId: 'test',
                    forceManualReview: true,
                },
                {
                    domainId: 'unicdn.net',
                    organizationId: 'test',
                    forceManualReview: true,
                },
            ],
            subdomains: [
                {
                    subdomainId: 'com.unibet.casino',
                    organizationId: 'test',
                    root: 'unibet.casino',
                },
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
                    organizationId: 'test',
                    subdomainId: 'unicdn.net',
                },
                {
                    path: '/apk/UnibetCasino.apk',
                    organizationId: 'test',
                    subdomainId: 'cdn.unicdn.net',
                },
            ],
            parameters: [],
            sourceCodeRepositories: [],
        };

        expect(result).toMatchObject(expectedResult);
    });
});

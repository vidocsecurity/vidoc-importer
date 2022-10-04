import { ApplicationType } from '@boosted-bb/backend-interfaces';
import {
    IHackerOneProgram,
    IHackerOneProgramScopeEntry,
    parseOutOfScope,
    parseProgram,
    parseScope,
} from '../../src/sources/hackerone/hackerOneProgramParser.js';

describe('parseProgram', () => {
    it('parses program', () => {
        const program: IHackerOneProgram = {
            id: 'test',
            name: 'test',
            url: 'https://bugcrowd.com/foo',
            offers_bounties: true,
            submission_state: 'open',
            targets: {
                in_scope: [
                    {
                        asset_type: 'OTHER',
                        asset_identifier:
                            'lrswitch-access-2.kulnet.kuleuven.be',
                        instruction: '',
                    },
                ],
                out_of_scope: [
                    {
                        asset_type: 'OTHER',
                        asset_identifier: 'ad.nl',
                        instruction: '',
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

describe('parseScope - type URL', () => {
    it('parses instruction for domains and subdomains', () => {
        const casinoDescription =
            'unibet.me, maria.casino, stly.eu share the same platform, we will only reward the initial report for any bug, as one fix will solve the bug on all three domains.';
        const semleDescription =
            'Our main domain for Semmle and LGTM services. All subdomains under semmle.com are in-scope **except**:\n* dev.semmle.com\n* git.semmle.com\n* jira.semmle.com\n* wiki.semmle.com';

        const scopeEntries: IHackerOneProgramScopeEntry[] = [
            {
                asset_identifier: 'maria.casino',
                asset_type: 'URL',
                instruction: casinoDescription,
            },
            {
                asset_identifier: 'semmle.com',
                asset_type: 'URL',
                instruction: semleDescription,
            },
        ];

        const result = parseScope('test', scopeEntries);

        const expectedResult = {
            domains: [
                {
                    domainId: 'maria.casino',
                    forceManualReview: false,
                    isInScope: true,
                    organizationId: 'test',
                    description: casinoDescription,
                },
                {
                    forceManualReview: true,
                    domainId: 'unibet.me',
                    organizationId: 'test',
                    description: casinoDescription,
                },
                {
                    domainId: 'stly.eu',
                    forceManualReview: true,
                    organizationId: 'test',
                    description: casinoDescription,
                },
                {
                    domainId: 'semmle.com',
                    organizationId: 'test',
                    description: semleDescription,
                },
            ],
            subdomains: [
                {
                    subdomainId: 'dev.semmle.com',
                    root: 'semmle.com',
                    organizationId: 'test',
                },
                {
                    subdomainId: 'git.semmle.com',
                    root: 'semmle.com',
                    organizationId: 'test',
                },
                {
                    subdomainId: 'jira.semmle.com',
                    root: 'semmle.com',
                    organizationId: 'test',
                },
                {
                    subdomainId: 'wiki.semmle.com',
                    root: 'semmle.com',
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

describe('parseScope - type OTHER_IPA', () => {
    it('parses instruction as other application', () => {
        const description =
            'Sign up on Microsoft AppCenter and download the special app for BugBounty testing:\nhttps://install.appcenter.ms/orgs/innogames-gmbh/apps/elvenar-bugbounty-ios/distribution_groups/bugbounty';
        const scopeEntries: IHackerOneProgramScopeEntry[] = [
            {
                asset_identifier: 'com.innogames.enterprise.elvenar',
                asset_type: 'OTHER_IPA',
                instruction: description,
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
                    name: 'com.innogames.enterprise.elvenar',
                    type: ApplicationType.mobileUnknown,
                    organizationId: 'test',
                    description,
                },
            ],
            sourceCodeRepositories: [],
        };

        expect(result).toMatchObject(expectedResult);
    });

    it('parses asset_identifier as app name without url', () => {
        const scopeEntries: IHackerOneProgramScopeEntry[] = [
            {
                asset_identifier: 'com.mi.global.shop',
                asset_type: 'OTHER_IPA',
                instruction: '',
            },
            {
                asset_identifier: 'com.foo.boo',
                asset_type: 'OTHER_IPA',
                instruction: '',
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
                    name: 'com.mi.global.shop',
                    type: ApplicationType.mobileUnknown,
                },
                {
                    name: 'com.foo.boo',
                    type: ApplicationType.mobileUnknown,
                },
            ],
            sourceCodeRepositories: [],
        };

        expect(result).toMatchObject(expectedResult);
    });
});

describe('parseScope - type OTHER', () => {
    it('parses instruction as mobile applications from description for apple', () => {
        const scopeEntries: IHackerOneProgramScopeEntry[] = [
            {
                asset_identifier: 'AOL (misc)',
                asset_type: 'OTHER',
                instruction:
                    '* [7News iOS](https://itunes.apple.com/au/app/7news/id439828000?mt=8)\\n* [7News Android](https://play.google.com/store/apps/details?id=com.seven.news&hl=en_US)',
            },
        ];
        const result = parseScope('test', scopeEntries);

        const expectedResult = {
            domains: [],
            subdomains: [],
            applications: [
                {
                    url:
                        'https://itunes.apple.com/au/app/7news/id439828000?mt=8',
                    type: ApplicationType.iosMobile,
                },
                {
                    url:
                        'https://play.google.com/store/apps/details?id=com.seven.news&hl=en_US',
                    type: ApplicationType.androidMobile,
                },
            ],
            ipRanges: [],
            endpoints: [],
            sourceCodeRepositories: [],
        };

        expect(result).toMatchObject(expectedResult);
    });

    it('parses instruction as mobile applications from description for google', () => {
        const scopeEntries: IHackerOneProgramScopeEntry[] = [
            {
                asset_identifier:
                    'Wallet App (Android): https://play.google.com/store/apps/details?id=piuk.blockchain.android ',
                asset_type: 'OTHER',
                instruction: '',
            },
        ];
        const result = parseScope('test', scopeEntries);

        const expectedResult = {
            domains: [],
            subdomains: [],
            applications: [
                {
                    url:
                        'https://play.google.com/store/apps/details?id=piuk.blockchain.android',
                    type: ApplicationType.androidMobile,
                },
            ],
            ipRanges: [],
            endpoints: [],
            sourceCodeRepositories: [],
        };

        expect(result).toMatchObject(expectedResult);
    });

    it('parses instruction as domains and subdomains from description', () => {
        const scopeEntries: IHackerOneProgramScopeEntry[] = [
            {
                asset_identifier: 'AOL (misc)',
                asset_type: 'OTHER',
                instruction:
                    '## In Scope\\n* *.aol.com\\n\\n## Notes\\nOnly use this asset when nothing else can be reasonably selected.\\n\\nBugs with AOL that are not listed in scope of our other AOL-related assets can still be submitted to this asset and **_*might*_** be eligible for award, at the sole discretion of the Verizon Media Bug Bounty team.\\n\\n## Out of Scope\\n* *nat.aol.com\\n* *.ipt.aol.com\\n',
            },
        ];
        const result = parseScope('test', scopeEntries);

        const expectedResult = {
            domains: [
                {
                    domainId: 'aol.com',
                    organizationId: 'test',
                    description:
                        '## In Scope\\n* *.aol.com\\n\\n## Notes\\nOnly use this asset when nothing else can be reasonably selected.\\n\\nBugs with AOL that are not listed in scope of our other AOL-related assets can still be submitted to this asset and **_*might*_** be eligible for award, at the sole discretion of the Verizon Media Bug Bounty team.\\n\\n## Out of Scope\\n* *nat.aol.com\\n* *.ipt.aol.com\\n',
                    forceManualReview: true,
                },
            ],
            subdomains: [
                {
                    subdomainId: 'nat.aol.com',
                    organizationId: 'test',
                    root: 'aol.com',
                },
                {
                    subdomainId: 'ipt.aol.com',
                    organizationId: 'test',
                    root: 'aol.com',
                },
            ],
            applications: [],
            ipRanges: [],
            endpoints: [],
            sourceCodeRepositories: [],
        };

        expect(result).toMatchObject(expectedResult);
    });

    it('parses instruction as source code from description', () => {
        const instruction =
            '###Review the Code\n* [Source Code](https://github.com/arkime/arkime)\n* Submit a PR to fix/update the code - [fork](https://help.github.com/en/articles/fork-a-repo) the codebase then submit a [PR](https://help.github.com/en/articles/creating-a-pull-request-from-a-fork)\n* Visit our web page at https://arkime.com/ for pre-bulit rpm/deb and instructions for running yourself.\n\n##Out of Scope\n* Known unauthenticated endpoints such as `parliament.json` & `eshealth.json`\n* UI based bugs on `parliament`\n* demo.arkime.com\n* *.molo.ch (old website)\n';

        const scopeEntries: IHackerOneProgramScopeEntry[] = [
            {
                asset_identifier: 'OTHER',
                asset_type: 'OTHER',
                instruction,
            },
        ];
        const result = parseScope('test', scopeEntries);

        const expectedResult = {
            domains: [
                {
                    domainId: 'arkime.com',
                    organizationId: 'test',
                    description: instruction,
                    forceManualReview: true,
                },
                {
                    domainId: 'molo.ch',
                    organizationId: 'test',
                    forceManualReview: true,
                    description: instruction,
                },
            ],
            subdomains: [
                {
                    subdomainId: 'demo.arkime.com',
                    organizationId: 'test',
                    root: 'arkime.com',
                },
            ],
            applications: [],
            ipRanges: [],
            endpoints: [],
            sourceCodeRepositories: [
                {
                    url: 'https://github.com/arkime/arkime',
                    type: 'github',
                },
            ],
        };

        expect(result).toMatchObject(expectedResult);
    });
});

describe('parseScope - type CIDR', () => {
    it('does not parse type CIDR with invalid IP', () => {
        const scopeEntries: IHackerOneProgramScopeEntry[] = [
            {
                asset_identifier: 'asdasd21312',
                asset_type: 'CIDR',
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
            sourceCodeRepositories: [],
        };

        expect(result).toMatchObject(expectedResult);
    });

    it('parses type CIDR as ipv4 range', () => {
        const scopeEntries: IHackerOneProgramScopeEntry[] = [
            {
                asset_identifier: '54.175.255.192/27',
                asset_type: 'CIDR',
                instruction: '',
            },
            {
                asset_identifier: '140.95.0.0/16',
                asset_type: 'CIDR',
                instruction: '',
            },
        ];
        const result = parseScope('test', scopeEntries);

        const expectedResult = {
            domains: [],
            subdomains: [],
            applications: [],
            ipRanges: [
                {
                    ipRange: '54.175.255.192/27',
                    organizationId: 'test',
                    type: 'ipv4',
                },
                {
                    ipRange: '140.95.0.0/16',
                    organizationId: 'test',
                    type: 'ipv4',
                },
            ],
            endpoints: [],
            sourceCodeRepositories: [],
        };

        expect(result).toMatchObject(expectedResult);
    });

    it('parses type CIDR as ipv6 range', () => {
        const scopeEntries: IHackerOneProgramScopeEntry[] = [
            {
                asset_identifier: '2604:a880:400:d1::aad:8001',
                asset_type: 'CIDR',
                instruction: '',
            },
            {
                asset_identifier: '2a01:7e00::f03c:91ff:fec6:27a3',
                asset_type: 'CIDR',
                instruction: '',
            },
        ];
        const result = parseScope('test', scopeEntries);

        const expectedResult = {
            domains: [],
            subdomains: [],
            applications: [],
            ipRanges: [
                {
                    ipRange: '2604:a880:400:d1::aad:8001',
                    organizationId: 'test',
                    type: 'ipv6',
                },
                {
                    ipRange: '2a01:7e00::f03c:91ff:fec6:27a3',
                    organizationId: 'test',
                    type: 'ipv6',
                },
            ],
            endpoints: [],
            sourceCodeRepositories: [],
        };

        expect(result).toMatchObject(expectedResult);
    });
});

describe('parseScope - type APPLE_STORE_APP_ID', () => {
    it('parses instruction as app url', () => {
        const scopeEntries: IHackerOneProgramScopeEntry[] = [
            {
                asset_identifier: 'com.defi.wallet',
                asset_type: 'APPLE_STORE_APP_ID',
                instruction:
                    'https://apps.apple.com/app/crypto-com-wallet/id1512048310',
            },
            {
                asset_identifier: 'com.monaco.mobile',
                asset_type: 'APPLE_STORE_APP_ID',
                instruction:
                    'Get the app here - https://itunes.apple.com/us/app/monaco-card/id1262148500?ls=1&mt=8\n\nYou won’t need test accounts for this as it will be public facing sites for now.\n\nGet the MCO Cryptocurrency Card app for iOS in the link above this app should allow you to create an account and start using the Monaco services.',
            },
        ];
        const result = parseScope('test', scopeEntries);

        const expectedResult = {
            domains: [],
            subdomains: [],
            applications: [
                {
                    type: ApplicationType.iosMobile,
                    url:
                        'https://apps.apple.com/app/crypto-com-wallet/id1512048310',
                },
                {
                    type: ApplicationType.iosMobile,
                    url:
                        'https://itunes.apple.com/us/app/monaco-card/id1262148500?ls=1&mt=8',
                },
            ],
            ipRanges: [],
            endpoints: [],
            sourceCodeRepositories: [],
        };

        expect(result).toMatchObject(expectedResult);
    });

    it('parses asset_identifier as app url', () => {
        const scopeEntries: IHackerOneProgramScopeEntry[] = [
            {
                asset_identifier: 'com.defi.wallet',
                asset_type: 'APPLE_STORE_APP_ID',
                instruction: '',
            },
            {
                asset_identifier: 'com.monaco.mobile',
                asset_type: 'APPLE_STORE_APP_ID',
                instruction:
                    'won’t need test accounts for this as it will be public facing sites for now.\n\nGet the MCO Cryptocurrency Card app for iOS in the link above this app should allow you to create an account and start using the Monaco services.',
            },
        ];
        const result = parseScope('test', scopeEntries);

        const expectedResult = {
            domains: [],
            subdomains: [],
            applications: [
                {
                    type: ApplicationType.iosMobile,
                    url: 'https://apps.apple.com/app/com.defi.wallet',
                },
                {
                    type: ApplicationType.iosMobile,
                    url: 'https://apps.apple.com/app/com.monaco.mobile',
                },
            ],
            ipRanges: [],
            endpoints: [],
            sourceCodeRepositories: [],
        };

        expect(result).toMatchObject(expectedResult);
    });
});

describe('parseScope - type GOOGLE_PLAY_APP_ID', () => {
    it('parses instruction as app url', () => {
        const scopeEntries: IHackerOneProgramScopeEntry[] = [
            {
                asset_identifier: 'com.defi.wallet',
                asset_type: 'GOOGLE_PLAY_APP_ID',
                instruction:
                    'https://play.google.com/store/apps/details?id=com.defi.wallet',
            },
            {
                asset_identifier: 'app.zenly.locator',
                asset_type: 'GOOGLE_PLAY_APP_ID',
                instruction:
                    'https://play.google.com/store/apps/details?id=app.zenly.locator&hl=en_US',
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
                        'https://play.google.com/store/apps/details?id=com.defi.wallet',
                },
                {
                    type: ApplicationType.androidMobile,
                    url:
                        'https://play.google.com/store/apps/details?id=app.zenly.locator&hl=en_US',
                },
            ],
            ipRanges: [],
            endpoints: [],
            sourceCodeRepositories: [],
        };

        expect(result).toMatchObject(expectedResult);
    });

    it('parses asset_identifier as app url', () => {
        const scopeEntries: IHackerOneProgramScopeEntry[] = [
            {
                asset_identifier: 'com.defi.wallet',
                asset_type: 'GOOGLE_PLAY_APP_ID',
                instruction: '',
            },
            {
                asset_identifier: 'app.zenly.locator',
                asset_type: 'GOOGLE_PLAY_APP_ID',
                instruction: '',
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
                        'https://play.google.com/store/apps/details?id=com.defi.wallet',
                },
                {
                    type: ApplicationType.androidMobile,
                    url:
                        'https://play.google.com/store/apps/details?id=app.zenly.locator',
                },
            ],
            ipRanges: [],
            endpoints: [],
            sourceCodeRepositories: [],
        };

        expect(result).toMatchObject(expectedResult);
    });
});

describe('parseScope - type DOWNLOADABLE_EXECUTABLES', () => {
    it('parses instruction as app url', () => {
        const scopeEntries: IHackerOneProgramScopeEntry[] = [
            {
                asset_identifier: 'Basecamp.app',
                asset_type: 'DOWNLOADABLE_EXECUTABLES',
                instruction:
                    'Basecamp for Mac: https://basecamp.com/via#basecamp-for-your-mac-or-pc',
            },
            {
                asset_identifier: 'HEY.app',
                asset_type: 'DOWNLOADABLE_EXECUTABLES',
                instruction: 'HEY for macOS: https://hey.com/apps/',
            },
        ];

        const result = parseScope('test', scopeEntries);

        const expectedResult = {
            domains: [
                {
                    domainId: 'basecamp.com',
                    forceManualReview: true,
                    description:
                        'Basecamp for Mac: https://basecamp.com/via#basecamp-for-your-mac-or-pc',
                    organizationId: 'test',
                },
                {
                    domainId: 'hey.com',
                    description: 'HEY for macOS: https://hey.com/apps/',
                    forceManualReview: true,
                    organizationId: 'test',
                },
            ],
            subdomains: [],
            ipRanges: [],
            endpoints: [
                {
                    path: '/via',
                    subdomainId: 'basecamp.com',
                    organizationId: 'test',
                },
                {
                    path: '/apps/',
                    subdomainId: 'hey.com',
                    organizationId: 'test',
                },
            ],
            applications: [
                {
                    type: ApplicationType.executable,
                    url: 'https://basecamp.com/via#basecamp-for-your-mac-or-pc',
                    name: 'Basecamp.app',
                },
                {
                    type: ApplicationType.executable,
                    url: 'https://hey.com/apps/',
                    name: 'HEY.app',
                },
            ],
            sourceCodeRepositories: [],
        };

        expect(result).toMatchObject(expectedResult);
    });

    it('parses asset_identifier as app name without url', () => {
        const scopeEntries: IHackerOneProgramScopeEntry[] = [
            {
                asset_identifier: 'After Effects',
                asset_type: 'DOWNLOADABLE_EXECUTABLES',
                instruction: '',
            },
            {
                asset_identifier: 'Animate',
                asset_type: 'DOWNLOADABLE_EXECUTABLES',
                instruction: '',
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
                    type: 'executable',
                    name: 'After Effects',
                },
                {
                    type: 'executable',
                    name: 'Animate',
                },
            ],
            sourceCodeRepositories: [],
        };

        expect(result).toMatchObject(expectedResult);
    });
});

describe('parseScope - type WINDOWS_APP_STORE_APP_ID', () => {
    it('parses instruction for application URLs', () => {
        const scopeEntries: IHackerOneProgramScopeEntry[] = [
            {
                asset_identifier: '9pp8m6lpfkgf',
                asset_type: 'WINDOWS_APP_STORE_APP_ID',
                instruction:
                    "It's the standalone edge extension\nhttps://www.microsoft.com/en-us/store/p/dashlane-password-manager/9pp8m6lpfkgf",
            },
            {
                asset_identifier: 'HEY.exe',
                asset_type: 'WINDOWS_APP_STORE_APP_ID',
                instruction:
                    'HEY for Windows: https://www.microsoft.com/en-us/p/hey-mail/9pf08ljw7gw2',
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
                    type: ApplicationType.windowsAppStore,
                    url:
                        'https://www.microsoft.com/en-us/store/p/dashlane-password-manager/9pp8m6lpfkgf',
                },
                {
                    type: ApplicationType.windowsAppStore,
                    url:
                        'https://www.microsoft.com/en-us/p/hey-mail/9pf08ljw7gw2',
                },
            ],
            sourceCodeRepositories: [],
        };

        expect(result).toMatchObject(expectedResult);
    });

    it('parses asset_identifier as app name', () => {
        const scopeEntries: IHackerOneProgramScopeEntry[] = [
            {
                asset_identifier: 'After Effects',
                asset_type: 'WINDOWS_APP_STORE_APP_ID',
                instruction: '',
            },
            {
                asset_identifier: 'Animate',
                asset_type: 'WINDOWS_APP_STORE_APP_ID',
                instruction: '',
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
                    type: ApplicationType.windowsAppStore,
                    name: 'After Effects',
                    url: 'After Effects',
                },
                {
                    type: ApplicationType.windowsAppStore,
                    url: 'Animate',
                    name: 'Animate',
                },
            ],
            sourceCodeRepositories: [],
        };

        expect(result).toMatchObject(expectedResult);
    });
});

describe('parseScope - type OTHER_APK', () => {
    it('parses instruction for application urls', () => {
        const scopeEntries: IHackerOneProgramScopeEntry[] = [
            {
                asset_identifier: 'com.unibet.casino',
                asset_type: 'OTHER_APK',
                instruction:
                    'Unibet Casino - Slots & Games\n\nhttps://cdn.unicdn.net/apk/UnibetCasino.apk',
            },
            {
                asset_identifier: 'com.mi.global.shop',
                asset_type: 'OTHER_APK',
                instruction: '',
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
                    name: 'com.unibet.casino',
                    url: 'https://cdn.unicdn.net/apk/UnibetCasino.apk',
                },
                {
                    type: ApplicationType.mobileUnknown,
                    name: 'com.mi.global.shop',
                },
            ],
            parameters: [],
            sourceCodeRepositories: [],
        };

        expect(result).toMatchObject(expectedResult);
    });

    it('parses asset_identifier as app name', () => {
        const scopeEntries: IHackerOneProgramScopeEntry[] = [
            {
                asset_identifier: 'com.mi.global.shop',
                asset_type: 'OTHER_APK',
                instruction: '',
            },
            {
                asset_identifier: 'com.foo.boo',
                asset_type: 'OTHER_APK',
                instruction: '',
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
                    name: 'com.mi.global.shop',
                    type: ApplicationType.mobileUnknown,
                },
                {
                    name: 'com.foo.boo',
                    type: ApplicationType.mobileUnknown,
                },
            ],
            sourceCodeRepositories: [],
        };

        expect(result).toMatchObject(expectedResult);
    });

    it('parses instruction as other application from description', () => {
        const description =
            'Sign up on Microsoft AppCenter and download the special app for BugBounty testing:\nhttps://install.appcenter.ms/orgs/innogames-gmbh/apps/elvenar-bugbounty-android/distribution_groups/bugbounty';
        const scopeEntries: IHackerOneProgramScopeEntry[] = [
            {
                asset_identifier: 'com.innogames.enterprise.elvenar',
                asset_type: 'OTHER_APK',
                instruction: description,
            },
        ];
        const result = parseScope('test', scopeEntries);

        const expectedResult = {
            domains: [],
            subdomains: [],
            applications: [
                {
                    url:
                        'https://install.appcenter.ms/orgs/innogames-gmbh/apps/elvenar-bugbounty-android/distribution_groups/bugbounty',
                    type: ApplicationType.mobileUnknown,
                    description,
                    organizationId: 'test',
                },
            ],
            ipRanges: [],
            endpoints: [],
            sourceCodeRepositories: [],
        };

        expect(result).toMatchObject(expectedResult);
    });

    it('parses asset_identifier as app name without url', () => {
        const scopeEntries: IHackerOneProgramScopeEntry[] = [
            {
                asset_identifier: 'com.mi.global.shop',
                asset_type: 'OTHER_APK',
                instruction: '',
            },
            {
                asset_identifier: 'com.foo.boo',
                asset_type: 'OTHER_APK',
                instruction: '',
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
                    name: 'com.mi.global.shop',
                    type: ApplicationType.mobileUnknown,
                },
                {
                    name: 'com.foo.boo',
                    type: ApplicationType.mobileUnknown,
                },
            ],
            sourceCodeRepositories: [],
        };

        expect(result).toMatchObject(expectedResult);
    });
});

describe('parseOutOfScope', () => {
    it('parses instruction for domains and subdomains', () => {
        const description =
            'If you would like to report a vulnerability to **Verizon** for one of their other companies, please visit [this link]\n(https://www.verizon.com/info/reportsecurityvulnerability). These include, among others:\n* MapQuest\n* MovilData \n* Skyward\n* XO\n* Yahoo Small Business\n\nAlong with these Verizon Corporate domains:\n* *.verizonwireless.com\n* *.verizon.com\n* *.verizon.net\n* *.vzw.com\n* *.myvzw.com\n* *.verizonbusiness.com';

        const outOfScopeEntries: IHackerOneProgramScopeEntry[] = [
            {
                asset_identifier: 'Verizon (parent)',
                asset_type: 'OTHER',
                instruction: description,
            },
        ];

        const result = parseOutOfScope('test', outOfScopeEntries);

        const expectedResult = {
            domains: [
                {
                    domainId: 'verizon.com',
                    organizationId: 'test',
                    description,
                    forceManualReview: true,
                },
                {
                    domainId: 'verizonwireless.com',
                    organizationId: 'test',
                    isInScope: false,
                    description,
                    forceManualReview: true,
                },
                {
                    domainId: 'verizon.net',
                    organizationId: 'test',
                    isInScope: false,
                    description,
                    forceManualReview: true,
                },
                {
                    domainId: 'vzw.com',
                    organizationId: 'test',
                    isInScope: false,
                    description,
                    forceManualReview: true,
                },
                {
                    domainId: 'myvzw.com',
                    organizationId: 'test',
                    isInScope: false,
                    description,
                    forceManualReview: true,
                },
                {
                    domainId: 'verizonbusiness.com',
                    organizationId: 'test',
                    isInScope: false,
                    description,
                    forceManualReview: true,
                },
            ],
            subdomains: [
                {
                    subdomainId: 'www.verizon.com',
                    root: 'verizon.com',
                    organizationId: 'test',
                },
            ],
            endpoints: [
                {
                    path: '/info/reportsecurityvulnerability',
                    subdomainId: 'verizon.com',
                    organizationId: 'test',
                },
                {
                    path: '/info/reportsecurityvulnerability',
                    subdomainId: 'www.verizon.com',
                    organizationId: 'test',
                },
            ],
            parameters: [],
        };

        expect(result).toMatchObject(expectedResult);
    });

    it('parses asset_identifier for domain', () => {
        const outOfScopeEntries: IHackerOneProgramScopeEntry[] = [
            {
                asset_identifier: '*.rubyonrails.org',
                asset_type: 'URL',
                instruction: '',
            },
        ];

        const result = parseOutOfScope('test', outOfScopeEntries);

        const expectedResult = {
            domains: [
                {
                    domainId: 'rubyonrails.org',
                    organizationId: 'test',
                    isInScope: false,
                    forceManualReview: false,
                },
            ],
            subdomains: [],
            endpoints: [],
        };

        expect(result).toMatchObject(expectedResult);
    });

    it('parses asset_identifier and instruction for domain and subdomain', () => {
        const description =
            '\nAirportrentalcars.com is current *not* in scope. Please do not test it. \n';
        const outOfScopeEntries: IHackerOneProgramScopeEntry[] = [
            {
                asset_identifier: 'www.airportrentalcars.com',
                asset_type: 'URL',
                instruction: description,
            },
        ];

        const result = parseOutOfScope('test', outOfScopeEntries);

        const expectedResult = {
            domains: [
                {
                    domainId: 'airportrentalcars.com',
                    organizationId: 'test',
                    isInScope: false,
                    description,
                },
            ],
            subdomains: [
                {
                    subdomainId: 'www.airportrentalcars.com',
                    root: 'airportrentalcars.com',
                    organizationId: 'test',
                },
            ],
            endpoints: [],
        };

        expect(result).toMatchObject(expectedResult);
    });
});

import {
    getURLsFromText,
    parseURLsForScopeItems,
} from '../src/urlScopeParser.js';

describe('parseURLsForScopeItems', () => {
    it('parses ip address', () => {
        const line = '139.162.222.67';
        const description = 'This is some test description';

        const result = parseURLsForScopeItems('Apple', line, description, true);

        const expectedResult = {
            domains: [],
            subdomains: [],
            ipRanges: [
                {
                    ipRange: '139.162.222.67',
                    type: 'ipv4',
                    organizationId: 'Apple',
                },
            ],
            endpoints: [],
            applications: [],
        };

        expect(result).toMatchObject(expectedResult);
    });

    it('parses ipv4 CIDR address', () => {
        const line = '139.162.222.0/26';
        const description = 'This is some test description';

        const result = parseURLsForScopeItems('test', line, description, true);

        const expectedResult = {
            domains: [],
            subdomains: [],
            ipRanges: [
                {
                    ipRange: '139.162.222.0/26',
                    type: 'ipv4',
                    organizationId: 'test',
                },
            ],
            endpoints: [],
            applications: [],
        };

        expect(result).toMatchObject(expectedResult);
    });

    it('parses ipv6 address', () => {
        const line = '2604:a880:400:d1::aad:8001';
        const description = 'This is some test description';

        const result = parseURLsForScopeItems('test', line, description, true);

        const expectedResult = {
            domains: [],
            subdomains: [],
            ipRanges: [
                {
                    ipRange: '2604:a880:400:d1::aad:8001',
                    organizationId: 'test',
                    type: 'ipv6',
                },
            ],
            endpoints: [],
            applications: [],
        };

        expect(result).toMatchObject(expectedResult);
    });

    it('parses domain', () => {
        const line = 'aaaabbb.com';
        const description = 'This is some test description';

        const result = parseURLsForScopeItems('test', line, description, true);

        const expectedResult = {
            domains: [
                {
                    domainId: 'aaaabbb.com',
                    organizationId: 'test',
                    description,
                    isInScope: true,
                    forceManualReview: false,
                },
            ],
            subdomains: [],
            ipRanges: [],
            endpoints: [],
            applications: [],
        };

        expect(result).toMatchObject(expectedResult);
    });

    it('parses subdomain and domain', () => {
        const line = 'foo.aaaabbb.com';
        const description = 'This is some test description';

        const result = parseURLsForScopeItems('test', line, description, true);

        const expectedResult = {
            domains: [
                {
                    domainId: 'aaaabbb.com',
                    organizationId: 'test',
                    forceManualReview: false,
                },
            ],
            subdomains: [
                {
                    subdomainId: 'foo.aaaabbb.com',
                    organizationId: 'test',
                },
            ],
            ipRanges: [],
            endpoints: [],
            applications: [],
        };

        expect(result).toMatchObject(expectedResult);
    });

    it('parses subdomain and domain and return empty arrays (test)', () => {
        const line = 'https://slack.com/foo';
        const description = 'This is some test description';

        const result = parseURLsForScopeItems('test', line, description, true);

        const expectedResult = {
            domains: [],
            subdomains: [],
            ipRanges: [],
            endpoints: [],
            applications: [],
        };

        expect(result).toMatchObject(expectedResult);
    });

    it('parses subdomain and domain and return results (Slack)', () => {
        const line = 'https://www.slack.com/foo?aa=aaa&bb=cc';
        const description = 'This is some test description';

        const result = parseURLsForScopeItems('Slack', line, description, true);

        const expectedResult = {
            domains: [
                {
                    domainId: 'slack.com',
                    organizationId: 'Slack',
                    forceManualReview: false,
                },
            ],
            subdomains: [
                {
                    subdomainId: 'www.slack.com',
                    organizationId: 'Slack',
                },
            ],
            ipRanges: [],
            endpoints: [
                {
                    path: '/foo',
                    organizationId: 'Slack',
                    subdomainId: 'slack.com',
                },
                {
                    path: '/foo',
                    organizationId: 'Slack',
                    subdomainId: 'www.slack.com',
                },
            ],
            parameters: [
                {
                    parameter: 'aa',
                    path: '/foo',
                    organizationId: 'Slack',
                },
                {
                    parameter: 'bb',
                    path: '/foo',
                    organizationId: 'Slack',
                },
            ],
            applications: [],
        };

        expect(result).toMatchObject(expectedResult);
    });

    it('parses subdomain and domain and returns domain (test)', () => {
        const line = 'unibet.me';
        const description = 'This is some test description';

        const result = parseURLsForScopeItems('test', line, description, true);

        const expectedResult = {
            domains: [
                {
                    domainId: 'unibet.me',
                    organizationId: 'test',
                    description,
                    isInScope: true,
                    forceManualReview: false,
                },
            ],
            subdomains: [],
            ipRanges: [],
            endpoints: [],
            applications: [],
        };

        expect(result).toMatchObject(expectedResult);
    });

    it('parses content and domain + subdomain', () => {
        const line = 'foo.aaaabbb.com/test/4123?a=b&c=d';
        const description = 'This is some test description';

        const result = parseURLsForScopeItems('test', line, description, true);

        const expectedResult = {
            domains: [
                {
                    domainId: 'aaaabbb.com',
                    organizationId: 'test',
                    forceManualReview: false,
                },
            ],
            subdomains: [
                {
                    subdomainId: 'foo.aaaabbb.com',
                    organizationId: 'test',
                },
            ],
            ipRanges: [],
            endpoints: [
                {
                    path: '/test/4123',
                    subdomainId: 'aaaabbb.com',
                    organizationId: 'test',
                },
                {
                    path: '/test/4123',
                    subdomainId: 'foo.aaaabbb.com',
                    organizationId: 'test',
                },
            ],
            parameters: [
                {
                    parameter: 'a',
                    path: '/test/4123',
                    organizationId: 'test',
                },
                {
                    parameter: 'c',
                    path: '/test/4123',
                    organizationId: 'test',
                },
            ],
            applications: [],
        };

        expect(result).toMatchObject(expectedResult);
    });

    it('parses ios mobile application url', () => {
        const line = 'https://itunes.apple.com/au/app/7news/id439828000?mt=8';
        const description = 'This is some test description';

        const result = parseURLsForScopeItems('test', line, description, true);

        const expectedResult = {
            domains: [],
            subdomains: [],
            ipRanges: [],
            endpoints: [],
            applications: [
                {
                    type: 'iosMobile',
                    url: line,
                },
            ],
        };

        expect(result).toMatchObject(expectedResult);
    });

    it('parses ios 2 mobile application url', () => {
        const line = 'https://apps.apple.com/au/app/7news/id439828000?mt=8';
        const description = 'This is some test description';

        const result = parseURLsForScopeItems('test', line, description, true);

        const expectedResult = {
            domains: [],
            subdomains: [],
            ipRanges: [],
            endpoints: [],
            applications: [
                {
                    type: 'iosMobile',
                    url: line,
                },
            ],
        };

        expect(result).toMatchObject(expectedResult);
    });

    it('parses android mobile application url', () => {
        const line =
            'https://play.google.com/store/apps/details?id=com.seven.news&hl=en_US';
        const description = 'This is some test description';

        const result = parseURLsForScopeItems('test', line, description, true);

        const expectedResult = {
            domains: [],
            subdomains: [],
            ipRanges: [],
            endpoints: [],
            applications: [
                {
                    type: 'androidMobile',
                    url: line,
                },
            ],
        };

        expect(result).toMatchObject(expectedResult);
    });

    it('parses subdomain and domain (isInScope inheritance)', () => {
        const line = 'https://lrswitch-access-2.kulnet.kuleuven.be';
        const description = 'This is some test description';

        const result = parseURLsForScopeItems('test', line, description, true);

        const expectedResult = {
            domains: [
                {
                    domainId: 'kuleuven.be',
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
            ipRanges: [],
            endpoints: [],
            applications: [],
        };

        expect(result).toMatchObject(expectedResult);
    });

    it('parses other application (install.appcenter.ms)', () => {
        const url =
            'https://install.appcenter.ms/orgs/innogames-gmbh/apps/foe-bugbounty-ios/distribution_groups/bugbounty';
        const description =
            'Sign up on AppCenter and download the special app for BugBounty testing:\nhttps://install.appcenter.ms/orgs/innogames-gmbh/apps/foe-bugbounty-ios/distribution_groups/bugbounty';

        const result = parseURLsForScopeItems('test', url, description, true);

        const expectedResult = {
            domains: [],
            subdomains: [],
            ipRanges: [],
            endpoints: [],
            applications: [
                {
                    url,
                    description,
                    type: 'mobileUnknown',
                },
            ],
        };

        expect(result).toMatchObject(expectedResult);
    });

    it('parses subdomain and domain and return results (outOfScope)', () => {
        const line = 'sandbox.checkhq.com';
        const description = 'This is some test description';

        const result = parseURLsForScopeItems('test', line, description, false);

        const expectedResult = {
            domains: [
                {
                    domainId: 'checkhq.com',
                    organizationId: 'test',
                    forceManualReview: false,
                },
            ],
            subdomains: [
                {
                    subdomainId: 'sandbox.checkhq.com',
                    organizationId: 'test',
                },
            ],
            ipRanges: [],
            endpoints: [],
            applications: [],
        };

        expect(result).toMatchObject(expectedResult);
        expect(result.domains[0]).toBeDefined();
        expect(result.domains[0]?.isInScope).toBeUndefined();
    });

    it('parses subdomain and domain and return results (inScope)', () => {
        const line = 'docs.checkhq.com';
        const description = 'This is some test description';

        const result = parseURLsForScopeItems(
            'test',
            line,
            description,
            true,
            false,
        );

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
                    subdomainId: 'docs.checkhq.com',
                    organizationId: 'test',
                },
            ],
            ipRanges: [],
            endpoints: [],
            applications: [],
        };

        expect(result).toMatchObject(expectedResult);
    });

    it('ignores top-level domains', () => {
        const line = 'co.in';
        const description = 'This is some test description';

        const result = parseURLsForScopeItems(
            'test',
            line,
            description,
            true,
            false,
        );

        const expectedResult = {
            domains: [],
            subdomains: [],
            ipRanges: [],
            endpoints: [],
            applications: [],
        };

        expect(result).toMatchObject(expectedResult);
    });
});

describe('common - getURLsFromText', () => {
    it('returns urls from text', () => {
        const text = `unibet.me,
            https://www.aaaabbb.com sdfassad
            http://www.aaaabbb.com
            www.aaaabbb.com
            aaaabbb.com
            http://blog.aaaabbb.com
            http://www.aaaabbb.com/product
            http://www.aaaabbb.com/products?id=1&page=2
            http://www.aaaabbb.com#up
            http://255.255.255.255
            255.255.255.255
            http://invalid.com/perl.cgi?key= | http://web-site.com/cgi-bin/perl.cgi?key1=value1&key2
            http://www.site.com:8008
            asdasd.cd
            *.pangolin.exchange

            fasldflsa.com
        `;

        const expectedList: string[] = [
            'unibet.me',
            'https://www.aaaabbb.com',
            'http://www.aaaabbb.com',
            'www.aaaabbb.com',
            'aaaabbb.com',
            'http://blog.aaaabbb.com',
            'http://www.aaaabbb.com/product',
            'http://www.aaaabbb.com/products?id=1&page=2',
            'http://www.aaaabbb.com#up',
            'http://255.255.255.255',
            '255.255.255.255',
            'http://invalid.com/perl.cgi?key=',
            'http://web-site.com/cgi-bin/perl.cgi?key1=value1&key2',
            'http://www.site.com:8008',
            'asdasd.cd',
            'pangolin.exchange',
            'fasldflsa.com',
        ];
        expect(getURLsFromText(text)).toMatchObject(expectedList);
    });

    it('returns list of subdomains from real bb program description', () => {
        const text =
            'In Scope\n* *.aol.com\n\n## Notes\nOnly use this asset when nothing else can be reasonably selected.\n\nBugs with AOL that are not listed in scope of our other AOL-related assets can still be submitted to this asset and **_*might*_** be eligible for award, at the sole discretion of the Verizon Media Bug Bounty team.\n\n## Out of Scope\n* *nat.aol.com\n* *.ipt.aol.com\n';

        const expectedList: string[] = [
            'aol.com',
            'nat.aol.com',
            'ipt.aol.com',
        ];
        expect(getURLsFromText(text)).toMatchObject(expectedList);
    });

    it('returns list of urls from real bb program description', () => {
        const text =
            'The app is currently a preview release - but reports are still welcome. Builds are available from [Gitlab CI](https://gitlab.com/passit/passit-mobile/pipelines) and [Google Play](https://play.google.com/store/apps/details?id=com.burkesoftware.Passit)';

        const expectedList: string[] = [
            'https://gitlab.com/passit/passit-mobile/pipelines)',
            'https://play.google.com/store/apps/details?id=com.burkesoftware.Passit)',
        ];

        expect(getURLsFromText(text)).toMatchObject(expectedList);
    });

    it('returns empty array', () => {
        const text = 'asdsadas sdasdas sdasd';

        const expectedList: string[] = [];
        expect(getURLsFromText(text)).toMatchObject(expectedList);
    });

    it('returns empty one url', () => {
        const text = 'sandbox.checkhq.com';

        const expectedList: string[] = ['sandbox.checkhq.com'];
        expect(getURLsFromText(text)).toMatchObject(expectedList);
    });
});

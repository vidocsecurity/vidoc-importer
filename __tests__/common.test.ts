import {
    shouldSkipSubdomain,
    shouldSkipDomain,
    prepareTargetNameToBeParsedAsURL,
    cleanPath,
    parseHostnameToDomainAndSubdomain,
    getParameterNamesFromSearchParams,
    getSourceCodeRepositoriesFromText,
    getIPv4FromText,
    parseTextForIPs,
    getIPv6FromText,
    deduplicateDomains,
    deduplicateSubdomains,
} from '../src/common.js';
import { IDomain } from '../src/sources/types/domain.js';
import { IIPRange, IPRangeType } from '../src/sources/types/ipRanges.js';
import {
    ISourceCodeRepository,
    SourceCodeRepositoryType,
} from '../src/sources/types/sourceCode.js';
import { ISubdomain } from '../src/sources/types/subdomain.js';

describe('common - shouldSkipSubdomain', () => {
    it("shouldn't skip subdomain 'foo.com'", () => {
        const subdomain = 'foo.com';

        expect(shouldSkipSubdomain(subdomain)).toBe(false);
    });

    it("should skip 'bit.ly'", () => {
        const subdomain = 'bit.ly';

        expect(shouldSkipSubdomain(subdomain)).toBe(true);
    });

    it("should skip 'cognito-idp.*.amazonaws.com'", () => {
        const subdomain = 'cognito-idp.eu-east-1.amazonaws.com';

        expect(shouldSkipSubdomain(subdomain)).toBe(true);
    });
});

describe('common - shouldSkipDomain', () => {
    it("shouldn't skip domain 'test.com' for program 'test'", () => {
        const domain = 'test.com';
        const programName = 'test';

        expect(shouldSkipDomain(programName, domain)).toBe(false);
    });

    it("should skip 'execute-api.eu-west-1.amazonaws.com' for program 'test'", () => {
        const domain = 'execute-api.eu-west-1.amazonaws.com';
        const programName = 'test';

        expect(shouldSkipDomain(programName, domain)).toBe(true);
    });

    it("shouldn't skip 'execute-api.eu-west-1.amazonaws.com' for program 'Amazon'", () => {
        const domain = 'execute-api.eu-west-1.amazonaws.com';
        const programName = 'Amazon';

        expect(shouldSkipDomain(programName, domain)).toBe(false);
    });

    it("should skip domain 'google.com' for program: 'Foo'", () => {
        const domain = 'google.com';
        const programName = 'Foo';

        expect(shouldSkipDomain(programName, domain)).toBe(true);
    });

    it("shouldn't skip domain 'google.com' for program: 'Google'", () => {
        const domain = 'google.com';
        const programName = 'Google';

        expect(shouldSkipDomain(programName, domain)).toBe(false);
    });

    it("should skip domain 'github.com' for program: 'Foo'", () => {
        const domain = 'github.com';
        const programName = 'Foo';

        expect(shouldSkipDomain(programName, domain)).toBe(true);
    });

    it("shouldn't skip domain 'github.com' for program: 'Github'", () => {
        const domain = 'github.com';
        const programName = 'Github';

        expect(shouldSkipDomain(programName, domain)).toBe(false);
    });

    it("shouldn't skip domain 'github.io' for program: 'Github'", () => {
        const domain = 'github.io';
        const programName = 'Github';

        expect(shouldSkipDomain(programName, domain)).toBe(false);
    });

    it("should skip domain 'amazon.com' for program: 'Foo'", () => {
        const domain = 'amazon.com';
        const programName = 'Foo';

        expect(shouldSkipDomain(programName, domain)).toBe(true);
    });

    it("shouldn't skip domain 'amazon.com' for program: 'Amazon'", () => {
        const domain = 'amazon.com';
        const programName = 'Amazon';

        expect(shouldSkipDomain(programName, domain)).toBe(false);
    });

    it("should skip domain 'hackerone.com' for program: 'Foo'", () => {
        const domain = 'hackerone.com';
        const programName = 'Foo';

        expect(shouldSkipDomain(programName, domain)).toBe(true);
    });

    it("shouldn't skip domain 'hackerone.com' for program: 'Hackerone'", () => {
        const domain = 'hackerone.com';
        const programName = 'Hackerone';

        expect(shouldSkipDomain(programName, domain)).toBe(false);
    });

    it("should skip domain 'bit.ly' for program: 'Foo'", () => {
        const domain = 'bit.ly';
        const programName = 'Foo';

        expect(shouldSkipDomain(programName, domain)).toBe(true);
    });

    it("should skip domain 'youtube.com' for program: 'Foo'", () => {
        const domain = 'youtube.com';
        const programName = 'Foo';

        expect(shouldSkipDomain(programName, domain)).toBe(true);
    });

    it("shouldn't skip domain 'youtube.com' for program: 'Google'", () => {
        const domain = 'youtube.com';
        const programName = 'Google';

        expect(shouldSkipDomain(programName, domain)).toBe(false);
    });

    it("should skip domain 'slack.com' for program: 'Foo'", () => {
        const domain = 'slack.com';
        const programName = 'Foo';

        expect(shouldSkipDomain(programName, domain)).toBe(true);
    });

    it("shouldn't skip domain 'slack.com' for program: 'Slack'", () => {
        const domain = 'slack.com';
        const programName = 'Slack';

        expect(shouldSkipDomain(programName, domain)).toBe(false);
    });
});

describe('common - prepareTargetNameToBeParsedAsURL', () => {
    it("adds top level domain for 'foo.*'", () => {
        const line = 'foo.*';

        expect(prepareTargetNameToBeParsedAsURL(line)).toBe('https://foo.com');
    });

    it('removes *.', () => {
        const line = '*.foo.pl';

        expect(prepareTargetNameToBeParsedAsURL(line)).toBe('https://foo.pl');
    });

    it('removes * from inside of subdomain', () => {
        const lines = ['aaaa*.foo.en', '*aaaa.foo.en', '*aaaa*.foo.en'];

        lines.forEach((line) => {
            expect(prepareTargetNameToBeParsedAsURL(line)).toBe(
                'https://aaaa.foo.en',
            );
        });
    });

    it('adds https://', () => {
        const line = 'b.foo.en';

        expect(prepareTargetNameToBeParsedAsURL(line)).toBe('https://b.foo.en');
    });

    it('does not add https:// because its https', () => {
        const line = 'https://b.foo.en';

        expect(prepareTargetNameToBeParsedAsURL(line)).toBe('https://b.foo.en');
    });

    it('does not add https:// because its http', () => {
        const line = 'http://b.foo.en';

        expect(prepareTargetNameToBeParsedAsURL(line)).toBe('http://b.foo.en');
    });

    it('does not add https:// because its itmss', () => {
        const line = 'itmss://b.foo.en';

        expect(prepareTargetNameToBeParsedAsURL(line)).toBe('itmss://b.foo.en');
    });

    it('complex test case - removes wildcards', () => {
        const line = 'http://*.a.*foo.en';

        expect(prepareTargetNameToBeParsedAsURL(line)).toBe('http://a.foo.en');
    });

    it('complex test case - fixes wildcard', () => {
        const line = 'https://*.a.*foo.*';

        expect(prepareTargetNameToBeParsedAsURL(line)).toBe(
            'https://a.foo.com',
        );
    });

    it('complex test case - fixes wildcard 2', () => {
        const line = ' https://*.a.*foo.* 3sadasdsa';

        expect(prepareTargetNameToBeParsedAsURL(line)).toBe(
            'https://a.foo.com',
        );
    });

    it('complex test case - parses url and skips garbage', () => {
        const line =
            ' https://*.a.*foo.*/?XD=sl%9sad./3-=12 asflsalfalsfl fsllsf https://google.com';

        expect(prepareTargetNameToBeParsedAsURL(line)).toBe(
            'https://a.foo.com/?XD=sl%9sad./3-=12',
        );
    });

    it('complex test case - parses url with ip and skips garbage', () => {
        const line =
            ' https://12.0.123.1?safsafas=3 asflsalfalsfl fsllsf https://google.com';

        expect(prepareTargetNameToBeParsedAsURL(line)).toBe(
            'https://12.0.123.1?safsafas=3',
        );
    });

    it('returns empty string', () => {
        const line = 'sdasdasasdd';

        expect(prepareTargetNameToBeParsedAsURL(line)).toBe('');
    });
});

describe('common - cleanPath', () => {
    it("doesn't clean path", () => {
        const path = '/foo';

        expect(cleanPath(path)).toBe('/foo');
    });

    it("doesn't clean path (empty path)", () => {
        const path = '/';

        expect(cleanPath(path)).toBe('/');
    });

    it('cleans paths from . at the end', () => {
        const path = '/.';

        expect(cleanPath(path)).toBe('/');
    });

    it('cleans paths from . at the end with name', () => {
        const path = '/foo.';

        expect(cleanPath(path)).toBe('/foo');
    });

    it('cleans paths from ) at the end', () => {
        const path = '/foo)';

        expect(cleanPath(path)).toBe('/foo');
    });
});

describe('common - parseHostnameToDomainAndSubdomain', () => {
    it('return domain and subdomain as null (ip address)', () => {
        const hostname = '127.0.0.1';

        const result = parseHostnameToDomainAndSubdomain('test', hostname);

        expect(result).toMatchObject({
            domain: null,
            subdomain: null,
        });
    });

    it('eturn domain and subdomain as null (invalid domain)', () => {
        const hostname = 'asdfasfasfas.salflsaf';

        const result = parseHostnameToDomainAndSubdomain('test', hostname);

        expect(result).toMatchObject({
            domain: null,
            subdomain: null,
        });
    });

    it('returns only domain for .com', () => {
        const hostname = 'google.com';

        const expected = {
            domain: {
                domainId: 'google.com',
                organizationId: 'test',
            },
            subdomain: null,
        };

        expect(
            parseHostnameToDomainAndSubdomain('test', hostname),
        ).toMatchObject(expected);
    });

    it('returns only domain for random domain', () => {
        const hostname = 'fooo.io';

        const expected = {
            domain: {
                domainId: 'fooo.io',
                organizationId: 'test',
            },
            subdomain: null,
        };

        expect(
            parseHostnameToDomainAndSubdomain('test', hostname),
        ).toMatchObject(expected);
    });

    it('returns only null for domain and subdomain for domain without tld', () => {
        const hostname = 'build';

        const expected = {
            domain: null,
            subdomain: null,
        };

        expect(
            parseHostnameToDomainAndSubdomain('test', hostname),
        ).toMatchObject(expected);
    });

    it('returns only null for domain and subdomain for domain with not asci chars', () => {
        const hostname = 'münchen.de';

        const expected = {
            domain: null,
            subdomain: null,
        };

        expect(
            parseHostnameToDomainAndSubdomain('test', hostname),
        ).toMatchObject(expected);
    });

    it('returns domain and subdomain', () => {
        const hostname = 'aaa.google.com';

        const expected = {
            domain: {
                domainId: 'google.com',
                organizationId: 'test',
            },
            subdomain: {
                subdomainId: 'aaa.google.com',
                root: 'google.com',
                organizationId: 'test',
            },
        };

        expect(
            parseHostnameToDomainAndSubdomain('test', hostname),
        ).toMatchObject(expected);
    });
});

describe('common - getIPv4FromText', () => {
    it('ip is type ipv4 with additional text', () => {
        const ip = '127.0.0.1';
        expect(getIPv4FromText(ip)).toBe('127.0.0.1');
    });

    it('ip is type ipv4', () => {
        const ip = 'asdasd 127.0.0.1 sdasdasd';
        expect(getIPv4FromText(ip)).toBe('127.0.0.1');
    });

    it('ip is type ipv4 (cidr)', () => {
        const ip = '127.0.0.1/28';
        expect(getIPv4FromText(ip)).toBe('127.0.0.1/28');
    });

    it('ip is type ipv4 (cidr) with additional text', () => {
        const ip = 'asdasd 127.0.0.1/28 sdasdasd';
        expect(getIPv4FromText(ip)).toBe('127.0.0.1/28');
    });

    it('ip is not type ipv4', () => {
        const ip = '2a01:7e00::f03c:91ff:fec6:27a3';

        expect(getIPv4FromText(ip)).toBe('');
    });
});

describe('common - getIPv6FromText', () => {
    it('ip is not type ipv4', () => {
        const ip = '127.0.0.1';

        expect(getIPv6FromText(ip)).toBe('');
    });

    it('ip is type ipv6', () => {
        const ip = '2a01:7e00::f03c:91ff:fec6:27a3';

        expect(getIPv6FromText(ip)).toBe('2a01:7e00::f03c:91ff:fec6:27a3');
    });

    it('ip is type ipv6 (cird) with /24 mask', () => {
        const ip = '2a01:7e00::f03c:91ff:fec6:27a3/24';

        expect(getIPv6FromText(ip)).toBe('2a01:7e00::f03c:91ff:fec6:27a3/24');
    });

    it('ip is type ipv6 (cird) with /12 mask', () => {
        const ip = '2604:a880:400:d1::aad:8001/12';

        expect(getIPv6FromText(ip)).toBe('2604:a880:400:d1::aad:8001/12');
    });
    it('ip is type ipv6 (cird) with additional text', () => {
        const ip = 'asdasdas 2604:a880:400:d1::aad:8001/12 sdasfdasf';

        expect(getIPv6FromText(ip)).toBe('2604:a880:400:d1::aad:8001/12');
    });
});

describe('common - getParameterNamesFromSearchParams', () => {
    it('returns names of search parameters', () => {
        const searchParams = new URLSearchParams('?foo=aaa&sadsada=1');

        const expectedList: string[] = ['foo', 'sadsada'];
        expect(getParameterNamesFromSearchParams(searchParams)).toMatchObject(
            expectedList,
        );
    });
});

describe('common - parseTextForIPs', () => {
    it('parsed as ipv4', () => {
        const line = '128.0.20.1';

        const expected: IIPRange[] = [
            {
                ipRange: line,
                organizationId: 'test',
                type: IPRangeType.ipv4,
            },
        ];

        expect(parseTextForIPs('test', line)).toMatchObject(expected);
    });

    it('returned as ipv6', () => {
        const line = '2a01:7e00::f03c:91ff:fec6:27a3';

        const expected: IIPRange[] = [
            {
                ipRange: line,
                organizationId: 'test',
                type: IPRangeType.ipv6,
            },
        ];

        expect(parseTextForIPs('test', line)).toMatchObject(expected);
    });
});

describe('common - getSourceCodeRepositoriesFromText', () => {
    it('does not return any github urls', () => {
        const text = 'Get the app here -';

        expect(getSourceCodeRepositoriesFromText('test', text)).toMatchObject(
            [],
        );
    });

    it('finds github url', () => {
        const text =
            'The app is currently a preview release - but reports are still welcome. Builds are available from [Github CI](https://github.com/passit/passit-mobile/pipelines) and [Google Play](https://play.google.com/store/apps/details?id=com.burkesoftware.Passit)';

        const expectedGithubURLs: ISourceCodeRepository[] = [
            {
                type: SourceCodeRepositoryType.github,
                url: 'https://github.com/passit/passit-mobile',
                organizationId: 'test',
                description: text,
            },
        ];

        expect(getSourceCodeRepositoriesFromText('test', text)).toMatchObject(
            expectedGithubURLs,
        );
    });

    it('finds gitlab url', () => {
        const text =
            'The app is currently a preview release - but reports are still welcome. Builds are available from [Gitlab CI](https://gitlab.com/passit/passit-mobile/pipelines) and [Google Play](https://play.google.com/store/apps/details?id=com.burkesoftware.Passit)';

        const expectedGithubURLs: ISourceCodeRepository[] = [
            {
                type: SourceCodeRepositoryType.gitlab,
                url: 'https://gitlab.com/passit/passit-mobile',
                organizationId: 'test',
                description: text,
            },
        ];

        expect(getSourceCodeRepositoriesFromText('test', text)).toMatchObject(
            expectedGithubURLs,
        );
    });

    it('finds gitlab and github url', () => {
        const text =
            'The app is currently a preview release - but reports are still welcome. https://github.com/passit/passit-mobile/pipelines Builds are available from [Gitlab CI](https://gitlab.com/passit/passit-mobile/pipelines) and [Google Play](https://play.google.com/store/apps/details?id=com.burkesoftware.Passit)';

        const expectedGithubURLs: ISourceCodeRepository[] = [
            {
                type: SourceCodeRepositoryType.github,
                url: 'https://github.com/passit/passit-mobile',
                organizationId: 'test',
                description: text,
            },
            {
                type: SourceCodeRepositoryType.gitlab,
                url: 'https://gitlab.com/passit/passit-mobile',
                organizationId: 'test',
                description: text,
            },
        ];

        expect(getSourceCodeRepositoriesFromText('test', text)).toMatchObject(
            expectedGithubURLs,
        );
    });
});

describe('common - deduplicateDomains', () => {
    it('removes duplicates from domain list', () => {
        const domains: IDomain[] = [
            {
                forceManualReview: false,
                domainId: 'unibet.me',
                organizationId: 'testorg',
                description: 'This is some test description',
                isInScope: true,
            },
            {
                forceManualReview: false,
                domainId: 'unibet.me',
                organizationId: 'testorg',
                description: 'This is some test description',
                isInScope: false,
            },
            {
                forceManualReview: false,
                domainId: 'foo.me',
                organizationId: 'testorg',
                description: 'This is some test description',
                isInScope: true,
            },
        ];

        const expectedDomains = [
            {
                forceManualReview: false,
                domainId: 'unibet.me',
                organizationId: 'testorg',
                description: 'This is some test description',
                isInScope: false,
            },
            {
                forceManualReview: false,
                domainId: 'foo.me',
                organizationId: 'testorg',
                description: 'This is some test description',
                isInScope: true,
            },
        ];

        expect(deduplicateDomains(domains)).toMatchObject(expectedDomains);
    });
});

describe('common - deduplicateSubdomains', () => {
    it('removes duplicates from subdomain list', () => {
        const subdomains: ISubdomain[] = [
            {
                subdomainId: 'aa.unibet.me',
                organizationId: 'testorg',
                root: 'unibet.me',
            },
            {
                subdomainId: 'aa.unibet.me',
                organizationId: 'testorg',
                root: 'unibet.me',
            },
            {
                subdomainId: 'bb.foo.me',
                organizationId: 'testorg',
                root: 'unibet.me',
            },
        ];

        const expectedSubdomains: ISubdomain[] = [
            {
                subdomainId: 'aa.unibet.me',
                organizationId: 'testorg',
                root: 'unibet.me',
            },
            {
                subdomainId: 'bb.foo.me',
                organizationId: 'testorg',
                root: 'unibet.me',
            },
        ];

        expect(deduplicateSubdomains(subdomains)).toMatchObject(
            expectedSubdomains,
        );
    });
});

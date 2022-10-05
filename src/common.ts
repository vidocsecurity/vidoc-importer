import {
    IApplication,
    IDomain,
    IIPRange,
    IPRangeType,
    ISourceCodeRepository,
    ISubdomain,
    SourceCodeRepositoryType,
} from '@boosted-bb/backend-interfaces';
import { parseDomain, ParseResultType } from 'parse-domain';
import { getURLsFromText } from './urlScopeParser.js';

const SKIP_HOSTNAMES_REGEXES = [
    /cognito-idp\..+\.amazonaws.com/gi, // cognito stuff
    /bit\.ly/gi,
    /amazonaws\.com/gi,
    /github\.io/gi,
    /gitter\.im/gi,
    /azurewebsites\.net/gi,
];

const shouldSkipSubdomain = (hostname: string) => {
    let shouldSkipSubdomain = false;
    SKIP_HOSTNAMES_REGEXES.forEach((regex) => {
        if (regex.test(hostname)) {
            shouldSkipSubdomain = true;
        }
    });

    return shouldSkipSubdomain;
};

const nameToOrganizationID = (name: string): string =>
    name.replace(/[^a-zA-Z0-9_-\s]+/g, '').toLowerCase();

const parseHostnameToDomainAndSubdomain = (
    organizationId: string,
    hostname: string,
) => {
    try {
        const parseResult = parseDomain(hostname);

        if (parseResult.type === ParseResultType.Ip) {
            throw new Error('The hostname is an IP address');
        }

        if (parseResult.type === ParseResultType.NotListed) {
            throw new Error('The hostname was parsed as NotListed');
        }

        if (parseResult.type === ParseResultType.Listed) {
            const {
                subDomains: parsedSubdomains,
                domain: parsedDomainName,
                topLevelDomains,
            } = parseResult;

            const domainName = `${parsedDomainName}.${topLevelDomains.join(
                '.',
            )}`;

            if (!parsedDomainName) {
                return {
                    domain: null,
                    subdomain: null,
                };
            }

            const domain: IDomain = {
                domainId: domainName,
                organizationId,
            };

            if (parsedSubdomains.length > 0) {
                const subdomainName = `${parsedSubdomains.join(
                    '.',
                )}.${domainName}`;

                const subdomain: ISubdomain = {
                    subdomainId: subdomainName,
                    organizationId,
                    root: domainName,
                };

                return {
                    domain,
                    subdomain,
                };
            }

            return {
                domain,
                subdomain: null,
            };
        }

        return {
            domain: null,
            subdomain: null,
        };
    } catch (error) {
        return {
            domain: null,
            subdomain: null,
        };
    }
};

// this is a list of domains that is commonly found
// in program's description and the domains are not owned by these
// programs
//
// Example: program https://hackerone.com/hackerone has link
// "https://help.github.com" in its description, the link will be parsed by our
// fetcher and would be added as a hackerone domain. It is not true that
// hackerone owns github.com or help.github.com, we want to prevent adding such
// domains/subdomains.
const SKIP_ROOT_DOMAINS: { [key: string]: RegExp[] } = {
    'execute-api.eu-west-1.amazonaws.com': [/amazon/gi],
    'google.com': [/google/i],
    'github.com': [/github/i],
    'github.io': [/github/i],
    'amazon.com': [/amazon/i],
    'hackerone.com': [/hackerone/i],
    'bit.ly': [], // we always skip that, they do not have bb program
    'youtube.com': [/google/i],
    'slack.com': [/slack/i],
    'microsoft.com': [/microsoft/i],
    'windows.net': [/microsoft/i],
    'twitter.com': [/twitter/i],
    'wearehackerone.com': [/hackerone/i],
    'bugcrowd.com': [/bugcrowd/i],
    'appcenter.ms': [/microsoft/i],
    'mozilla.org': [/mozilla/i],
    'cloudfront.net': [/amazon/i],
    'npmjs.com': [],
    'example.com': [],
    'gmail.com': [/google.com/i],
    'apple.com': [/apple/i],
    'azure.com': [/microsoft/i],
    'atlassian.com': [/atlassian/i],
    'atlassian.net': [/atlassian/i],
    'zendesk.com': [/zendesk/i],
    'salesforce.com': [/salesforce/i],
    'reddit.com': [/reddit/i],
    'force.com': [/salesforce/i],
    'stackoverflow.com': [/stackoverflow/i],
    'googleapis.com': [/google/i],
    'wordpress.org': [/wordpress/i],
    'wordpress.com': [/automattic/i],
    'vk.com': [/vk.com/i],
    'spotify.com': [/spotify/i],
    'facebook.com': [/facebook/i],
    's3.amazonaws.com': [/amazon/i],
    'elb.us-east-1.amazonaws.com': [/amazon/i],
    'azurefd.net': [/microsoft/i],
    'p.azurewebsites.net': [/microsoft/i],
    'statuspage.io': [/statuspage/i],
    'asp.net': [/microsoft/i],
};

// this function requires more context - programName,
// we do not want to skip certain domains if they are really
// part of some program.
const shouldSkipDomain = (organizationId: string, domain: string) => {
    const { domain: parsedDomain } = parseHostnameToDomainAndSubdomain(
        organizationId,
        domain,
    );

    if (!parsedDomain) {
        return false;
    }

    const nameRegexp = SKIP_ROOT_DOMAINS[parsedDomain.domainId];

    if (nameRegexp) {
        let shouldSkipDomain = true;

        nameRegexp.forEach((regexp) => {
            if (regexp.test(organizationId)) {
                shouldSkipDomain = false;
            }
        });

        return shouldSkipDomain;
    }

    return false;
};

const prepareTargetNameToBeParsedAsURL = (targetName: string) => {
    // remove leading white spaces
    let target = targetName.trimStart();

    // some of the programs provide really wide scope
    // example: apple.*
    // it would not be parsed by our system,
    // we want to replace it with some top level domain
    // ".com" will be good enough
    if (/\.(?:\*)(?=$|\s|\?|\/|\\)/g.test(target)) {
        target = target.replace(/\.(?:\*)(?=$|\s|\?|\/|\\)/g, '.com');
    }

    // some of the url contains *.foo.com
    // we remove that
    if (/^\*\./.test(target)) {
        target = target.replace(/^\*\./g, '');
    }

    // some of the url contains https://*.foo.com
    // we remove that
    if (/(^|:\/\/)(?:\*\.)/.test(target)) {
        target = target.replace(/(^|:\/\/)(?:\*\.)/g, '://');
    }

    // some targets use syntax: *developer*.cloud.com
    // to describe scope, we want to remove the star that is
    // inside subdomain name
    if (target.includes('*')) {
        target = target.replace(/\*/g, '');
    }

    // we have to add https:// or http://
    // in order for the target to be parsed by URL
    if (!target.startsWith('http') && !target.startsWith('itmss:/')) {
        target = `https://${target}`;
    }

    const urls = getURLsFromText(target);

    if (urls.length > 0) {
        return urls[0];
    }

    return '';
};

// often URLs in descriptions use this syntax: (Name)[url]
// and when we retrieve them from description we get the url with ] at the end
// other case is when there is link and dot at the end of it - end of the sentence
// this function cleans that cases
const cleanPath = (dirtyPath: string): string => {
    // if path ends with . we want to remove it
    let path = dirtyPath;
    if (path[path.length - 1] === '.') {
        path = path.slice(0, path.length - 1);
    }

    // if path ends with ) we want to remove it
    if (path[path.length - 1] === ')') {
        path = path.slice(0, path.length - 1);
    }

    return path;
};

const IPV4_REGEXP = /(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(\/[0-9][0-9]|)/;

const getIPv4FromText = (text: string) => {
    const results = text.replace('\\n', '\n').match(IPV4_REGEXP);

    if (results && results.length > 0) {
        return results[0];
    }

    return '';
};

const IPV6_REGEXP = /([0-9A-Fa-f]{0,4}:){2,7}([0-9A-Fa-f]{1,4}|((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){4})(\/[0-9][0-9]|)/;

const getIPv6FromText = (text: string) => {
    const results = text.replace('\\n', '\n').match(IPV6_REGEXP);

    if (results && results.length > 0) {
        return results[0];
    }

    return '';
};

const getParameterNamesFromSearchParams = (searchParams: URLSearchParams) => {
    const parameters: string[] = [];

    searchParams.forEach((_, key) => {
        parameters.push(key);
    });

    return parameters;
};

const parseTextForIPs = (
    organizationId: string,
    target: string,
): IIPRange[] => {
    const ips: IIPRange[] = [];

    const ipv4 = getIPv4FromText(target);

    if (ipv4) {
        ips.push({
            ipRange: ipv4,
            organizationId,
            type: IPRangeType.ipv4,
        });
    }

    const ipv6 = getIPv6FromText(target);

    if (ipv6) {
        ips.push({
            ipRange: ipv6,
            organizationId,
            type: IPRangeType.ipv6,
        });
    }

    return ips;
};

const GITHUB_REPO_REGEX = /(?:[^\s]+github\.com(\/|:)[^/\s]+\/[^/\s]+)/gi;
const GITLAB_REPO_REGEX = /(?:[^\s]+gitlab\.com(\/|:)[^/\s]+\/[^/\s]+)/gi;

const getCleanGithubRepoURL = (url: string) => {
    const matches = url.match(GITHUB_REPO_REGEX);
    if (matches) {
        return matches[0];
    }

    return url;
};

const getCleanGitlabRepoURL = (url: string) => {
    const matches = url.match(GITLAB_REPO_REGEX);
    if (matches) {
        return matches[0];
    }

    return url;
};

const getSourceCodeRepositoriesFromText = (
    organizationId: string,
    description: string,
) => {
    const urls = getURLsFromText(description);
    const sourceCodeRepositories: ISourceCodeRepository[] = [];

    urls.forEach((url) => {
        try {
            const parsedURL = new URL(url);

            if (parsedURL.hostname === 'github.com') {
                sourceCodeRepositories.push({
                    url: getCleanGithubRepoURL(cleanPath(url)),
                    type: SourceCodeRepositoryType.github,
                    description,
                    organizationId,
                });
            }

            if (parsedURL.hostname === 'gitlab.com') {
                sourceCodeRepositories.push({
                    url: getCleanGitlabRepoURL(cleanPath(url)),
                    type: SourceCodeRepositoryType.gitlab,
                    description,
                    organizationId,
                });
            }
            /* eslint-disable-next-line no-empty */
        } catch (_) {}
    });

    return sourceCodeRepositories;
};

const deduplicateDomains = (domains: IDomain[]): IDomain[] => {
    const mappedDomains: { [key: string]: IDomain } = {};

    domains.forEach((domain) => {
        // do not override property forceManualReview
        /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
        const { domainId, forceManualReview: _, ...rest } = domain;
        if (mappedDomains[domainId] !== undefined) {
            mappedDomains[domainId] = {
                ...mappedDomains[domainId],
                ...rest,
            };
        } else {
            mappedDomains[domainId] = domain;
        }
    });

    return Object.values(mappedDomains);
};

const deduplicateSubdomains = (subdomains: ISubdomain[]): ISubdomain[] => {
    const mappedDomains: { [key: string]: ISubdomain } = {};

    subdomains.forEach((subdomain) => {
        const { subdomainId, ...rest } = subdomain;
        if (mappedDomains[subdomainId] !== undefined) {
            // do not override property forceManualReview
            mappedDomains[subdomainId] = {
                ...mappedDomains[subdomainId],
                ...rest,
            };
        } else {
            mappedDomains[subdomainId] = subdomain;
        }
    });

    return Object.values(mappedDomains);
};

const deduplicateApplications = (
    applications: IApplication[],
): IApplication[] => {
    const mappedApplications: { [key: string]: IApplication } = {};

    applications.forEach((application) => {
        const { url, name, ...rest } = application;
        const index = url ?? name;

        if (!index) {
            return;
        }

        if (mappedApplications[index] !== undefined) {
            // do not override property forceManualReview
            mappedApplications[index] = {
                ...mappedApplications[index],
                ...rest,
            };
        } else {
            mappedApplications[index] = application;
        }
    });

    return Object.values(mappedApplications);
};

const processInChunks = async <T>(
    array: T[],
    chunkSize: number,
    process: (slice: T[], progress: number) => Promise<void>,
): Promise<void> => {
    const arrayCopy = [...array];
    return new Promise(async (resolve, reject) => {
        let startingSize = arrayCopy.length;

        const processChunk = async () => {
            const chunk = arrayCopy.splice(0, chunkSize);

            if (chunk.length === 0) {
                resolve();
                return;
            }

            let progress = Math.round(
                ((startingSize - arrayCopy.length) / startingSize) * 100,
            );

            try {
                await process(chunk, progress);
            } catch (err) {
                reject(err);
            }

            setImmediate(async () => {
                await processChunk();
            });
        };

        await processChunk();
    });
};

export {
    prepareTargetNameToBeParsedAsURL,
    parseHostnameToDomainAndSubdomain,
    getParameterNamesFromSearchParams,
    shouldSkipDomain,
    shouldSkipSubdomain,
    parseTextForIPs,
    cleanPath,
    getSourceCodeRepositoriesFromText,
    getIPv6FromText,
    getIPv4FromText,
    deduplicateDomains,
    deduplicateSubdomains,
    deduplicateApplications,
    nameToOrganizationID,
    processInChunks,
};

import {
    ApplicationType,
    IApplication,
    IEndpoint,
    IDomain,
    IIPRange,
    IParameter,
    ISubdomain,
} from '@boosted-bb/backend-interfaces';
import {
    cleanPath,
    getParameterNamesFromSearchParams,
    parseHostnameToDomainAndSubdomain,
    parseTextForIPs,
    prepareTargetNameToBeParsedAsURL,
    shouldSkipDomain,
    shouldSkipSubdomain,
} from './common.js';
import {
    ANDROID_MOBILE_APPS_HOSTNAMES,
    IOS_MOBILE_APPS_HOSTNAMES,
} from './mobileApplicationParser.js';

const URL_REGEX = /(?:[a-z]+:\/\/|[a-z0-9])[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,24}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/gi;

const getURLsFromText = (text: string): string[] => {
    const result = text.replace('\\n', '\n').match(URL_REGEX);
    return result ?? [];
};

const parseURLsForScopeItems = (
    organizationId: string,
    url: string,
    description: string,
    isInScope: boolean,
    forceManualReview = false,
) => {
    const endpoints: IEndpoint[] = [];
    const domains: IDomain[] = [];
    const subdomains: ISubdomain[] = [];
    const ipRanges: IIPRange[] = [];
    const applications: IApplication[] = [];
    const parameters: IParameter[] = [];

    try {
        const parsedIPs = parseTextForIPs(organizationId, url);
        if (parsedIPs.length > 0) {
            ipRanges.push(...parsedIPs);
            throw new Error('');
        }

        // if target is not a valid url the URL will throw an error
        const { hostname, pathname, searchParams } = new URL(
            prepareTargetNameToBeParsedAsURL(url),
        );

        // we check if its link to mobile application
        // f.e. https://play.google.com/store/apps/details?id=com.bitsmedia.android.muslimpro&hl=en
        if (ANDROID_MOBILE_APPS_HOSTNAMES.includes(hostname)) {
            applications.push({
                type: ApplicationType.androidMobile,
                url: cleanPath(url),
                ...(description.length > 0 && { description }),
                organizationId,
            });
            throw new Error('');
        }

        // we check if its link to mobile application
        // f.e. https://itunes.apple.com/fr/app/blablacar-trusted-carpooling/id341329033?l=en&mt=8
        if (IOS_MOBILE_APPS_HOSTNAMES.includes(hostname)) {
            applications.push({
                type: ApplicationType.iosMobile,
                url: cleanPath(url),
                ...(description.length > 0 && { description }),
                organizationId,
            });
            throw new Error('');
        }

        if (['install.appcenter.ms', 'f-droid.org'].includes(hostname)) {
            applications.push({
                url: cleanPath(url),
                type: ApplicationType.mobileUnknown,
                description,
                organizationId,
            });

            throw new Error('');
        }

        if (
            shouldSkipSubdomain(hostname) ||
            shouldSkipDomain(organizationId, hostname)
        ) {
            throw new Error('');
        }

        const {
            domain: parsedDomain,
            subdomain: parsedSubdomain,
        } = parseHostnameToDomainAndSubdomain(organizationId, hostname);

        const associatedSubdomains: string[] = [];

        if (parsedDomain) {
            if (cleanPath(pathname) !== '/') {
                endpoints.push({
                    path: cleanPath(pathname),
                    subdomainId: parsedDomain.domainId,
                    organizationId,
                    parameters: [],
                    source: ['bug-bounty-fetcher'],
                    root: parsedDomain.domainId,
                });
            }

            // if subdomain exist we only add description to subdomain
            if (parsedSubdomain) {
                subdomains.push(parsedSubdomain);

                // domain will inherit isInScope: true from subdomain only if the source is trusty
                // it will widen our scope
                domains.push({
                    ...parsedDomain,
                    ...(isInScope && !forceManualReview && { isInScope }),
                    forceManualReview,
                });

                if (cleanPath(pathname) !== '/') {
                    endpoints.push({
                        path: cleanPath(pathname),
                        subdomainId: parsedSubdomain.subdomainId,
                        organizationId,
                        parameters: [],
                        source: ['bug-bounty-fetcher'],
                        root: parsedDomain.domainId,
                    });
                }

                associatedSubdomains.push(parsedSubdomain.subdomainId);
            } else {
                // if subdomain is not defined we want to add description to domain
                domains.push({
                    ...parsedDomain,
                    ...(description.length > 0 && { description }),
                    ...((!forceManualReview || !isInScope) && { isInScope }),
                    forceManualReview,
                });
            }

            associatedSubdomains.push(parsedDomain.domainId);

            getParameterNamesFromSearchParams(searchParams).forEach(
                (parameter) => {
                    parameters.push({
                        path: cleanPath(pathname),
                        parameter,
                        organizationId,
                    });
                },
            );
        }
    } catch (error) {
        // console.log(url, error);
    }

    return {
        domains,
        subdomains,
        ipRanges,
        endpoints,
        applications,
        parameters,
    };
};

export { parseURLsForScopeItems, getURLsFromText };

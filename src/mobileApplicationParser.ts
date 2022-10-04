import { IApplication, ApplicationType } from '@boosted-bb/backend-interfaces';
import { cleanPath } from './common.js';
import { getURLsFromText } from './urlScopeParser.js';

const ANDROID_MOBILE_APPS_HOSTNAMES = ['play.google.com'];

const IOS_MOBILE_APPS_HOSTNAMES = ['itunes.apple.com', 'apps.apple.com'];

const APPLE_APP_ID_REGEXP = /^([^\s][a-z0-9-/.]*)$/;
const ANDROID_APP_ID_REGEXP = /^([^\s][a-z0-9-/.]*)$/;

const getMobileApplicationURLsFromText = (
    organizationId: string,
    text: string,
    description: string,
): IApplication[] => {
    const urls = getURLsFromText(text);
    const applications: IApplication[] = [];

    urls.forEach((url) => {
        try {
            const parsedURL = new URL(url);

            if (ANDROID_MOBILE_APPS_HOSTNAMES.includes(parsedURL.hostname)) {
                applications.push({
                    type: ApplicationType.androidMobile,
                    url: cleanPath(url),
                    ...(description.length > 0 && { description }),
                    organizationId,
                });
            }

            if (IOS_MOBILE_APPS_HOSTNAMES.includes(parsedURL.hostname)) {
                applications.push({
                    type: ApplicationType.iosMobile,
                    url: cleanPath(url),
                    ...(description.length > 0 && { description }),
                    organizationId,
                });
            }
            /* eslint-disable-next-line no-empty */
        } catch (_) {}
    });

    return applications;
};

const parseEndpointOrDescriptionForMobileApplications = (
    organizationId: string,
    endpoint: string,
    description: string,
    isIOSType: boolean,
): IApplication[] => {
    const applications: IApplication[] = [];

    const trimmedEndpoint = endpoint.trimStart().trimEnd();

    if (description.length > 0) {
        const applicationsFromDescription = getMobileApplicationURLsFromText(
            organizationId,
            description,
            description,
        );

        // its really common for programs to put full url to mobile application in description
        // and only add app id in asset_identifier, we prefer to take the full url
        if (applicationsFromDescription.length > 0) {
            applications.push(...applicationsFromDescription);
            return applications;
        }
    }

    const applicationsFromEndpoint = getMobileApplicationURLsFromText(
        organizationId,
        trimmedEndpoint,
        description,
    );

    // sometimes there is url to application - not the app store id
    if (applicationsFromEndpoint.length > 0) {
        applications.push(...applicationsFromEndpoint);
        return applications;
    }

    if (isIOSType) {
        if (APPLE_APP_ID_REGEXP.test(trimmedEndpoint)) {
            applications.push({
                type: ApplicationType.iosMobile,
                ...(description.length > 0 && { description }),
                url: `https://apps.apple.com/app/${trimmedEndpoint}`,
                organizationId,
            });
        } else {
            applications.push({
                url: trimmedEndpoint,
                type: ApplicationType.iosMobile,
                ...(description.length > 0 && { description }),
                name: trimmedEndpoint,
                organizationId,
            });
        }
    } else if (ANDROID_APP_ID_REGEXP.test(trimmedEndpoint)) {
        applications.push({
            type: ApplicationType.androidMobile,
            ...(description.length > 0 && { description }),
            url: `https://play.google.com/store/apps/details?id=${trimmedEndpoint}`,
            organizationId,
        });
    } else {
        applications.push({
            url: trimmedEndpoint,
            type: ApplicationType.androidMobile,
            ...(description.length > 0 && { description }),
            name: trimmedEndpoint,
            organizationId,
        });
    }

    return applications;
};

export {
    parseEndpointOrDescriptionForMobileApplications,
    getMobileApplicationURLsFromText,
    IOS_MOBILE_APPS_HOSTNAMES,
    ANDROID_MOBILE_APPS_HOSTNAMES,
};

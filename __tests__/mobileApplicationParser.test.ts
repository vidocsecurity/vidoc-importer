import { IApplication, ApplicationType } from '../src/sources/types/index.js';
import {
    getMobileApplicationURLsFromText,
    parseEndpointOrDescriptionForMobileApplications,
} from '../src/mobileApplicationParser.js';

describe('common - getMobileApplicationURLsFromText', () => {
    it('does not return any applications', () => {
        const text = 'Get the app here -';

        expect(
            getMobileApplicationURLsFromText('test', text, text),
        ).toMatchObject([]);
    });

    it('finds android application', () => {
        const text =
            'The app is currently a preview release - but reports are still welcome. Builds are available from [Gitlab CI](https://gitlab.com/passit/passit-mobile/pipelines) and [Google Play](https://play.google.com/store/apps/details?id=com.burkesoftware.Passit)';

        const expectedApplications: IApplication[] = [
            {
                type: ApplicationType.androidMobile,
                url:
                    'https://play.google.com/store/apps/details?id=com.burkesoftware.Passit',
                description: text,
                organizationId: 'test',
            },
        ];

        expect(
            getMobileApplicationURLsFromText('test', text, text),
        ).toMatchObject(expectedApplications);
    });

    it('finds ios application', () => {
        const text =
            'Get the app here - https://itunes.apple.com/us/app/monaco-card/id1262148500?ls=1&mt=8\n\nYou won’t need test accounts for this as it will be public facing sites for now.\n\nGet the MCO Cryptocurrency Card app for iOS in the link above this app should allow you to create an account and start using the Monaco services.';

        const expectedApplications: IApplication[] = [
            {
                type: ApplicationType.iosMobile,
                url:
                    'https://itunes.apple.com/us/app/monaco-card/id1262148500?ls=1&mt=8',
                description: text,
                organizationId: 'test',
            },
        ];

        expect(
            getMobileApplicationURLsFromText('test', text, text),
        ).toMatchObject(expectedApplications);
    });

    it('finds ios and android application', () => {
        const text =
            'Get the app here - https://itunes.apple.com/us/app/monaco-card/id1262148500?ls=1&mt=8\n\nYou won’t need test accounts https://play.google.com/store/apps/details?id=com.burkesoftware.Passit for this as it will be public facing sites for now.\n\nGet the MCO Cryptocurrency Card app for iOS in the link above this app should allow you to create an account and start using the Monaco services.';

        const expectedApplications: IApplication[] = [
            {
                type: ApplicationType.iosMobile,
                url:
                    'https://itunes.apple.com/us/app/monaco-card/id1262148500?ls=1&mt=8',
                description: text,
                organizationId: 'test',
            },
            {
                type: ApplicationType.androidMobile,
                url:
                    'https://play.google.com/store/apps/details?id=com.burkesoftware.Passit',
                description: text,
                organizationId: 'test',
            },
        ];

        expect(
            getMobileApplicationURLsFromText('test', text, text),
        ).toMatchObject(expectedApplications);
    });
});

describe('common - parseEndpointOrDescriptionForMobileApplications', () => {
    it('parses ios app from URL', () => {
        const endpoint =
            'https://apps.apple.com/us/app/confluence-server/id1288365159';

        const expectedApplications: IApplication[] = [
            {
                url: endpoint,
                type: ApplicationType.iosMobile,
                organizationId: 'test',
            },
        ];

        expect(
            parseEndpointOrDescriptionForMobileApplications(
                'test',
                endpoint,
                '',
                true,
            ),
        ).toMatchObject(expectedApplications);
    });

    it('parses android app from URL', () => {
        const endpoint =
            'https://play.google.com/store/apps/details?id=com.atlassian.confluence.server';

        const expectedApplications: IApplication[] = [
            {
                url: endpoint,
                type: ApplicationType.androidMobile,
                organizationId: 'test',
            },
        ];

        expect(
            parseEndpointOrDescriptionForMobileApplications(
                'test',
                endpoint,
                '',
                false,
            ),
        ).toMatchObject(expectedApplications);
    });

    it('parses ios app from application id for apple', () => {
        const endpoint = 'com.monaco.mobile';

        const expectedApplications: IApplication[] = [
            {
                url: 'https://apps.apple.com/app/com.monaco.mobile',
                type: ApplicationType.iosMobile,
                organizationId: 'test',
            },
        ];

        expect(
            parseEndpointOrDescriptionForMobileApplications(
                'test',
                endpoint,
                '',
                true,
            ),
        ).toMatchObject(expectedApplications);
    });

    it('parses android app from application id', () => {
        const endpoint = 'com.monaco.mobile';

        const expectedApplications: IApplication[] = [
            {
                url:
                    'https://play.google.com/store/apps/details?id=com.monaco.mobile',
                type: ApplicationType.androidMobile,
                organizationId: 'test',
            },
        ];

        expect(
            parseEndpointOrDescriptionForMobileApplications(
                'test',
                endpoint,
                '',
                false,
            ),
        ).toMatchObject(expectedApplications);
    });

    it('parses ios app from application id (only id provided)', () => {
        const endpoint = 'delen/id1064839588';

        const expectedApplications: IApplication[] = [
            {
                url: 'https://apps.apple.com/app/delen/id1064839588',
                type: ApplicationType.iosMobile,
                organizationId: 'test',
            },
        ];

        expect(
            parseEndpointOrDescriptionForMobileApplications(
                'test',
                endpoint,
                '',
                true,
            ),
        ).toMatchObject(expectedApplications);
    });

    it('parses android app from application id google', () => {
        const endpoint = 'delen/id1064839588';

        const expectedApplications: IApplication[] = [
            {
                url:
                    'https://play.google.com/store/apps/details?id=delen/id1064839588',
                type: ApplicationType.androidMobile,
                organizationId: 'test',
            },
        ];

        expect(
            parseEndpointOrDescriptionForMobileApplications(
                'test',
                endpoint,
                '',
                false,
            ),
        ).toMatchObject(expectedApplications);
    });

    it('parses ios app from application name', () => {
        const endpoint = 'Binance Mobile Application for iOS';

        const expectedApplications: IApplication[] = [
            {
                url: endpoint,
                name: endpoint,
                type: ApplicationType.iosMobile,
                organizationId: 'test',
            },
        ];

        expect(
            parseEndpointOrDescriptionForMobileApplications(
                'test',
                endpoint,
                '',
                true,
            ),
        ).toMatchObject(expectedApplications);
    });

    it('parses android app from application name', () => {
        const endpoint = 'Binance Mobile Application for iOS';

        const expectedApplications: IApplication[] = [
            {
                url: endpoint,
                name: endpoint,
                type: ApplicationType.androidMobile,
                organizationId: 'test',
            },
        ];

        expect(
            parseEndpointOrDescriptionForMobileApplications(
                'test',
                endpoint,
                '',
                false,
            ),
        ).toMatchObject(expectedApplications);
    });

    it('parses ios app from description', () => {
        const endpoint = 'Binance Mobile Application for iOS';
        const description =
            'foo https://apps.apple.com/us/app/confluence-server/id1288365159 aaa';

        const expectedApplications: IApplication[] = [
            {
                url:
                    'https://apps.apple.com/us/app/confluence-server/id1288365159',
                type: ApplicationType.iosMobile,
                organizationId: 'test',
            },
        ];

        expect(
            parseEndpointOrDescriptionForMobileApplications(
                'test',
                endpoint,
                description,
                true,
            ),
        ).toMatchObject(expectedApplications);
    });

    it('parses android app from description', () => {
        const endpoint = 'Binance Mobile Application for iOS';
        const description =
            'foo https://play.google.com/store/apps/details?id=delen/id1064839588 aaa';

        const expectedApplications: IApplication[] = [
            {
                url:
                    'https://play.google.com/store/apps/details?id=delen/id1064839588',
                type: ApplicationType.androidMobile,
                organizationId: 'test',
            },
        ];

        expect(
            parseEndpointOrDescriptionForMobileApplications(
                'test',
                endpoint,
                description,
                true,
            ),
        ).toMatchObject(expectedApplications);
    });

    it('parses ios app from application name (with description)', () => {
        const endpoint = 'Foo boo';
        const description = 'foo aaa';

        const expectedApplications: IApplication[] = [
            {
                url: endpoint,
                name: endpoint,
                type: ApplicationType.iosMobile,
                organizationId: 'test',
            },
        ];

        expect(
            parseEndpointOrDescriptionForMobileApplications(
                'test',
                endpoint,
                description,
                true,
            ),
        ).toMatchObject(expectedApplications);
    });

    it('parses android app from application name (with description)', () => {
        const endpoint = 'Foo boo';
        const description = 'foo aaa';

        const expectedApplications: IApplication[] = [
            {
                url: endpoint,
                name: endpoint,
                type: ApplicationType.androidMobile,
                organizationId: 'test',
            },
        ];

        expect(
            parseEndpointOrDescriptionForMobileApplications(
                'test',
                endpoint,
                description,
                false,
            ),
        ).toMatchObject(expectedApplications);
    });
});

import fetch from 'node-fetch';

const authorizeAndGetAuthorizedWebCookie = async (
    authorizeURL: URL,
    webCookie: string,
) => {
    const response = await fetch(authorizeURL, {
        redirect: 'manual',
        follow: 0,
        headers: {
            cookie: `${webCookie}; __Secure-Intigriti.CookieConsent.5MC37=closed; intercom-id-pf15mvw4=a05ba1cf-ae8a-413a-8810-1b43be8bdf14; intercom-session-pf15mvw4=`,
        },
    });

    const cookie = response.headers.get('set-cookie');

    if (cookie) {
        return cookie.split('; ')[0];
    }

    return null;
};

const getAuthorizeWithCode = async (
    authorizeURL: URL,
    csrfToken: string,
    ssoCookie: string,
) => {
    if (!ssoCookie || ssoCookie.length === 0) {
        throw new Error('ssoCookie is empty');
    }

    const response = await fetch(authorizeURL, {
        redirect: 'manual',
        headers: {
            cookie: `${csrfToken}; ${ssoCookie}; __Secure-Intigriti.CookieConsent.5MC37=closed; intercom-id-pf15mvw4=a05ba1cf-ae8a-413a-8810-1b43be8bdf14; intercom-session-pf15mvw4=`,
        },
    });
    const location = response.headers.get('location');

    if (location) {
        return new URL(location);
    }

    return null;
};

const fetchWebCookieAndGetRedirectURL = async () => {
    const response = await fetch('https://app.intigriti.com/auth/dashboard', {
        redirect: 'manual',
        headers: {
            cookie: `__Secure-Intigriti.CookieConsent.5MC37=closed; intercom-id-pf15mvw4=a05ba1cf-ae8a-413a-8810-1b43be8bdf14; intercom-session-pf15mvw4=`,
        },
    });
    const cookie = response.headers.get('set-cookie');
    const location = response.headers.get('location');

    if (location && cookie && cookie.length > 0) {
        return {
            webCookie: cookie.split('; ')[0],
            redirectURL: new URL(location),
        };
    }

    return null;
};

const PATH_AND_SAMESITE_REGEX = /\s+path=\/;(\s+HttpOnly;|)\s+secure;\s+samesite=([^,;]+)[^_]+/gi;

const fetchSSOCookie = async (
    email: string,
    password: string,
    csrfToken: string,
    verificationToken: string,
) => {
    const params = new URLSearchParams();
    params.append('Input.Email', email);
    params.append('Input.Password', password);
    params.append('Input.WebHostUrl', 'https://app.intigriti.com');
    params.append('__RequestVerificationToken', verificationToken);
    params.append('Input.RememberLogin', 'false');
    params.append('Input.LocalLogin', 'True');
    params.append('Input.ReturnUrl', '');
    params.append('button', 'login');

    const response = await fetch('https://login.intigriti.com/account/login', {
        method: 'POST',
        body: params.toString(),
        redirect: 'manual',
        headers: {
            cookie: `${csrfToken};`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
    });

    if (response.status !== 302 && response.status !== 301) {
        throw new Error(
            `Failed to fetchSSOCookie, got status ${response.status}`,
        );
    }

    const cookie = response.headers.get('set-cookie');
    if (cookie) {
        return cookie.replace(PATH_AND_SAMESITE_REGEX, '');
    }

    return '';
};

const INPUT_VERIFICATION_TOKEN_REGEX = /(?<=__RequestVerificationToken"\s+type="hidden"\s+value=")([^"]+)/gi;

const fetchCSRFTokenAndInputValue = async () => {
    const response = await fetch(
        'https://login.intigriti.com/account/login?client_id=nodejs&scope=openid%20profile%20email%20role%20tac%20eh_platform%20user_api%20core_api%20company_api%20groups_api%20feature_api%20configuration_api%20communication_api&response_type=code&redirect_uri=https%3A%2F%2Fapp.intigriti.com%2Fauth%2Fsignin-oidc&state=c_ufthQPHx-EQWMQ_RAZ5GNsO4hNs2Dl3wWCQfjKVIQ&code_challenge=JD3deNrkO0V3bALHo7hs_xHC_jSNFL18s3RpMbWl2PI&code_challenge_method=S256',
    );

    const responseText = await response.text();
    const cookie = response.headers.get('set-cookie');

    if (cookie) {
        const csrfToken = cookie.split('; ')[0];

        const verificationToken = responseText.match(
            INPUT_VERIFICATION_TOKEN_REGEX,
        );

        if (verificationToken && verificationToken.length > 0) {
            return {
                csrfToken,
                verificationToken: verificationToken[0],
            };
        }
    }

    return null;
};

const fetchToken = async (webCookie: string): Promise<string> => {
    const response = await fetch('https://app.intigriti.com/auth/token', {
        headers: {
            cookie: `${webCookie};`,
        },
    });

    if (response.status !== 200) {
        throw new Error(
            `Something went wrong while fetching Intigriti token, status code: ${
                response.status
            }, response text: ${await response.text()}`,
        );
    }

    const token = await response.text();
    // remove first and last character
    return token.slice(1, token.length - 1);
};

const getAuthorizationHeader = async (email: string, password: string) => {
    const tokens = await fetchCSRFTokenAndInputValue();

    if (!tokens) {
        throw new Error(
            'Fetching CSRF token and verification token resulted in error',
        );
    }
    const { csrfToken, verificationToken } = tokens;

    const ssoCookie = await fetchSSOCookie(
        email,
        password,
        csrfToken,
        verificationToken,
    );

    const webCookieAndRedirectURL = await fetchWebCookieAndGetRedirectURL();

    if (!webCookieAndRedirectURL) {
        throw new Error('webCookieAndRedirectURL was not fetched properly');
    }

    const { webCookie, redirectURL } = webCookieAndRedirectURL;
    const authorizeURLWithCode = await getAuthorizeWithCode(
        redirectURL,
        csrfToken,
        ssoCookie,
    );

    if (!authorizeURLWithCode) {
        throw new Error('authorizeURLWithCode was not fetched properly');
    }
    const authorizedWebCookie = await authorizeAndGetAuthorizedWebCookie(
        authorizeURLWithCode,
        webCookie,
    );

    if (!authorizedWebCookie) {
        throw new Error('authorizedWebCookie was not fetched properly');
    }

    const token = await fetchToken(authorizedWebCookie);

    const headers = {
        authorization: `Bearer ${token}`,
    };

    return headers;
};

export { getAuthorizationHeader };

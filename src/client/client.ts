import fetch, { Response } from 'node-fetch';
import retry from 'async-retry';
import https from 'https';

export interface ClientAPIOptions {
    token: string;
    apiHost: string;
}

const getHeaders = async (options: ClientAPIOptions) => ({
    'client-token': options.token,
});

interface ClientOptions {
    method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
    path: string;
    body?: object;
}

const httpsAgent = new https.Agent({
    keepAlive: true,
});

const httpAgent = new https.Agent({
    keepAlive: true,
});

const clientWithRetry = async <T>(
    clientOptions: ClientAPIOptions,
    options: ClientOptions,
) => {
    const { method, path, body } = options;

    const url = `${clientOptions.apiHost}${path}`;

    let response: Response;
    if (method === 'GET') {
        response = await retry(
            async () => {
                const headers = await getHeaders(clientOptions);

                const resp = await fetch(url, {
                    method,
                    headers,
                    agent: url.startsWith('https') ? httpsAgent : httpAgent,
                });

                if (resp.status === 520) {
                    throw new Error('Server Error 520 - force retry');
                }

                return resp;
            },
            {
                retries: 5,
            },
        );
    } else {
        response = await retry(
            async () => {
                const headers = await getHeaders(clientOptions);

                const resp = await fetch(url, {
                    method,
                    headers: {
                        ...headers,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(body),
                });

                if (resp.status === 520) {
                    throw new Error('Server Error 520 - force retry');
                }

                return resp;
            },
            {
                retries: 5,
            },
        );
    }

    try {
        const data = await response.json();
        return {
            data: data as T,
            status: response.status,
        };
    } catch (error) {
        const data = await response.text();
        throw new Error(
            `Server responded with status: ${response.status} and data ${data}`,
        );
    }
};

export { getHeaders, clientWithRetry };

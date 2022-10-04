import {
    BackendAPIClient,
    InitializeBackendAPIClient,
} from '@boosted-bb/backend-api-client';

let backendAPIClient: BackendAPIClient;

const getBackendAPIClient = (): BackendAPIClient => {
    if (backendAPIClient === undefined) {
        backendAPIClient = InitializeBackendAPIClient({
            authentication: {
                jwtSecret: process.env.BACKEND_API_JWT_SECRET!,
            },
            apiHost: process.env.BACKEND_API_HOST!,
            clientName: `scanner_${process.env.ENV!}`,
        });
    }

    return backendAPIClient;
};

export { getBackendAPIClient };

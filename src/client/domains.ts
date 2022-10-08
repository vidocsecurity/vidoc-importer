import { ClientAPIOptions, clientWithRetry } from './client.js';

const ENDPOINT = '/api/projects/:projectId/directories/:directoryId/domains';

export type AddDomainParameters = {
    name: string;
    forceManualReview: boolean;
};

const addDomainToDirectory = async (
    clientOptions: ClientAPIOptions,
    projectId: string,
    directoryId: string,
    params: AddDomainParameters,
) => {
    const { data, status } = await clientWithRetry<{ message: string }>(
        clientOptions,
        {
            method: 'POST',
            path: ENDPOINT.replace(':projectId', projectId).replace(
                ':directoryId',
                directoryId,
            ),
            body: params,
        },
    );

    if (status === 403 || status === 401) {
        throw new Error('Forbidden');
    }

    if (status === 400 && !data.message.includes('domain already exists')) {
        throw new Error(data.message);
    }
};

export { addDomainToDirectory };

import { ClientAPIOptions, clientWithRetry } from './client.js';

const PROFILE_ENDPOINT = '/api/projects/:projectId/directories';

export type Directory = {
    id: string;
    name: string;
    tags: string[];
    description: string | null;
};

const fetchAllDirectories = async (
    clientOptions: ClientAPIOptions,
    projectId: string,
) => {
    const { data, status } = await clientWithRetry<{
        directories: Directory[];
    }>(clientOptions, {
        method: 'GET',
        path: PROFILE_ENDPOINT.replace(':projectId', projectId),
    });

    if (status === 403 || status === 401) {
        throw new Error('Forbidden');
    }

    return data.directories;
};

export type CreateDirectoryParameters = {
    name: string;
    bounty?: boolean;
    isPublic?: boolean;
    programURL?: string;
    tags?: string[];
    description?: string;
};

const createDirectory = async (
    clientOptions: ClientAPIOptions,
    projectId: string,
    params: CreateDirectoryParameters,
) => {
    const { data, status } = await clientWithRetry<{
        directory: Directory;
    }>(clientOptions, {
        method: 'POST',
        path: PROFILE_ENDPOINT.replace(':projectId', projectId),
        body: params,
    });

    if (status === 403 || status === 401) {
        throw new Error('Forbidden');
    }

    if (status === 400) {
        throw new Error(`Bad request: ${JSON.stringify(data)}`);
    }

    return data.directory;
};

export { fetchAllDirectories, createDirectory };

import { ClientAPIOptions, clientWithRetry } from './client.js';

const PROFILE_ENDPOINT = '/api/profile';

export type Project = {
    id: string;
    name: string;
};

export type User = {
    id: string;
    email: string;
};

export type Profile = {
    user: User | null;
    projects: Project[];
};

const fetchProfile = async (clientOptions: ClientAPIOptions) => {
    const { data, status } = await clientWithRetry<Profile>(clientOptions, {
        method: 'GET',
        path: PROFILE_ENDPOINT,
    });

    if (status === 403 || status === 401) {
        throw new Error('Forbidden');
    }

    return data;
};

export { fetchProfile };

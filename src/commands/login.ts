import chalk from 'chalk';
import Configstore from 'configstore';
import { ClientAPIOptions } from '../client/client.js';
import { fetchProfile } from '../client/profile.js';

export type LoginOptions = {
    token: string;
    apiClientOptions: ClientAPIOptions;
    config: Configstore;
};

const handleLogin = async ({
    token,
    config,
    apiClientOptions,
}: LoginOptions) => {
    if (!token || token.length === 0) {
        console.log(
            chalk.yellow(
                '[Error] You need to provide a token value with --token <token>',
            ),
        );
        return;
    }

    const response = await fetchProfile(apiClientOptions);

    if (response.user) {
        console.log(
            chalk.green(
                `[Success] You are logged in as ${response.user.email}!!`,
            ),
        );
        config.set('token', token);
        config.set('user', response.user.email);

        config.set('project-id', response.projects[0].id);
        config.set('project-name', response.projects[0].name);
    }
};

export { handleLogin };

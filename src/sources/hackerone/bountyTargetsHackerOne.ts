/* eslint-disable camelcase */

import fetch from 'node-fetch';
import { IHackerOneProgram, parseProgram } from './hackerOneProgramParser.js';

const fetchBountyTargetsHackerOneProgramList = async () => {
    const response = await fetch(
        'https://raw.githubusercontent.com/arkadiyt/bounty-targets-data/master/data/hackerone_data.json',
    );
    const programs: IHackerOneProgram[] = await response.json();

    const programsThatPay = programs.filter(
        ({ offers_bounties, submission_state }) =>
            offers_bounties && submission_state === 'open',
    );

    return programsThatPay.map((program) => parseProgram(program));
};

export { fetchBountyTargetsHackerOneProgramList };

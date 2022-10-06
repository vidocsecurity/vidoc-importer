import fetch from 'node-fetch';
import { IIntigritiProgram, parseProgram } from './intigritiProgramParser.js';

/* eslint-disable camelcase */
const fetchBountyTargetsIntigritiProgramList = async () => {
    const response = await fetch(
        'https://raw.githubusercontent.com/arkadiyt/bounty-targets-data/master/data/intigriti_data.json',
    );
    const programs: IIntigritiProgram[] = await response.json();

    const programsThatPay = programs.filter(
        ({ min_bounty, max_bounty }) => min_bounty > 0 || max_bounty > 0,
    );

    return programsThatPay.map((program) => parseProgram(program));
};

export { fetchBountyTargetsIntigritiProgramList };

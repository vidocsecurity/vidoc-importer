// import { fetchBountyTargetsBugcrowdProgramList } from './bountyTargetsBugcrowd.js';
// import { fetchBountyTargetsYESWEHACKProgramList } from './bountyTargetsYESWEHACK.js';
// import { fetchChaosProgramList } from './chaos.js';
// import { fetchDiscloseProgramList } from './disclose.js';
import { fetchPrivateProgramsFromHackerOneProgram } from './hackerone/privateProgramsHackerOne.js';
import { fetchBountyTargetsHackerOneProgramList } from './hackerone/bountyTargetsHackerOne.js';
// import { fetchPrivateProgramsFromIntigritiProgram } from './intigriti/privateProgramsIntigriti.js';
// import { fetchBountyTargetsIntigritiProgramList } from './intigriti/bountyTargetsIntigriti.js';
// import { fetchBountyTargetsHackenProofProgramList } from './bountyTargetsHackenProof.js';
// import { fetchBountyTargetsFederacyProgramList } from './bountyTargetsFederacy.js';

const fetchAllSources = async () => {
    await fetchBountyTargetsHackerOneProgramList();
    await fetchPrivateProgramsFromHackerOneProgram({
        sessionCookie: 'a',
    });

    // await fetchBountyTargetsYESWEHACKProgramList(client);
    // await fetchBountyTargetsIntigritiProgramList(client);
    // await fetchBountyTargetsBugcrowdProgramList(client);
    // await fetchChaosProgramList(client);
    // await fetchDiscloseProgramList(client);
    // await fetchBountyTargetsHackenProofProgramList(client);
    // await fetchBountyTargetsFederacyProgramList(client);
    // await fetchPrivateProgramsFromIntigritiProgram(client);
};

export { fetchAllSources };

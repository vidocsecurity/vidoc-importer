import {
    IApplication,
    IEndpoint,
    IDomain,
    IIPRange,
    IOrganization,
    IParameter,
    ISourceCodeRepository,
    ISubdomain,
} from '@boosted-bb/backend-interfaces';

interface IParsedProgram {
    organization: IOrganization;
    ipRanges: IIPRange[];
    subdomains: ISubdomain[];
    domains: IDomain[];
    endpoints: IEndpoint[];
    applications: IApplication[];
    sourceCodeRepositories: ISourceCodeRepository[];
    parameters: IParameter[];
}

const parseProgramsAndSaveThem = async <T>(
    programs: T[],
    parseProgram: (programs: T) => IParsedProgram,
) => {
    return programs.map((program) => parseProgram(program));
};

export { parseProgramsAndSaveThem, IParsedProgram };

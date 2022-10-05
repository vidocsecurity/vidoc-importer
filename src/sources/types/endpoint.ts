export interface IEndpoint {
    path: string; // its URL path f.e. /foo/coo/bla.jpg
    parameters: string[];
    source: string[];
    organizationId: string;
    subdomainId: string;
    root: string;
    createdAt?: Date;
}

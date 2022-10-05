export interface ISubdomain {
    subdomainId: string; // id is the name of the subdomain
    projectId?: string;
    root: string;
    organizationId: string;
    createdAt?: Date;
}

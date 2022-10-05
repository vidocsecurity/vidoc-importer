
export interface IParameter {
    parameter: string,
    organizationId: string,
    path: string, // its URL path f.e. /foo/coo/bla.jpg
    createdAt?: Date,
}
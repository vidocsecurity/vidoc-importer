
export enum SourceCodeRepositoryType {
    github = "github",
    gitlab = "gitlab",
    other = "other",
}

export enum SourceCodeRepositoryReviewStatus {
    approved = "approved",
    rejected = "rejected"
}

export interface ISourceCodeRepository {
    url: string,
    organizationId: string,
    type: SourceCodeRepositoryType,
    isOrganization?: boolean,
    reviewStatus?: SourceCodeRepositoryReviewStatus,
    description?: string,
    createdAt?: Date,
    updatedAt?: Date,
}

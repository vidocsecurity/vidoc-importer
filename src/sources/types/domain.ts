export enum DomainReviewStatus {
    approved = 'approved',
    rejected = 'rejected',
}

export interface IDomain {
    domainId: string; // id is the name of the domain
    organizationId: string;
    projectId?: string;
    isInScope?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
    description?: string;
    forceManualReview?: boolean; // if the domain is added from untrusty source - f.e. bug bounty program description
    reviewStatus?: DomainReviewStatus;
}

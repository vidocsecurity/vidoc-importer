export enum IPRangeType {
    ipv6 = 'ipv6',
    ipv4 = 'ipv4',
}

export enum IPRangeReviewStatus {
    approved = 'approved',
    rejected = 'rejected',
}

export interface IIPRange {
    ipRange: string; // its the ranges value - f.e. 10.0.0.0/24
    organizationId: string;
    projectId?: string;
    reviewStatus?: IPRangeReviewStatus;
    type: IPRangeType;
    createdAt?: Date;
    updatedAt?: Date;
}

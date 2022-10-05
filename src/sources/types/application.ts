
export enum ApplicationReviewStatus {
    approved = "approved",
    rejected = "rejected"
}

export enum ApplicationType {
    androidMobile = 'androidMobile',
    iosMobile = 'iosMobile',
    mobileUnknown = 'mobileUnknown',
    windowsAppStore = "windowsAppStore",
    executable = "executable",
    browserExtension = "browserExtension",
    other = "other"
}

export interface IApplication {
    url: string,
    name?: string,
    type: ApplicationType,
    organizationId: string,
    description?: string,
    reviewStatus?: ApplicationReviewStatus,
    createdAt?: Date,
    updatedAt?: Date,
}
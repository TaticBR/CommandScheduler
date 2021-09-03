export class CommandOpts {

    retryOnExceptions?: any[] = [Error];

    retryCount?: number = 1;

    retryDelaySeconds?: number = 1;

    onSuccess?: (jobName: any) => Promise<void> | void;

    onFailed?: (jobName: any, err) => Promise<void> | void;

    onError?: (jobName: any, err) => Promise<void> | void;
}

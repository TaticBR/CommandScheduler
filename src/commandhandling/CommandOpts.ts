export class CommandOpts {

    retryOnExceptions?: any[] = [Error];

    retryCount?: number = 1;

    retryDelaySeconds?: number = 1;

    onSuccess?: (jobName: any, jobArgs: any[]) => Promise<void> | void;

    onFailed?: (jobName: any, jobArgs: any[], err: any) => Promise<void> | void;

    onError?: (jobName: any, jobArgs: any[], err: any) => Promise<void> | void;
}

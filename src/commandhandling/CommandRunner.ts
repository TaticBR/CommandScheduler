import {Agenda} from 'agenda/es';
import {CommandOpts} from "./CommandOpts";
import {CommandRunnerOpts} from "./CommandRunnerOpts";
import {CommandBus} from "./CommandBus";
import {Logger} from "../log/Logger";

const mongoConnectionString = process.env.MONGO_URL || 'mongodb://127.0.0.1/agenda';

export class CommandRunner {
    private readonly agenda: Agenda;
    private static singleton: CommandRunner;
    private readonly commandBus: CommandBus;

    constructor() {
        this.agenda = new Agenda({
            db: {address: mongoConnectionString},
        });
        this.commandBus = CommandBus.getInstance();

        const graceful = async () => {
            await this.agenda.stop();
            process.exit(0);
        }
        process.on("SIGTERM", graceful);
        process.on("SIGINT", graceful);
    }

    async initAgenda() {
        await this.agenda.start();
        this.agenda.on('success', (job) => {
            const jobName = job.attrs.name;
            this.dispatchEvent(job, 'onSuccess');
        })
        this.agenda.on('fail', async (err, job) => {
            const jobName = job.attrs.name;
            const commandOpts: CommandRunnerOpts = job.attrs.data;
            if (commandOpts.retryCount > 0) {
                Logger.warn(`Job ${jobName} with args ${JSON.stringify(commandOpts.args)} failed with error ${JSON.stringify(err.message)}. Retrying in ${commandOpts.retryDelaySeconds} seconds. Attempts left ${commandOpts.retryCount}`)
                commandOpts.retryCount--;
                let scheduledJob = await job.schedule(`${commandOpts.retryDelaySeconds} seconds`);
                scheduledJob.save();
                this.dispatchEvent(job, 'onError', err);
            } else {
                this.dispatchEvent(job, 'onFailed', err);
            }
        })
        let jobs = await this.agenda.jobs({nextRunAt: {$exists: true}, 'data.retryCount': {$gt: 0}});
        for (const job of jobs) {
            let scheduledJob = await job.schedule(`${job.attrs.data.retryDelaySeconds} seconds`);
            scheduledJob.attrs.data.restarted = true;
            scheduledJob.save();
        }
    }

    public static getInstance(): CommandRunner {
        if (this.singleton == null) {
            this.singleton = new CommandRunner();
        }
        return this.singleton;
    }

    public static pushCommand(commandName: string, command: any) {
        this.getInstance().agenda.define(commandName, {lockLifetime: 60000}, async (job) => {
            return await command(...job.attrs.data.args);
        });
    }

    async exec(
        commandName: string,
        command: () => Promise<void>,
        thisArg: any,
        args: any[],
        opts?: CommandOpts,
    ) {
        const boundedCommand = command.bind(thisArg, ...args);
        try {
            const result = await boundedCommand();
            opts.onSuccess(commandName);
            return result;
        } catch (e) {
            const retryOnException = opts.retryOnExceptions?.find((retryOnException) => e instanceof retryOnException);
            if (retryOnException) {
                opts.onError(commandName, e);
                await this.agenda.define(commandName, boundedCommand);
                let job = await this.agenda.create(commandName, {...opts, thisArg, args});
                await job.save();
                this.mapSubscription(opts, job);
                job.schedule(`${opts.retryDelaySeconds} seconds`);
            } else {
                opts.onFailed(commandName, e);
                throw e;
            }
        }
    }

    dispatchEvent(job: any, eventType: string, err?: any) {
        if (!job.attrs.restarted) {
            this.commandBus.dispatch(`${eventType}${job.attrs._id}`, job.attrs.name, err);
        } else {
            this.commandBus.dispatch(`${eventType}${job.attrs.name}`, job.attrs.name, err);
        }
    }

    subscribeEvent(job: any, eventType: string, callback: (jobName: any, err?: any) => Promise<void> | void) {
        this.commandBus.subscribe(`${eventType}${job?.attrs?._id}`, callback);
    }

    private mapSubscription(opts: CommandOpts, job: any) {
        if (opts.onSuccess) {
            this.subscribeEvent(job, 'onSuccess', opts.onSuccess);
        }
        if (opts.onFailed) {
            this.subscribeEvent(job, 'onFailed', opts.onFailed);
        }
        if (opts.onError) {
            this.subscribeEvent(job, 'onError', opts.onError);
        }
    }
}

import { Agenda } from 'agenda';

import { Logger } from '../log/Logger';
import { CommandBus } from './CommandBus';
import { CommandOpts } from './CommandOpts';
import { CommandRunnerOpts } from './CommandRunnerOpts';

export class CommandRunner {
  private agenda: Agenda;
  private static singleton: CommandRunner;
  private preCommands = [];
  private readonly commandBus: CommandBus;
  private started = false;

  constructor() {
    this.commandBus = CommandBus.getInstance();

    const graceful = async () => {
      await this.agenda.stop();
      process.exit(0);
    };
    process.on('SIGTERM', graceful);
    process.on('SIGINT', graceful);
  }

  async start(mongoConnectionString: string, collectionName: string) {
    if (!this.started) {
      this.agenda = new Agenda({
        db: { address: mongoConnectionString, collection: collectionName },
      });
      await this.agenda.start();
      this.agenda.on('success', (job) => {
        this.dispatchEvent(job, 'onSuccess', job.attrs.data.args);
      });
      this.agenda.on('fail', async (err, job) => {
        const jobName = job.attrs.name;
        const commandOpts: CommandRunnerOpts = job.attrs.data;
        if (commandOpts.retryCount > 0) {
          Logger.warn(
            `Job ${jobName} with args ${JSON.stringify(
              commandOpts.args,
            )} failed with error ${JSON.stringify(err.message)}. Retrying in ${
              commandOpts.retryDelaySeconds
            } seconds. Attempts left ${commandOpts.retryCount}.`,
          );
          commandOpts.retryCount--;
          const scheduledJob = await job.schedule(
            `${commandOpts.retryDelaySeconds} seconds`,
          );
          scheduledJob.save();
          this.dispatchEvent(job, 'onError', job.attrs.data.args, err);
        } else {
          Logger.error(
            `Job ${jobName} with args ${JSON.stringify(
              commandOpts.args,
            )} failed with error ${JSON.stringify(
              err.message,
            )}. And there is no attempts left.`,
          );
          this.dispatchEvent(job, 'onFailed', job.attrs.data.args, err);
        }
      });
      for (const [commandName, command] of this.preCommands) {
        this.agenda.define(commandName, (job) =>
          command(...job.attrs.data.args),
        );
      }
      const jobs = await this.agenda.jobs({
        nextRunAt: { $exists: true },
        'data.retryCount': { $gt: 0 },
      });
      for (const job of jobs) {
        const scheduledJob = await job.schedule(
          `${job.attrs.data.retryDelaySeconds} seconds`,
        );
        scheduledJob.attrs.data.restarted = true;
        scheduledJob.run();
      }
      this.started = true;
    } else {
      Logger.log('CommandRunner already stated.');
    }
  }

  public static getInstance(): CommandRunner {
    if (this.singleton == null) {
      this.singleton = new CommandRunner();
    }
    return this.singleton;
  }

  public pushCommand(commandName: string, command: any) {
    if (this.started) {
      Logger.error(
        'pushCommand can only be called before CommandRunner has started.',
      );
    }
    this.preCommands.push([commandName, command]);
  }

  async exec(
    commandName: string,
    command: (...p: any) => Promise<void>,
    thisArg: any,
    args: any[],
    opts?: CommandOpts,
  ) {
    if (!this.agenda) {
      throw Error('Command runner was not started');
    }
    const boundedCommand = command.bind(thisArg, ...args);
    try {
      const result = await boundedCommand();
      opts.onSuccess?.(commandName, args);
      return result;
    } catch (e) {
      const retryOnException = opts.retryOnExceptions?.find(
        (retryOnException) => e instanceof retryOnException,
      );
      if (retryOnException) {
        let count = opts.retryCount || 1;
        while (count > 0) {
          try {
            const command = () => {
              if (opts.retryDelaySeconds) {
                return new Promise((res) =>
                  setTimeout(
                    () => res(boundedCommand()),
                    opts.retryDelaySeconds * 1000,
                  ),
                );
              }
              return new Promise((res) => res(boundedCommand()));
            };

            const result = await command();
            opts.onSuccess?.(commandName, args);
            return result;
          } catch (error) {
            count--;

            opts.onFailed?.(commandName, args, error);
            if (count === 0) throw error;
          }
        }
      } else {
        opts.onFailed?.(commandName, args, e);
        throw e;
      }
    }
  }

  async asyncExec(
    commandName: string,
    command: (...p: any) => Promise<void>,
    thisArg: any,
    args: any[],
    opts?: CommandOpts,
  ) {
    if (!this.agenda) {
      throw Error('Command runner was not started');
    }
    const boundedCommand = command.bind(thisArg, ...args);
    try {
      const result = await boundedCommand();
      opts.onSuccess?.(commandName, args);
      return result;
    } catch (e) {
      const retryOnException = opts.retryOnExceptions?.find(
        (retryOnException) => e instanceof retryOnException,
      );
      if (retryOnException) {
        opts.onError?.(commandName, args, e);
        await this.agenda.define(commandName, (job) =>
          command.bind(thisArg, ...job.attrs.data.args)(),
        );
        const job = await this.agenda.create(commandName, {
          ...opts,
          thisArg,
          args,
        });
        await job.save();
        this.mapSubscription(opts, job);
        job.schedule(`${opts.retryDelaySeconds} seconds`);
      } else {
        opts.onFailed?.(commandName, args, e);
        throw e;
      }
    }
  }

  dispatchEvent(job: any, eventType: string, args: any[], err?: any) {
    if (!job.attrs.restarted) {
      this.commandBus.dispatch(
        `${eventType}${job.attrs._id}`,
        job.attrs.name,
        args,
        err,
      );
    } else {
      this.commandBus.dispatch(
        `${eventType}${job.attrs.name}`,
        job.attrs.name,
        args,
        err,
      );
    }
  }

  subscribeEvent(
    job: any,
    eventType: string,
    callback: (jobName: any, args: any[], err?: any) => Promise<void> | void,
  ) {
    this.commandBus.subscribe(`${eventType}${job?.attrs?._id}`, callback);
  }

  public mapSubscription(opts: CommandOpts, job?: any) {
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

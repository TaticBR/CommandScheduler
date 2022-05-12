import { CommandBus } from './CommandBus';
import { CommandOpts } from './CommandOpts';
import { CommandRunner } from './CommandRunner';

const preInitCommands = (
  commandName: string,
  originalCommand: any,
  opts: CommandOpts,
) => {
  const commandRunner = CommandRunner.getInstance();
  commandRunner.pushCommand(commandName, originalCommand);
  const job = { attrs: { _id: commandName } };
  commandRunner.mapSubscription(opts, job);

  const commandBus = CommandBus.getInstance();
  commandBus.subscribe(commandName, async (thisArg: any, ...args: any[]) =>
    commandRunner.exec(commandName, originalCommand, thisArg, args, opts),
  );
};

export const Command =
  (commandName: string, opts: CommandOpts = new CommandOpts()) =>
  (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalCommand = descriptor.value;

    preInitCommands(commandName, originalCommand, opts);

    descriptor.value = new Proxy(originalCommand, {
      apply: async function (target, thisArg, args) {
        const commandRunner = CommandRunner.getInstance();

        return opts.async
          ? commandRunner.asyncExec(
              commandName,
              originalCommand,
              thisArg,
              args,
              opts,
            )
          : commandRunner.exec(
              commandName,
              originalCommand,
              thisArg,
              args,
              opts,
            );
      },
    });
  };

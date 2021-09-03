import {CommandOpts} from "./CommandOpts";
import {CommandRunner} from "./CommandRunner";
import {CommandBus} from "./CommandBus";

const manageCommandBus = (commandName: string, originalCommand, opts: CommandOpts) => {
    let commandBus = CommandBus.getInstance();
    commandBus.subscribe(commandName, async (args) => {
        const agenda = await CommandRunner.getInstance();
        return await agenda.exec(commandName, originalCommand, {}, args, opts);
    });
    commandBus.subscribe(`onSuccess${commandBus}`, opts.onSuccess);
    commandBus.subscribe(`onFailed${commandBus}`, opts.onFailed);
    commandBus.subscribe(`onError${commandBus}`, opts.onError);
}

export const Command = (commandName: string, opts: CommandOpts = new CommandOpts()) => (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalCommand = descriptor.value;

    CommandRunner.pushCommand(commandName, originalCommand);
    manageCommandBus(commandName, originalCommand, opts);

    descriptor.value = new Proxy(originalCommand, {
        apply: async function (target, thisArg, args) {
            const agenda = await CommandRunner.getInstance();

            return await agenda.exec(commandName, originalCommand, thisArg, args, opts);
        },
    });
};

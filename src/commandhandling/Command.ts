import {CommandOpts} from "./CommandOpts";
import {CommandRunner} from "./CommandRunner";
import {CommandBus} from "./CommandBus";

const manageCommandBus = (commandName: string, originalCommand: any, opts: CommandOpts) => {
    const commandBus = CommandBus.getInstance();
    const commandRunner = CommandRunner.getInstance();
    commandBus.subscribe(commandName, async (args) => {
        const agenda = await commandRunner;
        return await agenda.exec(commandName, originalCommand, {}, args, opts);
    });

    const job = {attrs: {_id: commandName}};
    commandRunner.mapSubscription(opts, job);
}

export const Command = (commandName: string, opts: CommandOpts = new CommandOpts()) => (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalCommand = descriptor.value;

    CommandRunner.pushCommand(commandName, originalCommand);
    manageCommandBus(commandName, originalCommand, opts);

    descriptor.value = new Proxy(originalCommand, {
        apply: async function (target, thisArg, args) {
            const commandRunner = CommandRunner.getInstance();

            return await commandRunner.exec(commandName, originalCommand, thisArg, args, opts);
        },
    });
};

import {Command} from "../../src/commandhandling/Command";
import {CommandRunner} from "../../src/commandhandling/CommandRunner";
import {CommandBus} from "../../src/commandhandling/CommandBus";
import {Logger} from "../../src/log/Logger";

class CommandTestSpec {

    logger = Logger;

    @Command('abc', {
        retryOnExceptions: [Error],
        retryCount: 1,
        retryDelaySeconds: 1,
        onSuccess: (name, args) => Logger.log(name + ' =) ' + JSON.stringify(args)),
        onFailed: (name, args, err) => Logger.log(name + ' =( ' + JSON.stringify(args) + ' error ' + JSON.stringify(err, Object.getOwnPropertyNames(err))),
        onError: (name, args, err) => Logger.log(name + ' =/ ' + JSON.stringify(args) + ' error ' + JSON.stringify(err, Object.getOwnPropertyNames(err)))
    })
    async main(x: any) {
        // return x;
        // this.logger.log(x);
        throw Error(JSON.stringify(x));
    }
}

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

describe('CommandTest', () => {
    beforeAll(async () => {
        let any = CommandRunner.getInstance();
        await any.start('mongodb://127.0.0.1/agenda', 'agenda');
    }, 20000);

    it('Command test', async () => {
        CommandBus.getInstance().dispatch('abc', new CommandTestSpec(), {
            hello: "EventError"
        })
        let resp = await new CommandTestSpec().main({
            hello: "CallError"
        });
        Logger.log(`Call response: ${resp}`);
        await sleep(15000);
    }, 40000);
});

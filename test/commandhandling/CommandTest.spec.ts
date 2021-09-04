import {Command} from "../../src/commandhandling/Command";
import {CommandRunner} from "../../src/commandhandling/CommandRunner";
import {CommandBus} from "../../src/commandhandling/CommandBus";
import {Logger} from "../../src/log/Logger";

class CommandTestSpec {

    @Command('abc', {
        retryOnExceptions: [Error],
        retryCount: 1,
        retryDelaySeconds: 1,
        onSuccess: () => Logger.log('=)'),
        onFailed: () => Logger.log('=('),
        onError: () => Logger.log('=/')
    })
    async main(x: any) {
        // return x;
        throw Error(JSON.stringify(x));
    }
}

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

describe('CommandTest', () => {
    beforeAll(async () => {
        let any = CommandRunner.getInstance();
        await any.start('mongodb://127.0.0.1/agenda');
    }, 20000);

    it('Command test', async () => {
        CommandBus.getInstance().dispatch('abc', {
            hello: "EventError"
        })
        let resp = await new CommandTestSpec().main({
            hello: "CallError"
        });
        Logger.log(`Call response: ${resp}`);
        await sleep(15000);
    }, 40000);
});

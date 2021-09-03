import {Command} from "../../src/commandhandling/Command";
import {CommandRunner} from "../../src/commandhandling/CommandRunner";
import {CommandOpts} from "../../src/commandhandling/CommandOpts";
import {CommandBus} from "../../src/commandhandling/CommandBus";

class CommandTestSpec {

    @Command('abc', {
        retryOnExceptions: [Error],
        retryCount: 10,
        retryDelaySeconds: 2,
        onSuccess: () => console.log('=)'),
        onFailed: () => console.log('=('),
        onError: () => console.log('=/')
    })
    async main(x: CommandOpts) {
        // throw Error("Hello error");
        return x;
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

describe('CommandTest', () => {
    beforeAll(async () => {
        let any = CommandRunner.getInstance();
        await any.initAgenda();
    }, 20000);

    it('Command test', async () => {
        // let s = await new CommandTestSpec().main({
        //     onError(jobName: any, err): Promise<void> | void {
        //         return undefined;
        //     }, onFailed(jobName: any, err): Promise<void> | void {
        //         return undefined;
        //     }, onSuccess(jobName: any): Promise<void> | void {
        //         return undefined;
        //     }, retryCount: 0, retryDelaySeconds: 0, retryOnExceptions: []
        // });

        CommandBus.getInstance().dispatch('abc', {
            retryCount: 10, retryDelaySeconds: 1, retryOnExceptions: []
        })
        // console.log('Main response: ', s);
        await sleep(15000);
    }, 40000);
});

import DateTimeFormatOptions = Intl.DateTimeFormatOptions;

export class Logger {
    /**
     * Write an 'error' level log.
     */
    static error(message: any, stack?: string): void {
        this.printMessages(`${message}${stack ? ('\n' + JSON.stringify(stack)) : ''}`, 'error');
    }

    /**
     * Write a 'log' level log.
     */
    static log(message: any): void {
        this.printMessages(message, 'log');
    }

    /**
     * Write a 'warn' level log.
     */
    static warn(message: any): void {
        this.printMessages(message, 'warn');
    }

    /**
     * Write a 'debug' level log, if the configured level allows for it.
     * Prints to `stdout` with newline.
     */
    static debug(message: any): void {
        this.printMessages(message, 'debug');
    }

    /**
     * Write a 'verbose' level log.
     */
    static verbose(message: any): void {
        this.printMessages(message, 'verbose');
    }

    private static colorIfAllowed = (colorFn) => (text) => !process.env.NO_COLOR ? colorFn(text) : text;

    private static getColorByLogLevel(level) {
        switch (level) {
            case 'debug':
                return this.colorIfAllowed((text) => `\x1B[95m${text}\x1B[39m`);
            case 'warn':
                return this.colorIfAllowed((text) => `\x1B[33m${text}\x1B[39m`);
            case 'error':
                return this.colorIfAllowed((text) => `\x1B[31m${text}\x1B[39m`);
            case 'verbose':
                return this.colorIfAllowed((text) => `\x1B[96m${text}\x1B[39m`);
            default:
                return this.colorIfAllowed((text) => `\x1B[32m${text}\x1B[39m`);
        }
    }

    private static getTimestamp() {
        const localeStringOptions: DateTimeFormatOptions = {
            year: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric',
            day: '2-digit',
            month: '2-digit',
        };
        return new Date(Date.now()).toLocaleString(undefined, localeStringOptions);
    }

    private static printMessages(message, logLevel = 'log') {
        const color = this.getColorByLogLevel(logLevel);
        const formattedLogLevel = `[${logLevel.toUpperCase()}]`.padStart(7, ' ');
        console.log(color(`[CmdS] ${process.pid}  - ${this.getTimestamp()} ${formattedLogLevel} ${message}`));

    }
}

import * as EventEmitter from 'events';

export class CommandBus extends EventEmitter {
  private static singleton: CommandBus;

  constructor() {
    super();
  }

  public static getInstance(): CommandBus {
    if (this.singleton == null) {
      this.singleton = new CommandBus();
    }
    return this.singleton;
  }

  dispatch(commandName: string, thisArg: any, ...args: any[]) {
    this.emit(commandName, thisArg, args);
  }

  subscribe(
    commandName: string,
    handler: (thisArg: any, ...args: any[]) => void,
  ) {
    this.on(commandName, handler);
  }
}

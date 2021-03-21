export type GlobalOptions = {
  disableCmdPrefix?: boolean;
};

class GlobalOptionsStore {
  store: any = {
    disableCmdPrefix: undefined,
  };

  set(key: any, value: any) {
    this.store[key] = value;
  }

  get(key: any): any {
    return this.store[key];
  }

  getAll(): GlobalOptions {
    return this.store;
  }

  setFromFlags(flags: any) {
    if (flags.prefix === false) {
      this.set("disableCmdPrefix", true);
    }
  }
}

export const globalOptions = new GlobalOptionsStore();

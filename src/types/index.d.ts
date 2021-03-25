declare module 'cmd-shim';
declare module 'read-cmd-shim';
declare module 'typeable-promisify';
declare module 'rimraf';
declare module 'cross-spawn';
declare module 'fixturez';

declare namespace BoltTypes {
  type DependencySet = {
    [key: string]: string;
  };

  type Scripts = {
    [script: string]: string;
  };

  type JSONValue =
    | null
    | string
    | boolean
    | number
    | Array<JSONValue>
    | { [key: string]: JSONValue };

  type SpawnOpts = {
    orderMode?: 'serial' | 'parallel' | 'parallel-nodes';
    bail?: boolean;
    excludeFromGraph?: Array<configDependencyType>;
  };

  type FilterOpts = {
    only?: string;
    ignore?: string;
    onlyFs?: string;
    ignoreFs?: string;
  };

  type Dependency = {
    name: string;
    version?: string;
  };

  type configDependencyType =
    | 'dependencies'
    | 'devDependencies'
    | 'peerDependencies'
    | 'optionalDependencies';

  type LockFileMode = 'default' | 'pure' | 'frozen';
}

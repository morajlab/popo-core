import includes from "array-includes";
import projectBinPath from "project-bin-path";
import { join, relative } from "path";
import Package from "../Package";
import Project from "../Project";
import { spawn } from "./processes";
import { readdirSafe } from "../utils/fs";
//import * as logger from '../utils/fs';
import { DEPENDENCY_TYPE_FLAGS_MAP, BOLT_VERSION } from "../constants";

const getLocalBinPath = (): Promise<string> =>
  projectBinPath(
    __dirname
  ); /*

function depTypeToFlag(depType: any) {
  let flag = Object.keys(DEPENDENCY_TYPE_FLAGS_MAP).find(
    key => (DEPENDENCY_TYPE_FLAGS_MAP as any)[key] === depType
  );

  return flag ? `--${flag}` : flag;
}
*/
const getEnvWithUserAgents = async () => {
  let yarnUserAgent = await userAgent();
  let boltUserAgent = `bolt/${BOLT_VERSION} ${yarnUserAgent}`;

  return {
    ...process.env,
    npm_config_user_agent: boltUserAgent,
    bolt_config_user_agent: boltUserAgent,
  };
};

const spawnWithUserAgent = async (
  cmd: string,
  args: string[],
  opts?: any //processes.SpawnOptions
) =>
  spawn(cmd, args, {
    ...opts,
    env: {
      ...(await getEnvWithUserAgents()),
      ...(opts && opts.env),
    },
  });

export const install = async (
  cwd: string,
  lockfileMode: BoltTypes.LockFileMode = "default"
) => {
  let localYarn = join(await getLocalBinPath(), "yarn");
  let installFlags = [];

  switch (lockfileMode) {
    case "frozen":
      installFlags.push("--frozen-lockfile");
      break;
    case "pure":
      installFlags.push("--pure-lockfile");
      break;
    default:
      break;
  }

  await spawnWithUserAgent(localYarn, ["install", ...installFlags], {
    cwd,
    tty: true,
    useBasename: true,
  });
}; /*

export async function add(
  pkg: Package,
  dependencies: Array<Dependency>,
  type?: configDependencyType
) {
  let localYarn = path.join(await getLocalBinPath(), 'yarn');
  let spawnArgs = ['add'];
  if (!dependencies.length) return;

  dependencies.forEach(dep => {
    if (dep.version) {
      spawnArgs.push(`${dep.name}@${dep.version}`);
    } else {
      spawnArgs.push(dep.name);
    }
  });

  if (type) {
    let flag = depTypeToFlag(type);
    if (flag) spawnArgs.push(flag);
  }

  await spawnWithUserAgent(localYarn, spawnArgs, {
    cwd: pkg.dir,
    pkg: pkg,
    tty: true,
    useBasename: true
  });
}

export async function upgrade(
  pkg: Package,
  dependencies: Array<Dependency> = [],
  flags: Array<string> = []
) {
  let localYarn = path.join(await getLocalBinPath(), 'yarn');
  let spawnArgs = ['upgrade'];

  if (dependencies.length) {
    dependencies.forEach(dep => {
      if (dep.version) {
        spawnArgs.push(`${dep.name}@${dep.version}`);
      } else {
        spawnArgs.push(dep.name);
      }
    });
  }

  await spawnWithUserAgent(localYarn, [...spawnArgs, ...flags], {
    cwd: pkg.dir,
    pkg: pkg,
    tty: true,
    useBasename: true
  });
}*/

export async function run(pkg: Package, script: string, args: string[] = []) {
  //let project = await Project.init(pkg.dir);
  await Project.init(pkg.dir);
  let localYarn = join(await getLocalBinPath(), "yarn");
  let localYarnRelative = relative(pkg.dir, localYarn);
  let spawnArgs = ["run", "-s", script];

  if (args.length) {
    spawnArgs = spawnArgs.concat(args);
  }

  await spawnWithUserAgent(localYarnRelative, spawnArgs, {
    cwd: pkg.dir,
    pkg: pkg,
    tty: true,
    useBasename: true,
  });
}

export const runIfExists = async (
  pkg: Package,
  script: string,
  args: string[] = []
) => {
  let scriptExists = await getScript(pkg, script);

  if (scriptExists) {
    await run(pkg, script, args);
  }
};

export const getScript = async (pkg: Package, script: string) => {
  let result = null;
  let scripts = pkg.config.getScripts();

  if (scripts && scripts[script]) {
    result = scripts[script];
  }

  if (!result) {
    let bins = await readdirSafe(pkg.nodeModulesBin);

    if (includes(bins, script)) {
      result = script;
    }
  }

  return result;
}; /*

export async function remove(dependencies: Array<string>, cwd: string) {
  let localYarn = path.join(await getLocalBinPath(), 'yarn');
  await spawnWithUserAgent(localYarn, ['remove', ...dependencies], {
    cwd,
    tty: true
  });
}

export async function cliCommand(
  cwd: string,
  command: string = '',
  spawnArgs: Array<string> = []
) {
  let localYarn = path.join(await getLocalBinPath(), 'yarn');

  return await spawnWithUserAgent(localYarn, [command, ...spawnArgs], {
    cwd,
    tty: true,
    useBasename: true
  });
}

export async function info(cwd: string, spawnArgs: Array<string> = []) {
  let localYarn = path.join(await getLocalBinPath(), 'yarn');
  await spawnWithUserAgent(localYarn, ['info', ...spawnArgs], {
    cwd,
    tty: true
  });
}
*/
export const userAgent = async () => {
  let localYarn = join(await getLocalBinPath(), "yarn");

  let { stdout: yarnUserAgent } = await spawn(
    localYarn,
    ["config", "get", "user-agent"],
    {
      tty: false,
      silent: true,
    }
  );

  return yarnUserAgent.replace(/\n/g, "");
}; /*

export async function globalCli(
  command: string = '',
  dependencies: Array<Dependency>
) {
  let spawnArgs = ['global', command];
  if (!dependencies.length) return;

  dependencies.forEach(dep => {
    if (dep.version) {
      spawnArgs.push(`${dep.name}@${dep.version}`);
    } else {
      spawnArgs.push(dep.name);
    }
  });

  await spawnWithUserAgent('yarn', spawnArgs, {
    tty: true
  });
}*/

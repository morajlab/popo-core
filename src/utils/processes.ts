import crossSpawn from 'cross-spawn';
import { stdout as loggerStdout, stderr as loggerStderr } from './logger';
/*import * as cleanUp from './cleanUp';
import Package from '../Package';
import type Project from '../Project';*/
import pLimit from 'p-limit';
import { cpus } from 'os';
import { basename } from 'path';
import { globalOptions } from '../lib/GlobalOptions';

const limit = pLimit(cpus().length);
const processes: any = new Set();
/*
export function handleSignals() {
  cleanUp.handleAllSignals(() => {
    for (let child of processes) {
      child.kill('SIGTERM');
    }
    processes.clear();
  });
}*/

export class ChildProcessError extends Error {
  code: number;
  stdout: string;
  stderr: string;

  constructor(code: number, stdout: string, stderr: string) {
    super(stderr);

    Error.captureStackTrace(this, this.constructor);

    this.code = code;
    this.stdout = stdout;
    this.stderr = stderr;
  }
} /*

export type SpawnOptions = {
  ...GlobalOptions,
  cwd?: string,
  pkg?: Package,
  silent?: boolean,
  tty?: boolean,
  useBasename?: boolean,
  env?: { [key: string]: ?string }
};*/

export const spawn = (
  cmd: string,
  args: string[],
  opts: any = {} //SpawnOptions = {}
): Promise<any> =>
  limit(
    () =>
      new Promise((resolve, reject) => {
        let stdoutBuf = Buffer.from('');
        let stderrBuf = Buffer.from('');
        let isTTY = process.stdout.isTTY && opts.tty;
        let cmdDisplayName = opts.useBasename ? basename(cmd) : cmd;
        let displayCmd =
          opts.disableCmdPrefix ?? globalOptions.get('disableCmdPrefix');
        let cmdStr = displayCmd ? '' : `${cmdDisplayName} ` + args.join(' ');

        let spawnOpts: any /*child_process$spawnOpts*/ = {
          cwd: opts.cwd,
          env: opts.env || process.env,
        };

        if (isTTY) {
          spawnOpts.shell = true;
          spawnOpts.stdio = 'inherit';
        }

        let child = crossSpawn(cmd, args, spawnOpts);

        processes.add(child);

        if (child.stdout) {
          child.stdout.on('data', (data: any) => {
            if (!opts.silent) {
              loggerStdout(cmdStr, data, opts.pkg);
            }

            stdoutBuf = Buffer.concat([stdoutBuf, data]);
          });
        }

        if (child.stderr) {
          child.stderr.on('data', (data: any) => {
            if (!opts.silent) {
              loggerStderr(cmdStr, data, opts.pkg);
            }

            stderrBuf = Buffer.concat([stderrBuf, data]);
          });
        }

        child.on('error', reject);

        child.on('close', (code: any) => {
          let stdout = stdoutBuf.toString();
          let stderr = stderrBuf.toString();

          processes.delete(child);

          if (code === 0) {
            resolve({ code, stdout, stderr });
          } else {
            reject(new ChildProcessError(code, stdout, stderr));
          }
        });
      })
  );

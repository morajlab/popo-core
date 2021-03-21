import fs from 'fs';
import path from 'path';
import _cmdShim from 'cmd-shim';
import _readCmdShim from 'read-cmd-shim';
import promisify from 'typeable-promisify';
import makeDir from 'make-dir';
import _rimraf from 'rimraf';

export function readFile(filePath: string): Promise<string> {
  return promisify((cb: any) => fs.readFile(filePath, cb));
}

export function writeFile(
  filePath: string,
  fileContents: string
): Promise<string> {
  return promisify((cb: any) => fs.writeFile(filePath, fileContents, cb));
}

export function mkdirp(filePath: string): Promise<void> {
  return makeDir(filePath);
}

export function rimraf(filePath: string): Promise<void> {
  return promisify((cb: any) => _rimraf(filePath, cb));
}

export function stat(filePath: string) {
  return promisify((cb: any) => fs.stat(filePath, cb));
}

export function lstat(filePath: string) {
  return promisify((cb: any) => fs.lstat(filePath, cb));
}

function unlink(filePath: string) {
  return promisify((cb: any) => fs.unlink(filePath, cb));
}

export function realpath(filePath: string) {
  return promisify((cb: any) => fs.realpath(filePath, cb));
}

function _symlink(src: string, dest: string, type: any) {
  return promisify((cb: any) => fs.symlink(src, dest, type, cb));
}

function stripExtension(filePath: string) {
  return path.join(
    path.dirname(filePath),
    path.basename(filePath, path.extname(filePath))
  );
}

async function cmdShim(src: string, dest: string) {
  // If not a symlink we default to the actual src file
  // https://github.com/npm/npm/blob/d081cc6c8d73f2aa698aab36605377c95e916224/lib/utils/gently-rm.js#L273
  let relativeShimTarget = await readlink(src);
  let currentShimTarget = relativeShimTarget
    ? path.resolve(path.dirname(src), relativeShimTarget)
    : src;
  await promisify((cb: any) => _cmdShim(currentShimTarget, stripExtension(dest), cb));
}

async function createSymbolicLink(src: any, dest: any, type: any) {
  try {
    await lstat(dest);
    await rimraf(dest);
  } catch (err) {
    if (err.code === 'EPERM') throw err;
  }
  await _symlink(src, dest, type);
}

async function createPosixSymlink(origin: any, dest: any, type: any) {
  if (type === 'exec') {
    type = 'file';
  }

  let src = path.relative(path.dirname(dest), origin);

  return await createSymbolicLink(src, dest, type);
}

async function createWindowsSymlink(src: any, dest: any, type: any) {
  if (type === 'exec') {
    return await cmdShim(src, dest);
  } else {
    return await createSymbolicLink(src, dest, type);
  }
}

export async function symlink(
  src: string,
  dest: string,
  type: 'exec' | 'junction'
) {
  if (dest.includes(path.sep)) {
    await mkdirp(path.dirname(dest));
  }

  if (process.platform === 'win32') {
    return await createWindowsSymlink(src, dest, type);
  } else {
    return await createPosixSymlink(src, dest, type);
  }
}

export async function readdir(dir: string) {
  return promisify((cb: any) => fs.readdir(dir, cb));
}

// Return an empty array if a directory doesnt exist (but still throw if errof if dir is a file)
export async function readdirSafe(dir: string) {
  return stat(dir)
    .catch((err: any) => Promise.resolve([]))
    .then((statsOrArray: any) => {
      if (statsOrArray instanceof Array) return statsOrArray;
      if (!statsOrArray.isDirectory())
        throw new Error(dir + ' is not a directory');
      return readdir(dir);
    });
}

function readCmdShim(filePath: string) {
  return promisify((cb: any) => _readCmdShim(filePath, cb));
}

function _readlink(filePath: string) {
  return promisify((cb: any) => fs.readlink(filePath, cb));
}

// Copied from:
// https://github.com/npm/npm/blob/d081cc6c8d73f2aa698aab36605377c95e916224/lib/utils/gently-rm.js#L280-L297
export async function readlink(filePath: string) {
  let stat = await lstat(filePath);
  let result = null;

  if (stat.isSymbolicLink()) {
    result = await _readlink(filePath);
  } else {
    try {
      result = await readCmdShim(filePath);
    } catch (err) {
      if (err.code !== 'ENOTASHIM' && err.code !== 'EISDIR') {
        throw err;
      }
    }
  }

  return result;
}

export async function dirExists(dir: string) {
  try {
    let _stat = await stat(dir);
    return _stat.isDirectory();
  } catch (err) {
    return false;
  }
}

export async function symlinkExists(filePath: string) {
  try {
    let stat = await lstat(filePath);
    return stat.isSymbolicLink();
  } catch (err) {
    return false;
  }
}

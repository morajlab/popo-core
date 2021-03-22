import multimatch from "multimatch";
import globby from "globby";

const matchGlobs = (paths: string[], patterns: string[]) =>
  multimatch(paths, patterns);

const findGlobs = (cwd: string, patterns: string[]) =>
  globby(patterns, { cwd });

export const matchWorkspaces = (paths: string[], patterns: string[]) =>
  matchGlobs(paths, patterns);

export const findWorkspaces = (cwd: string, patterns: string[]) =>
  findGlobs(
    cwd,
    patterns
  ); /*

export function matchOnlyAndIgnore(
  paths: Array<string>,
  only: string | void,
  ignore: string | void
) {
  let onlyPattern = only || '**';
  let ignorePattern = ignore ? `!${ignore}` : '';
  return matchGlobs(paths, [onlyPattern, ignorePattern]);
}*/

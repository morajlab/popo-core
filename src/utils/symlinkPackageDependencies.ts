import { join, basename, relative, sep } from 'path';
//import pathIsInside from 'path-is-inside';
import includes from 'array-includes';
import Project from '../lib/Project';
import Package from '../lib/Package';
import { BoltError } from './errors';
import { readdirSafe, readlink, symlinkExists, mkdirp, symlink } from './fs';
import { error as loggerError } from './logger';
//import * as messages from './messages';
import * as yarn from './yarn';

const symlinkPackageDependencies = async (
  project: Project,
  pkg: Package,
  dependencies: string[],
  dependencyGraph: any
) => {
  let pkgName = pkg.config.getName();
  let internalDeps = (dependencyGraph.get(pkgName) || {}).dependencies || [];
  let directoriesToCreate = [];
  let symlinksToCreate = [];
  let valid = true;

  directoriesToCreate.push(pkg.nodeModules, pkg.nodeModulesBin);

  for (let depName of dependencies) {
    let versionInProject = project.pkg.getDependencyVersionRange(depName);
    let versionInPkg = pkg.getDependencyVersionRange(depName);

    if (dependencyGraph.has(depName)) {
      continue;
    }

    if (!versionInProject) {
      valid = false;

      loggerError(
        'depMustBeAddedToProject'
        /*messages.depMustBeAddedToProject(pkg.config.getName(), depName)*/
      );

      continue;
    }

    if (!versionInPkg) {
      valid = false;

      loggerError(
        'couldntSymlinkDependencyNotExists'
        /*messages.couldntSymlinkDependencyNotExists(
          pkg.config.getName(),
          depName
        )*/
      );

      continue;
    }

    if (versionInProject !== versionInPkg) {
      valid = false;

      loggerError(
        'depMustMatchProject'
        /*messages.depMustMatchProject(
          pkg.config.getName(),
          depName,
          versionInProject,
          versionInPkg
        )*/
      );

      continue;
    }

    let src = join(project.pkg.nodeModules, depName);
    let dest = join(pkg.nodeModules, depName);

    symlinksToCreate.push({ src, dest, type: 'junction' });
  }

  for (let dependency of internalDeps) {
    let depWorkspace = dependencyGraph.get(dependency) || {};
    let src = depWorkspace.pkg.dir;
    let dest = join(pkg.nodeModules, dependency);

    symlinksToCreate.push({ src, dest, type: 'junction' });
  }

  if (!valid) {
    throw new BoltError('Cannot symlink invalid set of dependencies.');
  }

  let projectBinFiles = await readdirSafe(project.pkg.nodeModulesBin);

  for (let binFile of projectBinFiles) {
    let binPath = join(project.pkg.nodeModulesBin, binFile);
    let binName = basename(binPath);
    let actualBinFileRelative = await readlink(binPath);
    let actualBinFile = actualBinFileRelative
      ? join(project.pkg.nodeModulesBin, actualBinFileRelative)
      : binPath;
    let binFileRelativeToNodeModules = relative(
      project.pkg.nodeModules,
      actualBinFile
    );
    let pathParts = binFileRelativeToNodeModules.split(sep);
    let pkgName = pathParts[0];

    if (pkgName.startsWith('@')) {
      pkgName += `/${pathParts[1]}`;
    }

    let workspaceBinPath = join(pkg.nodeModulesBin, binName);

    symlinksToCreate.push({
      src: binPath,
      dest: workspaceBinPath,
      type: 'exec',
    });
  }

  for (let dependency of internalDeps) {
    let depWorkspace = dependencyGraph.get(dependency) || {};
    let depBinFiles =
      depWorkspace.pkg &&
      depWorkspace.pkg.config &&
      depWorkspace.pkg.config.getBin();

    if (!depBinFiles) {
      continue;
    }

    if (!includes(dependencies, dependency)) {
      continue;
    }

    if (typeof depBinFiles === 'string') {
      let binName = dependency.split('/').pop();
      let src = join(depWorkspace.pkg.dir, depBinFiles);
      let dest = join(pkg.nodeModulesBin, binName);
      let exists = await symlinkExists(dest);

      !exists && symlinksToCreate.push({ src, dest, type: 'exec' });

      continue;
    }

    for (let [binName, binPath] of Object.entries(depBinFiles)) {
      let src = join(depWorkspace.pkg.dir, String(binPath));
      let dest = join(pkg.nodeModulesBin, binName);

      if (!symlinksToCreate.find((symlink) => symlink.dest === dest)) {
        let exists = await symlinkExists(dest);

        !exists && symlinksToCreate.push({ src, dest, type: 'exec' });
      }
    }
  }

  await yarn.runIfExists(pkg, 'preinstall');

  await Promise.all(
    directoriesToCreate.map((dirName) => {
      return mkdirp(dirName);
    })
  );

  await Promise.all(
    symlinksToCreate.map(async ({ src, dest, type }) => {
      const _symlinkExists = await symlinkExists(dest);

      if (!_symlinkExists) {
        await symlink(src, dest, type as any);
      }
    })
  );

  await yarn.runIfExists(pkg, 'postinstall');
  await yarn.runIfExists(pkg, 'prepublish');
  await yarn.runIfExists(pkg, 'prepare');
};

export default symlinkPackageDependencies;

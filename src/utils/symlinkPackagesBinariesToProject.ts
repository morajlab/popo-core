import { join } from 'path';
import Project from '../lib/Project';
import { symlink } from './fs';

const symlinkPackagesBinaries = async (project: Project) => {
  let projectBinPath = project.pkg.nodeModulesBin;
  let packages = await project.getPackages();
  let symlinksToCreate = [];
  //let { graph: dependencyGraph } = await project.getDependencyGraph(packages);
  await project.getDependencyGraph(packages);

  for (let pkg of packages) {
    const pkgBins = await pkg.getBins();

    if (pkgBins.length === 0) {
      continue;
    }

    for (let pkgBin of pkgBins) {
      let binName: string = pkgBin.name.split('/').pop() as string;
      let src = pkgBin.filePath;
      let dest = join(projectBinPath, binName);

      symlinksToCreate.push({ src, dest, type: 'exec' });
    }
  }

  await Promise.all(
    symlinksToCreate.map(({ src, dest, type }) =>
      symlink(src, dest, type as any)
    )
  );
};

export default symlinkPackagesBinaries;

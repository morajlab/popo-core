import semver from "semver";
import Project from "../Project";
/*import Config from "../Config";
import Package from "../Package";
import * as messages from "./messages";
import { BoltError } from "./errors";*/
import { error as loggerError } from "./logger";
import { BOLT_VERSION } from "../constants";

const validateProject = async (project: Project) => {
  let packages = await project.getPackages();
  let projectDependencies = project.pkg.getAllDependencies();
  let projectConfig = project.pkg.config;
  //let { graph: depGraph } = await project.getDependencyGraph(packages);
  await project.getDependencyGraph(packages);

  let projectIsValid = true;
  let boltConfigVersion = projectConfig.getBoltConfigVersion();

  if (boltConfigVersion) {
    if (!semver.satisfies(BOLT_VERSION, boltConfigVersion)) {
      loggerError(
        "invalidBoltVersion"
        /*messages.invalidBoltVersion(BOLT_VERSION, boltConfigVersion)*/
      );

      projectIsValid = false;
    }
  }

  for (let pkg of packages) {
    try {
      pkg.getName();
    } catch (error) {
      loggerError(error.message);

      projectIsValid = false;
    }

    try {
      pkg.getVersion();
    } catch (err) {
      loggerError(err.message);

      projectIsValid = false;
    }
  }

  for (let pkg of packages) {
    let depName = pkg.getName();

    if (projectDependencies.has(depName)) {
      loggerError(
        "projectCannotDependOnWorkspace" /*messages.projectCannotDependOnWorkspace(depName)*/
      );

      projectIsValid = false;
    }
  }

  return projectIsValid;
};

export default validateProject;

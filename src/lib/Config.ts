import { EOL } from "os";
import pkgUp from "pkg-up";
import detectIndent from "detect-indent";
import detectNewline from "detect-newline";
import parseJson from "parse-json";
import { readFile } from "./utils/fs";
import { dirname, relative } from "path";
import { matchWorkspaces } from "./utils/globs";
import { error as loggerError } from "./utils/logger";
//import * as messages from "./utils/messages";
import { BoltError } from "./utils/errors";

const getPackageStack = async (cwd: string) => {
  let stack = [];
  let searching: any = cwd;

  while (searching) {
    let filePath: string = await Config.findConfigFile(searching);

    if (filePath) {
      let config = await Config.init(filePath);

      stack.unshift({ filePath, config });
      searching = dirname(dirname(filePath));
    } else {
      searching = null;
    }
  }

  return stack;
};

const toArrayOfStrings = (value: BoltTypes.JSONValue, message: string) => {
  if (!Array.isArray(value)) {
    throw new BoltError(message);
  }

  return value.map((item) => {
    if (typeof item !== "string") {
      throw new BoltError(message);
    } else {
      return item;
    }
  });
};

const toObject = (value: BoltTypes.JSONValue, message: string) => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new BoltError(message);
  } else {
    return value;
  }
};

const toObjectOfStrings = (value: BoltTypes.JSONValue, message: string) => {
  let safeRef = toObject(value, message);
  let safeCopy: any = {};

  Object.keys(safeRef).forEach((k) => {
    if (typeof safeRef[k] !== "string") {
      throw new BoltError(message);
    } else {
      safeCopy[k] = safeRef[k];
    }
  });

  return safeCopy;
};

export default class Config {
  filePath: string;
  fileContents: string;
  json: BoltTypes.JSONValue;
  indent: string;
  newline: string;
  invalid: any = undefined;

  constructor(filePath: string, fileContents: string) {
    this.filePath = filePath;
    this.fileContents = fileContents;

    try {
      this.indent = detectIndent(fileContents).indent || "  ";
      this.newline = detectNewline(fileContents) || EOL;
      this.json = parseJson(fileContents);
    } catch (error) {
      if (error.name === "JSONError") {
        loggerError(
          "errorParsingJSON" /*messages.errorParsingJSON(filePath)*/,
          {
            emoji: "💥",
            prefix: false,
          }
        );
      }

      throw error;
    }
  }

  static findConfigFile = async (filePath: string): Promise<string> => {
    return await pkgUp(filePath);
  };

  static init = async (filePath: string): Promise<Config> => {
    let fileContents;

    try {
      fileContents = await readFile(filePath);
    } catch (error) {
      if (error.code === "ENOENT") {
        throw new BoltError(
          "cannotInitConfigMissingPkgJSON" /*messages.cannotInitConfigMissingPkgJSON(filePath)*/
        );
      }

      throw error;
    }

    return new Config(filePath, fileContents.toString());
  }; /*

  async write(json: BoltTypes.JSONValue) {
    let fileContents =
      JSON.stringify(json, null, this.indent).replace(/\n/g, this.newline) +
      this.newline;
    await fs.writeFile(this.filePath, fileContents);
    this.fileContents = fileContents;
    this.json = json;
  }*/

  static getProjectConfig = async (cwd: string) => {
    let stack = await getPackageStack(cwd);

    if (stack.length === 0) return null;

    let highest: any = stack.pop();
    let matches = [highest];

    while (stack.length) {
      let current: any = stack.pop();
      let patterns = current.config.getWorkspaces();

      if (patterns) {
        let filePaths = matches.map((match: any) =>
          relative(dirname(current.filePath), dirname(match.filePath))
        );

        let found = matchWorkspaces(filePaths, patterns);

        if (found.length) {
          matches.push(current);
          highest = current;
        }
      }
    }

    return highest.filePath;
  };

  getConfig = (): { [key: string]: BoltTypes.JSONValue } => {
    if (this.invalid) {
      throw new BoltError(
        `You need to refresh the Config object for ${this.filePath}`
      );
    }

    let config = this.json;

    if (
      typeof config !== "object" ||
      config === null ||
      Array.isArray(config)
    ) {
      throw new BoltError(
        `package.json must be an object. See: "${this.filePath}"`
      );
    }

    return config;
  }; /*

  invalidate() {
    this.invalid = true;
  }

  getDescriptor(): string {
    if (this.json && typeof (this.json as any).name === "string") {
      return (this.json as any).name;
    }

    return this.filePath;
  }
*/
  getName = (): string => {
    let config = this.getConfig();
    let name = config.name;

    if (typeof name !== "string") {
      throw new BoltError(
        `package.json#name must be a string. See "${this.filePath}"`
      );
    }
    return name;
  };

  getVersion = (): string => {
    let config = this.getConfig();
    let version = config.version;

    if (typeof version !== "string") {
      throw new BoltError(
        `package.json#version must be a string. See "${this.filePath}"`
      );
    }

    return version;
  }; /*

  getPrivate(): boolean | void {
    let config = this.getConfig();
    let priv = config.private;

    if (typeof priv !== "undefined" && typeof priv !== "boolean") {
      throw new BoltError(
        `package.json#private must be a boolean. See "${this.filePath}"`
      );
    }

    return priv;
  }
*/
  getBoltConfig = (): { [key: string]: BoltTypes.JSONValue } | void => {
    let config = this.getConfig();
    let boltConfig = config.bolt;

    if (typeof boltConfig === "undefined") return;

    return toObject(
      boltConfig,
      `package.json#bolt must be an object. See "${this.filePath}"`
    );
  };

  getBoltConfigVersion = (): string | void => {
    let config = this.getBoltConfig();
    let boltVersion = config && config.version;

    if (typeof boltVersion === "string") {
      return boltVersion;
    }

    return;
  };

  getWorkspaces = (): string[] | void => {
    let boltConfig = this.getBoltConfig();

    if (typeof boltConfig === "undefined") return;

    let workspaces = boltConfig.workspaces;

    if (typeof workspaces === "undefined") return;

    return toArrayOfStrings(
      workspaces,
      `package.json#bolt.workspaces must be an array of globs. See "${this.filePath}"`
    );
  };

  getDeps = (depType: string): BoltTypes.DependencySet | void => {
    let config = this.getConfig();
    let deps = config[depType];

    if (typeof deps === "undefined") return;

    return toObjectOfStrings(
      deps,
      `package.json#${depType} must be an object of strings. See "${this.filePath}"`
    );
  };

  getScripts = () => {
    let config = this.getConfig();
    let scripts = config.scripts;

    if (typeof scripts === "undefined") return;

    return toObjectOfStrings(
      scripts,
      `package.json#scripts must be an object of strings. See "${this.filePath}"`
    );
  };

  getBin = () => {
    let config = this.getConfig();
    let bin = config.bin;

    if (typeof bin === "undefined") return;
    if (typeof bin === "string") return bin;

    return toObjectOfStrings(
      bin,
      `package.json#bin must be an object of strings or a string. See "${this.filePath}"`
    );
  };
}

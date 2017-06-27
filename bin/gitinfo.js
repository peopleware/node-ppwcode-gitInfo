#!/usr/bin/env node

/**
 *    Copyright 2017 PeopleWare n.v.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const program = require("commander");
const GitInfo = require("../GitInfo");
const tagGitRepo = require("../tagGitRepo");
const packageVersion = require("pkginfo")(module, "version");

//noinspection JSCheckFunctionSignatures
program
  .version(packageVersion);

program
  .command("git-highest-working-copy-dir [path]")
  .alias("ghwc")
  .description("Show the path of the top directory of the highest git working copy [path] is in. This is the top most "
               + "ancestor directory that contains a .git folder. cwd is the default for [path].")
  .action(function(path) {
    GitInfo.highestGitDirPath(path || process.cwd())
      .done((gitPath) => console.log(gitPath));
  });

program
  .command("git-info [path]")
  .alias("gi")
  .description("Information about the highest git working copy and repository above [path], as JSON. "
               + "cwd is the default for [path].")
  .action(function(path) {
    GitInfo
      .createForHighestGitDir(path || process.cwd())
      .done(
        (gitInfo) => console.log("%j", gitInfo),
        (err) => {
          if (err.message === GitInfo.noGitDirectoryMsg) {
            console.error("No git directory found above " + path);
            process.exitCode = 1;
            return false;
          }
          throw err;
        }
      );
  });

program
  .command("tag [tagName] [path]")
  .alias("t")
  .description("Tag the highest git working copy and repository above [path] with [tagName]. "
               + "cwd is the default for [path]. The tag is not pushed!")
  .action(function(tagName, path) {
    if (!tagName || tagName === "") {
      console.error("tagName is mandatory");
      process.exitCode = 1;
      return false;
    }
    const gitBasePath = path || process.cwd();
    GitInfo
      .highestGitDirPath(gitBasePath)
      .then(gitPath => tagGitRepo(gitPath, tagName))
      .done(
        () => {
          console.log("%j", {tag: tagName});
        },
        err => {
          if (err.message === tagGitRepo.couldNotCreateTagMsg) {
            console.error("Could not create the tag on the git repository. Does it already exist?");
            process.exitCode = 1;
            return false;
          }
          throw err;
        }
      );
  });

program
  .command("branch-as-environment [path]")
  .alias("b")
  .description("Return the branch currently checked-out in the highest git working copy above [path], formatted "
               + "so that it can be used as an environment name, i.e. /\//-/g, and url-escaped. "
               + "cwd is the default for [path].")
  .action(function(path) {
    const gitBasePath = path || process.cwd();
    GitInfo
      .createForHighestGitDir(gitBasePath)
      .done(
        (gitInfo) => console.log(gitInfo.environment),
        (err) => {
          if (err.message === GitInfo.noGitDirectoryMsg) {
            console.error("No git directory found above " + path);
            process.exitCode = 1;
            return false;
          }
          throw err;
        }
      );
  });

program.parse(process.argv);

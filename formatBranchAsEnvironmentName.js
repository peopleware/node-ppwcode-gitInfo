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

const Contract = require("@toryt/contracts-ii");
const querystring = require("querystring");

const masterBranchName = "master";
const defaultEnvironmentName = "default";

/**
 * Transforms a git branch name into a string that can be used as a Terraform environment name.
 * Falsy inputs return {@code undefined}. When the branch name is &quot;master&quot;, &quot;default&quot; is returned.
 * &quot;default&quot; cannot be used as branch name.
 *
 * @param {string} branch - string representing a git branch name, possibly compound (using &quot;/&quot;,
 *                          possibly falsy
 */
const formatBranchAsEnvironmentName = new Contract({
  pre: [
    branch => !branch || typeof branch === "string",
    branch => branch !== formatBranchAsEnvironmentName.defaultEnvironmentName
  ],
  post: [
    (branch, result) => !branch
                        || branch === formatBranchAsEnvironmentName.masterBranchName
                        || querystring.unescape(result) === branch.replace(/\//g, "-"),
    (branch, result) => branch !== formatBranchAsEnvironmentName.masterBranchName
                        || result === formatBranchAsEnvironmentName.defaultEnvironmentName,
    (branch, result) => !!branch || result === undefined
  ],
  exception: [() => false]
}).implementation(function(branch) {
  return !branch
    ? undefined
    : (branch === masterBranchName
        ? defaultEnvironmentName
        : querystring.escape(branch.split("/").join("-")));
});

formatBranchAsEnvironmentName.masterBranchName = masterBranchName;
formatBranchAsEnvironmentName.defaultEnvironmentName = defaultEnvironmentName;

module.exports = formatBranchAsEnvironmentName;


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

const formatBranchAsEnvironmentName = new Contract({
  pre: [
    branch => !branch || typeof branch === "string"
  ],
  post: [
    (branch, result) => !branch || querystring.unescape(result) === branch.replace(/\//g, "-"),
    (branch, result) => !!branch || result === undefined
  ],
  exception: [() => false]
}).implementation(function(branch) {
  return !branch ? undefined : querystring.escape(branch.split("/").join("-"));
});

module.exports = formatBranchAsEnvironmentName;

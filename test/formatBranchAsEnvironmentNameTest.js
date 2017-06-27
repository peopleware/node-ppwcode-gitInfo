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

const formatBranchAsEnvironmentName = require("../formatBranchAsEnvironmentName");

//noinspection SpellCheckingInspection
const someBranchNames = [
  null,
  undefined,
  0,
  false,
  "",
  "master",
  "production",
  "staging/1",
  "personal/jack/experiment/subject-0",
  "test/the/vëry/long/𝕭ranch/ℕame/⩠",
  "staging 1/some very∆∆ weird name-That does'nt_probably \\%2f  _ _ __-- exists"
];

describe("formatBranchAsEnvironmentName", function() {
  someBranchNames.forEach(branchName => {
    it("behaves as expected for branch name \"" + branchName + "\"", function() {
      console.log(formatBranchAsEnvironmentName(branchName));
    });
  });
});

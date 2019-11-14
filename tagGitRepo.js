/**
 *    Copyright 2017 - 2018 PeopleWare n.v.
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

const PromiseContract = require('@toryt/contracts-iv/lib/IV/PromiseContract')
const Git = require('nodegit')
const GitInfo = require('./GitInfo')
const util = require('./_util')

/**
 * Tag the git repository at {@code path} with {@code tagName}, and return a Promise
 * that resolves when done. The tag is not pushed!
 * The resolution value is not specified.
 *
 * @param {string} tag - the tag to be used
 * @param {string} path - path to the git repository to tag;
 *                        should be a path to a directory that contains a {@code .git/} folder
 */
const tagGitRepo = new PromiseContract({
  pre: [
    (path) => typeof path === 'string',
    (path) => !!path,
    (path, tagName) => typeof tagName === 'string',
    (path, tagName) => !!tagName
  ],
  post: [], // void
  fastException: PromiseContract.mustNotHappen,
  exception: [
    util.exceptionIsAnErrorCondition,
    (path, tagName, exc) => exc.message === GitInfo.noGitDirectoryMsg || exc.message === tagGitRepo.couldNotCreateTagMsg
  ]
}).implementation(async function tagGit (path, tagName) {
  const message = 'tag with ' + tagName
  let repository
  try {
    repository = await Git.Repository.open(path)
  } catch (ignore) {
    throw new Error(GitInfo.noGitDirectoryMsg)
  }
  try {
    const [head, signature] = await Promise.all([repository.getHeadCommit(), Git.Signature.default(repository)])
    await Git.Tag.create(repository, tagName, head, signature, message, 0)
  } catch (ignore) {
    throw new Error(tagGitRepo.couldNotCreateTagMsg)
  }
})

tagGitRepo.couldNotCreateTagMsg = 'COULD NOT CREATE TAG'

module.exports = tagGitRepo

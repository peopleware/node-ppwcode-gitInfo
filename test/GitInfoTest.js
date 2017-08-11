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

/* global describe, it */

const GitInfo = require('../GitInfo')
const util = require('./_util')
const path = require('path')
const fs = require('fs')
const Q = require('../q2')
const ConditionError = require('@toryt/contracts-ii/src/II/ConditionError')
const Git = require('nodegit')

const thisGitRepoRoot = path.dirname(path.dirname(__dirname))
// noinspection SpellCheckingInspection
const someBranchNames = [
  'master',
  'nested/branch/name',
  'dev',
  'development',
  'personal/jack/experiment/subject-0',
  'validate/the/vëry/long/𝕭ranch/ℕame/⩠',
  "validate 1/some very∆∆ weird name-That does'nt_probably \\%2f  _ _ __-- exists"
]
const preciousBranchNames = [
  false,
  0,
  '',
  null,
  undefined,
  'production',
  'test',
  'staging/4',
  'stage/4',
  'staging-pre-release'
]
// noinspection SpellCheckingInspection
const aSha = 'b557eb5aabebf72f84ae9750be2ad1b7b6b43a4b'
// noinspection SpellCheckingInspection
const someShas = [aSha, '3268d7bc82d16d840f71ddfb5c8f5e42dea16f3b', null, undefined, '', 0, false]
const someOriginUrls = [0, false, '', null, undefined, 'git@GitHub:peopleware/terraform-ppwcode-modules.git']
const someChanges = [
  new Set(),
  new Set(['a/path/to/a/file']),
  new Set(['a/path/to/a/file', 'a/path/to/another/file', 'a/path/to/yet/another/file'])
]
const somePaths = [
  '/',
  __dirname,
  __filename,
  process.cwd(),
  require.main.filename,
  path.dirname(require.main.filename),
  thisGitRepoRoot,
  path.dirname(thisGitRepoRoot),
  'this is not a path'
]

describe('GitInfo', function () {
  describe('constructor', function () {
    const path = thisGitRepoRoot
    someBranchNames
      .map(name => { return {name: name, precious: false} })
      .concat(preciousBranchNames.map(name => { return {name: name, precious: true} }))
      .forEach(branch => {
        const sha = aSha
        someOriginUrls.forEach(originUrl => {
          someChanges.forEach(changes => {
            someShas.forEach(originBranchSha => {
              it('should return a GitInfo with the expected properties for ' +
                'path === "' + path + '", ' +
                'sha === "' + sha + '", ' +
                'branch === "' + branch.name + '", ' +
                'originUrl === "' + originUrl + '", ' +
                'changes: ' + changes.size + '", ' +
                'originBranchSha: ' + originBranchSha,
                function () {
                  util.validateConditions(
                    GitInfo.constructorContract.pre,
                    [path, sha, branch.name, originUrl, changes, originBranchSha]
                  )
                  const result = new GitInfo(path, sha, branch.name, originUrl, changes, originBranchSha)
                  console.log('branch %s precious? %s', result.branch, result.isPrecious)
                  if (result.isPrecious !== branch.precious) {
                    throw new Error('Expected precious to be ' + branch.precious + ' for ' + branch.name + ", but wasn't")
                  }
                  util.validateConditions(
                    GitInfo.constructorContract.post,
                    [path, sha, branch.name, originUrl, changes, originBranchSha, result]
                  )
                  util.validateInvariants(result)
                  console.log('%j', result)
                })
            })
          })
        })
      })
  })

  function shouldNotExist (dirName) {
    throw Error('"' + dirName + '" is a git directory, and should not be')
  }

  describe('highestGitDirPath', function () {
    somePaths.forEach(function (dirPath) {
      it('should return a promise for "' + dirPath + '"', function () {
        const result = GitInfo.highestGitDirPath(dirPath)
        return result.then(highestPath => {
          console.log('highest git dir path for "%s": "%s"', dirPath, highestPath)

          if (!highestPath) {
            return true
          }

          const testPromises = [
            Q.nfcall(fs.access, path.format({dir: highestPath, name: '.git'}), 'rw')
          ]
          let intermediate = dirPath
          while (intermediate.startsWith(highestPath) && intermediate !== highestPath) {
            const p = path.format({dir: intermediate, name: '.git'})
            testPromises.push(
              Q.nfcall(fs.access, p, 'rw')
                .then(
                  shouldNotExist.bind(undefined, p),
                  () => true // errors are good, and what we expect
                )
            )
            intermediate = path.dirname(intermediate)
          }
          return Q.all(testPromises)
        })
      })
    })
  })

  describe('isNotClean', function () {
    it('should behave for all files in this repo', function () {
      // noinspection JSUnresolvedVariable,JSCheckFunctionSignatures
      return Q.all(
        Git
          .Repository
          .open(path.dirname(path.dirname(path.resolve(__filename))))
          .then(repository => repository.getStatus())
          .then(statuses => statuses.map(status => GitInfo.isNotClean(status)))
      )
    })
  })

  describe('create', function () {
    somePaths.forEach(function (dirPath) {
      it('should return a promise for "' + dirPath + '"', function () {
        const result = GitInfo.create(dirPath)
        return result.then(
          gitInfo => {
            util.validateInvariants(gitInfo)
            console.log('create success for %s: %s', dirPath, JSON.stringify(gitInfo))
            return true
          },
          err => {
            if (err instanceof ConditionError || err instanceof ReferenceError) {
              throw err
            }
            console.log('create failed for %s: %s', dirPath, err)
            return true
          }
        )
      })
    })
  })

  describe('createForHighestGitDir', function () {
    somePaths.forEach(function (dirPath) {
      it('should return a promise for "' + dirPath + '"', function () {
        return Q.all([
          GitInfo.createForHighestGitDir(dirPath).then(
            gitInfo => {
              util.validateInvariants(gitInfo)
              console.log('create success for %s: %s', dirPath, JSON.stringify(gitInfo))
              return gitInfo
            },
            err => {
              if (err instanceof ConditionError || err instanceof ReferenceError) {
                throw err
              }
              console.log('create failed for %s: %s', dirPath, err)
              return false
            }
          ),
          GitInfo.highestGitDirPath(dirPath)
        ])
        .spread((gitInfo, gitDirPath) => {
          if (gitInfo && gitInfo.path !== gitDirPath) {
            throw new Error('path is not what was expected')
          }
          return gitInfo
        })
      })
    })
  })
})

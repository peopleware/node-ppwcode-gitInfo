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

/* global describe, it, before, after */

const Git = require('nodegit')
const util = require('./_util')
const path = require('path')
const fs = require('fs')
const Q = require('q')
const ConditionError = require('@toryt/contracts-iv/lib/IV/ConditionError')
const proxyquire = require('proxyquire')
const GitInfo = proxyquire('../GitInfo', { nodegit: Git })
const assert = require('assert')
const sinon = require('sinon')

const thisGitRepoRoot = path.dirname(__dirname)
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
      .map(name => { return { name: name, precious: false } })
      .concat(preciousBranchNames.map(name => { return { name: name, precious: true } }))
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
    before(function () {
      GitInfo.highestGitDirPath.contract.verifyPostconditions = true
    })

    after(function () {
      GitInfo.highestGitDirPath.contract.verifyPostconditions = true
    })

    somePaths.forEach(function (dirPath) {
      it('should return a promise for "' + dirPath + '"', function () {
        GitInfo.highestGitDirPath.contract.verifyPostconditions = true
        const result = GitInfo.highestGitDirPath(dirPath)
        GitInfo.highestGitDirPath.contract.verifyPostconditions = false
        return result.then(highestPath => {
          console.log('highest git dir path for "%s": "%s"', dirPath, highestPath)

          if (!highestPath) {
            return true
          }

          const testPromises = [
            Q.nfcall(fs.access, path.format({ dir: highestPath, name: '.git' }), 'rw')
          ]
          let intermediate = dirPath
          while (intermediate.startsWith(highestPath) && intermediate !== highestPath) {
            const p = path.format({ dir: intermediate, name: '.git' })
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
    before(function () {
      GitInfo.isNotClean.contract.verifyPostconditions = true
    })

    after(function () {
      GitInfo.isNotClean.contract.verifyPostconditions = true
    })

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

    function ok () { return true }

    function nok () { return false }

    const statusMethods = ['isNew', 'isModified', 'isTypechange', 'isRenamed', 'isDeleted']

    function okMock () {
      const mock = {
        isIgnored: nok
      }
      statusMethods.forEach(statusMethod => {
        mock[statusMethod] = nok
      })
      return mock
    }

    it('should return false when not ignored and clean', function () {
      const mockStatus = okMock()
      const result = GitInfo.isNotClean(mockStatus)
      assert.ok(!result)
    })

    describe('should behave when ignored', function () {
      statusMethods.concat([undefined]).forEach(statusMethod => {
        it(`should return false when ignored, and status method ${statusMethod} is nok`, function () {
          const mockStatus = okMock()
          mockStatus.isIgnored = ok
          if (statusMethod) {
            mockStatus[statusMethod] = nok
          }
          const result = GitInfo.isNotClean(mockStatus)
          assert.ok(!result)
        })
      })
    })

    describe('should behave when not ignored and dirty', function () {
      statusMethods.forEach(statusMethod => {
        it(`should return true when not ignored and dirty because of ${statusMethod}`, function () {
          const mockStatus = okMock()
          mockStatus[statusMethod] = ok
          const result = GitInfo.isNotClean(mockStatus)
          assert.ok(result)
        })
      })
    })
  })

  describe('create', function () {
    before(function () {
      GitInfo.create.contract.verifyPostconditions = true
    })

    after(function () {
      GitInfo.create.contract.verifyPostconditions = true
    })

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

    it('returns an undefined sha if the branch does not exist in the remote', function () {
      const stubError = new Error(GitInfo.branchDoesNotExistOnRemoteMessageFraction)
      const stub = sinon.stub(Git.Repository.prototype, 'getBranchCommit')
      stub.rejects(stubError)
      return GitInfo.create(thisGitRepoRoot)
        .then(
          result => {
            stub.restore()
            console.log(result)
            assert.strictEqual(result.originBranchSha, undefined)
          },
          err => {
            stub.restore()
            throw err
          }
        )
    })

    function failToGet (method, stubby) {
      const stubError = new Error('Stub error')
      const stub = sinon.stub(Git.Repository.prototype, method)
      stub[stubby](stubError)
      return GitInfo.create(thisGitRepoRoot)
        .then(
          () => {
            stub.restore()
            assert.fail('should not have resolved')
          },
          exc => {
            stub.restore()
            assert.strictEqual(exc, stubError)
          }
        )
    }

    it('fails with an error when getBranchCommit fails, fast', function () {
      return failToGet('getBranchCommit', 'throws')
    })
    it('fails with an error when getBranchCommit rejects', function () {
      return failToGet('getBranchCommit', 'rejects')
    })
    it('fails with an error when getRemote fails, fast', function () {
      return failToGet('getRemote', 'throws')
    })

    it('fails with an expected exception when getRemote rejects', function () {
      const stub = sinon.stub(Git.Repository.prototype, 'getRemote')
      stub.rejects()
      return GitInfo.create(thisGitRepoRoot)
        .then(
          () => {
            stub.restore()
            assert.fail('should not have resolved')
          },
          exc => {
            stub.restore()
            assert.strictEqual(exc.message, GitInfo.originRemoteDoesNotExistMessage())
          }
        )
    })

    it('works when the repo is forced to be dirty', function () {
      // introduced to cover the getStatus() path when the repo is clean

      const makeTheRepoDirtyFileName = 'makeTheRepoDirty.txt'
      const makeTheRepoDirtyPath = path.format({ dir: thisGitRepoRoot, name: makeTheRepoDirtyFileName })

      function rm () {
        return Q.nfcall(fs.unlink, makeTheRepoDirtyPath)
      }

      return Q.nfcall(fs.open, makeTheRepoDirtyPath, 'w')
        .then(fd => Q.nfcall(fs.close, fd))
        .then(() => GitInfo.create(thisGitRepoRoot))
        .then(
          gitInfo => {
            util.validateInvariants(gitInfo)
            console.log('create success for %s: %s', thisGitRepoRoot, JSON.stringify(gitInfo))
          }
        )
        .then(
          rm,
          err => {
            rm()
            throw err
          }
        )
    })
  })

  describe('createForHighestGitDir', function () {
    before(function () {
      GitInfo.createForHighestGitDir.contract.verifyPostconditions = true
    })

    after(function () {
      GitInfo.createForHighestGitDir.contract.verifyPostconditions = true
    })

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

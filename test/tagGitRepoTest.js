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
const path = require('path')
const GitInfo = require('../GitInfo')
const assert = require('assert')
const sinon = require('sinon')
const proxyquire = require('proxyquire')
const tagGitRepo = proxyquire('../tagGitRepo', { nodegit: Git })

const someRepoPaths = [path.dirname(path.dirname(__filename)), '/repo/does/not/exist']
const aTagNameBase = 'automated_test/tagGitRepo/' + Date.now()

let counter = 0

function aTagName () {
  return aTagNameBase + '/' + counter
}

describe('tagGitRepo', function () {
  describe('tagGitRepo', function () {
    before(function () {
      tagGitRepo.contract.verifyPostconditions = true
    })

    after(function () {
      tagGitRepo.contract.verifyPostconditions = false
    })

    someRepoPaths.forEach(function (path) {
      const tagName = aTagName()
      it('creates the expected tag, or fails expected, for "' + path + '" and tag "' + tagName, function () {
        // noinspection JSUnresolvedVariable,JSUnresolvedFunction
        return tagGitRepo(path, tagName)
          .then(
            () => Git.Repository
              .open(path)
              .then(repository =>
                Git.Tag
                  .list(repository)
                  .then(tags => {
                    if (tags.indexOf(tagName) < 0) {
                      throw new Error('tag was not created as expected')
                    }
                    // noinspection JSUnresolvedVariable
                    return Git.Tag.delete(repository, tagName)
                  })
              ),
            (err) => {
              console.log(err)
              if (err instanceof Error &&
                (err.message === GitInfo.noGitDirectoryMsg || err.message === tagGitRepo.couldNotCreateTagMsg)) {
                return true
              }
              throw err
            }
          )
      })
    })

    function failToTag (stubby) {
      const tagName = aTagName()
      const stub = sinon.stub(Git.Tag, 'create')
      stubby(stub)
      return tagGitRepo(someRepoPaths[0], tagName)
        .then(
          () => {
            assert.fail('should not have resolved')
          },
          exc => {
            assert.strictEqual(exc.message, tagGitRepo.couldNotCreateTagMsg)
          }
        )
        .finally(() => {
          stub.restore()
        })
    }

    it('fails as expected when we cannot tag, with a fast exception', function () {
      return failToTag(stub => stub.throws())
    })

    it('fails as expected when we cannot tag, with a rejection', function () {
      return failToTag(stub => stub.rejects())
    })
  })
})

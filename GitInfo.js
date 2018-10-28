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

const Contract = require('@toryt/contracts-iv')
const PromiseContract = require('@toryt/contracts-iv/lib/IV/PromiseContract')
const path = require('path')
const fs = require('fs')
const Q = require('q')
const Git = require('nodegit')
const querystring = require('querystring')
const all = require('promise-all')
const util = require('./_util')
const exceptionIsAnError = util.exceptionIsAnError

/**
 * Holder for consolidated information about the git repository at {@code #path}.
 */
class GitInfo {
  get invariants () {
    return typeof this.path === 'string' &&
      !!this.path &&
      /* We will not add an invariant that this path exists. 1) That can only be determined
         asynchronously, and we don't want that for invariants(). 2) The disk can be changed after
         creation of this object. */
      typeof this.sha === 'string' &&
      GitInfo.shaRegExp.test(this.sha) &&
      (this.branch === undefined || (typeof this.branch === 'string' && !!this.branch)) &&
      (this.originUrl === undefined || (typeof this.originUrl === 'string' && !!this.originUrl)) &&
      this.changes instanceof Set &&
      Array.from(this.changes).every(path => typeof path === 'string' && !!path) &&
      (this.originBranchSha === undefined || typeof this.originBranchSha === 'string') &&
      (this.originBranchSha === undefined || GitInfo.shaRegExp.test(this.originBranchSha)) &&
      typeof this.isClean === 'boolean' &&
      this.isClean === (this.changes.size === 0) &&
      typeof this.isPushed === 'boolean' &&
      this.isPushed === (this.originBranchSha === this.sha) &&
      typeof this.isPrecious === 'boolean' &&
      (this.branch || this.isPrecious) &&
      (!this.branch ||
          GitInfo.preciousBranchNameFragments.every(fragment => this.branch.indexOf(fragment) < 0) ||
          this.isPrecious) &&
      typeof this.isSave === 'boolean' &&
      (this.isPrecious || this.isSave) &&
      (!this.isPrecious || (this.isSave === (this.isClean && this.isPushed))) &&
      (!this.branch ||
          this.branch === GitInfo.masterBranchName ||
          this.branch === GitInfo.defaultEnvironmentName ||
          querystring.unescape(this.environment) === this.branch.replace(/\//g, '-')) &&
      (this.branch !== GitInfo.masterBranchName || this.environment === GitInfo.defaultEnvironmentName) &&
      ((!!this.branch && this.branch !== GitInfo.defaultEnvironmentName) || this.environment === undefined) &&
      JSON.parse(JSON.stringify(this)).path === this.path &&
      JSON.parse(JSON.stringify(this)).sha === this.sha &&
      JSON.parse(JSON.stringify(this)).branch === this.branch &&
      JSON.parse(JSON.stringify(this)).environment === this.environment &&
      JSON.parse(JSON.stringify(this)).originUrl === this.originUrl &&
      JSON.parse(JSON.stringify(this)).changes.every(e => this.changes.has(e)) &&
      Array.from(this.changes).every(e => JSON.parse(JSON.stringify(this)).changes.indexOf(e) >= 0) &&
      JSON.parse(JSON.stringify(this)).originBranchSha === this.originBranchSha &&
      JSON.parse(JSON.stringify(this)).isClean === this.isClean &&
      JSON.parse(JSON.stringify(this)).isPushed === this.isPushed &&
      JSON.parse(JSON.stringify(this)).isPrecious === this.isPrecious &&
      JSON.parse(JSON.stringify(this)).isSave === this.isSave
  }

  /**
   * Create a new GitInfo instance with the given properties.
   *
   * @param {string} path - path to the git repository represented by the new instance;
   *                        should be a path to a directory that contains a {@code .git/} folder
   * @param {string} sha - sha of the current commit of the checked-out repository
   * @param {string=} branch - name of the current checked-out branch; might be {@code undefined}
   * @param {string=} originUrl - url of the remote with name {@code origin} of the current checked-out branch;
   *                              might be {@code undefined}
   * @param {Set<string>} changes - set of paths of files that are not committed in the working copy
   *                                referred to by {@code path}; files are deleted, new, or modified
   * @param {string=} originBranchSha - sha of branch {@code branch} at remote with name {@code origin};
   *                                    might be {@code undefined}
   */
  constructor (path, sha, branch, originUrl, changes, originBranchSha) {
    this._path = path
    this._sha = sha
    this._branch = branch || undefined
    this._originUrl = originUrl || undefined
    this._changes = new Set(changes)
    this._originBranchSha = originBranchSha || undefined
  }

  /**
   * Path to the git repository represented by this.
   *
   * @return {string}
   */
  get path () {
    return this._path
  }

  /**
   * Sha of the current commit of the checked-out repository.
   *
   * @return {string}
   */
  get sha () {
    return this._sha
  }

  /**
   * Name of the current checked-out branch. Might be {@code undefined}.
   *
   * @return {(string|undefined)}
   */
  get branch () {
    return this._branch
  }

  /**
   * A string that can be used as a Terraform environment name, derived from {@link #branch}.
   * Falsy {@link #branch} values return {@code undefined}.
   * When the {@link #branch} is &quot;master&quot;, &quot;default&quot; is returned.
   * &quot;default&quot; cannot be used as branch name.
   *
   * @return {(string|undefined)}
   */
  get environment () {
    return !this._branch
      ? undefined
      : (this._branch === GitInfo.masterBranchName
        ? GitInfo.defaultEnvironmentName
        : querystring.escape(this._branch.split('/').join('-')))
  }

  /**
   * Url of the remote with name {@code origin} of the current checked-out branch.
   * Might be {@code undefined}.
   *
   * @return {(string|undefined)}
   */
  get originUrl () {
    return this._originUrl
  }

  /**
   * Set of paths of files that are not committed in the working copy referred to by {@code path}.
   * Files are deleted, new, or modified.
   *
   * @return {Set<string>}
   */
  get changes () {
    return new Set(this._changes)
  }

  /**
   * Sha of branch {@link #branch} at remote with name {@code origin}. Might be {@code undefined}.
   */
  get originBranchSha () {
    return this._originBranchSha
  }

  /**
   * This represents a clean git repo working copy.
   */
  get isClean () {
    return this.changes.size === 0
  }

  /**
   * This is pushed, i.e., there is a {@link #originBranchSha}, and it is the same as {@link #sha}.
   */
  get isPushed () {
    return this.originBranchSha === this.sha
  }

  /**
   * This represents a git repo, of which a precious branch is checked out.
   * No branch is precious too.
   */
  get isPrecious () {
    return !this.branch || GitInfo.preciousBranchNameFragments.some(fragment => this.branch.indexOf(fragment) >= 0)
  }

  /**
   * This represents a git repo that is save.
   * A precious branch must be clean, and all commits must be pushed.
   * A non-precious branch is always save.
   */
  get isSave () {
    return !this.isPrecious || (this.isClean && this.isPushed)
  }

  // noinspection JSUnusedGlobalSymbols
  toJSON () {
    return {
      path: this.path,
      sha: this.sha,
      branch: this.branch,
      environment: this.environment,
      originUrl: this.originUrl,
      changes: Array.from(this.changes),
      originBranchSha: this.originBranchSha,
      isClean: this.isClean,
      isPushed: this.isPushed,
      isPrecious: this.isPrecious,
      isSave: this.isSave
    }
  }
}

GitInfo.constructorContract = new Contract({
  pre: [
    (path, sha, branch, originUrl, changes, originBranchSha) => typeof path === 'string',
    (path, sha, branch, originUrl, changes, originBranchSha) => !!path,
    (path, sha, branch, originUrl, changes, originBranchSha) => typeof sha === 'string',
    (path, sha, branch, originUrl, changes, originBranchSha) => GitInfo.shaRegExp.test(sha),
    (path, sha, branch, originUrl, changes, originBranchSha) => !branch || typeof branch === 'string',
    (path, sha, branch, originUrl, changes, originBranchSha) => !originUrl || typeof originUrl === 'string',
    (path, sha, branch, originUrl, changes, originBranchSha) => changes instanceof Set,
    (path, sha, branch, originUrl, changes, originBranchSha) =>
      Array.from(changes).every(path => typeof path === 'string' && !!path),
    (path, sha, branch, originUrl, changes, originBranchSha) => !originBranchSha || typeof originBranchSha === 'string',
    (path, sha, branch, originUrl, changes, originBranchSha) =>
      !originBranchSha || GitInfo.shaRegExp.test(originBranchSha)
  ],
  post: [
    (path, sha, branch, originUrl, changes, originBranchSha, result) => result.path === path,
    (path, sha, branch, originUrl, changes, originBranchSha, result) => result.sha === sha,
    (path, sha, branch, originUrl, changes, originBranchSha, result) => !!branch || result.branch === undefined,
    (path, sha, branch, originUrl, changes, originBranchSha, result) => !branch || result.branch === branch,
    (path, sha, branch, originUrl, changes, originBranchSha, result) => !!originUrl || result.originUrl === undefined,
    (path, sha, branch, originUrl, changes, originBranchSha, result) => !originUrl || result.originUrl === originUrl,
    (path, sha, branch, originUrl, changes, originBranchSha, result) =>
      Array.from(changes).every(path => result.changes.has(path)),
    (path, sha, branch, originUrl, changes, originBranchSha, result) =>
      Array.from(result.changes).every(path => changes.has(path)),
    (path, sha, branch, originUrl, changes, originBranchSha, result) =>
      !originBranchSha || result.originBranchSha === originBranchSha
  ],
  exception: Contract.mustNotHappen
})

GitInfo.shaRegExp = /^[a-f0-9]{40}$/
GitInfo.preciousBranchNameFragments = ['prod', 'staging', 'stage', 'test']
GitInfo.originRemoteName = 'origin'
GitInfo.gitRefsPattern = /^refs\/heads\/(.*)$/
GitInfo.gitOriginRefsPrefix = 'refs/remotes/' + GitInfo.originRemoteName + '/'
GitInfo.masterBranchName = 'master'
GitInfo.defaultEnvironmentName = 'default'

/**
 * Promise for the path of the directory of the highest git working copy {@code path} is in. This is the top most
 + ancestor directory of {@code path} that contains a {@code .git} folder.
 */
GitInfo.highestGitDirPath = new PromiseContract({
  pre: [
    (dirPath) => typeof dirPath === 'string'
  ],
  post: [
    (dirPath, result) => result === undefined || (typeof result === 'string' && !!result),
    (dirPath, result) => !result || dirPath.startsWith(result)
  ],
  fastException: PromiseContract.mustNotHappen,
  exception: PromiseContract.mustNotHappen
})
  .implementation(dirPath => {
    const parts = dirPath.split(path.sep)
    const dirs = parts.map((part, index) => parts.slice(0, index + 1).join(path.sep))
    return Promise.all(dirs.map(dir => Q.nfcall(fs.access, path.format({ dir: dir, name: '.git' }), 'rw')
      .then(() => dir)
      .catch(() => undefined)))
      .then(gitDirs => gitDirs.find(dir => !!dir))
  })

/**
 * Helper function to decide whether a NodeGit Status represents a clean or dirty file.
 */
GitInfo.isNotClean = new Contract({
  pre: [
    (status) => typeof status.isNew === 'function',
    (status) => typeof status.isModified === 'function',
    (status) => typeof status.isTypechange === 'function',
    (status) => typeof status.isRenamed === 'function',
    (status) => typeof status.isDeleted === 'function',
    (status) => typeof status.isIgnored === 'function'
  ],
  post: [
    (status, result) => typeof result === 'boolean',
    (status, result) => !status.isNew() || result,
    (status, result) => !status.isModified() || result,
    (status, result) => !status.isTypechange() || result,
    (status, result) => !status.isRenamed() || result,
    (status, result) => !status.isDeleted() || result,
    (status, result) => !status.isIgnored() || !result
  ],
  exception: Contract.mustNotHappen
}).implementation(function (status) {
  return !!(status.isNew() || status.isModified() || status.isTypechange() || status.isRenamed() || status.isDeleted())
})

/**
 * Promise for the git working copy information in {@code gitDirPath}.
 * The promise is rejected if {@code gitDirPath} does not point to a git working copy.
 */
GitInfo.create = new PromiseContract({
  pre: [
    (gitDirPath) => typeof gitDirPath === 'string',
    (gitDirPath) => !!gitDirPath
  ],
  post: [
    (gitDirPath, result) => result instanceof GitInfo,
    (gitDirPath, result) => result.path === gitDirPath
  ],
  fastException: PromiseContract.mustNotHappen,
  exception: exceptionIsAnError
}).implementation(function (gitDirPath) {
  // NOTE wrapped in Promise.all to make the result an instance of native Promise, because Contracts requires that
  // noinspection JSUnresolvedVariable
  return util.realPromise(Git.Repository.open(gitDirPath))
    .catch(() => { throw new Error(gitDirPath + ' is not a git directory') })
    .then(repository => {
      // noinspection JSCheckFunctionSignatures,JSUnresolvedFunction
      return all({
        sha: repository
          .getHeadCommit()
          .then(head => head.sha()),
        branch: repository
          .getCurrentBranch()
          .then(reference => GitInfo.gitRefsPattern.exec(reference.name())[1])
          .then(branchName => all({
            name: branchName,
            originSha: repository
              .getBranchCommit(GitInfo.gitOriginRefsPrefix + branchName)
              .then(
                head => head.sha(),
                err => {
                  if (err && err.message && err.message.indexOf('no reference found for shorthand') >= 0) {
                    // the branch does not exist in the remote, so certainly not pushed
                    return undefined
                  }
                  throw err
                }
              )
          })),
        originUrl: repository
          .getRemote(GitInfo.originRemoteName)
          .catch(() => new Error('remote "' + GitInfo.originRemoteName + '" does not exist'))
          .then(remote => remote.url()),
        changes: repository
          .getStatus()
          .then(statuses =>
            new Set(statuses.filter(status => GitInfo.isNotClean(status)).map(status => status.path())))
      })
        .then(params => new GitInfo(
          gitDirPath,
          params.sha,
          params.branch.name,
          params.originUrl,
          params.changes,
          params.branch.originSha
        ))
    })
})

GitInfo.noGitDirectoryMsg = 'NO GIT DIRECTORY'

/**
 * Promise for the git working copy information of the highest git working copy {@code path} is in.
 * The promise is rejected if there is no git working copy above {@code path}.
 */
GitInfo.createForHighestGitDir = new PromiseContract({
  pre: [
    (path) => typeof path === 'string',
    (path) => !!path
  ],
  post: [
    (path, result) => result instanceof GitInfo,
    (path, result) => path.startsWith(result.path)
  ],
  fastException: PromiseContract.mustNotHappen,
  exception: exceptionIsAnError
}).implementation(function (path) {
  return GitInfo
    .highestGitDirPath(path)
    .then(gitDirPath => {
      if (!gitDirPath) {
        throw new Error(GitInfo.noGitDirectoryMsg)
      }
      return GitInfo.create(gitDirPath)
    })
})

module.exports = GitInfo

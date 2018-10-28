[Node.js] package to get information about the current status of a git working copy.

This package was created to be used in the context of [Terraform]. See [terraform-ppwcode-modules].

[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)



Installation
============

To install, do

    > npm install --save \@ppwcode/node-gitinfo

    
    
Usage in code
=============    

When used in other code, use

    const GitInfo = require("@ppwcode/node-gitinfo)
     
You can tag with
     
    const tagGitRepo = require("@ppwcode/node-gitinfo/tagGitRepo)


    
CLI
===    
     
`gitinfo.js` is a CLI tool that uses this code. See
     
     > node ./bin/gitinfo.js -h
     
for help. This program is installed in npm as `gitinfo`.

     > node ./bin/gitinfo.js gi
     
is intended for use in a [Terraform external data source provider]. It returns JSON.



Compatibility
=============

This library is intended to be compatible with Node 6, 8, and 10.

Therefor, the code does not use `async` / `await`, which was introduced in Node 8.

Also, we use `Q` as Promise library, instead of native Promises, since Node 6 does not yet support `util.promisify()`.
We use `Q.nfcall` instead.



Development
===========

Node version
------------

Development is done in Node 10, via `nvm`.


Compatibility
-------------

The code does not use `async` / `await`, which was introduced in Node 8.

Also, we use `Q` as Promise library, instead of native Promises, since Node 6 does not yet support `util.promisify()`.
We use `Q.nfcall` instead.


Style
-----

[![JavaScript Style Guide](https://cdn.rawgit.com/standard/standard/master/badge.svg)](https://github.com/standard/standard)

This code uses [Standard] coding style.



[Terraform]: https://peopleware.atlassian.net/wiki/x/CwAvBg
[Node.js]: https://nodejs.org
[Terraform external data source provider]: https://www.terraform.io/docs/providers/external/data_source.html
[terraform-ppwcode-modules]: https://github.com/peopleware/terraform-ppwcode-modules
[Standard]: https://standardjs.com

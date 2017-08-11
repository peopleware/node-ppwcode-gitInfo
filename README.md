[Node.js] package to get information about the current status of a git working copy.

This package was created to be used in the context of [Terraform]. See [terraform-ppwcode-modules].

[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)



Installation
============

To install, do

    > yarn add \@ppwcode/node-gitinfo
    
or
    
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



Style
=====

[![JavaScript Style Guide](https://cdn.rawgit.com/standard/standard/master/badge.svg)](https://github.com/standard/standard)

This code uses [Standard] coding style.



[Terraform]: https://peopleware.atlassian.net/wiki/x/CwAvBg
[Node.js]: https://nodejs.org
[Terraform external data source provider]: https://www.terraform.io/docs/providers/external/data_source.html
[terraform-ppwcode-modules]: https://github.com/peopleware/terraform-ppwcode-modules
[Standard]: https://standardjs.com

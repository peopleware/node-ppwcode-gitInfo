[Node.js] package to get information about the current status of a git working copy.

This package was created to be used in the context of [Terraform]. See [terraform-ppwcode-modules].


To install, do

    > yarn add \@ppwcode/node-gitinfo
    
or
    
    > npm install --save \@ppwcode/node-gitinfo

When used in other code, use

    const GitInfo = require("@ppwcode/node-gitinfo);
     
You can tag with
     
    const tagGitRepo = require("@ppwcode/node-gitinfo/tagGitRepo);
     
`index.js` is a CLI tool that uses this code. See
     
     > node ./index.js -h
     
for help.

     > node ./index.js gi
     
is intended for use in a [Terraform external data source provider]. It returns JSON.

[Terraform]: https://peopleware.atlassian.net/wiki/x/CwAvBg
[Node.js]: https://nodejs.org
[Terraform external data source provider]: https://www.terraform.io/docs/providers/external/data_source.html
[terraform-ppwcode-modules]: https://github.com/peopleware/terraform-ppwcode-modules

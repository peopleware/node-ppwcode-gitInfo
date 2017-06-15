[Node.js] package to get information about the current status of a git working copy.

When used in other code, use

    const GitInfo = require("@ppwcode/node-ppwcode-gitinfo/GitInfo);
     
You can tag with
     
    const tagGitRepo = require("@ppwcode/node-ppwcode-gitinfo/tagGitRepo);
     
`index.js` is a CLI tool that uses this code. See
     
     > node ./index.js -h
     
for help.

     > node ./index.js gi
     
is intended for use in a [Terraform external data source provider]. It returns JSON.

[Terraform]: https://peopleware.atlassian.net/wiki/x/CwAvBg
[Node.js]: https://nodejs.org
[Terraform external data source provider]: https://www.terraform.io/docs/providers/external/data_source.html

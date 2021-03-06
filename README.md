[![Build Status](https://travis-ci.org/JamesMGreene/node-gcph-client.png?branch=master)](https://travis-ci.org/JamesMGreene/node-gcph-client)

# gcph-client

A Node.js client for the Google Code Project Hosting [Issue Tracker API](http://code.google.com/p/support/wiki/IssueTrackerAPI).

## Getting Started
Install the module with: `npm install gcph-client`


## Documentation
_(Coming soon?)_


## Examples
```js
var gcph = require('gcph-client');
var client = new gcph.Client();
client.login('YourGoogleAccount@GmailOrWherever.com', 'p@s$w0r|)', function() {
	client.getIssues('someGoogleCodeProject', function(issues) {
		console.log(JSON.stringify(issues));
	});
});
```

For many much more complete examples, see the "examples" folder.


## Contributing
In lieu of a formal styleguide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality. Lint and test your code using [grunt](http://gruntjs.com/).


## Release History
 - 1.5.9: Published to NPM on 2013-03-17.
    - Fixed a bug with comments missing when there are more than 1000.
    - Fixed a bug with calculating the issue ID for each comment.
 - 1.5.8: Published to NPM on 2013-03-15.
    - Fixed a bug with issues missing when honoring user privacy due the issue addressed in 1.5.7.
 - 1.5.7: Published to NPM on 2013-03-15.
    - Fixed a bug with not getting all the issues when there are more than 1000 (due to Google overriding the URL). Still need to do the same for comments.
 - 1.5.6: Published to NPM on 2013-03-15.
    - Fixed a bug/vulnerability with the `author` field.
 - 1.5.5: Published to NPM on 2013-03-04.
    - Fixed a lint issue.
 - 1.5.4: Published to NPM on 2013-01-23.
    - Fixed the Comment object so that it exposes its `project` and `issueId` properties.
 - 1.5.3: Published to NPM on 2013-01-22.
    - Fixed a typo causing a syntax error... fail.
 - 1.5.2: Published to NPM on 2013-01-22.
    - Minor bug fix to prevent the username "---" (represented removal, e.g. Issue had an owner but now it doesn't) from having "@gmail.com" appended.
 - 1.5.1: Published to NPM on 2013-01-21.
    - Minor bug fix/input sanitizing for the new `Issue.getUrl` method.
 - 1.5.0: Published to NPM on 2013-01-21.
    - Added the `Issue.getUrl` method.
 - 1.4.0: Published to NPM on 2013-01-21.
    - Added `project` and `issueId` to the Comment object.
 - 1.3.0: Published to NPM on 2013-01-20.
    - Added `blocks` and `project` to the Issue object.
    - Parsed the `id`, `blocks`, and `mergedInto` values for Comments as integers.
 - 1.2.0: Published to NPM on 2013-01-18.
    - Removed over-zealous use of `Object.create(null);`.
 - 1.1.0: Published to NPM on 2013-01-14.
    - Added the ability to remain unauthenticated when possible.
    - Added the ability to "honor privacy" (i.e. project members can still get the user's public display name).
 - 1.0.0: Published to NPM on 2012-11-27.
    - Complete authenticated API is supported.


## License
Copyright (c) 2012-2013 James M. Greene  
Licensed under the MIT license.

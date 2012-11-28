# gcph-client

A Node.js client for the Google Code Project Hosting Issue Tracker API.

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

For more complete examples, see the "examples" folder.


## Contributing
In lieu of a formal styleguide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality. Lint and test your code using [grunt](http://gruntjs.com/).


## Release History
 - 1.0.0: Published to NPM on 2012-11-27


## License
Copyright (c) 2012 James M. Greene  
Licensed under the MIT license.

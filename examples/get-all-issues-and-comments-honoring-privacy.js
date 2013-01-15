/*!
 * gcph-client
 * https://github.com/JamesMGreene/node-gcph-client
 *
 * Copyright (c) 2012 James M. Greene
 * Licensed under the MIT license.
 */

'use strict';

// External modules
var Q = require('q');
var path = require('path');
var fs = require('fs');

// Internal modules
var gcph = require('../lib/gcph');
var exUtil = require('./util/ex-util');


// Default the final output file if it was not provided as a commandline arg
var outputFilePath = process.argv[2];
if (!outputFilePath) {
	var outputDir = path.resolve(process.cwd(), 'out/');
	if (
		!(
			fs.existsSync(outputDir) || 
			(function() {
				try { return fs.statSync(outputDir).isDirectory(); }
				catch (e) { return false; }
			})()
		)
	) {
		fs.mkdirSync(outputDir);
	}
	outputFilePath = path.resolve(outputDir, 'gcAllIssuesAndCommentsHonoringPrivacy.json');
	
	console.warn('WARNING: Did not provide an output filename as an argument. Defaulting to:\n  ' + outputFilePath + '\n');
}

// Initialize the client for the Google Code Project Hosting Issue Tracker API
var clientOpts = {
	honorPrivacy: true
};
var client = new gcph.Client(clientOpts);

// Pre-bind all the Node promises for Q
var getUsernameP = Q.nfbind(exUtil.getUsername);
var getPasswordP = Q.nfbind(exUtil.getPassword);
var loginP       = Q.nfbind(client.login.bind(client));
var getIssuesP   = Q.nfbind(client.getIssues.bind(client));
var getCommentsP = Q.nfbind(client.getComments.bind(client));
var writeFileP   = Q.nfbind(fs.writeFile.bind(fs));

getUsernameP().then(function(username) {
	return getPasswordP().then(function(password) {
		return loginP(username, password);
	});
}).then(function() {
	console.log('Authenticated BUT also honoring privacy!');
	console.warn('WARNING: This will be literally twice as slow as usual!');
	console.log('Now getting all issues and comments for the "phantomjs" project....');
	
	return getIssuesP('phantomjs');
}).then(function(issues) {
	return Q.all(issues.map(function(issue) {
		return getCommentsP('phantomjs', issue.id).then(function(comments) {
			issue.comments = comments || [];
			return issue;
		});
	}));
}).then(function(issues) {
	return writeFileP(outputFilePath, JSON.stringify(issues, null, '  '), 'utf8');
}).then(function() {
	console.log('All promises fulfilled!\n\nFinal JSON was written to:\n  ' + outputFilePath + '\n');
}).fail(function(err) {
	console.error(err);
}).done();

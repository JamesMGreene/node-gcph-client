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
var exUtil = require('./ex-util');


// Default the final output file if it was not provided as a commandline arg
var outputFilePath = process.argv[2];
if (!outputFilePath) {
	outputFilePath = path.resolve(process.cwd(), 'out/gcAllIssuesAndComments.json');
	console.warn('WARNING: Did not provide an output filename as an argument. Defaulting to:\n  ' + outputFilePath + '\n');
}

// Initialize the client for the Google Code Project Hosting Issue Tracker API
var client = new gcph.Client();

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
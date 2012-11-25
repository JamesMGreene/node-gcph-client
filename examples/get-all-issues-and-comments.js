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
var getUsernameP = Q.nbind(exUtil.getUsername);
var getPasswordP = Q.nbind(exUtil.getPassword);
var loginP = Q.nbind(client.login, client);
var getIssuesP = Q.nbind(client.getIssues, client);
var getCommentsP = Q.nbind(client.getComments, client);
var writeFileP = Q.nbind(fs.writeFile, fs);

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
/*!
 * gcph-client
 * https://github.com/JamesMGreene/node-gcph-client
 *
 * Copyright (c) 2012 James M. Greene
 * Licensed under the MIT license.
 */

'use strict';
//require('nodetime').profile();

// External modules
var Q = require('q');
var path = require('path');
var fs = require('fs');

// Internal modules
var gcph = require('../lib/gcph');


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
	outputFilePath = path.resolve(outputDir, 'gcAllIssuesAndCommentsUnauthenticated.json');
	
	console.warn('WARNING: Did not provide an output filename as an argument. Defaulting to:\n  ' + outputFilePath + '\n');
}

// Initialize the client for the Google Code Project Hosting Issue Tracker API
var clientOpts = {
	disableAuthWarnings: true
};
var client = new gcph.Client(clientOpts);

// Pre-bind all the Node promises for Q
var getIssuesP   = Q.nfbind(client.getIssues.bind(client));
var getCommentsP = Q.nfbind(client.getComments.bind(client));
var writeFileP   = Q.nfbind(fs.writeFile.bind(fs));

console.log('NOT authenticated!');
console.log('Now getting all issues and comments for the "phantomjs" project....');

getIssuesP('phantomjs').then(function(issues) {
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
	console.error(err.stack || err);
}).done();

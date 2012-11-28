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

// Internal modules
var gcph = require('../lib/gcph');
var exUtil = require('./ex-util');

// Initialize the client for the Google Code Project Hosting Issue Tracker API
var client = new gcph.Client();

// Pre-bind all the Node promises for Q
var getUsernameP = Q.nfbind(exUtil.getUsername);
var getPasswordP = Q.nfbind(exUtil.getPassword);
var loginP       = Q.nfbind(client.login.bind(client));
var addIssueP    = Q.nfbind(client.addIssue.bind(client));
var updateIssueP = Q.nfbind(client.updateIssue.bind(client));

var author;
getUsernameP().then(function(username) {
	// Store this state for use later in the promise chain without having to work hard to continue passing it along when the chain pops
	author = username;
	
	return getPasswordP().then(function(password) {
		return loginP(username, password);
	});
}).then(function() {
	var newIssue = new gcph.Issue({
		'title': 'API-generated example issue',
		'content': 'This issue was generated using the amazing "node-gcph-client" library. Try it TODAY with `npm install gcph-client`! <3',
		'author': author
	});
	return addIssueP('jwalker', newIssue);
}).then(function(newlyCreatedIssue) {
	var newComment = new gcph.Comment({
		'author': author,
		'content': 'This comment was generated using the amazing "node-gcph-client" library. Try it TODAY with `npm install gcph-client`! <3',
		'issueUpdates': {
			'labels': {
				'added': ['Type-Enhancement', 'Domain-NodeJS'],
				'removed': ['Type-Defect']
			},
			'owner': author
		}
	});
	return updateIssueP('jwalker', newlyCreatedIssue, newComment);
}).then(function(newlyCreatedComment) {
	console.log('All promises fulfilled!\n\nNewly created comment:\n' + JSON.stringify(newlyCreatedComment));
}).fail(function(err) {
	console.error(err);
}).done();
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
var getUsernameP = Q.nbind(exUtil.getUsername);
var getPasswordP = Q.nbind(exUtil.getPassword);
var loginP = Q.nbind(client.login, client);
var addIssueP = Q.nbind(client.addIssue, client);
var updateIssueP = Q.nbind(client.updateIssue, client);

getUsernameP().then(function(username) {
	return getPasswordP().then(function(password) {
		return loginP(username, password).then(function() {
			// Pass this value along so we can pop the Q call chain
			return username;
		});
	});
}).then(function(username) {
	var newIssue = new gcph.Issue({
		'title': 'API-generated example issue',
		'content': 'This issue was generated using the amazing "node-gcph-client" library. Try it TODAY with `npm install gcph-client`! <3',
		'author': username
	});
	return addIssueP('jwalker', newIssue);
}).then(function(newlyCreatedIssue) {
	var newComment = new gcph.Comment({
		
	});
	return updateIssueP('jwalker', newlyCreatedIssue, newComment);
}).then(function() {
	console.log('All promises fulfilled!\n\n');
}).fail(function(err) {
	console.error(err);
}).done();
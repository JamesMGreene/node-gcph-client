/*!
 * gcph-client
 * https://github.com/JamesMGreene/node-gcph-client
 *
 * Copyright (c) 2012 James M. Greene
 * Licensed under the MIT license.
 */

'use strict';

// External modules
var path = require('path');
var commander = require('commander');
var Q = require('q');
var fs = require('fs');

// Internal modules
var gcph = require('../lib/gcph');


var outputFilePath = process.argv[2];
if (!outputFilePath) {
	outputFilePath = path.resolve(process.cwd(), 'out/gcAllIssuesAndComments.json');
	console.warn('WARNING: Did not provide an output filename as an argument. Defaulting to:\n  ' + outputFilePath + '\n');
}

var client = new gcph.Client();
var cmd = new commander.Command();

var getUsername = function(done) {
	cmd.prompt('GC Username (james.m.greene@gmail.com): ', function(user) {
		if (!user) {
			// Default value
			done(null, 'james.m.greene@gmail.com');
		}
		else {
			done(null, user);
		}
	});
};

var getPassword = function(done) {
	cmd.password('GC Password: ', '*', function(pass) {
		if (!pass) {
			done(new Error('Google Code does not allow empty passwords!'));
		}
		else {
			process.stdin.destroy();
			done(null, pass);
		}
	});
};

Q.napply(getUsername, null, []).then(function(username) {
	return Q.napply(getPassword, null, []).then(function(password) {
		return Q.resolve([username, password]);
	});
}).spread(function(username, password) {
	return Q.napply(client.login, client, [username, password]);
}).then(function() {
	return Q.napply(client.getIssues, client, ['phantomjs', null]);
}).then(function(issues) {
	return Q.all(issues.map(function(issue) {
		return Q.napply(client.getComments, client, ['phantomjs', issue.id]).then(function(comments) {
			issue.comments = comments || [];
			return Q.resolve(issue);
		});
	})).then(function() {
		return Q.resolve(issues);
	});
}).then(function(issues) {
	return Q.napply(fs.writeFile, fs, [outputFilePath, JSON.stringify(issues, null, '  '), 'utf8']);
}).then(function() {
	console.log('All promises fulfilled!\n\nFinal JSON written to:\n  ' + outputFilePath);
}).fail(function(err) {
	console.error(err);
});
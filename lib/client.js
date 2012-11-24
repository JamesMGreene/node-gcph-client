/*
 * gcph-client
 * https://github.com/JamesMGreene/node-gcph-client
 *
 * Copyright (c) 2012 James M. Greene
 * Licensed under the MIT license.
 */

'use strict';

// External modules
var querystring = require('querystring');
var https = require('https');
var didHttpCallSucceed = require('./util').didHttpCallSucceed;

// Internal modules
var appMeta = require('../package.json');
var Query = require('./query');
var Issue = require('./issue');
var Comment = require('./comment');

// Taken from: https://developers.google.com/accounts/docs/AuthForInstalledApps#Errors
var GOOGLE_LOGIN_FAILURE_EXPLANATIONS = {
	'BadAuthentication': 'The login request used a username or password that is not recognized.',
	'NotVerified': 'The account email address has not been verified. The user will need to access their Google account directly to resolve the issue before logging in using a non-Google application.',
	'TermsNotAgreed': 'The user has not agreed to terms. The user will need to access their Google account directly to resolve the issue before logging in using a non-Google application.',
	'CaptchaRequired': 'A CAPTCHA is required. (A response with this error code will also contain an image URL and a CAPTCHA token.)',
	'Unknown': 'The error is unknown or unspecified; the request contained invalid input or was malformed.',
	'AccountDeleted': 'The user account has been deleted.',
	'AccountDisabled': 'The user account has been disabled.',
	'ServiceDisabled': 'The user\'s access to the specified service has been disabled. (The user account may still be valid.)',
	'ServiceUnavailable': 'The service is not available; try again later.'
};

// Convert dashed name to Pascal-cased name, e.g. 'gcph-client' => 'GcphClient'
var appName = appMeta.name.split('-').map(function(e) { return e ? e.slice(0, 1).toUpperCase() + e.slice(1).toLowerCase() : e; }).join('');
var sourceId = ['NodeJS', appName, appMeta.version].join('-');  // e.g. 'NodeJS-GcphClient-0.1.0'
var authTokenPropName = '_authToken';

var getAuthHeaders = function(client) {
	return {
		'Authorization': 'GoogleLogin auth=' + client[authTokenPropName]
	};
};

var isAuthenticated = function(client) {
	return Object.prototype.hasOwnProperty.call(client, authTokenPropName) && !!client[authTokenPropName];
};

var convertAtomIntoIssues = function(atom) {
	if (atom && atom.feed && atom.feed.entry) {
		return atom.feed.entry.map(Issue.fromRawIssue);
	}
	return [];
};

var convertAtomIntoComments = function(atom) {
	if (atom && atom.feed && atom.feed.entry) {
		return atom.feed.entry.map(Comment.fromRawComment);
	}
	return [];
};

var Client = function() {
	// Allow `Client()` to work the same as `new Client()`
	if (!(this instanceof Client)) {
		return new Client();
	}
};
Client.prototype = Object.create(null);
Client.constructor = Client;

/**
* @returns { 'sid': '...', 'lsid': '...', 'auth': '...' }  OR  { 'error': '...' }
* Target URL: https://www.google.com/accounts/ClientLogin
*
* IMPORTANT: ClientLogin has been officially deprecated as of April 20, 2012. It will continue to work
* as per our deprecation policy, but we encourage you to migrate to OAuth 2.0 as soon as possible. It
* will continue to be supported through April 20, 2015.
* SOURCES:
*  - https://developers.google.com/accounts/docs/AuthForInstalledApps
*  - https://developers.google.com/accounts/terms
*/
Client.prototype.login = function(username, password, done) {
	// Input validation
	if (typeof done !== 'function') {
		throw new TypeError('`done` was not a function');
	}
	
	var me = this;
	if (isAuthenticated(me)) {
		console.warn('WARNING: Someone is already logged in! Create a new Client instance.');
		done(null, me[authTokenPropName]);
	}
	else {
		// Input validation continued
		if (!username) {
			done(new TypeError('`username` was empty'));
		}
		else if (!password) {
			done(new TypeError('`password` was empty'));
		}
		else {
			// Do the real work
			var postData = querystring.stringify({
				accountType: 'HOSTED_OR_GOOGLE',
				Email: username,
				Passwd: password,
				source: sourceId,
				service: 'code'
			});
			var requestMeta = {
				method: 'POST',
				host: 'www.google.com',
				path: '/accounts/ClientLogin',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
					'Content-Length': postData.length
				}
			};
			
			var req = https.request(requestMeta, function(res) {
				var chunks = [];
				res.setEncoding('utf8');
				res.on('data', function (chunk) {
					chunks.push(chunk);
				});
				res.on('end', function() {
					var responseData = chunks.join('');
					var lines = responseData.replace(/\r\n/g, '\n').split('\n');
					var loginData = {};
					for (var l = 0, len = lines.length; l < len; l++) {
						var kvp = lines[l].split('=');
						if (kvp.length >= 2) {
							var key = kvp[0];
							var val = kvp.slice(1).join('=');
							
							loginData[key.toLowerCase()] = val;
						}
					}
					
					if (loginData.error) {
						var failureReason = GOOGLE_LOGIN_FAILURE_EXPLANATIONS[loginData.error];
						done(new Error('Failed to login! Reason: ' + failureReason));
					}
					else if (!loginData.auth) {
						done(new Error('Failed to login for an unknown reason!'));
					}
					else {
						var authToken = loginData.auth;
						me[authTokenPropName] = authToken;
						//console.info('INFO: Success! You are now logged in as: ' + username);
						done(null, loginData);
					}
				});
			});
			req.on('error', function(err) {
				done(err);
			});
			req.write(postData);
			req.end();
		}
	}
};

/**
* Get all the issues, or all issues matching a query.
* Target: GET https://code.google.com/feeds/issues/p/{@project}/issues/full?alt=json
*/
Client.prototype.getIssues = function(project, query, done) {
	// Shift the arguments if no `query` was provided
	if (typeof query === 'function' && done == null) {
		done = query;
		query = null;
	}
	
	// Input validation
	if (typeof done !== 'function') {
		throw new TypeError('`done` was not a function');
	}
	
	var me = this;
	if (!isAuthenticated(me)) {
		done(new Error('This request was unauthorized. Please login first!'));
	}
	else {
		// Input validation continued
		if (!project) {
			done(new TypeError('`project` was empty'));
		}
		else if (query && !(query instanceof Query)) {
			done(new TypeError('`query` was provided but was not an instance of Query'));
		}
		else {
			// Do the real work
			query = query || new Query();
			
			// Set some default values if they aren't already set
			query.alt = query.alt || 'json';
			query['max-results'] = query['max-results'] || 1000000;
			
			var queryParamsString = (function() {
				var qs = Query.stringify(query);
				return qs ? '?' + qs : '';
			})();
			
			var requestMeta = {
				method: 'GET',
				host: 'code.google.com',
				path: '/feeds/issues/p/' + project + '/issues/full' + queryParamsString,
				headers: getAuthHeaders(me)
			};
			
			var req = https.request(requestMeta, function(res) {
				var chunks = [];
				res.setEncoding('utf8');
				res.on('data', function (chunk) {
					chunks.push(chunk);
				});
				res.on('end', function() {
					var responseData = chunks.join('');
					if (didHttpCallSucceed(res)) {
						try {
							var atom = JSON.parse(responseData);
							var issues = convertAtomIntoIssues(atom);
							done(null, issues);
						}
						catch (e) {
							done(e, responseData);
						}
					}
					else {
						done(new Error('HTTP ' + res.statusCode + ': Failed to retrieve issues!'));
					}
				});
			});
			req.on('error', function(err) {
				done(err);
			});
			req.end();
		}
	}
};

/**
* 
* Target: GET https://code.google.com/feeds/issues/p/{@project}/issues/{@issueId}/comments/full?alt=json
*/
Client.prototype.getComments = function(project, issueId, done) {
	// Input validation
	if (typeof done !== 'function') {
		throw new TypeError('`done` was not a function');
	}
	
	var me = this;
	if (!isAuthenticated(me)) {
		done(new Error('This request was unauthorized. Please login first!'));
	}
	else {
		// Input validation continued
		if (!project) {
			done(new TypeError('`project` was empty'));
		}
		else if (!issueId) {
			done(new TypeError('`issueId` was empty'));
		}
		else {
			// Do the real work
			var query = new Query({
				'alt': 'json',
				'max-results': 1000000
			});
			var queryParamsString = (function() {
				var qs = Query.stringify(query);
				return qs ? '?' + qs : '';
			})();
			
			var requestMeta = {
				method: 'GET',
				host: 'code.google.com',
				path: '/feeds/issues/p/' + project + '/issues/' + issueId + '/comments/full' + queryParamsString,
				headers: getAuthHeaders(me)
			};
			
			var req = https.request(requestMeta, function(res) {
				var chunks = [];
				res.setEncoding('utf8');
				res.on('data', function (chunk) {
					chunks.push(chunk);
				});
				res.on('end', function() {
					var responseData = chunks.join('');
					if (didHttpCallSucceed(res)) {
						try {
							var atom = JSON.parse(responseData);
							var comments = convertAtomIntoComments(atom);
							done(null, comments);
						}
						catch (e) {
							done(e, responseData);
						}
					}
					else {
						done(new Error('HTTP ' + res.statusCode + ': Failed to retrieve comments!'));
					}
				});
			});
			req.on('error', function(err) {
				done(err);
			});
			req.end();
		}
	}
};

/**
* Add a new issue.
* Target: POST https://code.google.com/feeds/issues/p/{@project}/issues/full?alt=json
*/
Client.prototype.addIssue = function(project, issue, done) {
	// Input validation
	if (typeof done !== 'function') {
		throw new TypeError('`done` was not a function');
	}
	
	var me = this;
	if (!isAuthenticated(me)) {
		done(new Error('This request was unauthorized. Please login first!'));
	}
	else {
		// Input validation continued
		if (!project) {
			done(new TypeError('`project` was empty'));
		}
		else if (!issue) {
			done(new TypeError('`issue` was empty'));
		}
		else if (issue && !(issue instanceof Issue)) {
			done(new TypeError('`issue` was provided but was not an instance of Issue'));
		}
		else {
			// Do the real work
			var postData = JSON.stringify(issue.toRawIssue());
			var requestMeta = {
				method: 'POST',
				host: 'code.google.com',
				path: '/feeds/issues/p/' + project + '/issues/full?alt=json',
				headers: getAuthHeaders(me)
			};
			requestMeta.headers['Content-Type'] = 'application/json';
			requestMeta.headers['Content-Length'] = postData.length;
			
			var req = https.request(requestMeta, function(res) {
				var chunks = [];
				res.setEncoding('utf8');
				res.on('data', function (chunk) {
					chunks.push(chunk);
				});
				res.on('end', function() {
					var responseData = chunks.join('');
					if (didHttpCallSucceed(res)) {
						// TODO: Do something with `responseData`...
						done(null, responseData);
					}
				});
			});
			req.on('error', function(err) {
				done(err);
			});
			//req.write();
			req.end();
		}
	}
};

/**
* Can do any and/or all of the following:
*   - Update an existing issue's data
*   - Close an existing issue
*   - Add a new comment to an existing issue
* 
* Target URL: https://code.google.com/feeds/issues/p/{@project}/issues/{@issueId}/comments/full?alt=json
*/
Client.prototype.updateIssue = function(project, issue, comment, done) {
	// Input validation
	if (typeof done !== 'function') {
		throw new TypeError('`done` was not a function');
	}
	
	var me = this;
	if (!isAuthenticated(me)) {
		done(new Error('This request was unauthorized. Please login first!'));
	}
	else {
		// Input validation continued
		if (!project) {
			done(new TypeError('`project` was empty'));
		}
		else if (!issue) {
			done(new TypeError('`issue` was empty'));
		}
		else if (issue && !(issue instanceof Issue)) {
			done(new TypeError('`issue` was provided but was not an instance of Issue'));
		}
		else if (!issue.id) {
			done(new TypeError('`issue` was provided but it did not have a valid `id` property'));
		}
		else if (!comment) {
			done(new TypeError('`comment` was empty'));
		}
		else if (comment && !(comment instanceof Comment)) {
			done(new TypeError('`comment` was provided but was not an instance of Comment'));
		}
		else {
			// Do the real work
			var requestMeta = {
				method: 'POST',
				host: 'code.google.com',
				path: '/feeds/issues/p/' + project + '/issues/' + issue.id + '/comments/full?alt=json',
				headers: getAuthHeaders(me)
			};
			
			var req = https.get(requestMeta, function(res) {
				var chunks = [];
				res.setEncoding('utf8');
				res.on('data', function (chunk) {
					chunks.push(chunk);
				});
				res.on('end', function() {
					var responseData = chunks.join('');
					if (didHttpCallSucceed(res)) {
						// TODO: Do something with `responseData`...
						done(null, responseData);
					}
				});
			});
			req.on('error', function(err) {
				done(err);
			});
		}
	}
};

// Export!
module.exports = Client;

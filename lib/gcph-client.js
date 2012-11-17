/*
 * gcph-client
 * https://github.com/JamesMGreene/node-gcph-client
 *
 * Copyright (c) 2012 James M. Greene
 * Licensed under the MIT license.
 */

'use strict';

exports = Client;

var appMeta = require('../package.json');
var querystring = require('querystring')
var XmlParser = require('xml2js').Parser;
var Query = require('./gcph-query');

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

var Client = function() {
	// Allow `Client()` to work the same as `new Client()`
	if (!(this instanceof Client)) {
		return new Client();
	}
};
Client.prototype = Object.create(null);
Client.constructor = Client;

/**
 *
 * Target URL: https://www.google.com/accounts/ClientLogin?alt=json
 */
Client.prototype.login = function(username, password, done) {
	// Input validation
	if (typeof done !== 'function') {
		throw new TypeError('`done` was not a function');
	}
	
	var me = this;
	if (isAuthenticated(me)) {
		console.warn('WARNING: Someone is already logged in! Create a new Client instance.');
		done(me[authTokenPropName]);
	}
	else {
		// Input validation continued
		if (!username) {
			done(null, new TypeError('`username` was empty');
		}
		else if (!password) {
			done(null, new TypeError('`password` was empty');
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
				path: '/accounts/ClientLogin?alt=json',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
					'Content-Length': postData.length
				}
			};
			
			var req = https.request(requestMeta, function(res) {
				var responseData = '';
				if (res.statusCode === 200) {
					res.setEncoding('utf8');
					res.on('data', function (chunk) {
						responseData += chunk;
					});
					res.on('end', function() {
						var parser = new XmlParser();
						parser.parseString(responseData, function (err, result) {
							if (!err) {
								var authToken = result.Auth;
								// Store the authorization token item as a read-only property
								Object.defineProperty(me, authTokenPropName, { value: authToken });
								done(authToken);
							}
							else {
								done(null, err);
							}
						});
					});
				}
				else {
					// For Google's subset of status codes, see:
					//   https://developers.google.com/accounts/docs/AuthForInstalledApps#Errors
					done(null, new Error('HTTP ' + res.statusCode + ': Failed to login!'));
				}
			});
			req.on('error', function(err) {
				done(null, err);
			});
			req.write(postData);
			req.end();
		}
	}
};

/**
 * Get all the issues, or all issues matching a query.
 * Target URL: https://code.google.com/feeds/issues/p/{@project}/issues/full?alt=json
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
	
	if (!isAuthenticated(this)) {
		console.error('ERROR: Nobody is logged in!');
		done(null, new Error('This request was unauthorized. Please login first!'));
	}
	else {
		// Input validation continued
		if (!project) {
			done(null, new TypeError('`project` was empty');
		}
		else if (query && !(query instanceof Query)) {
			done(null, new TypeError('`query` was provided but was not an instance of Query');
		}
		else {
			// Do the real work
			query = query || new Query();
			var queryParamsString = (function() {
				var qs = querystring.stringify(query);
				return qs ? '&' + qs : '';
			})();
			var requestMeta = {
				method: 'GET',
				host: 'code.google.com',
				path: '/feeds/issues/p/' + project + '/issues/full?alt=json' + queryParamsString,
				headers: getAuthHeaders(this)
			};
			
			var req = https.request(requestMeta, function(res) {
				
			});
			req.on('error', function(err) {
				done(null, err);
			});
			req.end();
		}
	}
};

/**
 *
 * Target URL: https://code.google.com/feeds/issues/p/{@project}/issues/{@issueId}/comments/full?alt=json
 */
Client.prototype.getComments = function(project, issueId, done) {
	// Input validation
	if (typeof done !== 'function') {
		throw new TypeError('`done` was not a function');
	}
	
	if (!isAuthenticated(this)) {
		console.error('ERROR: Nobody is logged in!');
		done(null, new Error('This request was unauthorized. Please login first!'));
	}
	else {
		// Input validation continued
		if (!project) {
			done(null, new TypeError('`project` was empty');
		}
		else if (!issueId) {
			done(null, new TypeError('`issueId` was empty');
		}
		else {
			// Do the real work
			var requestMeta = {
				method: 'GET',
				host: 'code.google.com',
				path: '/feeds/issues/p/' + project + '/issues/' + issueId + '/comments/full?alt=json',
				headers: getAuthHeaders(this)
			};
			
			var req = https.request(requestMeta, function(res) {
				
			});
			req.on('error', function(err) {
				done(null, err);
			});
			req.end();
		}
	}
};

/**
 * Add a new issue.
 * Target URL: 
 */
Client.prototype.addIssue = function(project, issue, done) {
	// Input validation
	if (typeof done !== 'function') {
		throw new TypeError('`done` was not a function');
	}
	
	if (!isAuthenticated(this)) {
		console.error('ERROR: Nobody is logged in!');
		done(null, new Error('This request was unauthorized. Please login first!'));
	}
	else {
		// Input validation continued
		if (!project) {
			done(null, new TypeError('`project` was empty');
		}
		else if (!issue) {
			done(null, new TypeError('`issue` was empty');
		}
		else if (issue && !(issue instanceof Issue)) {
			done(null, new TypeError('`issue` was provided but was not an instance of Issue');
		}
		else {
			// Do the real work
			var requestMeta = {
				method: 'POST',
				host: 'code.google.com',
				path: '/feeds/issues/p/' + project + '/issues/full?alt=json',
				headers: getAuthHeaders(this)
			};
			
			var req = https.request(requestMeta, function(res) {
				
			});
			req.on('error', function(err) {
				done(null, err);
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
	
	if (!isAuthenticated(this)) {
		console.error('ERROR: Nobody is logged in!');
		done(null, new Error('This request was unauthorized. Please login first!'));
	}
	else {
		// Input validation continued
		if (!project) {
			done(null, new TypeError('`project` was empty');
		}
		else if (!issue) {
			done(null, new TypeError('`issue` was empty');
		}
		else if (issue && !(issue instanceof Issue)) {
			done(null, new TypeError('`issue` was provided but was not an instance of Issue');
		}
		else if (!issue.id) {
			done(null, new TypeError('`issue` was provided but it did not have a valid `id` property');
		}
		else if (!comment) {
			done(null, new TypeError('`comment` was empty');
		}
		else if (comment && !(comment instanceof Comment)) {
			done(null, new TypeError('`comment` was provided but was not an instance of Comment');
		}
		else {
			// Do the real work
			var requestMeta = {
				method: 'POST',
				host: 'code.google.com',
				path: '/feeds/issues/p/' + project + '/issues/' + issue.id + '/comments/full?alt=json',
				headers: getAuthHeaders(this)
			};
			
			var req = https.get(requestMeta, function(res) {
				
			});
			req.on('error', function(err) {
				done(null, err);
			});
		}
	}
};


/*
 * gcph-client
 * https://github.com/JamesMGreene/node-gcph-client
 *
 * Copyright (c) 2012 James M. Greene
 * Licensed under the MIT license.
 */

'use strict';

// Constants
var MAX_CONCURRENT_REQUESTS = 20;
var MAX_RESULTS = 500000;
var JSON_FEED_TYPE = 'json';

// External modules
var querystring = require('querystring');
var https = require('https');
var chain = require('chain-gang').create({ workers: MAX_CONCURRENT_REQUESTS });

var createUniqueIdFromRequest = function(req, reqBody) {
	var taskDescription;
	if (reqBody) {
		req.body = reqBody;
		taskDescription = JSON.stringify(req);
		delete req.body;
	}
	else {
		taskDescription = JSON.stringify(req);
	}
	return chain.defaultNameFor(taskDescription);
};

var pad2zero = function(s) {
	s = '' + s;
	while (s.length < 2) {
		s = '0' + s;
	}
	return s;
};

var getTimestamp = function(date) {
	date = date || new Date();
	return date.getFullYear() + '-' +
		pad2zero(date.getMonth() + 1) + '-' +
		pad2zero(date.getDate())
    + 'T' +
		pad2zero(date.getHours()) + ':' +
		pad2zero(date.getMinutes()) + ':' +
		pad2zero(date.getSeconds()) + 'Z';
};

var totalRequests = 0;
var startDate;

var yellAboutChainLimit = function(chain) {
	if (chain.current > chain.limit || chain.limit !== MAX_CONCURRENT_REQUESTS) {
		console.error('ERROR: Chain broken! Expected limit: ' + MAX_CONCURRENT_REQUESTS + '. Actual limit: ' + chain.limit + '. Current requests: ' + chain.current);
	}
};

chain.on('add', function(name) {
	totalRequests += 1;
	if (!startDate) {
		startDate = +new Date();
	}
	console.log(getTimestamp() + ' [CHAIN] ' + name + ' has been queued. Concurrent requests: ' + chain.current);
	yellAboutChainLimit(chain);
});
chain.on('starting', function(name) {
	console.log(getTimestamp() + ' [CHAIN] ' + name + 'has started running. Concurrent requests: ' + chain.current);
	yellAboutChainLimit(chain);
});
chain.on('finished', function(err, name) {
	console.log(getTimestamp() + ' [CHAIN] ' + name + 'has finished.  Error: ' + err + '. Concurrent requests: ' + chain.current);
	yellAboutChainLimit(chain);
});
chain.on('empty', function() {
	console.log(getTimestamp() + ' [CHAIN] queue is empty. Concurrent requests: ' + chain.current);
	yellAboutChainLimit(chain);
	console.log('Total requests completed: ' + totalRequests + '. Total time (ms): ' + ((+new Date()) - startDate));
});
chain.on('timeout', function(job) {
	console.log(getTimestamp() + ' [CHAIN] ' + job.name + 'timed out. Concurrent requests: ' + chain.current);
	yellAboutChainLimit(chain);
});

process.on('uncaughtException', function(err) {
  console.log('Caught exception: ' + err.stack);
});

process.on('exit', function() {
  console.log('Exiting. Trace:\n');
  console.trace();
  
  console.log('process._getActiveHandles():\n' + JSON.stringify(process._getActiveHandles()));
  console.log('process._getActiveRequests():\n' + JSON.stringify(process._getActiveRequests()));
});

// Internal modules
var appMeta = require('../package.json');
var Query = require('./query');
var Issue = require('./issue');
var Comment = require('./comment');
var didHttpCallSucceed = require('./util').didHttpCallSucceed;

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
var appName = appMeta.name.split('-').map(function(e) { return e ? e.substring(0, 1).toUpperCase() + e.substring(1).toLowerCase() : e; }).join('');
var sourceId = ['NodeJS', appName, appMeta.version].join('-');  // e.g. 'NodeJS-GcphClient-0.1.0'
var authTokenPropName = '_authToken';

var isAuthenticated = function(client) {
	return Object.prototype.hasOwnProperty.call(client, authTokenPropName) && !!client[authTokenPropName];
};

var getAuthHeaders = function(client) {
	return isAuthenticated(client) ?
		{ 'Authorization': 'GoogleLogin auth=' + client[authTokenPropName] } :
		{};
};

// Add a User URI-to-email mapping
var addInfoToUriToPrivateEmailMap = function(privateUser, uriToPrivateEmailMap) {
	uriToPrivateEmailMap[privateUser.uri] = privateUser.email;
};

// Add a User displayName-to-URI mapping
var addInfoToPublicEmailToUriMap = function(publicUser, publicEmailToUriMap) {
	publicEmailToUriMap[publicUser.email] = publicUser.uri;
};

var addPrivateEmailToPublicUser = function(publicUser, uriToPrivateEmailMap) {
	var privateEmail = uriToPrivateEmailMap[publicUser.uri];
	if (privateEmail) {
		publicUser.displayName = publicUser.email;
		publicUser.email = privateEmail;
	}
};

var convertAtomIntoIssues = function(atom, client, done) {
	if (atom && atom.feed && atom.feed.entry) {
		var gcIssues = atom.feed.entry.map(function(e) {
			var gcIssue = Issue.fromRawIssue(e);
			if (client.options.honorPrivacy) {
				var isAuthed = isAuthenticated(client),
					grabInfo = isAuthed ? addInfoToUriToPrivateEmailMap : addInfoToPublicEmailToUriMap,
					infoMap = isAuthed ? client.uriToPrivateEmailMap : client.publicEmailToUriMap;
				
				grabInfo(gcIssue.author, infoMap);
				
				if (gcIssue.owner) {
					grabInfo(gcIssue.owner, infoMap);
				}
				
				if (gcIssue.ccs && gcIssue.ccs.length) {
					gcIssue.ccs.forEach(function(cc) {
						grabInfo(cc, infoMap);
					});
				}
			}
			return gcIssue;
		});
		done(null, gcIssues);
	}
	else {
		done(null, []);
	}
};

var postFixIssuesWithPrivateEmails = function(gcPublicIssues, uriToPrivateEmailMap, done) {
	gcPublicIssues.forEach(function(e) {
		addPrivateEmailToPublicUser(e.author, uriToPrivateEmailMap);
		
		if (e.owner) {
			addPrivateEmailToPublicUser(e.owner, uriToPrivateEmailMap);
		}
		
		if (e.ccs && e.ccs.length) {
			e.ccs.forEach(function(cc) {
				addPrivateEmailToPublicUser(cc, uriToPrivateEmailMap);
			});
		}
	});
	done(null, gcPublicIssues);
};

var convertAtomIntoComments = function(atom, client, done) {
	if (atom && atom.feed && atom.feed.entry) {
		var gcComments = atom.feed.entry.map(function(e) {
			var gcComment = Comment.fromRawComment(e);
			if (client.options.honorPrivacy) {
				var isAuthed = isAuthenticated(client),
					grabInfo = isAuthed ? addInfoToUriToPrivateEmailMap : addInfoToPublicEmailToUriMap,
					infoMap = isAuthed ? client.uriToPrivateEmailMap : client.publicEmailToUriMap;
					
				grabInfo(gcComment.author, infoMap);
				
				// Ignore `issueUpdates.owner` and `issueUpdates.ccs` for now since they aren't actually user objects (just strings)
				// TODO: Hook this up!
			}
			return gcComment;
		});
		
		done(null, gcComments);
	}
	else {
		done(null, []);
	}
};

var postFixCommentsWithPrivateEmails = function(gcPublicComments, uriToPrivateEmailMap, done) {
	gcPublicComments.forEach(function(e) {
		addPrivateEmailToPublicUser(e.author, uriToPrivateEmailMap);

		// Ignore `issueUpdates.owner` and `issueUpdates.ccs` for now since they aren't actually user objects (just strings)
		// TODO: Hook this up!
	});
	done(null, gcPublicComments);
};


var Client = function(opts) {
	// Allow `Client()` to work the same as `new Client()`
	if (!(this instanceof Client)) {
		return new Client(opts);
	}
	
	// Default
	opts = opts || {};
	
	this.options = {
		suppressAuthWarnings: false,
		honorPrivacy: false
	};
	
	this.anonClient = null;
	
	// Lookup a user's URI (`User#uri`) by their public email address (`User#displayName`)
	this.publicEmailToUriMap = {
		// 'james.m....@gmail.com': 'http://code.google.com/u/101963681963300214110/'
	};
	
	// Lookup a user's private email address (`User#email`) by their URI (`User#uri`)
	this.uriToPrivateEmailMap = {
		// 'http://code.google.com/u/101963681963300214110/': 'james.m.greene@gmail.com'
	};
	
	// If you do not authenticate, you will receive `console.warn` messages (or error callbacks, depending on the method).
	// To supress the `console.warn` messages, set this to `true`.
	if (typeof opts.suppressAuthWarnings === 'boolean') {
		this.options.suppressAuthWarnings = opts.suppressAuthWarnings;
	}
	
	// If you are a project member and you are authenticated, you will see users' private email addresses.
	// If you do not intend to share those, you can also request their public email address in addition for use in your output.
	// To request their public email address to added, set this to `true`.
	// WARNING: Performance will degrade substantially as this will greatly increase the number of HTTP requests.
	if (typeof opts.honorPrivacy === 'boolean') {
		this.options.honorPrivacy = opts.honorPrivacy;
	}
};

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
					'Content-Length': postData.length,
					'Accept': 'text/plain'
				}
			};
			
			chain.add(
				function(job) {
					// Bind so the context doesn't get messed up with Q
					job.finish.bind(job);
					
					var req = https.request(requestMeta, function(res) {
						var chunks = [];
						res.setEncoding('utf8');
						res.on('data', function (chunk) {
							chunks.push(chunk);
						});
						res.on('end', function() {
							var responseData = chunks.join('');
							try {
								var lines = responseData.replace(/\r\n/g, '\n').split('\n');
								var loginData = {};
								for (var l = 0, len = lines.length; l < len; l++) {
									var line = lines[l];
									var index = line.indexOf('=');
									if (index !== -1) {
										var key = line.substring(0, index);
										var val = line.substring(index + 1);

										loginData[key.toLowerCase()] = val;
									}
								}

								if (loginData.error) {
									var failureReason = GOOGLE_LOGIN_FAILURE_EXPLANATIONS[loginData.error];
									job.finish(new Error('Failed to login! Reason: ' + failureReason));
								}
								else if (!loginData.auth) {
									job.finish(new Error('Failed to login for an unknown reason!'));
								}
								else {
									var authToken = loginData.auth;
									me[authTokenPropName] = authToken;
									//console.info('INFO: Success! You are now logged in as: ' + username);
									job.finish(null, loginData);
								}
							}
							catch (err) {
								job.finish(err, responseData);
							}
						});
					});
					req.on('error', function(err) {
						job.finish(err);
					});
					req.write(postData);
					req.end();
				},
				createUniqueIdFromRequest(requestMeta, postData),
				done
			);
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
	if (!isAuthenticated(me) && !me.options.suppressAuthWarnings) {
		console.warn('WARNING: This request was unauthorized! Please login first to receive more detailed data from the API.');
	}
	
	if (isAuthenticated(me) && me.options.honorPrivacy && !me.anonClient) {
		me.anonClient = new Client({
			suppressAuthWarnings: true,
			honorPrivacy: true
		});
	}
	
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
		query.alt = query.alt || JSON_FEED_TYPE;
		query['max-results'] = query['max-results'] || MAX_RESULTS;
		
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
		requestMeta.headers['Accept'] = 'application/json';
		
		chain.add(
			function(job) {
				// Bind so the context doesn't get messed up with Q
				job.finish.bind(job);
				
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
								var finalDoneCallback = function(err, gcIssues) {
									job.finish(err, gcIssues);
								};
								var doneCallback = !me.anonClient ?
										finalDoneCallback :
										function(err /*, gcIssues */) {
											if (err) {
												job.finish(err);
											}
											else {
												me.anonClient.getIssues(project, query, function(err, gcObfuscatedIssues) {
													postFixIssuesWithPrivateEmails(gcObfuscatedIssues, me.uriToPrivateEmailMap, finalDoneCallback);
												});
											}
										};
								convertAtomIntoIssues(atom, me, doneCallback);
							}
							catch (err) {
								job.finish(err, responseData);
							}
						}
						else {
							job.finish(new Error('Failed to retrieve issues! HTTP ' + res.statusCode + ': ' + responseData));
						}
					});
				});
				req.on('error', function(err) {
					job.finish(err);
				});
				req.end();
			},
			createUniqueIdFromRequest(requestMeta),
			done
		);
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
	if (!isAuthenticated(me) && !me.options.suppressAuthWarnings) {
		console.warn('WARNING: This request was unauthorized! Please login first to receive more detailed data from the API.');
	}
	
	if (isAuthenticated(me) && me.options.honorPrivacy && !me.anonClient) {
		me.anonClient = new Client({
			suppressAuthWarnings: true,
			honorPrivacy: true
		});
	}
	
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
			'alt': JSON_FEED_TYPE,
			'max-results': MAX_RESULTS
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
		requestMeta.headers['Accept'] = 'application/json';
		
		chain.add(
			function(job) {
				// Bind so the context doesn't get messed up with Q
				job.finish.bind(job);
				
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
								var finalDoneCallback = function(err, gcComments) {
									job.finish(err, gcComments);
								};
								var doneCallback = !me.anonClient ?
										finalDoneCallback :
										function(err /*, gcComments */) {
											if (err) {
												job.finish(err);
											}
											else {
												me.anonClient.getComments(project, issueId, function(err, gcObfuscatedComments) {
													postFixCommentsWithPrivateEmails(gcObfuscatedComments, me.uriToPrivateEmailMap, finalDoneCallback);
												});
											}
										};
								convertAtomIntoComments(atom, me, doneCallback);
							}
							catch (err) {
								job.finish(err, responseData);
							}
						}
						else {
							job.finish(new Error('Failed to retrieve comments! HTTP ' + res.statusCode + ': ' + responseData));
						}
					});
				});
				req.on('error', function(err) {
					job.finish(err);
				});
				req.end();
			},
			createUniqueIdFromRequest(requestMeta),
			done
		);
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
		else if (!(issue instanceof Issue)) {
			console.log(JSON.stringify(issue));
			done(new TypeError('`issue` was provided but was not an instance of Issue'));
		}
		else if (!issue.title) {
			done(new TypeError('`issue` was provided but did not have a `title` property set'));
		}
		else if (!issue.content) {
			done(new TypeError('`issue` was provided but did not have a `content` property set'));
		}
		else if (!issue.author) {
			done(new TypeError('`issue` was provided but did not have a `author` property set'));
		}
		else {
			// Do the real work
			var postData = issue.toAtomXml();
			var requestMeta = {
				method: 'POST',
				host: 'code.google.com',
				path: '/feeds/issues/p/' + project + '/issues/full?alt=json',
				headers: getAuthHeaders(me)
			};
			requestMeta.headers['Content-Type'] = 'application/atom+xml';
			requestMeta.headers['Content-Length'] = postData.length;
			requestMeta.headers['Accept'] = 'application/json';
			
			chain.add(
				function(job) {
					// Bind so the context doesn't get messed up with Q
					job.finish.bind(job);
					
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
									var rawIssue = JSON.parse(responseData);
									var cleanIssue = Issue.fromRawIssue(rawIssue.entry);
									job.finish(null, cleanIssue);
								}
								catch (err) {
									job.finish(err, responseData);
								}
							}
							else {
								job.finish(new Error('Failed to add a new issue! HTTP ' + res.statusCode + ': ' + responseData));
							}
						});
					});
					req.on('error', function(err) {
						job.finish(err);
					});
					req.write(postData);
					req.end();
				},
				createUniqueIdFromRequest(requestMeta, postData),
				done
			);
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
			done(new TypeError('`issue` was provided but did not have an `id` property'));
		}
		else if (!comment) {
			done(new TypeError('`comment` was empty'));
		}
		else if (!(comment instanceof Comment)) {
			done(new TypeError('`comment` was provided but was not an instance of Comment'));
		}
		else if (!comment.author) {
			done(new TypeError('`comment` was provided but did not have an `author` property set'));
		}
		else {
			// Do the real work
			var postData = comment.toAtomXml();
			var requestMeta = {
				method: 'POST',
				host: 'code.google.com',
				path: '/feeds/issues/p/' + project + '/issues/' + issue.id + '/comments/full?alt=json',
				headers: getAuthHeaders(me)
			};
			requestMeta.headers['Content-Type'] = 'application/atom+xml';
			requestMeta.headers['Content-Length'] = postData.length;
			requestMeta.headers['Accept'] = 'application/json';
			
			chain.add(
				function(job) {
					// Bind so the context doesn't get messed up with Q
					job.finish.bind(job);
					
					var req = https.get(requestMeta, function(res) {
						var chunks = [];
						res.setEncoding('utf8');
						res.on('data', function (chunk) {
							chunks.push(chunk);
						});
						res.on('end', function() {
							var responseData = chunks.join('');
							if (didHttpCallSucceed(res)) {
								try {
									var rawComment = JSON.parse(responseData);
									var cleanComment = Comment.fromRawComment(rawComment.entry);
									job.finish(null, cleanComment);
								}
								catch (err) {
									job.finish(err, responseData);
								}
							}
							else {
								job.finish(new Error('Failed to update an existing issue! HTTP ' + res.statusCode + ': ' + responseData));
							}
						});
					});
					req.on('error', function(err) {
						job.finish(err);
					});
					req.write(postData);
					req.end();
				},
				createUniqueIdFromRequest(requestMeta, postData),
				done
			);
		}
	}
};

// Export!
module.exports = Client;

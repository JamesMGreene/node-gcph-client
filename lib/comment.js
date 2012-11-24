/*!
 * gcph-client
 * https://github.com/JamesMGreene/node-gcph-client
 *
 * Copyright (c) 2012 James M. Greene
 * Licensed under the MIT license.
 */

'use strict';

var fixUsername = require('./util').fixUsername;


/**
* Definition of properties gleaned from:
*   {Looking at API output}
*/
var commentFields = [
	'id',
	'author',
	'title',
	'content',
	'published',
	'updated',
	'links',
	'issueUpdates'
];

/**
*
*/
var Comment = function(values) {
	// Allow `Comment()` to work the same as `new Comment()`
	if (!(this instanceof Comment)) {
		return new Comment(values);
	}
	
	var me = Object.create(null);
	
	commentFields.map(function(e) {
		Object.defineProperty(me, e, {
			value: values ? (values[e] || null) : null,
			writable: true,
			enumerable: true
		});
	});
	
	// Seal it off!
	Object.seal(me);
	
	return me;
};

/**
* Keys are the Google Code JSON property names.
*/
var issueUpdatesMetadata = {
	'issues$label': {
		arity: 2,
		key: 'labels'
	},
	'issues$blockedOnUpdate': {
		arity: 2,
		key: 'blocks'
	},
	'issues$summary': {
		arity: 1,
		key: 'title'
	},
	'issues$status': {
		arity: 1,
		key: 'status'
	},
	'issues$mergedIntoUpdate': {
		arity: 1,
		key: 'mergedInto'
	},
	'issues$ownerUpdate': {
		arity: 1,
		key: 'owner'
	},
	'issues$ccUpdate': {
		arity: 2,
		key: 'ccs'
	}
};

/**
*
*/
Comment.fromRawComment = function(rawComment) {
	try {
		var commentValues = {
			'id': (function(commentUrl) { return commentUrl.slice(commentUrl.lastIndexOf('/' + 1)); })(rawComment.id.$t),
			'author': fixUsername(rawComment.author[0].name.$t),
			'title': rawComment.title.$t,
			'content': rawComment.content.$t,
			'published': rawComment.published.$t,
			'updated': rawComment.updated.$t,
			'links': rawComment.link || [],
			'issueUpdates': (function() {
				var updates = {};
				Object.keys(rawComment.issues$updates || {}).forEach(function(key) {
					var metadata = issueUpdatesMetadata[key];
					switch (metadata.arity) {
						case 2:
							updates[metadata.key] = {
								added: rawComment.issues$updates[key].map(function(e) { return e.$t; }).filter(function(s) { return s.charAt(0) !== '-'; }),
								removed: rawComment.issues$updates[key].map(function(e) { return e.$t; }).filter(function(s) { return s.charAt(0) === '-'; })
							};
							break;
						case 1:
							updates[metadata.key] = rawComment.issues$updates[key].$t;
							break;
						default:
							break;
					}
				});
				return updates;
			})()
		};
		return new Comment(commentValues);
	}
	catch (e) {
		var id = (rawComment && rawComment.id && rawComment.id.$t) ?
			(function(commentUrl) { return commentUrl.slice(commentUrl.lastIndexOf('/' + 1)); })(rawComment.id.$t) :
			'WTF';
		var issueId = (rawComment && rawComment.id && rawComment.id.$t) ?
			(function(commentUrl) {
				var issueIdStartIndex = commentUrl.lastIndexOf('/issues/') + 8;
				var issueIdEndIndex = commentUrl.lastIndexOf('/comments/');
				return commentUrl.slice(issueIdStartIndex, issueIdEndIndex - issueIdStartIndex);
			})(rawComment.id.$t) :
			'WTF';
		console.error('Error evaluating Issue #' + issueId + '\'s Comment #' + id + ': ' + e.stack + '\n\nJSON:\n' + JSON.stringify(rawComment) + '\n');
	}
};


// Export!
module.exports = Comment;

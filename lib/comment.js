/*!
 * gcph-client
 * https://github.com/JamesMGreene/node-gcph-client
 *
 * Copyright (c) 2012 James M. Greene
 * Licensed under the MIT license.
 */

'use strict';

var appendGmailDomainToUsername = require('./util').appendGmailDomainToUsername;


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
	
	var me = this;
	
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
Comment.prototype = Object.create(null);
Comment.constructor = Comment;

/**
*
*/
Comment.prototype.toRawCommentXml = function() {
	var rawCommentXmlBuilder = [
''
];
	// TODO: Implement
	/*
<?xml version="1.0" encoding="UTF-8"?>
<entry xmlns="http://www.w3.org/2005/Atom" xmlns:issues="http://schemas.google.com/projecthosting/issues/2009">
  <content type="html">This is comment - update issue</content>
  <author>
    <name>elizabeth.bennet</name>
  </author>
  <issues:updates>
    <issues:summary>This is updated issue summary</issues:summary>
    <issues:status>Started</issues:status>
    <issues:ownerUpdate>charlotte.lucas</issues:ownerUpdate>
    <issues:label>-Type-Defect</issues:label>
    <issues:label>Type-Enhancement</issues:label>
    <issues:label>-Milestone-2009</issues:label>
    <issues:label>-Priority-Medium</issues:label>
    <issues:label>Priority-Low</issues:label>
    <issues:ccUpdate>-fitzwilliam.darcy</issues:ccUpdate>
    <issues:ccUpdate>marialucas@example.com</issues:ccUpdate>
  </issues:updates>
</entry>
	*/
	
	return rawCommentXmlBuilder.join('\n');
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
			'id': (function(commentUrl) { return commentUrl.slice(commentUrl.lastIndexOf('/') + 1); })(rawComment.id.$t),
			'author': appendGmailDomainToUsername(rawComment.author[0].name.$t),
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

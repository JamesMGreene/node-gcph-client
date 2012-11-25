/*!
 * gcph-client
 * https://github.com/JamesMGreene/node-gcph-client
 *
 * Copyright (c) 2012 James M. Greene
 * Licensed under the MIT license.
 */

'use strict';

var util = require('./util');
var appendGmailDomainToUsername = util.appendGmailDomainToUsername;
var removeGmailDomainFromUsername = util.removeGmailDomainFromUsername;
var xmlEncode = util.xmlEncode;


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
Comment.prototype.toAtomXml = function() {
	var atomXmlBuilder = [
'<?xml version="1.0" encoding="UTF-8"?>',
'<entry xmlns="http://www.w3.org/2005/Atom" xmlns:issues="http://schemas.google.com/projecthosting/issues/2009">',
'  <author>',
'    <name>' + xmlEncode(removeGmailDomainFromUsername(this.author)) + '</name>',
'  </author>'
];
	
	if (this.content) {
		atomXmlBuilder.push(
'  <content type="html">' + xmlEncode(this.content) + '</content>'
);
	}
	
	if (this.issueUpdates && Object.keys(this.issueUpdates).length) {
		atomXmlBuilder.push(
'  <issues:updates>'
);
		if (this.issueUpdates.title) {
			atomXmlBuilder.push(
'    <issues:summary>' + xmlEncode(this.issueUpdates.title) + '</issues:summary>'
);
		}
		
		if (this.issueUpdates.status) {
			atomXmlBuilder.push(
'    <issues:status>' + xmlEncode(this.issueUpdates.status) + '</issues:status>'
);
		}
		
		if (this.issueUpdates.owner) {
			atomXmlBuilder.push(
'    <issues:ownerUpdate>' + xmlEncode(removeGmailDomainFromUsername(this.issueUpdates.owner)) + '</issues:ownerUpdate>'
);
		}
		
		if (this.issueUpdates.mergedInto) {
			atomXmlBuilder.push(
'    <issues:mergedIntoUpdate>' + xmlEncode(this.issueUpdates.mergedInto) + '</issues:mergedIntoUpdate>'
);
		}
		
		var appendAtomXmlForList = function(listWrapper, elementName, indentText) {
			// Set default values, if necessary
			indentText = indentText || '';
			
			if (listWrapper) {
				if (listWrapper.removed && listWrapper.removed.length) {
					listWrapper.removed.forEach(function(block) {
						atomXmlBuilder.push(
indentText + '<' + elementName + '>-' + xmlEncode(block) + '</' + elementName + '>'
);
					});
				}
				if (listWrapper.added && listWrapper.added.length) {
					listWrapper.added.forEach(function(block) {
						atomXmlBuilder.push(
indentText + '<' + elementName + '>' + xmlEncode(block) + '</' + elementName + '>'
);
					});
				}
			}
		};
		
		appendAtomXmlForList(this.issueUpdates.blocks, 'issues:blockedOnUpdate', '    ');
		appendAtomXmlForList(this.issueUpdates.labels, 'issues:label', '    ');
		appendAtomXmlForList(this.issueUpdates.ccs, 'issues:ccUpdate', '    ');
		
		atomXmlBuilder.push(
'  </issues:updates>'
);
	}
	
	// Close it off for well-formedness
	atomXmlBuilder.push('</entry>');
	
	return atomXmlBuilder.join('\n');
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

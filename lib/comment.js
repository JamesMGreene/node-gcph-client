/*!
 * gcph-client
 * https://github.com/JamesMGreene/node-gcph-client
 *
 * Copyright (c) 2012 James M. Greene
 * Licensed under the MIT license.
 */

'use strict';

var User = require('./user');
var util = require('./util');
var appendGmailDomainToUsername = util.appendGmailDomainToUsername;
var removeGmailDomainFromUsername = util.removeGmailDomainFromUsername;
var xmlEncode = util.xmlEncode;

var appendAtomXmlForList = function(atomXmlBuilder, listWrapper, elementName, indentText) {
	// Set default values, if necessary
	indentText = indentText || '';
	
	if (listWrapper) {
		if (listWrapper.removed && listWrapper.removed.length) {
			listWrapper.removed.forEach(function(item) {
				atomXmlBuilder.push(
indentText + '<' + elementName + '>-' + xmlEncode(item) + '</' + elementName + '>'
);
			});
		}
		if (listWrapper.added && listWrapper.added.length) {
			listWrapper.added.forEach(function(item) {
				atomXmlBuilder.push(
indentText + '<' + elementName + '>' + xmlEncode(item) + '</' + elementName + '>'
);
			});
		}
	}
};

var getProjectNameFromUrl = function(commentUrl) {
	var startIndex = commentUrl.lastIndexOf('/p/') + 3;
	var endIndex = commentUrl.indexOf('/', startIndex);
	return commentUrl.substring(startIndex, (endIndex !== -1 ? endIndex : undefined));
};


/**
* Definition of properties gleaned from:
*   {Looking at API output}
*/
var commentFields = [
	'id',
	'issueId',
	'project',
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

	// Fix up the author value
	if (me.author) {
		if (typeof me.author === 'string') {
			var authorEmail = me.author;
			me.author = {
				email: authorEmail
			};
		}
		if (me.author.email) {
			me.author.email = appendGmailDomainToUsername(me.author.email);
		}
	}

	// Seal it off!
	Object.seal(me);

	return me;
};

/**
*
*/
Comment.prototype.toAtomXml = function() {
	var atomXmlBuilder = [
'<?xml version="1.0" encoding="UTF-8"?>',
'<entry xmlns="http://www.w3.org/2005/Atom" xmlns:issues="http://schemas.google.com/projecthosting/issues/2009">',
'  <author>',
'    <name>' + xmlEncode(removeGmailDomainFromUsername(this.author.email)) + '</name>',
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
		
		appendAtomXmlForList(atomXmlBuilder, this.issueUpdates.blocks, 'issues:blockedOnUpdate', '    ');
		appendAtomXmlForList(atomXmlBuilder, this.issueUpdates.labels, 'issues:label', '    ');
		
		if (this.issueUpdates.ccs) {
			var ccEmails = {
				added: (this.issueUpdates.ccs.added || []).map(removeGmailDomainFromUsername),
				removed: (this.issueUpdates.ccs.removed || []).map(removeGmailDomainFromUsername)
			};
			appendAtomXmlForList(atomXmlBuilder, ccEmails, 'issues:ccUpdate', '    ');
		}

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
		key: 'blocks',
		transformFn: function(blockedOn) {
			return parseInt(blockedOn, 10);
		}
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
		key: 'mergedInto',
		transformFn: function(mergedInto) {
			return parseInt(mergedInto, 10);
		}
	},
	'issues$ownerUpdate': {
		arity: 1,
		key: 'owner',
		transformFn: appendGmailDomainToUsername
	},
	'issues$ccUpdate': {
		arity: 2,
		key: 'ccs',
		transformFn: appendGmailDomainToUsername
	}
};

/**
*
*/
Comment.fromRawComment = function(rawComment) {
	try {
		var author = User.fromRawUser(rawComment.author[0]);
		var commentValues = {
			'id':
				parseInt(
					(function(commentUrl) {
						return commentUrl.slice(commentUrl.lastIndexOf('/') + 1);
					})(rawComment.id.$t),
					10
				),
			'issueId':
				parseInt(
					(function(commentUrl) {
						var issueIdStartIndex = commentUrl.lastIndexOf('/issues/') + 8;
						var issueIdEndIndex = commentUrl.lastIndexOf('/comments/');
						return commentUrl.slice(issueIdStartIndex, issueIdEndIndex);
					})(rawComment.id.$t),
					10
				),
			'project':
				rawComment.issues$project ?
					rawComment.issues$project.$t :
					getProjectNameFromUrl(rawComment.id.$t),
			'author': author,
			'title': rawComment.title.$t.replace(/^(Comment [\d]+ by )(.+)$/, '$1' + (author.displayName || author.email)),
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
								added:
									(function() {
										var addedVals = rawComment.issues$updates[key].filter(function(e) {
												return e.$t.charAt(0) !== '-';
											}).map(function(e) {
												return e.$t;
											});
										// Special transforms
										if (addedVals && addedVals.length && typeof metadata.transformFn === 'function') {
											return addedVals.map(metadata.transformFn);
										}
										return addedVals;
									})(),
								removed:
									(function() {
										var removedVals = rawComment.issues$updates[key].filter(function(e) {
												return e.$t.charAt(0) === '-';
											}).map(function(e) {
												return e.$t.substring(1);
											});
										// Special transforms
										if (removedVals && removedVals.length && typeof metadata.transformFn === 'function') {
											return removedVals.map(metadata.transformFn);
										}
										return removedVals;
									})()
							};
							break;
						case 1:
							updates[metadata.key] = (function() {
								var val = rawComment.issues$updates[key].$t;
								// Special transforms
								if (typeof metadata.transformFn === 'function') {
									return metadata.transformFn(val);
								}
								return val;
							})();
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
				parseInt(
					(function(commentUrl) {
						return commentUrl.slice(commentUrl.lastIndexOf('/') + 1);
					})(rawComment.id.$t),
					10
				) :
				'WTF';
		var issueId = (rawComment && rawComment.id && rawComment.id.$t) ?
				parseInt(
					(function(commentUrl) {
						var issueIdStartIndex = commentUrl.lastIndexOf('/issues/') + 8;
						var issueIdEndIndex = commentUrl.lastIndexOf('/comments/');
						return commentUrl.slice(issueIdStartIndex, issueIdEndIndex);
					})(rawComment.id.$t),
					10
				) :
				'WTF';
		console.error('Error evaluating Issue #' + issueId + '\'s Comment #' + id + ': ' + e.stack + '\n\nJSON:\n' + JSON.stringify(rawComment) + '\n');
	}
};


// Export!
module.exports = Comment;

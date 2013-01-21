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
var removeGmailDomainFromUsername = util.removeGmailDomainFromUsername;
var xmlEncode = util.xmlEncode;

var getProjectNameFromUrl = function(issueUrl) {
	var startIndex = issueUrl.lastIndexOf('/p/') + 3;
	var endIndex = issueUrl.indexOf('/', startIndex);
	return issueUrl.substring(startIndex, (endIndex !== -1 ? endIndex : undefined));
};

/**
* Definition of properties gleaned from:
*   {Looking at API output}
*/
var issueFields = [
	'id',
	'project',
	'author',
	'title',
	'content',
	'published',
	'updated',
	'state',
	'closedDate',
	'labels',
	'blocks',
	'owner',
	'ccs',
	'stars',
	'status',
	'comments',
	'links'
];

/**
*
*/
var Issue = function(values) {
	// Allow `Issue()` to work the same as `new Issue()`
	if (!(this instanceof Issue)) {
		return new Issue(values);
	}
	
	var me = this;
	
	issueFields.map(function(e) {
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
*
*/
Issue.prototype.toAtomXml = function() {
	// Set default labels if not present
	var labels = (this.labels || []).slice(0);
	if (!labels.some(function(e) { return e.substring(0, 5) === 'Type-'; })) {
		labels.push('Type-Defect');
	}
	if (!labels.some(function(e) { return e.substring(0, 9) === 'Priority-'; })) {
		labels.push('Priority-Medium');
	}

	var atomXmlBuilder = [
'<?xml version="1.0" encoding="UTF-8"?>',
'<entry xmlns="http://www.w3.org/2005/Atom" xmlns:issues="http://schemas.google.com/projecthosting/issues/2009">',
'  <title>' + xmlEncode(this.title) + '</title>',
'  <content type="html">' + xmlEncode(this.content) + '</content>',
'  <author>',
'    <name>' + xmlEncode(removeGmailDomainFromUsername(this.author.email)) + '</name>',
'  </author>',
'  <issues:status>' + xmlEncode(this.status || 'New') + '</issues:status>'
];
	
	// Dynamically add the labels
	labels.forEach(function(label) {
		atomXmlBuilder.push(
'  <issues:label>' + xmlEncode(label) + '</issues:label>'
);
	});
	
	// Dynamically add the blocks
	blocks.forEach(function(block) {
		atomXmlBuilder.splice.apply(atomXmlBuilder, [atomXmlBuilder.length, 0, 
'  <issues:blockedOn>',
'    <issues:id>' + xmlEncode(block) + '</issues:id>',
'  </issues:blockedOn>'
]);
	});
	
	// Only set the Owner property if it is actually set
	if (this.owner) {
		atomXmlBuilder.splice.apply(atomXmlBuilder, [atomXmlBuilder.length, 0, 
'  <issues:owner>',
'    <issues:username>' + xmlEncode(removeGmailDomainFromUsername(this.owner.email)) + '</issues:username>',
'  </issues:owner>'
]);
	}
	
	// Only set the CCs property if there are values for it
	if (this.ccs && this.ccs.length) {
		this.ccs.forEach(function(cc) {
			atomXmlBuilder.splice.apply(atomXmlBuilder, [atomXmlBuilder.length, 0, 
'  <issues:cc>',
'    <issues:username>' + xmlEncode(removeGmailDomainFromUsername(cc.email)) + '</issues:username>',
'  </issues:cc>'
]);
		});
	}
	
	// Close it off for well-formedness
	atomXmlBuilder.push('</entry>');
	
	return atomXmlBuilder.join('\n');
};

/**
*
*/
Issue.fromRawIssue = function(rawIssue) {
	try {
		var issueValues = {
			'id': rawIssue.issues$id.$t,  /* already a number */
			'project':
				rawIssue.issues$project ?
					rawIssue.issues$project.$t :
					getProjectNameFromUrl(rawIssue.id.$t),
			'author': User.fromRawUser(rawIssue.author[0]),
			'title': rawIssue.title.$t,
			'content': rawIssue.content.$t,
			'published': rawIssue.published.$t,
			'updated': rawIssue.updated.$t,
			'labels': (rawIssue.issues$label || []).map(function(e) { return e.$t; }),
			'blocks': (rawIssue.issues$blockedOn || []).map(function(e) { return e.issues$id.$t; }),  /* already a number */
			'owner': User.fromRawUser(rawIssue.issues$owner),
			'ccs': (rawIssue.issues$cc || []).map(function(e) { return User.fromRawUser(e); }),
			'stars': rawIssue.issues$stars.$t,  /* already a number */
			'status': rawIssue.issues$status.$t,
			'state': rawIssue.issues$state.$t,
			'closedDate': rawIssue.issues$closedDate ? rawIssue.issues$closedDate.$t : null,
			'links': rawIssue.link || [],
			'comments': []
		};
		return new Issue(issueValues);
	}
	catch (e) {
		var id = (rawIssue && rawIssue.issues$id && rawIssue.issues$id.$t) ? rawIssue.issues$id.$t : 'WTF';
		console.error('Error evaluating Issue #' + id + ': ' + e.stack + '\n\nJSON:\n' + JSON.stringify(rawIssue) + '\n');
	}
};


// Export!
module.exports = Issue;

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
var issueFields = [
	'id',
	'author',
	'title',
	'content',
	'published',
	'updated',
	'state',
	'closedDate',
	'labels',
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
Issue.prototype = Object.create(null);
Issue.constructor = Issue;

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
'    <name>' + xmlEncode(removeGmailDomainFromUsername(this.author)) + '</name>',
'  </author>',
'  <issues:status>' + xmlEncode(this.status || 'New') + '</issues:status>'
];
	
	// Dynamically add the labels
	labels.forEach(function(label) {
		atomXmlBuilder.push(
'  <issues:label>' + xmlEncode(label) + '</issues:label>'
);
	});
	
	// Only set the Owner property if it is actually set
	if (this.owner) {
		atomXmlBuilder.splice.apply(atomXmlBuilder, [atomXmlBuilder.length, 0, 
'  <issues:owner>',
'    <issues:username>' + xmlEncode(removeGmailDomainFromUsername(this.owner)) + '</issues:username>',
'  </issues:owner>'
]);
	}
	
	// Only set the CCs property if there are values for it
	if (this.ccs && this.ccs.length) {
		this.ccs.forEach(function(cc) {
			atomXmlBuilder.splice.apply(atomXmlBuilder, [atomXmlBuilder.length, 0, 
'  <issues:cc>',
'    <issues:username>' + xmlEncode(removeGmailDomainFromUsername(cc)) + '</issues:username>',
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
			'id': rawIssue.issues$id.$t,
			'author': appendGmailDomainToUsername(rawIssue.author[0].name.$t),
			'title': rawIssue.title.$t,
			'content': rawIssue.content.$t,
			'published': rawIssue.published.$t,
			'updated': rawIssue.updated.$t,
			'labels': (rawIssue.issues$label || []).map(function(e) { return e.$t; }),
			'owner': rawIssue.issues$owner ? appendGmailDomainToUsername(rawIssue.issues$owner.issues$username.$t) : null,
			'ccs': (rawIssue.issues$cc || []).map(function(e) { return appendGmailDomainToUsername(e.issues$username.$t); }),
			'stars': rawIssue.issues$stars.$t,
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

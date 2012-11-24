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
	
	var me = Object.create(null);
	
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
Issue.prototype.toRawIssue() {
	
};

/**
*
*/
Issue.fromRawIssue = function(rawIssue) {
	try {
		var issueValues = {
			'id': rawIssue.issues$id.$t,
			'author': fixUsername(rawIssue.author[0].name.$t),
			'title': rawIssue.title.$t,
			'content': rawIssue.content.$t,
			'published': rawIssue.published.$t,
			'updated': rawIssue.updated.$t,
			'labels': (rawIssue.issues$label || []).map(function(e) { return e.$t; }),
			'owner': rawIssue.issues$owner ? fixUsername(rawIssue.issues$owner.issues$username.$t) : null,
			'ccs': (rawIssue.issues$cc || []).map(function(e) { return fixUsername(e.issues$username.$t); }),
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

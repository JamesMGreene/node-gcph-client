/*
 * gcph-client
 * https://github.com/JamesMGreene/node-gcph-client
 *
 * Copyright (c) 2012 James M. Greene
 * Licensed under the MIT license.
 */

'use strict';

exports = Query;

/**
 * 
 * Definition of properties: http://code.google.com/p/support/wiki/IssueTrackerAPIPython#Retrieving_issues_using_query_parameters
 */
var Query = function(values) {
	var me = this;
	
	// Allow `Query()` to work the same as `new Query()`
	if (!(me instanceof Query)) {
		return new Query(values);
	}
	
	var queryFields = [
		'alt',
		'author',
		'can',
		'id',
		'label',
		'max-results',
		'owner',
		'published-min',
		'published-max',
		'q',
		'status',
		'start-index',
		'status',
		'updated-min',
		'updated-max'
	];
	queryFields.map(function(e) {
		Object.defineProperty(me, e, {
			value: values[e] || null,
			writable: true
		});
	});
	
	// Seal it off!
	Object.seal(me);
};
Query.prototype = Object.create(null);
Query.constructor = Query;
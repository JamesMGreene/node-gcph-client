/*
 * gcph-client
 * https://github.com/JamesMGreene/node-gcph-client
 *
 * Copyright (c) 2012 James M. Greene
 * Licensed under the MIT license.
 */

'use strict';

var querystring = require('querystring');

/**
 * Definition of properties gleaned from:
 *   http://code.google.com/p/support/wiki/IssueTrackerAPI#Retrieving_issues_using_query_parameters
 */
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
	'start-index',
	'status',
	'updated-min',
	'updated-max'
];

/**
 * 
 */
var Query = function(values) {
	// Allow `Query()` to work the same as `new Query()`
	if (!(this instanceof Query)) {
		return new Query(values);
	}
	
	var me = Object.create(null);
	
	queryFields.map(function(e) {
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
Query.stringify = function(query) {
	var queryWithoutEmptyValues = {};
	Object.keys(query).forEach(function(e) {
		if (query[e] != null && query[e] !== '') {
			queryWithoutEmptyValues[e] = query[e];
		}
	});
	return querystring.stringify(queryWithoutEmptyValues);
};


// Export!
module.exports = Query;

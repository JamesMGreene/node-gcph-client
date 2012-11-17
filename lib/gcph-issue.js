/*
 * gcph-client
 * https://github.com/JamesMGreene/node-gcph-client
 *
 * Copyright (c) 2012 James M. Greene
 * Licensed under the MIT license.
 */

'use strict';

exports = Issue;

var Issue = function(values) {
	var me = this;
	
	// Allow `Issue()` to work the same as `new Issue()`
	if (!(me instanceof Issue)) {
		return new Issue(values);
	}
	
	var commentFields = [
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
	commentFields.map(function(e) {
		Object.defineProperty(me, e, {
			value: values[e] || null,
			writable: true
		});
	});
	
	// Seal it off!
	Object.seal(me);
};
Issue.prototype = Object.create(null);
Issue.constructor = Issue;
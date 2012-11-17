/*
 * gcph-client
 * https://github.com/JamesMGreene/node-gcph-client
 *
 * Copyright (c) 2012 James M. Greene
 * Licensed under the MIT license.
 */

'use strict';

exports = Comment;

var Comment = function(values) {
	var me = this;
	
	// Allow `Comment()` to work the same as `new Comment()`
	if (!(me instanceof Comment)) {
		return new Comment(values);
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
Comment.prototype = Object.create(null);
Comment.constructor = Comment;
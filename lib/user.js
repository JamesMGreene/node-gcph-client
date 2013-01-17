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
var userFields = [
	'email',       // 'ariya.hidayat@gmail.com'
	'uri',         // 'http://code.google.com/u/103266860731871773002/'
	'displayName'  // 'ariya.hi...@gmail.com'
];

/**
*
*/
var User = function(values) {
	// Allow `User()` to work the same as `new User()`
	if (!(this instanceof User)) {
		return new User(values);
	}
	
	var me = this;
	
	userFields.map(function(e) {
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
User.fromRawUser = function(rawUser) {
	try {
		if (rawUser) {
			var userValues = {
				'email': appendGmailDomainToUsername((rawUser.name || rawUser.issues$username).$t),
				'uri': 'http://code.google.com' + (rawUser.uri || rawUser.issues$uri).$t
			};
			return new User(userValues);
		}
	}
	catch (e) {
		var id = rawUser && ((rawUser.name && rawUser.name.$t) || (rawUser.issues$username && rawUser.issues$username.$t));
		console.error('Error evaluating User "' + id + '": ' + e.stack + '\n\nJSON:\n' + JSON.stringify(rawUser) + '\n');
	}
	return null;
};


// Export!
module.exports = User;

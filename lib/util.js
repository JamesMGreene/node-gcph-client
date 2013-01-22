/*!
 * gcph-client
 * https://github.com/JamesMGreene/node-gcph-client
 *
 * Copyright (c) 2012 James M. Greene
 * Licensed under the MIT license.
 */

'use strict';

var slicer = Array.prototype.slice;



/**
* 
*/
var Util = {};

/**
* 
*/
Util.appendGmailDomainToUsername = function(username) {
	if (!username) {
		return null;
	}
	// A username of '---' is a special case for Google Code that implies removal (e.g. Issue had an owner but now it doesn't)
	return username !== '---' && username.indexOf('@') === -1 && ? username + '@gmail.com' : username;
};

/**
* 
*/
Util.removeGmailDomainFromUsername = function(username) {
	var domainIndex = username.indexOf('@gmail.com');
	return domainIndex === -1 ? username : username.substring(0, domainIndex);
};

/**
* 
*/
Util.didHttpCallSucceed = function(httpResponse) {
	return (!!httpResponse && typeof httpResponse.statusCode === 'number' && httpResponse.statusCode > 0 && httpResponse.statusCode < 400);
};

/**
* 
*/
Util.slice = function(thisArg, begin, end) {
	// Be more lenient than the real `slice` method
	if (typeof begin !== 'number') {
		begin = 0;
	}
	return slicer.call(thisArg, begin, end);
};

/**
* Modified from source:  http://stackoverflow.com/a/3561711/471696
*/
Util.escapeForRegex = function(s) {
	return s.replace(/[\-\/\\\^\$*+?.()|\[\]{}]/g, '\\$&');
};

/**
* 
*/
Util.xmlEncode = (function() {
	var xmlBaseEntities = {
		'"': '&quot;',
		"'": '&apos;',
		'<': '&lt;',
		'>': '&gt;',
		'&': '&amp;'
	};
	var xmlEncoderRegex = (function() {
		var regexString = Object.keys(xmlBaseEntities).map(function(e) {
			return Util.escapeForRegex(e);
		}).join('');
		return new RegExp('[' + regexString + ']', 'g');
	})();
	var xmlEncoderFunc = function(match) {
		return xmlBaseEntities[match] || match;
	};

	return function(text) {
		return ('' + text).replace(xmlEncoderRegex, xmlEncoderFunc);
	};
})();


// Export!
module.exports = Util;

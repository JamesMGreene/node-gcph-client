/*
 * gcph-client
 * https://github.com/JamesMGreene/node-gcph-client
 *
 * Copyright (c) 2012 James M. Greene
 * Licensed under the MIT license.
 */

'use strict';

var slicer = Array.prototype.slice;

var Utils = Object.create(null);
Utils.fixUsername = function(username) {
	return username.indexOf('@') === -1 ? username + '@gmail.com' : username;
};
Utils.didHttpCallSucceed = function(httpResponse) {
	return (!!httpResponse && typeof httpResponse.statusCode === 'number' && httpResponse.statusCode > 0 && httpResponse.statusCode < 400);
};
Utils.slice = function(thisArg, begin, end) {
	// Be more lenient than the real `slice` method
	if (typeof begin !== 'number') {
		begin = 0;
	}
	return slicer.call(thisArg, begin, end);
};


// Export!
module.exports = Utils;

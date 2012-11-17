/*
 * gcph-client
 * https://github.com/JamesMGreene/node-gcph-client
 *
 * Copyright (c) 2012 James M. Greene
 * Licensed under the MIT license.
 */

'use strict';

exports = Api;

var Api = {
	Client: require('./gcph-client'),
	Query: require('./gcph-query'),
	Issue: require('./gcph-issue'),
	Comment: require('./gcph-comment')
};
Api.prototype = Object.create(null);

// Define some read-only properties
Object.defineProperty(Api, 'version', {
	value: require('../package.json').version
});

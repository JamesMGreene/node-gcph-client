/*
 * gcph-client
 * https://github.com/JamesMGreene/node-gcph-client
 *
 * Copyright (c) 2012 James M. Greene
 * Licensed under the MIT license.
 */

'use strict';

var Api = {
	Client: require('./client'),
	Query: require('./query'),
	Issue: require('./issue'),
	Comment: require('./comment')
};

// Define some read-only properties
Object.defineProperty(Api, 'version', {
	value: require('../package.json').version
});


// Export!
module.exports = Api;

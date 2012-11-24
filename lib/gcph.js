/*
 * gcph-client
 * https://github.com/JamesMGreene/node-gcph-client
 *
 * Copyright (c) 2012 James M. Greene
 * Licensed under the MIT license.
 */

'use strict';

// Create an object without any prototype
var Api = Object.create(null);

Api.Client = require('./client');
Api.Query = require('./query');
Api.Issue = require('./issue');
Api.Comment = require('./comment');

// Define some read-only properties
Object.defineProperty(Api, 'version', {
	value: require('../package.json').version
});


// Export!
module.exports = Api;

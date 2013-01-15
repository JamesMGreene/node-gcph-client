/*!
 * gcph-client
 * https://github.com/JamesMGreene/node-gcph-client
 *
 * Copyright (c) 2012 James M. Greene
 * Licensed under the MIT license.
 */

'use strict';

// External modules
var commander = require('commander');
var cmd = new commander.Command();

/**
* 
*/
var ExUtil = Object.create(null);

/**
* 
*/
ExUtil.getUsername = function(done) {
	cmd.prompt('GC Username (james.m.greene@gmail.com): ', function(user) {
		if (!user) {
			// Default value
			done(null, 'james.m.greene@gmail.com');
		}
		else {
			done(null, user);
		}
	});
};

/**
* 
*/
ExUtil.getPassword = function(done) {
	cmd.password('GC Password: ', '*', function(pass) {
		if (!pass) {
			done(new Error('Google Code does not allow empty passwords!'));
		}
		else {
			process.stdin.destroy();
			done(null, pass);
		}
	});
};

module.exports = ExUtil;


'use strict';
// The unmodified 17-case timer suite executes the current repaired client.
const {after}=require('node:test'),path=require('node:path');
const fixture=require('./helpers/dual-array-browser-timer-fixture.cjs').createFixture(path.resolve(__dirname,'..'));
after(fixture.cleanup);
require(fixture.suite);

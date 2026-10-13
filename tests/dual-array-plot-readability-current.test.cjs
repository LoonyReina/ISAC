'use strict';
// Authenticate the generated current page before restoring its raw SITE regions.
const {after}=require('node:test'),path=require('node:path');
const fixture=require('./helpers/dual-array-browser-timer-fixture.cjs').createFixture(path.resolve(__dirname,'..'),'display');
after(fixture.cleanup);
require(fixture.suite);

'use strict';
// Register all six original source cases against the exact accepted prior layer.
const { after } = require('node:test');
const path = require('node:path');
const { createFixture } = require('./helpers/desktop-layout-source-gate.cjs');
const fixture = createFixture(path.resolve(__dirname, '..'), 'narrow');
after(fixture.cleanup);
require(fixture.suite);

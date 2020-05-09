var lib = {};

var util = require('../../utilities/util');
var dres = util.dres;

var context = require('../../interpreter/context');

lib.meta = {};

lib.meta.newStandardContext = context.newStandardExecutionContext;
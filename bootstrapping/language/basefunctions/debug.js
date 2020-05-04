var util = require('../../utilities/util');
var dres = util.dres;

var lib = {};
lib.debug = {};

lib.debugfuncs = {};

lib.debugfuncs['@'] = (args, ctx) => {
  let fn = ctx.getOwner('logger.dump').call;
  let res = fn(args, ctx);
  return dres.resOK();
}

lib.debug['~!'] = (args, ctx) => {
  ctx.registerMap('', lib.debugfuncs);
  console.log('Debug functions added!')
  console.log('  @  - Dump variable')
  return dres.resOK();
};

module.exports = lib.debug;

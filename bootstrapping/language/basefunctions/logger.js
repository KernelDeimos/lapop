var util = require('../../utilities/util');
var dres = util.dres;

var localUtil = require('./util');

var makeDump = val => {
  if ( val.type === 'assoc' ) {
    return val.internal.map(entry =>
      [entry.key,entry.value]
    )
  }
  return val;
};

var lib = {};
lib.logger = {
  'info': localUtil.newFunc(args => {
    console.log('\x1B[36;1m[info]\x1B[0m',
      ...args.map(a => a.value));
    return dres.resOK(null);
  }, null),
  'dump': (args, ctx) => {
    console.log('\x1B[37;1m[dump]\x1B[0m',
      ...args.map(a => makeDump(a)));
    return dres.resOK(null);
  },
  'notice': localUtil.newFunc(args => {
    console.log('\x1B[37;1m|====|\x1B[0m',
      ...args.map(a => a.value));
    return dres.resOK(null);
  }, null),
  'noticew': localUtil.newFunc(args => {
    console.log('\x1B[33;1m|====|\x1B[0m',
      ...args.map(a => a.value));
    return dres.resOK(null);
  }, null)
}

module.exports = lib.logger;
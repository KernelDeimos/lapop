var lib = {};

var util = require('../../utilities/util');
var dres = util.dres;

// TODO: function calls in brackets should be validated by
//       the pattern if one exists

lib.string = {};

// This is not out of laziness; the string library in LePoT
// just happens to be almost identical to the one in
// Javascript ;)
lib.string.slice = (args, ctx) => {
  return dres.resOK(
    args[0].value.slice(...args.slice(1).map(a => a.value)),
    {
      type: 'string'
    }
  );
};
lib.string.indexOf = (args, ctx) => {
  return dres.resOK(
    args[0].value.indexOf(args[1].value),
    {
      type: 'string'
    }
  );
};
lib.string.startsWith = (args, ctx) => {
  return dres.resOK(
    args[0].value.startsWith(args[1].value),
    {
      type: 'bool'
    }
  );
};
lib.string.cat = (args, ctx) => {
  return dres.resOK(args.map(a => a.value).join(''));
};

module.exports = lib.string;
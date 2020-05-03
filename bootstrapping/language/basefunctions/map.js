var util = require('../../utilities/util');
var dres = util.dres;

var lib = {};
lib.map = {};

// Note: map operations are O(n) for now. This will be fixed after
//       equality operations for non-primitive keys are implemented,
//       in case that work yeilds an efficient way to hash such keys.
//     Reference ticket: #50

lib.map.in = (args, ctx) => {
  var map = args[0];
  var key = args[1].value;
  for ( let i=0; i < map.value.length; i++ ) {
    let entry = map.value[i];
    if ( entry.key.value === key )
      return dres.resOK(true, { type: 'bool' });
  }
  return dres.resOK(false, { type: 'bool' });
};

lib.map.get = (args, ctx) => {
  var map = args[0];
  var key = args[1].value;
  // TODO: Add cache for keys that can be stored in a Javascript
  //       map to make this O(1) instead of O(n)
  for ( let i=0; i < map.value.length; i++ ) {
    let entry = map.value[i];
    if ( entry.key.value === key )
      return dres.resOK(util.dhelp.processData(null, entry.value));
  }
  return dres.resOK()
};

lib.map.put = (args, ctx) => {
  var map = args[0];
  var key = args[1];
  var val = util.dhelp.listifyData(args[2]);
  // TODO: Add cache for keys that can be stored in a Javascript
  //       map to make this O(1) instead of O(n)
  for ( let i=0; i < map.value.length; i++ ) {
    let entry = map.value[i];
    if ( entry.key.value === key.value ) {
      let oldValue = entry.value;
      entry.value = val;
      return oldValue;
    }
  }
  map.value.push({
    key: key,
    value: val
  });
  return dres.resOK();
};
lib.map.dump = (args, ctx) => {
  var map = args[0];
  return dres.resOK(JSON.stringify(map));
};

module.exports = lib.map;
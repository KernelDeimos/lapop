var util = require('../utilities/util');
var dres = util.dres;

/*

Formats of the Types
====================

- **AST** is the format of a parsed LePoT value.
- **API** is the format of a processed value, and is simply an API
          for working with the value; the internal strucutre is
          not exposed.
- **native** is the best javascript-equivalent value of the
             LePoT value with no frills. Associative type becomes
             a unique map with array values when a key exists
             more than once.

*/

var lib = {};
var types = {};

var astResult = dres.subContext({
  type: 'ast',
  format: 'lepot'
})

var apiResult = dres.subContext({
  type: 'api',
  format: 'js:funcmap'
})

types.list = {};
types.list.fromAstToApi = astNode => {
  var internal = [...astNode.value];
  var astCopy = { ...astNode };

  var api = {};
  api.reconstruct = () => {
    var newAstNode = {
      ...astCopy,
      type: 'list',
      value: internal
    };

    return astResult.resOK(newAstNode);
  }

  api.each = (callback) => {
    var thiser = {};
    callback = callback.bind(thiser);
    for ( let i=0; i < internal.length; i++ ) {
      thiser.replace = v => { internal[i] = v };
      let ret = callback(internal[i]);
      if ( ret !== undefined ) return ret;
    }
  };

  return apiResult.resOK(api);
};
types.list.fromAstToNative = astNode => {
  var native = [...astNode.value];
  return native;
};

types.assoc = {};
types.assoc.fromAstToApi = astNode => {
  var internal = [];
  var astCopy = { ...astNode };
  var data = astNode.value;

  // Construct internal representation
  if ( data.length % 2 !== 0 ) return dres.resInvalid(
    'associative array needs even number of elements');
  for ( let i = 0; i < data.length; i += 2 ) {
    var entry = {
      key:   lib.fromAstToApi(data[   i   ]),
      value: lib.fromAstToApi(data[ i + 1 ]),
    }
    if ( dres.eitherKeyNegative(entry) ) {
      return dres.resInvalid('error processing assoc entry', {
        causes: [key, value]
      })
    }
    Object.keys(entry).forEach(k => { entry[k] = entry[k].value; });
    internal.push(entry);
  };

  // Construct processed type API
  var api = {};
  api.reconstruct = () => {
    var newAstNode = { ...astCopy, type: 'assoc', value: [] };
    internal.forEach(entry => {
      var  key  = entry. key .reconstruct();
      if ( dres.isNegative( key ) ) { return  key  };
      key  = key.value;

      var value = entry.value.reconstruct();
      if ( dres.isNegative(value) ) { return value };
      value = value.value;

      newAstNode.value.push( key );
      newAstNode.value.push(value);
    });
    return astResult.resOK(newAstNode);
  };

  api.put = (k, v) => { newAstNode.push({ key: k, value: v }) };

  return apiResult.resOK(api);
};
types.assoc.fromAstToNative = astNode => {
  //
}

simpleType = {};
simpleType.fromAstToApi = (typeName, astNode) => {
  var internal = astNode.value;
  var astCopy = { ...astNode };

  var api = {};

  api.reconstruct = () => {
    var newAstNode = {
      ...astCopy,
      type: typeName,
      value: astNode.value
    };
    return astResult.resOK(newAstNode);
  };

  return apiResult.resOK(api);
};
simpleType.fromAstToNative = astNode => {
  return astNode.value;
}

simpleType.create_ = typeName => {
  var o = {};
  o.fromAstToApi = simpleType.fromAstToApi.bind(o, typeName);
  o.fromAstToNative = simpleType.fromAstToNative.bind(o, typeName);
  return o;
}


['string','float','bool'].forEach(typeName => {
  types[typeName] = simpleType.create_(typeName);
});

Object.keys(types).forEach(k => {
  types[k].fromApiToAst = api => { return api.reconstruct() };
  types[k].fromApiToNative = api => {
    var v = api;
    v = types[k].fromApiToAst(v)
    if ( dres.isNegative(v) ) return v;
    v = types[k].fromAstToNative(v);
    return v;
  }
})

lib.types = types;

lib.fromAstToApi = astNode =>
  lib.types[astNode.type].fromAstToApi(astNode);

module.exports = lib;

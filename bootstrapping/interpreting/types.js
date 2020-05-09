var dres = require('../utilities/descriptiveresults');

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

var listType = {};
listType.fromAstToApi = (typeName, astNode) => {
  var internal = [...astNode.value];
  var astCopy = { ...astNode };

  var api = {};
  api.reconstruct = () => {
    var newAstNode = {
      ...astCopy,
      type: typeName,
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

  api.toDeprecated = () => {
    return [typeName].concat(internal);
  };

  return apiResult.resOK(api);
};
listType.fromAstToNative = (typeName, astNode) => {
  var native = [...astNode.value];
  return native;
};

listType.create_ = typeName => {
  var o = {};
  o.fromAstToApi = listType.fromAstToApi.bind(o, typeName);
  o.fromAstToNative = listType.fromAstToNative.bind(o, typeName);
  return o;
}

['list', 'code'].forEach(typeName => {
  types[typeName] = listType.create_(typeName);
});

types.assoc = {};
types.assoc.fromAstToApi = astNode => {
  var internal = [];
  var astCopy = { ...astNode };
  var data = astNode.value;

  // Construct internal representation
  if ( data.length % 2 !== 0 ) return dres.resInvalid(
    'associative array needs even number of elements');
  for ( let i = 0; i < data.length; i += 2 ) {
    console.log('?', data[i], data[i+1]);
    var entry = {
      key:   lib.fromAstToApi(data[   i   ]),
      value: lib.fromAstToApi(data[ i + 1 ]),
    }
    console.log(entry);
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
  api.keysInOrder = () => {
    return internal.map(entry => entry.key);
  }

  api.put = (k, v) => { newAstNode.push({ key: k, value: v }) };

  api.toDeprecated = () => {
    var ret = ['assoc'];
    internal.forEach(entry => {
      ret.push(entry.key.toDeprecated());
      ret.push(entry.value.toDeprecated());
    })
    return ret;
  };

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

  api.toDeprecated = () => {
    return [typeName, internal]
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


['string','float','bool', 'symbol'].forEach(typeName => {
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

lib.fromAstToApi = astNode => {
  console.log('A:', astNode.type);
  api = lib.types[astNode.type].fromAstToApi(astNode);
  api.meta = {};
  api.meta.type = astNode.type;
  return api;
}

lib.fromAstToDeprecated = astNode => {
  console.log('D:', astNode.type);
  if ( Array.isArray(astNode) ) throw new Error('not AST: ' + JSON.stringify(astNode));
  var api = lib.types[astNode.type].fromAstToApi(astNode);
  if ( dres.isNegative(api) ) {
    console.log(api);
    throw new Error('negative api: ' + api.info);
  }
  var retval =  api.value.toDeprecated();
  if ( typeof retval !== 'object' || ! Array.isArray(retval) ) {
    throw new Error('bad deprecated value for '+ astNode.type +': ' + JSON.stringify(retval));
  }
  return retval;
}

module.exports = lib;

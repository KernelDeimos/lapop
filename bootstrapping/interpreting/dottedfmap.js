var dres = require('../utilities/descriptiveresults');
var dhelp = require('../utilities/datahelper');
var functionmaps = require('./functionmaps');
require('../utilities/util');

var lib = {};

/*
DottedFunctionMap internal registry format
------------------------------------------

internalRegistry variable holds an object of
`type:name` keys. For example, a package named
'math.extra' would be located at:

    internalRegistry['pkg:math']['pkg:extra']

The function 'qisqrt' in 'math.extra' would be
located at:

    internalRegistry['pkg:math']['pkg:extra']['jsfunc:qisqrt']

This is done with the intention of behaving in a similar
way as the the LePoT instance registry (memory.js), which
may simplify the eventual re-implementation of LePoT in
itself.
*/

lib.irkey_ = (typ, name) => ''+typ+':'+name;

lib.resolvePackage_ = (self, pkgParts) => {
  var currentNode = self.internalRegistry;

  for ( let i=0; i < pkgParts.length; i++ ) {
    let pkgPartKey = lib.irkey_('pkg', pkgParts[i]);
    if ( ! currentNode.hasOwnProperty(pkgPartKey) ) {
      currentNode[pkgPartKey] = {};
    }
    currentNode = currentNode[pkgPartKey];
  }

  return currentNode;
}

lib.processFunctionName_ = (self, name) => {
  var w = {};
  w.parts = name.split('.');
  w.pkgParts = w.parts.slice(0,-1);
  w.funcName = w.parts.slice(-1);
  w.targetNode = lib.resolvePackage_(self, w.pkgParts);
  w.funcKey = lib.irkey_('jsfunc', w.funcName);
  return w;
}

lib.newFunctionMapNodeAPI = (self, name) => {
  with ( lib.processFunctionName_(self, name) ) return {
    call: (args, ctx) => targetNode[funcKey](args, ctx),
    replace: nw => targetNode[funcKey] = nw,
    remove: () => delete targetNode[funcKey],
  }
};

lib.newDottedFunctionMap = (delegate) => {
  delegate = delegate || functionmaps.newNullFunctionMap();

  var self = {};
  var implementor = {};

  self.internalRegistry = {};

  // function map interface
  implementor.get = name => {
    var w = lib.processFunctionName_(self, name);
    if ( w.targetNode.hasOwnProperty(w.funcKey) ) {
      return dres.resOK(w.targetNode[w.funcKey]);
    }
    return dres.result({ status: 'unknown' });
  };

  implementor.has = name => {
    var w = lib.processFunctionName_(self, name);
    if ( w.targetNode.hasOwnProperty(w.funcKey) ) {
      return lib.newFunctionMapNodeAPI(self, name);
    }
    return null;
  };

  // specific interface
  implementor.register = (name, f) => {
    var w = lib.processFunctionName_(self, name);
    if ( w.parts.length < 1 ) {
      return dres.resInvalid('tried to register function with empty name');
    }

    w.targetNode[w.funcKey] = f;
  }
  implementor.registerMap = (pkg, map) => {
    for ( k in map ) if ( map.hasOwnProperty(k) ) {
      let name = (pkg === '' ? '' : ''+pkg+'.') + k;
      implementor.register(name, map[k]);
    }
  }

  implementor.registerDeprecated = (name, f) => {
    var w = lib.processFunctionName_(self, name);
    if ( w.parts.length < 1 ) {
      return dres.resInvalid('tried to register function with empty name');
    }

    fNew = (args, ctx) => {
      console.log(args)
      args = args.map(a => dhelp.processData(null, a.toDeprecated()))
      return f(args, ctx);
    };

    w.targetNode[w.funcKey] = fNew;
  }

  implementor.registerDeprecatedMap = (pkg, map) => {
    for ( k in map ) if ( map.hasOwnProperty(k) ) {
      let name = (pkg === '' ? '' : ''+pkg+'.') + k;
      implementor.registerDeprecated(name, map[k]);
    }
  }

  return implementor;
}

module.exports = lib;
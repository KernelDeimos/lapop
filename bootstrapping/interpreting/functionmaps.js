var dres = require('../utilities/descriptiveresults');

var lib = {};

var localUtil = {};
localUtil.adaptObject = o => ( typeof o === 'undefined' ) ? {} : o;
localUtil.adaptList = l => ( typeof l === 'undefined' ) ? [] : l;

lib.newFuncMapNodeAPIFromObject = (o, name) => {
  return {
    getObject_: () => o,
    getKey_: () => name,
    call: (args, ctx) => o[name](args, ctx),
    get: () => o[name],
    replace: nw => o[name] = nw,
    remove: () => delete o[name],
  }
}

lib.newDottedCompositeFunctionMap = (entries, delegate) => {
  entries = localUtil.adaptObject(entries);
  
  var implementor = {};
  implementor.get = name => {
    var dot = name.indexOf('.');
    if ( dot === -1 ) {
      return delegate.get(name);
    }
    var remainder = name.slice(dot + 1);
    var name = name.slice(0, dot);
    if ( entries.hasOwnProperty(name) ) {
      return entries[name].get(remainder);
    }
    return dres.result({ status: 'unknown' });
  }
  implementor.has = name => {
    var dot = name.indexOf('.');
    if ( dot === -1 ) {
      return delegate.has(name);
    }
    var remainder = name.slice(dot + 1);
    var name = name.slice(0, dot);
    if ( entries.hasOwnProperty(name) ) {
      let maybeAPI = entries[name].has(remainder);
      return maybeAPI;
    }
    return null;
  }
  return implementor;
}

lib.newObjectFunctionMap = o => {
  var implementor = {};
  implementor.get = name => {
    if ( o.hasOwnProperty(name) ) {
      return dres.resOK(o[name]);
    }
    return dres.result({ status: 'unknown' });
  }
  implementor.has = name => {
    if ( o.hasOwnProperty(name) )
      return lib.newFuncMapNodeAPIFromObject(o, name);
    return null;
  }
  return implementor;
}

lib.newFallbackFunctionMap = delegates => {
  delegates = localUtil.adaptList(delegates);

  var implementor = {};
  implementor.get = name => {
    for ( let i=0; i < delegates.length; i++ ) {
      let res = delegates[i].get(name);
      if ( dres.isNegative(res) ) continue;
      return res;
    }
    return dres.result({
      status: 'unknown',
      info: 'fallBackFunctionMap couldn\'t find: '+name
    });
  }
  implementor.has = name => {
    for ( let i=0; i < delegates.length; i++ ) {
      let maybeAPI = delegates[i].has(name);
      if ( maybeAPI === null ) continue;
      return maybeAPI;
    }
    return null;
  }
  return implementor;
}

lib.newNullFunctionMap = () => {
  var implementor = {};
  implementor.get = name => {
    return dres.result({ status: 'unknown' });
  }
  implementor.has = name => {
    return null;
  }
  return implementor;
}

module.exports = lib;
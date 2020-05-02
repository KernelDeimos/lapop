'use strict';

var emitter = require('../utilities/emitter');

var lib = {};

lib.newRegistryObject = (cb, type, name) => {
    var o = {};
    var def = null;
    Object.defineProperty(o, 'def', {
        get: () => def,
        set: v => {
            def = v;
            cb(type, name, v);
        }
    });
    return o;
}

lib.newDelegatingRegistryObject = (
  type, name, parent, child
) => {
    var o = {};
    var def = null;
    Object.defineProperty(o, 'def', {
        get: () => child.has(type, name)
          ? child.fabricate(type, name).def
          : parent.has(type, name)
            ? parent.fabricate(type, name).def
            : null
          ,
        set: v => child.fabricate(type, name).def = v,
    });
    return o;
}

lib.newRegistry = () => {
  var api = {};
  api.data_ = {};
  api.data_.currentPackage = '';
  api.data_.stores = {};
  api.data_.orders = {};
  api.data_.order = [];
  api.data_.emitter = emitter.newEmitter();

  var stores = api.data_.stores;
  var orders = api.data_.orders;

  for ( let propKey in api.data_.emitter ) {
    let prop = api.data_.emitter[propKey];
    if ( typeof prop === 'function' ) {
      api[propKey] = prop;
    }
  }

  api.addListener = api.data_.emitter.addListener;
  api.emitPattern = (type, name, value) => {
    api.emit({
      type: 'put',
      value: {
        of: type,
        for: name,
        value: value
      }
    });
  };

  // @deprecated
  api.callListeners = api.emitPattern;
  let callback = api.emitPattern;
  
  // returns the registry entry of the specified type and name, creating
  // a new entry first if it doesn't exist already.
  api.fabricate = (type, name) => {
    if ( name.startsWith('.') ) {
      name = name.substr(1);
      if ( api.data_.currentPackage ) {
        name = api.data_.currentPackage + '.' + name;
      }
    }

    var _b = () => {
      stores[type][name] = lib.newRegistryObject(
        callback, type, name);
      orders[type].push(name);
    }
    if ( ! stores.hasOwnProperty(type) ) {
      stores[type] = {};
      orders[type] = [];
      _b();
    } else if ( ! stores[type].hasOwnProperty(name) ) {
      _b();
    }
    return stores[type][name];
  }

  return api;
}

lib.newDelegatingRegistry = (parent, child) => {
  var api = {};

  var stores = api.data_.stores;

  api.has = (type, name) => false
    || child.has(type, name)
    || parent.has(type, name)
    ;
 
  api.fabricate = (type, name) =>
    lib.newDelegatingRegistryObject(type, name, parent, child)
}

lib.select = (registry, optionsIn) => {
  optionsIn = optionsIn || {};
  var options = {
    under: {
      startsWith: '',
      recursive: true
    },
    pattern: 'any',
  };
  for ( k in options ) {
    options[k] = optionsIn[k] || options[k];
  }

  var stores = registry.data_.stores;

  var patternIter = () => {};
  if ( options.pattern === 'any' ) {
    patternIter = cb => {
      Object.keys(stores).forEach(pattern => {
        cb(pattern);
      })
    }
  } else {
    patternIter = cb => {
      cb(options.pattern);
    }
  }

  var results = [];

  patternIter(pattern => {
    var store = stores[pattern];
    Object.keys(store).forEach(name => {
      if ( ! name.startsWith(options.under.startsWith) ) return;
      var rest = name.slice(options.under.startsWith.length);
      if ( 1
        && ! options.under.recursive
        && rest.indexOf('.') !== -1
      ) return;
      results.push({
        type: 'definition',
        of: pattern,
        for: name,
        value: store[name].def
      });
    });
  });

  return results;
}

module.exports = lib;
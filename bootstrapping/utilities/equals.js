'use strict';
var lib = {};

lib.equal = (v1, v2) => {
  if ( false
    || typeof v1 === 'boolean'
    || typeof v1 === 'number'
    || typeof v1 === 'string'
  ) {
    return v1 === v2;
  }

  if ( typeof v1 === 'function' ) {
    return typeof v2 === 'function' &&
      v1.toString() === v2.toString();
  }

  if ( typeof v1 === 'object' ) {
    if ( Array.isArray(v1) ) {
      return Array.isArray(v1) &&
        lib.listEqual(v1, v2);
    }
    return ( ! Array.isArray(v2) ) && lib.objEqual(v1, v2);
  }

  return v1 === v2;
}

lib.listEqual = (lis1, lis2) => {
  if ( lis1.length != lis2.length ) return false;
  for ( let i=0; i < lis1.length; i++ ) {
    if ( ! lib.equal(lis1[i], lis2[i]) ) return false;
  }
  return true;
}

lib.objEqual = (obj1, obj2) => {
  if ( obj1 === null ) return obj2 === null;
  if ( obj1 === undefined ) return obj2 === undefined;
  var objs = [obj1, obj2];
  var keys = objs
    .map(o => Object.keys(o).filter(k => o.hasOwnProperty(k)))
  var keySet = {};
  keys.forEach(keyList => keyList.forEach(k => {
    keySet[k] = true;
  }))
  if ( keys[0].length != keys[1].length ) return false;
  if ( keys[0].length != Object.keys(keySet).length ) return false;
  return lib.listEqual(
    keys[0].map(k => objs[0][k]),
    keys[0].map(k => objs[1][k]),
  )
}

if (typeof window === 'undefined') module.exports = lib;

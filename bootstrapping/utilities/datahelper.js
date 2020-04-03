var lib = {};

var dres = require('./descriptiveresults.js');

lib.fmap_convertData = {
  list: data => dres.resOK(data),
  code: data => dres.resOK(data),
  symbol: data => dres.resOK(data.join('.')),
  assoc: data => {
    if ( data.length % 2 !== 0 ) return dres.resInvalid(
        'associative array needs even number of elements'
    );
   
    var assoc = [];
    for ( let i=0; i < data.length; i+=2 ) {
      let k = data[i];
      let v = data[i+1];
      assoc.push({
        key: k,
        value: v
      });
    }

    var methods = {};
    methods.iterate = f => {
      for ( let i=0; i < assoc.length; i++ ) {
        f(assoc[i]);
      }
    }
    methods.get = k => {
      for ( let j=0; j < assoc.length; j++ ) {
        if ( assoc[j].key === k ) return assoc[j].value;
      }
    }
    methods.set = (k, v) => {
      for ( let j=0; j < assoc.length; j++ ) {
        if ( assoc[j].key === k ) {
          assoc[j].value = v;
          return true;
        }
      }
      assoc.push({
        key: k,
        value: v
      });
    }
    return dres.resOK(methods);
  }
};

// Convert data object to processing object
lib.processData = (funcMap, data) => {
  if ( funcMap === null ) {
    funcMap = lib.fmap_convertData;
  }
  if ( data.length < 1 ) {
    return dres.resInvalid(
      'data type missing from list (empty list not allowed)');
  }

  if ( funcMap.hasOwnProperty(data[0]) ) {
    let result = funcMap[data[0]](data.slice(1));
    if ( dres.isOK(result) ) result.type = data[0];
    return result;
  }

  if ( typeof data === 'string' ) return dres.resOK(data, {
    type: 'string'
  });

  return dres.result({
    status: 'unknown',
    type: data[0],
    subject: JSON.stringify(data),
    info: 'found an unrecognized type',
    infoParams: ['type']
  })
}

lib.assertData = (funcMap, type, data) => {
  if ( funcMap === null ) {
    funcMap = lib.fmap_convertData;
  }
  result = lib.processData(funcMap, data);
  if ( dres.isNegative(result) ) return result;
  if ( result.type !== type ) {
    result.status = 'invalid';
  }
  return result;
}

lib.listEqual = (lis1, lis2) => {
  if ( lis1.length != lis2.length ) return false;
  for ( let i=0; i < lis1.length; i++ ) {
    // TODO: recurse lists
    if ( Array.isArray(lis1[i]) ) {
      if ( ! Array.isArray(lis2[i]) ) return false;
      return lib.listEqual(lis1[i], lis2[i]);
    }
    if ( lis1[i] !== lis2[i] ) {
      return false;
    }
  }
  return true;
}

module.exports = lib;
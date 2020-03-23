var jslib = {};

jslib.fmap_convertData = {
  list: data => data,
  symbol: data => data.join('.'),
  assoc: data => {
    if ( data.length % 2 !== 0 ) {
      return {
        type: 'invalid',
        info: 'associative array needs even number of elements'
      }
    }
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
    return methods;
  }
};

jslib.convertData = (funcMap, data) => {
  if ( funcMap === null ) {
    funcMap = jslib.fmap_convertData;
  }

  if ( data.length < 1 ) {
    return {
      type: 'invalid',
      info: 'data type missing from list',
      subject: data
    }
  }
  if ( funcMap.hasOwnProperty(data[0]) ) {
    return {
      type: data[0],
      value: funcMap[data[0]](data.slice(1))
    }
  }
  return {
    type: data[0]
  }
}

jslib.assertData = (funcMap, type, data) => {
  data = jslib.convertData(funcMap, data);
  if ( data.type !== type ) {
    data.type = 'invalid';
    data.info = 'type did not match assertion'
  }
  return data;
}

module.exports = jslib;
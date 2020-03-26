'use strict';
/*.md
Descriptive Results
===================

Descriptive results are vanilla javascript objects that wrap
returned values. They are trackable, and have a concept of
different states of validity. They are also meant to hold
related information such as parser/processor streams.

## States of Validity

### "Negative" states
- `invalid`: Inputs were not valid
- `unknown`: Inputs are not recognized by this function, but may be
             valid and recognized by a related function.
- `defiant`: Input is valid and perhaps recognized, but does not
             comply with other parameters that were provided.
- `internal`: An internal error was encountered

### "OK" states
- `populated`: Everything worked okay; a result was returned.
- `empty`: Everything worked okay; no result was returned.

All negative states, and `empty`, are considered falsy states.

### Meta properties
- `type` should be reserved to indicate the type of the value.
- `stream` should be reserved to hold a related parsing or
           processing stream.
- `info` should be reserved for information related to the status
*/

var newResult_ = o => o;

var newResultContext_ = () => {};
newResultContext_ = (o) => {
  if ( typeof o === 'undefined' ) o = {};
  var ctx = {
    baseValues: o,
  };
  ctx.subContext = oNew => {
    if ( typeof oNew === 'undefined' ) oNew = {};
    return newResultContext_({
      ...ctx.baseValues,
      ...oNew
    });
  };
  ctx.set = (k, v) => { ctx.baseValues[k] = v; };
  ctx.apply = oNew => {
    ctx.baseValues = { ...ctx.baseValues, ...oNew };
  };
  ctx.result = oIn => {
    return newResult_({
      ...ctx.baseValues,
      ...oIn
    });
  };
  ctx.resInvalid = (msg, extra) => {
    if ( typeof extra === 'undefined' ) extra = {};
    return newResult_({
      ...ctx.baseValues,
      ...extra,
      status: 'invalid',
      info: msg
    });
  };
  ctx.resOK = (value, extra) => {
    var res = {...ctx.baseValues, ...extra};
    res.status = (() => {
      if ( false
        || typeof value === 'undefined'
        || value === null
        || ( Array.isArray(value) && value.length < 1 )
      ) return 'empty';
      return 'populated';
    })();
    res.value = value;
    return res;
  }
  return ctx;
}

var lib = newResultContext_();

lib.isNegative = o => false
  || o.status === 'unknown'
  || o.status === 'invalid'
  || o.status === 'defiant'
  || o.status === 'internal'
  ;

lib.isFalsy = o => lib.isNegative(o) || o.status === 'empty';

lib.isOK = o => false
  || o.status === 'populated'
  || o.status === 'empty'
  ;

lib.unknownIsDefiant = o => {
  if ( o.status === 'unknown' ) o.status = 'defiant';
  return o;
}

module.exports = lib;
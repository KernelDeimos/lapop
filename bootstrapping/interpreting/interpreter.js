'use strict';

var dres = require('../utilities/descriptiveresults');
var dhelp = require('../utilities/datahelper');
var util = require('../utilities/util');
var pattern = require('../semantics/pattern');
var streams = require('./streams');
var memory = require('./memory');
var plugins = require('../utilities/plugins');

var soup;

var lib = {};

lib.process_pattern_by_name = (name, args, s) => {
  let primitives = [
    'assoc', 'list', 'code', 'string', 'symbol', 'float'
  ];
  let aliases = {
    'object': 'assoc'
  }
  if ( name in aliases ) name = aliases[name];

  if ( primitives.includes(name) ) {
    let res = dhelp.processData(null, s.val());
    if ( dres.isNegative(res) ) return res;
    if ( res.type !== name ) return dres.result({
      status: 'defiant', 
      cause: res,
      value: res.value,
      stream: s
    });
    return dres.resOK([ s.val() ], {
      type: res.type,
      stream: s.next()
    });
  }

  let maybeDef = soup.registry('pattern', name);
  if ( maybeDef.def === null ) {
    return dres.result({
      status: 'unknown',
      info: `pattern name "${name}" not recognized`,
      source: 'interpreter',
      subject: name,
      stream: s
    });
  }
  if ( ! maybeDef.def ) {
    console.warn('invalid definition detected for '+name,
      maybeDef);
  }
  let result = lib.process_pattern(maybeDef.def[0], s);
  if ( dres.isNegative(result) ) {
    return result;
  }
  return result
}

lib.process_pattern = pattern.process_pattern.bind(
  pattern.process_pattern, {
    process_pattern_by_name: lib.process_pattern_by_name,
  }
);

lib.try_evaluatable = s => {
  let jsnode = dhelp.processData(null, s.val());
  if ( dres.isNegative(jsnode) ) {
    return jsnode;
  }

  switch ( jsnode.type ) {
    case 'symbol':
      s = s.next();
      let filling = lib.process_pattern_by_name(jsnode.value, [], s);
      if ( dres.isNegative(filling) ) {
        if ( filling.status === 'defiant' ) {
          return dres.resInvalid(
            'defiant filling for '+jsnode.value,
            {
              cause: filling
            }
          );
        }
        return dres.result({
          status: 'unknown',
          info: 'no pattern for '+jsnode.value,
          subject: jsnode.value,
          cause: filling,
          stream: s
        });
      }
      s = filling.stream;
      var r = dres.resOK([
        ['symbol', jsnode.value],
        ...filling.value
      ], {
        type: 'code',
        stream: s
      });
      return r;
    case 'code':
      jsnode.stream = s.next();
      return jsnode;
    default:
      return dres.resInvalid('non-evaluatable type', {
        subject: jsnode.value
      });
  }
}

lib.newBlockExecutor = (configuration) => {
  var params = util.jshelp.requireParams(configuration, [
    'resultHandler', 'evaluator'
  ]);
  var api = {}; // for resultHandler
  var evaluate = input => {
    var res = params.evaluator(input);
    params.resultHandler(api, res);
    return res;
  }
  let stopped = false;
  let stopres = null;
  api.stop = res => {
    stopped = true;
    stopres = res;
  };
  return (s) => {
    if ( s.eof() ) {
      console.warn('execution of empty code');
      return;
    }
    // setting `stopped` to false here will allow coroutines to be
    // implemented in the future.
    stopped = false;
    while ( ! s.eof() && ! stopped ) {
      let code = lib.try_evaluatable(s);
      
      if ( dres.isNegative(code) ) {
        console.error(code, 'no function at', s.preview);
        return code;
      }

      s = code.stream;
      let evalS = streams.newListStream(code.value, 0);
      
      let res = evaluate(evalS);
      if ( dres.isNegative(res) ) {
        // TODO: generate part of stack trace here
        console.error(res, 'when evaluating', evalS.preview);
        return res;
      }
    }
    if ( stopped ) return stopres;
    return dres.resOK(null);
  }
}

module.exports = soup_ => {
  soup = soup_;
  return lib;
}
'use strict';

var dres = require('../utilities/descriptiveresults');
var dhelp = require('../utilities/datahelper');
var util = require('../utilities/util');
var pattern = require('../semantics/pattern');
var streams = require('./streams');

var soup;

var lib = {};

lib.process_pattern_by_name = (name, args, s) => {
  var validateListType = (type) => {
    let res = dhelp.processData(null, s.val());
    if ( dres.isNegative(res) ) return res;
    if ( res.type !== type ) return dres.result({
      status: 'defiant', 
      value: result,
      stream: s
    });
    return dres.resOK([ s.val() ], {
      type: type,
      stream: s.next()
    });
  }
  switch ( name ) {
    case 'code':
      return validateListType('code');
    case 'list':
      return validateListType('list');
    default:
      let maybeDef = soup.registry('pattern', name);
      if ( ! maybeDef.hasOwnProperty('def') ) {
        return dres.resInvalid(
          `pattern name "${name}" not recognized`,
          { stream: s });
      }
      let result = lib.process_pattern(maybeDef.def[0], s);
      if ( dres.isNegative(result) ) {
        return dres.unknownIsDefiant(result);
      }
      return result
  }
}

lib.process_pattern = pattern.process_pattern.bind(
  pattern.process_pattern, {
    process_pattern_by_name: lib.process_pattern_by_name,
  }
);

lib.try_evaluatable = s => {
  let jsnode = dhelp.processData(null, s.val());
  if ( dres.isNegative(jsnode) ) return jsnode

  switch ( jsnode.type ) {
    case 'symbol':
      s = s.next();
      let filling = lib.process_pattern_by_name(jsnode.value, [], s);
      if ( dres.isNegative(filling) ) {
        return dres.resInvalid('no pattern for '+jsnode.value);
      }
      s = filling.stream;
      return dres.resOK([
        ['symbol', jsnode.value],
        ...filling.value
      ], {
        type: 'code',
        stream: s
      });
    case 'code':
      jsnode.stream = s.next();
      return jsnode;
  }
}

lib.newBlockExecutor = (configuration) => {
  var params = util.jshelp.requireParams(configuration, [
    'resultHandler', 'evaluator'
  ]);
  var evaluate = input => {
    var res = params.evaluator(input);
    params.resultHandler(res);
    return res;
  }
  return (s) => {
    console.log(s);
    if ( s.eof() ) {
      console.warn('execution of empty code');
      return;
    }
    while ( ! s.eof() ) {
      let code = lib.try_evaluatable(s);
      
      if ( dres.isNegative(code) ) {
        return code;
      }

      s = code.stream;
      let evalS = streams.newListStream(code.value, 0);
      
      let res = evaluate(evalS);
    }
  }
}

lib.newObjectFunctionMap = o => {
  var implementor = {};
  implementor.get = name => {
    if ( o.hasOwnProperty(name) ) {
      return dres.resOK(o[name]);
    }
    return dres.result({ status: 'unknown' });
  }
  return implementor;
}

module.exports = soup_ => {
  soup = soup_;
  return lib;
}
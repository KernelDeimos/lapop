'use strict';

var dres = require('../utilities/descriptiveresults');
var dhelp = require('../utilities/datahelper');
var util = require('../utilities/util');
var pattern = require('../semantics/pattern');

var soup;

var lib = {};

lib.newListStream = (list, index) => {
  var o = {};
  o.preview = list.slice(index);
  o.eof = () => index >= list.length;
  o.val = () => list[index];
  o.rest = () => list.slice(index);
  o.next = () => lib.newListStream(list, index+1);
  return o;
}

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
      let jsnode = dhelp.processData(null, s.val());
      if ( dres.isNegative(jsnode) ) {
        return jsnode;
      }
      let evalS, res;
      switch ( jsnode.type ) {
        case 'symbol':
          s = s.next();
          console.log(s);
          let filling = lib.process_pattern_by_name(jsnode.value, [], s);
          console.log('check:exSymbolFilling', filling);
          if ( dres.isNegative(filling) ) {
            console.log(filling);
            return dres.resInvalid('no pattern for '+jsnode.value);
          }
          s = filling.stream;
          evalS = lib.newListStream(
            [
              ['symbol', jsnode.value],
              ...filling.value
            ], 0);
          res = evaluate(evalS);
          if ( dres.isNegative(res) ) return res;
          break;
        case 'code':
          console.log('uhh', JSON.stringify(jsnode));
          evalS = lib.newListStream(
            jsnode.value, 0);
          res = evaluate(evalS);
          debugger
          if ( dres.isNegative(res) ) return res;
          s = s.next();
          break;
      }
    }
  }
}

lib.newFuncMapEvaluator = (funcMap) => {
  var evl;
  evl = (s) => {
    if ( s.eof() ) {
      throw new Error('EMPTY');
    }
    console.log({
      a: s,
      b: s.val(),
      c: JSON.stringify(s)
    });

    var funcName;
    if ( typeof s.val() === 'string' ) {
      funcName = s.val();
    } else {
      let symbolNode = dhelp.processData(null, s.val());
      if ( symbolNode.type !== 'symbol' ) {
        throw new Error('expected symbol or string');
      }
      funcName = symbolNode.value;
    }
    var func = funcMap.get(funcName);

    if ( dres.isNegative(func) ) {
      // TODO: Use similar error handling as parser.js so that
      //       more context can be added later
      throw new Error(`Function '${func}' not recognized`);
    }
    var func = func.value;

    var args = s.next().rest();

    args.map(arg => {
      arg = dhelp.processData(null, arg);
      if ( arg.type === 'code' ) {
        return evl(lib.newListStream(arg.value,0));
      }
      return arg;
    });

    console.log('AAAA');
    var output = func(args);
    console.log('BBBB');
    return dres.resOK(output);
  }
  return evl;
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
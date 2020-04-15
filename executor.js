'use strict';

var l;
var execute;
var soup;

var jslib = require('./jslib');

function addPatterns() {
  soup.parse.process_definitions(soup.parse.newStream(`
      def pattern if [ [code] [list] ]
  `, 0));
}

// TODO: these two are copied from the parser, which is bad
var noValue = (item) => false
  || item.type === 'unknown'
  || item.type === 'defiant'
  || item.type === 'invalid'
  ;

var setAsDefiant = (token) => {
    if ( token.type === 'unknown' ) token.type = 'defiant';
    return token;
};

var newListStream = () => {};
newListStream = (list, index) => {
  var o = {};
  o.preview = list.slice(index);
  o.eof = () => index >= list.length;
  o.val = () => list[index];
  o.rest = () => list.slice(index);
  o.next = () => newListStream(list, index+1);
  return o;
}
/*
function {a b c d} [a b c]
-> by name, function
   [list [list [symbol object]] [list [symbol list]]
*/
var process_pattern_by_name = (name, s) => {
  var validateListType = (type) => {
    console.log('&&^&&&&', type, s.val()[0]);
    if ( s.val()[0] !== type ) return {
      type: 'defiant', 
      value: result,
      stream: s
    }
    console.log('okay', s);
    return {
      type: type,
      value: [ s.val() ],
      stream: s.next()
    }
  }
  switch ( name ) {
    case 'code':
      return validateListType('code');
    case 'list':
      return validateListType('list');
    default:
      let maybeDef = l('pattern', name);
      if ( ! maybeDef.hasOwnProperty('def') ) {
        return {
          type: 'invalid',
          info: `pattern name "${name}" not recognized`,
          stream: s
        }
      }
      let result = process_pattern(maybeDef.def[0], s);
      if ( noValue(result) ) {
        return setAsDefiant(result);
      }
      return result
  }
}

// Eventually there will be one "consume_pattern" function that
// will contain the common logic between this and what's in
// parser.js, and it will take as a parameter a function to
// consume the named types
/**
 * @param pattern javascript array of typespec lists
 * @param s listStream object
 * @return pattern filling object
 */
var process_pattern = (pattern, s) => {
  console.log('pattern', pattern);
  pattern = jslib.convertData(null, pattern);

  if ( pattern.type !== 'list' ) {
    return {
      type: 'invalid',
      info:
        `invalid pattern: expected list but got `
        +`'${pattern.type}'`,
    }
  }

  pattern = pattern.value;

  var items = [];
  
  for ( let i=0; i < pattern.length; i++ ) {
    let patternNode = jslib.convertData(null, pattern[i]);
    if ( patternNode.type !== 'list' )
      throw new Error('patternNode should be a list');
    patternNode = patternNode.value;
    let patternSymbol = jslib.convertData(null, patternNode[0]);
    if ( patternSymbol.type !== 'symbol' )
      throw new Error('patternSymbol should be a symbol');
    let patternName = patternSymbol.value;
    
    switch ( patternSymbol.value ) {
      case 'either':
        console.error('either not implemented here yet');
        return {
          type: 'invalid'
        }
      default:
        let result = process_pattern_by_name(patternName, s)
        if ( noValue(result) ) {
          return setAsDefiant(result);
        }
        items.push(...result.value);
        s = result.stream;
    }
  }

  return {
    type: 'filling',
    value: items,
    stream: s
  }
}

/*
  When you get back to this:
  - executing lists of functions and functions
    are two different things
  - maybe expression vs sequencable problem?
*/

var newBlockExecutor = () => {};
newBlockExecutor = (configuration) => {
  var params = jslib.util.requireParams(configuration, [
    'resultHandler', 'evaluator'
  ]);
  var evaluate = input => params.resultHandler(
    params.evaluator(input));
  return (s) => {
    if ( s.eof() ) {
      console.warn('empty code execution');
      return;
    }
    while ( ! s.eof() ) {
      let jsnode = jslib.convertData(null, s.val());
      let evalS;
      switch ( jsnode.type ) {
        case 'symbol':
          s = s.next();
          let filling = process_pattern_by_name(jsnode.value, s);
          console.log('check:exSymbolFilling', filling);
          if ( noValue(filling) ) {
            console.log(filling);
            throw new Error('no pattern for '+jsnode.value)
          }
          s = filling.stream;
          evalS = newListStream(
            [
              ['symbol', jsnode.value],
              ...filling.value
            ], 0);
          evaluate(evalS);
          break;
        case 'code':
          evalS = newListStream(
            jsnode.value, 0);
          evaluate(evalS);
          s = s.next();
          break;
      }
    }
  }
}

var expressionExecutor;
var listResultExecutor;
var voidResultExecutor;

/**
 * @param options
 * @param evaluator decorators for list evaluation
 * @param s listStream object
 * @return execution result object
 */
var execute = () => {};
execute = (options, evaluator, s) => {
  if ( s.eof() ) {
    console.warn('empty code execution');
    return;
  }
  while ( ! s.eof() ) {
    var jsnode = jslib.convertData(null, s.val());
    switch ( jsnode.type ) {
      case 'symbol':
        let result = process_pattern_by_name(
          jsnode.value, s.next().rest());
        console.log('check:exSymbolResult', result);
        if ( noValue(result) ) {
          throw new Error('no pattern; executing as single function')
        }
        evaluator(newListStream(result.value, 0));
        break;
      case 'code':
        console.log("ayyyy got here");
        break;
      default:
        console.log('uh oh this is not good');
    }
  }
}

var newFuncMapEvaluator;
newFuncMapEvaluator = (funcMap) => {
  var evl;
  evl = (s) => {
    if ( s.eof() ) {
      console.warn('empty evaluator');
      return;
    }
    console.log({
      a: s,
      b: s.val(),
      c: JSON.stringify(s)
    });
    var symbolNode = jslib.convertData(null, s.val());
    if ( symbolNode.type !== 'symbol' ) {
      throw new Error('expected symbol or string');
    }
    var funcName = symbolNode.value;
    if ( ! funcMap.hasOwnProperty(funcName) ) {
      // TODO: Use similar error handling as parser.js so that
      //       more context can be added later
      throw new Error(`Function '${func}' not recognized`);
    }
    var func = funcMap[funcName];

    var args = s.next().rest();
    args.map(arg => (arg === 'code')
      ? evl(arg.slice(1))
      : arg
    )

    console.log('AAAA');
    var output = func(args);
    console.log('BBBB');
    return output;
  }
  return evl;
}

module.exports = (_soup) => {
  soup = _soup;
  l = soup.l;
  addPatterns();
  return {
    process_pattern: process_pattern,
    newListStream: newListStream,
    newBlockExecutor: newBlockExecutor,
    newFuncMapEvaluator: newFuncMapEvaluator,
  }
}
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
    if ( s.val()[0] !== type ) return {
      type: 'defiant', 
      value: result,
      stream: s
    }
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
      return {
        type: 'invalid',
        info: `pattern name "${name}" not recognized`,
        stream: s
      }
  }
}

// Eventually there will be one "consume_pattern" function that
// will contain the common logic between this and what's in
// parser.js, and it will take as a parameter a function to
// consume the named types
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

execute = (options, evaluator, data) => {
  
}

var funcMapEvaluate = (input, funcMap) => {
  if ( input.length < 1 ) {
    // TODO: make this more specific
    throw new Error('invalid list');
  }
  var func = input[0];
  if ( ! funcMap.hasOwnProperty(func) ) {
    // TODO: Use similar error handling as parser.js so that
    //       more context can be added later
    throw new Error(`Function '${func}' not recognized`);
  }

  return func(input.slice(1));
}

var conditionalEvaluate = (input, delegate) => {
  if ( input.length < 1 ) {
    // TODO: make this more specific
    throw new Error('invalid list');
  }

  var type = input[0];
  if ( type === 'code' ) {
    return delegate(input.slice(1));
  }
  return input;
}

module.exports = (_soup) => {
  soup = _soup;
  l = soup.l;
  addPatterns();
  return {
    process_pattern: process_pattern,
    newListStream: newListStream,
  }
}
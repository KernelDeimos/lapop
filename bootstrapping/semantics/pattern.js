'use strict';
var dhelp = require('../utilities/datahelper');
var dres = require('../utilities/descriptiveresults');
var lib = {};

lib.process_pattern = (config, pattern, s) => {
  // TODO: add assertion for config
  let dresLocal = dres.subContext({
    stream: s
  });
  let advance = result => {
    s = result.stream;
    if ( typeof config.onAdvance !== 'undefined' ) {
      let o = { stream: s };
      config.onAdvance(o);
      s = o.stream;
    }
    dresLocal.set('stream', s);
  };

  let items = [];

  pattern = dhelp.processData(null, pattern);
  if ( dres.isNegative(pattern) ) {
    return pattern;
  }
  pattern = pattern.value;
  for ( let i=0; i < pattern.length; i++ ) {
    // wrap parser output with javascript helpers
    let patternNode = dhelp.processData(null, pattern[i]);
    if ( dres.isNegative(patternNode) )
      return dresLocal.dress(patternNode);
    if ( patternNode.type !== 'list' ) {
      return dresLocal.result({
        status: 'internal',
        info: 'patternNode should be a list',
        extra: { patternNode: patternNode }
      });
    }
    patternNode = patternNode.value;
    if ( patternNode.length === 0 ) {
      return dresLocal.resInvalid('patternNode is empty');
    }
    let patternSymbol = dhelp.processData(null, patternNode[0])
    if ( dres.isNegative(patternSymbol) )
      return dresLocal.dress(patternSymbol);
    let patternName = patternSymbol.value;

    switch ( patternName ) {
      case 'either':
        let choices = patternNode.slice(1);
        let success = false;
        for ( let j = 0; j < choices.length; j++ ) {
          let currentPattern = choices[j];
          let possibleResult = lib.process_pattern(
            config, currentPattern, s);
          if ( dres.isError(possibleResult) ) {
            return dresLocal.dress(possibleResult);
          }
          if ( dres.isNegative(possibleResult) ) continue;
          items.push(...possibleResult.value)
          advance(possibleResult);
          success = true;
          break;
        }
        if ( ! success ) {
          return dresLocal.resInvalid('no patterns matched');
        }
      default:
        let args = patternNode.slice(1);
        let res = config.process_pattern_by_name(
          patternName, args, s);
        if ( dres.isNegative(res) )
          return dres.unknownIsDefiant(res);
        items.push(...res.value);
        advance(res);
    }
  }

  return dresLocal.resOK(items, { type: 'filling' })
}

lib.filling_to_tuple = (res) => {
  if ( dres.resOK(res) ) {
    res.value = ['tuple'].concat(res.value);
  }
  return res;
}

module.exports = lib;
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
    if ( result.stream === undefined ) {
      throw new Error('no stream: ' + JSON.stringify(result));
    }
    s = result.stream;
    if ( typeof config.onAdvance !== 'undefined' ) {
      let o = { stream: s };
      config.onAdvance(o);
      s = o.stream;
    }
    dresLocal.set('stream', s);
  };

  // pattern filling items
  let items = [];

  // remembers name-for-pattern results for the pattern-from-name pseudo-type.
  let identifiers = {};

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

    // TODO: replace this switch to make variable names consistent
    //       ("let"s don't look at "breaks" and enforce irritating scope rules)
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
          return dresLocal.result({
            status: 'defiant',
            info: 'no patterns matched'
          });
        }
        break;
      case 'symbol-for-pattern':
        let patternIdentSymbol = dhelp.processData(null, patternNode[1]);

        // note: res2 is a filling containing a listified symbol
        let res2 = config.process_pattern_by_name('symbol', [], s);
        if ( dres.isNegative(res2) ) {
          res2.info = `while processing identifier ${ident} ` +
            `${patternName}: ${res2.info}`
          return res2;
        }

        // This closure adds the named pattern to the `identifiers` map
        (() => {
          let listifiedSymbol = res2.value[0];
          let processedSymbol = dhelp.processData(null, listifiedSymbol);
          identifiers[patternIdentSymbol.value] = processedSymbol.value;
        })();

        advance(res2)
        items.push(...res2.value);
        break;
      case 'pattern-from-symbol':
          let patternIdentSymbol2 = dhelp.processData(null, patternNode[1]);
          if ( ! identifiers.hasOwnProperty(patternIdentSymbol2.value) ) {
            return dres.result({
              status: 'unknown',
              info: 'missing pattern',
              subject: patternIdentSymbol2.value
            });
          }
          let expectedPattern = identifiers[patternIdentSymbol2.value];
          let res3 = config.process_pattern_by_name(
            expectedPattern, [], s);
          if ( dres.isNegative(res3) ) {
            res3.info = `while processing identifier ${expectedPattern} ` +
              `${patternName}: ${res3.info}`
            return res3;
          }
          items.push(...res3.value);
          advance(res3)
        break;
      case 'optional':
        let optionalPattern = ['list'].concat(patternNode.slice(1));
        let optionalResult = lib.process_pattern(
          config, optionalPattern, s);
        if ( dres.isNegative(optionalResult) ) {
          continue;
        }
        items.push(...optionalResult.value);
        advance(optionalResult);
        break;
      case 'keyword':
        // GOTCHA: as of writing, this is the only place where the
        //   pattern processer processes a filling value. If
        //   changing the format for filling results, remove this
        //   and re-implement it after to avoid debugging two things
        //   at once.
        let keywordResult = config.process_pattern_by_name(
          'symbol', [], s);
        if ( dres.isNegative(keywordResult) ) {
          return keywordResult;
        }
        if ( patternNode[1][1] !== keywordResult.value[0][1] ) {
          return dresLocal.result({
            status: 'defiant',
            info: 'keyword did not match expected value; ' +
              `expected '${patternNode[1][1]}' but got '` +
              keywordResult.value[0][1] + `'`
          });
        }
        advance(keywordResult);
        break;
      default:
        let args = patternNode.slice(1);
        let res = config.process_pattern_by_name(
          patternName, args, s);
        if ( dres.isNegative(res) ) {
          res.info = `while processing ${patternName}: ${res.info}`;
          return dres.unknownIsDefiant(res);
        }
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
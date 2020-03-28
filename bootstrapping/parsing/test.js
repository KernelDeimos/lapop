// The test framework is tested with manual verification of
// the output. While it's possible to use the test framework
// to test itself, it could lead to inaccurate test results.

var testf = require('../testing/framework');
var dres = require('../utilities/descriptiveresults');
var dhelp = require('../utilities/datahelper');
var parser = require('./parser');

testf.SET(
  'bootstrapping.parsing.parser.try_symbol',
  ts => {
    ts.CASE('parses valid symbols', tc => {
      tc.RUN((t, d) => {
        let inputs = [
          ['simpleSymbol', 'simpleSymbol'],
          ['dotted.symbol', 'dotted.symbol'],
          ['symbol "string"', 'symbol'],
        ];
        inputs.forEach(input => {
          let s = parser.newStream(input[0], 0);
          let res = parser.try_symbol(s);
          t.assert(input[0] + ' is considered valid', dres.isOK(res));
          t.assert(input[0] + ' has correct value', true
            && Array.isArray(res.value)
            && res.value[0] === 'symbol'
            && res.value[1] === input[1],
            {
              expected: ['symbol', input[1]],
              received: res.value,
            }
          );
        });
      })
    })
    /* This test case will be used somewhere else
    ts.CASE('works with different whitespace', (tc) => {
      tc.RUN((t, d) => {
        let ws = [' ', '\n', '\t', '\r\n'];
        let literalize = str => JSON.stringify(str);
        for ( a in ws ) for ( b in ws ) {
          let input = ws[a]+'mySymbol'+ws[b];
          let s = parser.newStream(input, 0);
          let res = parser.try_symbol(s);
          t.assert(
            'with '+literalize(ws[a])+' and '+literalize(ws[b]),
            dres.isOK(res)
          );
        }
      });
    });
    */
  }
);

testf.SET(
  'bootstrapping.parsing.parser.try_string',
  ts => {
    ts.CASE('parses valid symbols', tc => {
      tc.RUN((t, d) => {
        let inputs = {}
        inputs[`"double-quoted string"`]=`double-quoted string`;
        inputs[`'single-quoted string'`]=`single-quoted string`;
        inputs[`"string with \\`+`\"escaped quotes\\`+`\".."`]=
          `string with \"escaped quotes\"..`;
        inputs[`"\\\"begins with quote"`]=
          `\"begins with quote`;
        inputs[`"ends with quote\\`+`\""`]=
          `ends with quote\"`;
        for ( input in inputs ) {
          let s = parser.newStream(input, 0);
          let res = parser.try_string(s);
          t.assert(input + ' is considered valid', dres.isOK(res));
          t.assert(
            input + ' has correct value',
            res.value === inputs[input],
            {
              expected: inputs[input],
              received: res.value
            }
          );
        }
      })
    })
    ts.CASE('rejects invalid symbols', tc => {
      tc.RUN((t, d) => {
        let cases = [
          ['isSymbol', 'unknown'],
          ['\"not finished', 'invalid'],
        ];
        cases.forEach(case_ => {
          let s = parser.newStream(case_[0], 0);
          let res = parser.try_string(s);
          t.assert(case_[0] + ' reports status '+case_[1],
            res.status === case_[1]);
        });
      })
    })
  }
);

testf.SET(
  'bootstrapping.parsing.parser.alt',
  ts => {
    ts.CASE('parses valid symbols', tc => {
      tc.RUN((t, d) => {
        let input = `isSymbol "is string"`
        let s = parser.newStream(input, 0);
        let alt = parser.alt.bind(this, [
          parser.try_string,
          parser.try_symbol,
        ]);
        let res = alt(s);
        t.assert('bound alt is considered valid', dres.isOK(res));
        t.assert('bound alt matched symbol',
          dhelp.listEqual(res.value, ['symbol', 'isSymbol']),
          {
            expected: ['symbol', 'isSymbol'],
            received: res.value,
          }
        )
      })
    })
  }
);

testf.SET(
  'bootstrapping.parsing.parser.eat_whitespace',
  ts => {
    ts.CASE('functions correctly', tc => {
      tc.RUN((t, d) => {
        let input = ` \r\n\t\nsymbol`;
        let s = parser.newStream(input, 0);
        let res = parser.eat_whitespace(s);
        t.assert('eat_whitespace reports valid', dres.isOK(res));
        t.assert('eat_whitespace advances stream',
          res.stream.chr() === 's', { res: res });
      })
    })
  }
);

testf.SET(
  'bootstrapping.parsing.parser.parse_list_tokens',
  ts => {
    ts.CASE('ignores commas', tc => {
      tc.RUN((t, d) => {
        let input = `"a", "b" "c"`;
        let s = parser.newStream(input, 0);
        let res = parser.parse_list_tokens(null,
          parser.try_string, s);
        t.assert('reports valid', dres.isOK(res));
        t.assert('contains expected value',
          dhelp.listEqual(['a','b','c'], res.value));
      })
    })
  }
);

testf.SET(
  'bootstrapping.parsing.parser.try_data',
  ts => {
    ts.CASE('parses string list', tc => {
      tc.RUN((t, d) => {
        let input = `["a", "b" "c"] symbol`;
        let s = parser.newStream(input, 0);
        let res = parser.try_data(s);
        t.assert('reports valid', dres.isOK(res));
        t.assert('contains expected value',
          dhelp.listEqual(['list', 'a','b','c'], res.value));
      })
    });
    ts.CASE('parses mixed-value list', tc => {
      tc.RUN((t, d) => {
        let input = `["a", {b 'c'} d] symbol`;
        let s = parser.newStream(input, 0);
        let res = parser.try_data(s);
        t.assert('reports valid', dres.isOK(res));
        t.assert('contains expected value',
          dhelp.listEqual(
            ['list',
              'a',
              ['assoc',['symbol','b'],'c'],
              ['symbol','d']],
            res.value),
            res
        );
      })
    });
  }
);

testf.SET(
  'bootstrapping.parsing.parser.try_assoc',
  ts => {
    ts.CASE('parses string list', tc => {
      tc.RUN((t, d) => {
        let input = `{'a' 'b' 'c': 'd', 'e' 'f'} symbol`;
        let s = parser.newStream(input, 0);
        let res = parser.try_assoc(s);
        t.assert('reports valid', dres.isOK(res));
        t.assert('contains expected value',
          dhelp.listEqual(
            ['assoc', 'a','b','c','d','e','f'],
            res.value));
      })
    })
  }
);

testf.all();

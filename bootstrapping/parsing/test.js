// The test framework is tested with manual verification of
// the output. While it's possible to use the test framework
// to test itself, it could lead to inaccurate test results.

var testf = require('../testing/framework');
var dres = require('../utilities/descriptiveresults');
var dhelp = require('../utilities/datahelper');
var parser = require('./primitives');
var primitives = parser;

var astAdapter = astNode => {
  var o = {
    status: astNode.status,
    stream: astNode.stream,
  };
  if ( true
    && astNode.hasOwnProperty('value')
    && astNode.value !== null
  ) {
    o.value = [];
    if ( astNode.value.hasOwnProperty('type') ) {
      o.value[0] = astNode.value.type;
    }
    if ( astNode.value.hasOwnProperty('value') ) {
      o.value[1] = astNode.value.value;
    }
  }
  return o;
}

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
          res = astAdapter(res);
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
    ts.CASE('parses valid strings', tc => {
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
          res = astAdapter(res);
          t.assert(input + ' is considered valid', dres.isOK(res));
          t.assert(
            input + ' has correct value',
            res.value[1] === inputs[input],
            {
              expected: inputs[input],
              received: res.value
            }
          );
        }
      })
    })
    ts.CASE('rejects invalid strings', tc => {
      tc.RUN((t, d) => {
        let cases = [
          ['isSymbol', 'unknown'],
          ['\"not finished', 'invalid'],
        ];
        cases.forEach(case_ => {
          let s = parser.newStream(case_[0], 0);
          let res = parser.try_string(s);
          console.log(res);
          res = astAdapter(res);
          t.assert(case_[0] + ' reports status '+case_[1],
            res.status === case_[1]);
        });
      })
    })
  }
);

testf.SET('bootstrapping.parsing.parser.try_float', ts => {
  ts.CASE('123.456', tc => { tc.RUN((t, d) => {
    let input = `123.456`;
    let s = parser.newStream(input, 0);
    let res = parser.try_float(s);
    res = astAdapter(res);
    t.assert('reports valid', dres.resOK(res));
    t.assert('reports correct value', true
      && res.value[0] === 'float'
      && res.value[1] === 123.456
    );
  })});
});

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
        res = astAdapter(res);
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
        res = astAdapter(res);
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
        // Remove irrelevant properties
        // TODO: add a subset equals to remove this code
        t.assert('reports valid', dres.isOK(res));
        console.log(res);
        t.assert('contains expected value',
          dhelp.equal([
            { type: 'string', value: 'a', escapeQuote: '"' },
            { type: 'string', value: 'b', escapeQuote: '"' },
            { type: 'string', value: 'c', escapeQuote: '"' },
          ], res.value));
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
          dhelp.equal({
            type: 'list',
            value: [
              { type: 'string', value: 'a', escapeQuote: '"' },
              { type: 'string', value: 'b', escapeQuote: '"' },
              { type: 'string', value: 'c', escapeQuote: '"' },
            ],
          }, res.value));
        s = res.stream;
        t.assert('advances stream', s.chr() === ' ');
      })
    });
    ts.CASE('parses mixed-value list', tc => {
      tc.RUN((t, d) => {
        let input = `["a", {b 'c'} d] symbol`;
        let s = parser.newStream(input, 0);
        let res = parser.try_data(s);
        t.assert('reports valid', dres.isOK(res));
        console.log(res.value.value[1])
        t.assert('contains expected value',
          dhelp.equal({
            type: 'list',
            value: [
              { type: 'string', value: 'a', escapeQuote: '"' },
              { type: 'assoc', value: [
                { type: 'symbol', value: 'b' },
                { type: 'string', value: 'c', escapeQuote: "'" },
              ]},
              { type: 'symbol', value: 'd' },
            ],
          }, res.value));
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
          dhelp.listEqual({
            type: 'assoc',
            value: ['a','b','c','d','e','f'].map(v => ({
              type: 'string', escapeQuote: "'", value: v
            }))
          },
            res.value));
      })
    })
  }
);

var memory = require('../interpreting/memory');

var definitions = require('./definitions')(
  memory.install_in_soup({})
);
var pattern = require('./pattern')(
  memory.install_in_soup({})
);

/*
testf.SET('bootstrapping.parsing.deep_patterns', ts => {
  ts.CASE('assoc, deep pattern on value', tc => {
    tc.RUN((t, d) => {
      var s = primitives.newStream(
        `{
          a [a b] [c d]
          c [e f] [g h]
        }
      `, 0);
      let res = pattern.process_pattern_by_name(
        'assoc', [
          ['list',
            ['list', ['symbol', 'list']],
            ['list', ['symbol', 'list']]]
        ],
        s
      );
      t.assert('reports valid', dres.resOK(res));
      console.log('patternResult',
        JSON.stringify(res.value, null, 4));
      let compareO = {
        received: res.value,
        expected: [ /* pattern array *//* ['assoc',
          ['symbol', 'a'], ['tuple',
            ['list',['symbol','a'],['symbol','b']],
            ['list',['symbol','c'],['symbol','d']]],
          ['symbol', 'c'], ['tuple',
            ['list',['symbol','e'],['symbol','f']],
            ['list',['symbol','g'],['symbol','h']]]]
        ]};
      t.assert('reports expected value',
        dhelp.listEqual(
          compareO.expected, compareO.received
        ), JSON.stringify(compareO));
    });
  });
})

testf.SET(
  'bootstrapping.parsing.definitions',
  ts => {
    ts.CASE('can process definitions', tc => {
      tc.RUN((t, d) => {
        var s = primitives.newStream(`
          def pattern __test__1__ [
            [list]
            [object]
          ]
        `, 0);
        let res = definitions.process_definitions(s);
        let received = memory.registry('pattern', '__test__1__').def;
        let expected = [
          ['list',
            ['list', ['symbol','list']],
            ['list', ['symbol','object']]]
        ];
        t.assert('correctly stores pattern definition', dhelp.listEqual(received, expected), {
          expected: expected,
          received: received,
        });
        s = primitives.newStream(`
          def __test__1__ __test__2__ [a b c] {d e f g}
        `, 0);
        res = definitions.process_definitions(s);
        if ( dres.isNegative(res) ) {
          console.log(res);
        }
        received = memory.registry('__test__1__', '__test__2__').def;
        expected = [
          ['list',
            ['symbol', 'a'],
            ['symbol', 'b'],
            ['symbol', 'c']],
          ['assoc',
            ['symbol', 'd'],
            ['symbol', 'e'],
            ['symbol', 'f'],
            ['symbol', 'g']]
        ];
        t.assert('correctly stores custom definition', dhelp.listEqual(received, expected), {
          expected: expected,
          received: received,
        });
      });
    })
  }
);
*/

testf.all();

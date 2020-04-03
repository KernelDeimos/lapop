var testf = require('../testing/framework');
var dres = require('../utilities/descriptiveresults');
var dhelp = require('../utilities/datahelper');
var memory = require('../interpreting/memory');
var evaluators = require('./evaluators');
var streams = require('./streams');

var interpreter = require('./interpreter')(
  memory.install_in_soup({})
);

// Patterns for testing
memory.registry('pattern', 'if').def = [
  ['list',
    ['list', ['symbol', 'code']],
    ['list', ['symbol', 'list']]]
];

// Function map for testing

testf.SET(
  'bootstrapping.interpreting.interpreter.process_pattern',
  ts => {
    ts.CASE('can process custom pattern', tc => {
      tc.RUN((t, d) => {
        var pattern =
          ['list',
            ['list', ['symbol', 'list']],
            ['list', ['symbol', 'list']]];
        var s = streams.newListStream([
          ['list', 'a', 'b', 'c'],
          ['list', 'd', 'e', 'f'],
          ['list', 'g', 'e', 'f'],
        ], 0);
        var res = interpreter.process_pattern(pattern, s);
        t.assert('reports valid', dres.isOK(res));
        var expected = [
          ['list', 'a', 'b', 'c'],
          // TODO: assoc instead of list
          ['list', 'd', 'e', 'f'],
        ];
        t.assert('contains expected value',
          dhelp.listEqual(expected, res.value),
          {
            expected: expected,
            received: res.value,
          }
        );
      })
    });
  }
)

testf.SET(
  'bootstrapping.interpreting.interpreter.__evaluators__',
  ts => {
    ts.CASE('can process custom pattern', tc => {
      tc.RUN((t, d) => {
        var inputBlock = [
          ['symbol', 'if'],
          ['code',
            ['symbol', 'eq'],
            ['code', ['symbol', 'a']], 
            ['code', ['symbol', 'b']]],
          ['list',
            ['code', ['symbol', 'log'], 'Hello!']]
        ];
        console.log(inputBlock);
        var fmap = {};
        var logger = console.log;
        var ofmap = interpreter.newObjectFunctionMap(fmap);
        var ev = evaluators.newStandardEvaluator(ofmap);
        var ex = interpreter.newBlockExecutor({
          resultHandler: () => {},
          evaluator: ev,
        });

fmap.if = args => {
  if ( dres.isOK(args[0]) && args[0].value === true ) {
    ex(streams.newListStream(args[1].value, 0));
  }
}
fmap.eq = args => {
  if ( args.length < 2 ) return dres.resOK(true); // I suppose?
  let previous = args[0].value;
  for ( let i=1; i < args.length; i++ ) {
    if ( args[i].value != previous ) return dres.resOK(false);
    previous = args[i].value;
  }
  return dres.resOK(true);
};
fmap.log = (msg) => {
  logger(msg[0].value);
}
fmap.a = () => dres.resOK(2);
fmap.b = () => dres.resOK(2);

        var s = streams.newListStream(inputBlock, 0);
        var result = ex(s);
        console.log('result', result);
      })
    });
  }
)

testf.all();
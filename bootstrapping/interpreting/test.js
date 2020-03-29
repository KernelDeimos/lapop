var testf = require('../testing/framework');
var dres = require('../utilities/descriptiveresults');
var dhelp = require('../utilities/datahelper');
var memory = require('../interpreting/memory');

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
        var s = interpreter.newListStream([
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
        var ev = interpreter.newFuncMapEvaluator(ofmap);
        var ex = interpreter.newBlockExecutor({
          resultHandler: () => {},
          evaluator: ev,
        });

fmap.if = args => {
  if ( args[0] ) {
    let code = dhelp.assertData(null, 'list', args[1]);
    console.log("1!!!", code);
    ex(interpreter.newListStream(code.value, 0));
  }
}
fmap.eq = (...args) => {
  if ( args.length < 2 ) return true; // I suppose?
  let previous = args[0];
  for ( let i=1; i < args.length; i++ ) {
    if ( args[i] != previous ) return false;
    previous = args[i];
  }
  return true;
};
fmap.log = (msg) => {
  logger(...msg);
}
fmap.a = () => 2;
fmap.b = () => 2;

        var s = interpreter.newListStream(inputBlock, 0);
        console.log(s);
        var result = ex(s);
      })
    });
  }
)

testf.all();
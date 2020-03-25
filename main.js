var boot = require('./boot.js');

var jslib = require('./jslib');

var parserInit = require('./parser.js');
var parse = parserInit({
  l: boot.l
});
console.log(parse);

var executorInit = require('./executor.js');
var executor = executorInit({
  l: boot.l,
  parse: parse,
});

var spectaclesInit = require('./spectacles.js');
var spectacles = spectaclesInit({
  bootDebug: boot._debug,
});

var serialize_code = (text) => {
  var s = parse.newStream(text, 0);
  s = parse.eat_whitespace(s).stream;
  result = parse.parse_list_tokens(s, null, parse.try_any);
  console.log('serialized', result);
  return result;
}

/*
console.log(JSON.stringify(serialize_code(`
  if (eq (a) (b)) [
    (logger.info 'This is a string')
  ]
`)));
console.log('hi?');
*/

spectacles.printOfType('pattern');
spectacles.printOfType('function');

console.log('-------------');

result = executor.process_pattern(
  l('pattern', 'if').def[0],
    executor.newListStream(serialize_code(`
      (eq (a) 2) [
        (log 'Hello')
      ]
    `).value, 0)
);

console.log(result);

console.log('-------------');

var fmap = {};
var ev = executor.newFuncMapEvaluator(fmap);
var ex = executor.newBlockExecutor({
  resultHandler: () => {},
  evaluator: ev,
});
fmap.if = args => {
  if ( args[0] ) {
    let code = jslib.assertData(null, 'list', args[1]);
    console.log("1!!!", code);
    ex(executor.newListStream(code.value, 0));
  }
}
fmap.a = () => 2;
fmap.eq = (...args) => {
  if ( args.length < 1 ) return true; // I suppose?
  let previous = args[0];
  for ( let i=1; i < args.length; i++ ) {
    if ( args[i] != previous ) return false;
    previous = args[i];
  }
  return true;
};
fmap.log = (msg) => {
  console.log(...msg);
}

result = ex(
  executor.newListStream(serialize_code(`
    if (eq (a) 2) [
      (log 'Hello')
    ]
  `).value, 0)
);

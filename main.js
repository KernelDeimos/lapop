var boot = require('./boot.js');

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
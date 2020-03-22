var boot = require('./boot.js');

var parserInit = require('./parser.js');
var parse = parserInit({
  l: boot.l
});
console.log(parse);

var serialize_code = (text) => {
  var s = parse.newStream(text, 0);
  s = parse.eat_whitespace(s).stream;
  result = parse.parse_list_tokens(s, null, parse.try_any);
  return result;
}

console.log(JSON.stringify(serialize_code(`
  if (eq (a) (b)) [
    (logger.info 'This is a string')
  ]
`)));
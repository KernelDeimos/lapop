var soup = {};
var lib = {};

var dres = require('../utilities/descriptiveresults');

var primitives = require('./primitives');
var patternParsing = null;

lib.try_def = (s) => {
    let command = primitives.try_symbol(s);
    if ( dres.isNegative(command) ) {
        command.status = 'invalid';
        return command;
    }
    s = command.stream;
    s = primitives.eat_whitespace(s).stream;

    // TODO: maybe instead of command.value[1] use actual parser
    if ( command.value[1] != 'def' ) {
        dres.resInvalid({
            status: 'invalid',
            info: '"def" keyword not found; malformed pattern or filling?',
            expected: 'def',
            received: command.value,
            stream: s
        });
    }

    // assume def command (for now)
    let pattern = primitives.try_symbol(s);
    if ( dres.isNegative(pattern) ) {
      pattern.status = 'invalid';
      pattern.info = 'expected pattern';
      return pattern;
    }
    s = pattern.stream;
    s = primitives.eat_whitespace(s).stream;

    let identifier = primitives.try_symbol(s);
    if ( dres.isNegative(identifier) ) {
      identifier.status = 'invalid';
      identifier.info = 'expected pattern';
      return identifier;
    }
    s = identifier.stream;
    s = primitives.eat_whitespace(s).stream;

    let result = patternParsing.process_pattern_by_name(pattern.value[1], s);
    if ( dres.isNegative(result) ) {
      result.status = 'invalid';
      return result;
    }
    s = result.stream;
    return dres.resOK(result.value, {
        type: 'definition',
        of: pattern.value[1],
        for: identifier.value[1],
        stream: s
    })
}

lib.process_definitions = (s) => {
    // Script is allowed to begin with whitespace
    s = primitives.eat_whitespace(s).stream;

    while ( ! s.eof() ) {
        let result = lib.try_def(s)
        s = result.stream;
        if ( dres.isNegative(result) ) {
            return result;
        }
        soup.registry(result.of, result.for).def = result.value;
        s = primitives.eat_whitespace(s).stream;
    }

    return dres.resOK();
}

module.exports = soup_ => {
  soup = soup_;
  patternParsing = require('./pattern')(soup_)
  return lib;
}
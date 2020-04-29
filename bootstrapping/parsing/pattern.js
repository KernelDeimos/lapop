var soup = {};
var lib = {};

var dres = require('../utilities/descriptiveresults');
var pattern = require('../semantics/pattern');

var primitives = require('./primitives');

lib.process_pattern = () => { throw new Error('NOOP') };
lib.process_pattern_by_name = (name, args, s) => {
  let result;
  let dresFilling = dres.subContext({
    type: 'filling',
    stream: s
  });
  // let dresLocal = dres.subContext({
  //   stream: s
  // });
  let advance = result => {
    s = result.stream;
    // dresLocal.set('stream', s);
    dresFilling.set('stream', s);
  };

  switch ( name ) {
    case 'list':
      result = primitives.try_data(s);
      if ( dres.isNegative(result) )
        return dres.unknownIsDefiant(result);
      advance(result);
      return dresFilling.resOK( [ result.value ] );
    case 'symbol':
      result = primitives.try_symbol(s);
      if ( dres.isNegative(result) )
        return dres.unknownIsDefiant(result);
      advance(result);
      return dresFilling.resOK( [ result.value ] );
    case 'object':
    case 'assoc': // alias
      let try_key = primitives.alt.bind(
        primitives.alt, [primitives.try_string, primitives.try_symbol]);
      let try_val = primitives.try_any;
      if ( Array.isArray(args) ) {
        if ( args.length == 1 ) {
          try_val = s_ => {
            return pattern.filling_to_tuple(
              lib.process_pattern(args[0], s_));
          }
        } else if ( args.length == 2 ) {
          try_key = s_ => lib.process_pattern(args[0], s_);
          if ( args[1] !== null )
            try_val = s_ => lib.process_pattern(args[1], s_);
        }
      }
      result = primitives.try_assoc_customized(try_key, try_val, s);
      if ( dres.isNegative(result) )
        return dres.unknownIsDefiant(result);
      advance(result);
      return dresFilling.resOK( [ result.value ] );
    default:
      let maybeDef = soup.registry('pattern', name);
      if ( maybeDef.hasOwnProperty('def') && maybeDef.def !== null ) {
          result = lib.process_pattern(maybeDef.def[0], s);
          if ( dres.isNegative(result) )
              return dres.unknownIsDefiant(result);
          return result;
      }
      return dres.result({
        status: 'unknown',
        info: `pattern name "${name}" not recognized`,
        source: 'parser',
        subject: name,
        stream: s
      });
  }
}

lib.process_pattern = (pattern_, s) => {
  return pattern.process_pattern({
    process_pattern_by_name: lib.process_pattern_by_name,
    onAdvance: state => {
      state.stream = primitives.eat_whitespace(state.stream).stream;
    }
  }, pattern_, s);
};

module.exports = soup_ => {
  soup = soup_;
  return lib;
}
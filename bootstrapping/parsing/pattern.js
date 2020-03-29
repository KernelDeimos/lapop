var soup = {};
var lib = {};

var dres = require('../utilities/descriptiveresults');
var pattern = require('../semantics/pattern');

var primitives = require('./primitives');

lib.process_pattern = () => { throw new Error('NOOP') };
lib.process_pattern_by_name = (name, s) => {
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
    case 'object':
      result = primitives.try_assoc(s);
      if ( dres.isNegative(result) )
        return dres.unknownIsDefiant(result);
      advance(result);
      return dresFilling.resOK( [ result.value ] );
    default:
      let maybeDef = soup.registry('pattern', name);
      if ( maybeDef.hasOwnProperty('def') ) {
          result = lib.process_pattern(maybeDef.def[0], s);
          if ( dres.isNegative(result) )
              return dres.unknownIsDefiant(result);
          return result;
      }
      return dres.resInvalid(
        `pattern name "${name}" not recognized`, {
        stream: s
      });
  }
}

lib.process_pattern = pattern.process_pattern.bind(
  pattern.process_pattern, {
    process_pattern_by_name: lib.process_pattern_by_name,
    onAdvance: state => {
      state.stream = primitives.eat_whitespace(state.stream).stream;
    }
  }
);

module.exports = soup_ => {
  soup = soup_;
  return lib;
}
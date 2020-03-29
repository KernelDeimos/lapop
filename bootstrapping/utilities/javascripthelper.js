var lib = {}

lib.requireParams = (configuration, requires) => {
  var params = {};
  requires.forEach(require => {
    switch ( typeof require ) {
      case 'string':
        if ( ! configuration.hasOwnProperty(require) ) {
          // This functions does throw an exception, but
          // the return adds flexibility to change that later.
          return jslib.programmerErrorr(
            `missing requirement: '${require}'`);
        }
        params[require] = configuration[require];
        break;
      case 'object':
        return jslib.programmerError(
          'typespec requirements have not beel implemented yet');
    }
  });
  return params;
}

module.exports = lib;
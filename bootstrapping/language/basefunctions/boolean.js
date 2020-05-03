var util = require('../../utilities/util');
var dres = util.dres;

var localUtil = require('./util');

var lib = {};
lib.boolean = {};
lib.boolean['=='] = localUtil.newFunc((args, context) => {
  if ( args.length < 1 ) return dres.resOK(true); // I guess??
  let prev = args[0];
  let rest = args.slice(1)
  for ( let i=0; i < rest.length; i++ ) {
    if ( prev.type !== rest[i].type
      && ! (
        ( prev.type === 'list' || prev.type === 'code' ) &&
        ( rest[i].type === 'list' || rest[i].type === 'code' )
      )
    ) {
      return dres.resOK(false);
    }
    switch ( prev.type ) {
      case 'string':
      case 'symbol':
      case 'float':
        if ( prev.value != rest[i].value ) return dres.resOK(false);
        break;
      case 'list':
      case 'code':
        if ( ! util.dhelp.listEqual( prev.value, rest[i].value ) ) {
          return dres.resOK(false);
        }
    }
    prev = rest[i];
  }
  return dres.resOK(true);
}, null);

lib.boolean['!='] = (args, context) => {
  var res = lib.boolean['=='](args, context);
  res.value = ( res.value === true ) ? false : true;
  return res;
}

lib.boolean['<'] = localUtil.newFunc((args, context) => {
  if ( args.length < 1 ) return dres.resOK(true); // I guess??
  let prev = args[0];
  let rest = args.slice(1)
  for ( let i=0; i < rest.length; i++ ) {
    if ( prev.value >= rest[i].value ) return dres.resOK(false);
  }
  return dres.resOK(true);
}, localUtil.newVariadicValidator('float', '<'));

module.exports = lib.boolean;
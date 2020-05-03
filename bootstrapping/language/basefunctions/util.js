var util = require('../../utilities/util');
var dres = util.dres;

var localUtil = {};
localUtil.validateType = (dresValue, typ) => {
  if ( dresValue.type !== typ ) {
    return dres.resInvalid('expected type "'+typ+'"', {
      subject: dresValue
    });
  }
}

// TODO: these validators need to support pattern identifiers
localUtil.newVariadicValidator = (typ, fname) => index => arg =>
  ( arg.type === typ ) ? dres.resOK(null) : dres.resInvalid(
    `${fname} expected type "${typ}", got "${arg.type}"`);
localUtil.newListValidator = (types, fname) => i => arg =>
  ( types[i] === 'ignore' )
  ? dres.resOK(null)
  : ( arg.type === types[i] )
    ? dres.resOK(null)
    : ( dres.isNegative(arg) )
      ? arg
      : dres.resInvalid(
        `${fname} expected type "${types[i]}" but got "${arg.type}"`);

localUtil.newFunc = (f, validation) => (args, context) => {
  for ( let i=0; i < args.length; i++ ) {
    if ( dres.isNegative(args[i]) ) return args[i];
    if ( validation !== null ) {
      let res = validation(i)(args[i]);
      if ( dres.isNegative(res) ) return res;
    }
  }

  let res = f(args, context);
  if ( typeof res === 'undefined' ) {
    return dres.resOK(undefined);
  }
  return res;
}

localUtil.tmplFunc = (str, validation, extra) => {
  extra = extra || {};
  let f1 = (args, context) => {
    let arg = i => args[i].value;
    let argc = args.length;
    let res = eval(`(function(){${str}}())`);
    return res;
  };
  let f2 = (args, context) => {
    return dres.resOK(f1(args, context), extra);
  }
  return localUtil.newFunc(f2, validation);
}

localUtil.infix = sym => `return arg(0) ${sym} arg(1)`;
localUtil.varEq = (start, sym) => `
  let v = ${start};
  for ( let i=0; i < argc; i++ ) { v ${sym} arg(i); }
  return v;
`;

module.exports = localUtil;
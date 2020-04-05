var streams = require('./streams');
var dhelp = require('../utilities/datahelper');
var dres = require('../utilities/descriptiveresults');
var lib = {};

lib.try_function_name = s => {
  if ( typeof s.val() === 'string' ) {
    return dres.resOK(s.val());
  }
  let symbolNode = dhelp.processData(null, s.val());
  if ( symbolNode.type === 'symbol' ) return symbolNode;

  symbolNode.status = 'invalid';
  return symbolNode;
};

lib.baseEvaluator_ = config => funcMap => {
  var evl;
  evl = s => {
    if ( s.eof() ) return dres.result({
      status: 'empty',
      stream: s
    });

    // I can't wait to write this in the interpreted
    // language so that `try [ ... ]` handles dres.isNegative
    var funcName = lib.try_function_name(s);
    if ( dres.isNegative(funcName) ) return funcName;

    var func = funcMap.get(funcName.value);
    if ( dres.isNegative(func) ) return func;

    var args = s.next().rest();

    args = config.argFilter({ evaluate: evl }, args);

    return func.value(args, config.context);
  }
  return evl;
}

lib.createEvaluator = easyConfig => {
  var argFilter = ( easyConfig.processArguments )
    ? (api, args) => args.map(arg => dhelp.processData(null, arg))
    : (api, args) => args;
  if ( easyConfig.evaluateCodeArguments ) {
    let prevFilter = argFilter;
    if ( easyConfig.processArguments ) {
      argFilter = (api, args) => prevFilter(api, args).map(arg => {
        return ( arg.type === 'code' )
          ? api.evaluate(streams.newListStream(
            arg.value, 0))
          : arg
      });
    } else {
      argFilter = (api, args) => args.map(arg => {
        let parg = dhelp.processData(null, arg);
        return ( parg.type === 'code' )
          ? api.evaluate(streams.newListStream(
            parg.value, 0))
          : arg
      });
    }
  }
  return lib.baseEvaluator_({
    argFilter: argFilter,
    context: easyConfig.context,
  });
}

lib.newStandardEvaluator = (funcMap, context) => lib.createEvaluator({
  processArguments: true,
  evaluateCodeArguments: true,
  context: context,
})(funcMap);

lib.newShallowEvaluator = (funcMap, context) => lib.createEvaluator({
  processArguments: true,
  evaluateCodeArguments: false,
  context: context,
})(funcMap);

module.exports = lib;
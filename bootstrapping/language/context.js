var p = '..';
var memory = require(p+'/interpreting/memory');
var evaluators = require(p+'/interpreting/evaluators');
var streams = require(p+'/interpreting/streams');
var fmaps = require(p+'/interpreting/functionmaps');
var interpreter = require(p+'/interpreting/interpreter')({
  registry: memory.registry });
var basefunctions = require('./basefunctions');
var dottedfmap = require('../interpreting/dottedfmap');
var types = require('../interpreting/types');
var stdlib = require('./stdlib/main');
var cglib = require('./cglib/main');

var util = require(p+'/utilities/util');

var lib = {};

lib.newStandardExecutorProvider = () => {
  return {
    newEvaluator: evaluators.newStandardEvaluator,
    newExecutor: interpreter.newBlockExecutor,
  }
}

lib.newContextAPI = (internal, context) => {
  let api = context || {};

  api.register = internal.localFmap.register;
  api.registerMap = internal.localFmap.registerMap;
  api.registerDeprecatedMap = internal.localFmap.registerDeprecatedMap;
  api.registerDeprecated = internal.localFmap.registerDeprecated;
  api.object = map => {
    return fmaps.newObjectFunctionMap(map)
  }
  api.execBlockHere = s => {
    return internal.ex(s);
  }
  api.subContext = (config) => {
    config = config || {};
    return lib.newExecutionContext({
      executorProvider:
        config.executorProvider || internal.executorProvider,
      resultHandler:
        config.resultHandler || internal.resultHandler,
      parentFmap:
        config.internalFmap || internal.fmap,
    });
  };
  api.callResultHandler = function () {
    internal.resultHandler(...arguments);
  }
  api.getOwner = name => {
    let res = internal.fmap.has(name)
    return res;
  }
  api.ev = internal.ev;
  api.ex = internal.ex;

  return api;
}

lib.newExecutionContext = config => {
  var params = util.jshelp.requireParams(config, [
    'executorProvider', 'resultHandler',
  ])

  let subDottedFmap = dottedfmap.newDottedFunctionMap();

  let fmap = fmaps.newFallbackFunctionMap([
    subDottedFmap, config.parentFmap || fmaps.newNullFunctionMap()
  ]);

  let context = {};
  let ev = params.executorProvider.newEvaluator(fmap, context);
  let ex = params.executorProvider.newExecutor({
    evaluator: ev,
    resultHandler: params.resultHandler
  });

  return lib.newContextAPI({
    fmap: fmap,
    localFmap: subDottedFmap,
    executorProvider: params.executorProvider,
    resultHandler: params.resultHandler,
    ev: ev,
    ex: ex,
  }, context);
};

lib.newStandardExecutionContext = () => {
  let rh = (api, res) => {
    if ( res.type === 'exit' ) api.stop(res);
    else if ( ! res.status === 'empty' )
      console.warn('unrecognized result reached root scope', res);
  };

  let defFuncMap = dottedfmap.newDottedFunctionMap();

  let contextAPI = lib.newExecutionContext({
    executorProvider: lib.newStandardExecutorProvider(),
    resultHandler: rh,
    parentFmap: defFuncMap,
  });

  basefunctions.install(contextAPI);
  stdlib.install(contextAPI);
  cglib.install(contextAPI);

  memory.addListener(event => {
    if ( event.type === 'put' && event.value.of === 'function' ) {
      let newFn = contextAPI.getOwner(':fn').call;
      let args = [
        types.fromAstToApi({ type: 'symbol', value: event.value.for }).value,
        ...event.value.value.map(
          v => types.fromAstToApi(types.fromDeprecatedToAst(v)).value)
      ];
      console.log('!!!', args)
      let res = newFn(
        args,
        contextAPI);
    }
  });

  return contextAPI;
};

module.exports = lib;
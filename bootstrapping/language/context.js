var p = '..';
var memory = require(p+'/interpreting/memory');
var evaluators = require(p+'/interpreting/evaluators');
var streams = require(p+'/interpreting/streams');
var fmaps = require(p+'/interpreting/functionmaps');
var interpreter = require(p+'/interpreting/interpreter')({
  registry: memory.registry });
var basefunctions = require('./basefunctions');

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

  api.registerDotted = (name, fmap) => {
    internal.dotted[name] = fmap;
  }
  api.registerObject = obj => {
    for ( k in obj ) if ( obj.hasOwnProperty(k) ) {
      internal.object[k] = obj[k];
    }
  }
  api.object = map => {
    return fmaps.newObjectFunctionMap(map)
  }
  api.execBlockHere = lis => {
    internal.ex(streams.newListStream(lis.value, 0));
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
  api.ev = internal.ev;
  api.ex = internal.ex;

  return api;
}

lib.newExecutionContext = config => {
  var params = util.jshelp.requireParams(config, [
    'executorProvider', 'resultHandler',
  ])

  let object = {};
  let subObjectFmap = fmaps.newObjectFunctionMap(object);
  let dotted = {};
  let subDottedFmap = fmaps.newDottedCompositeFunctionMap(
    dotted, subObjectFmap
  )

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
    object: object,
    dotted: dotted,
    fmap: fmap,
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

  let contextAPI = lib.newExecutionContext({
    executorProvider: lib.newStandardExecutorProvider(),
    resultHandler: rh
  });

  basefunctions.install(contextAPI);

  return contextAPI;
};

module.exports = lib;
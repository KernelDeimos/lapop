var lib = {};

var streams = require('../interpreting/streams');
var util = require('../utilities/util');
var dres = util.dres;

// Parsing imports are for processing boot scripts
var memory  = require('../interpreting/memory');
var primitives  = require('../parsing/primitives');
var definitions = require('../parsing/definitions')({
  registry: memory.registry });

var localUtil = require('./basefunctions/util');

lib.arithmetic = require('./basefunctions/arithmetic');
lib.variable = require('./basefunctions/variable');
lib.boolean = require('./basefunctions/boolean');

lib.lists = {};
lib.lists['append'] = localUtil.newFunc((args, context) => {
  let l = [].concat(args[0].value);
  l = l.concat([util.dhelp.listifyData(args[1])]);
  return dres.resOK(l, {
    type: 'list'
  })
}, localUtil.newListValidator(['list', 'ignore']));

lib.conv = {};
lib.conv['code'] = localUtil.newFunc((args, context) => {
  return dres.resOK(args[0].value, {
    type: 'code'
  })
}, localUtil.newListValidator(['list']))

lib.controlflow = require('./basefunctions/controlflow');

lib.safety = {}
lib.safety['checkFuncmap'] = localUtil.newFunc((args, context) => {
  let missing = [];
  args[0].value.map(
    // TODO: is recursive data proessing a good idea?
    unprocessed => util.dhelp.processData(null, unprocessed)
  ).forEach((v) => {
    if ( ! args[1].value.hasOwnProperty(v.value) ) {
      missing.push(v.value);
    }
  })
  if ( missing.length > 0 ) {
    return dres.resInvalid(
      'missing:' + JSON.stringify(missing)
    );
  }
  return dres.resOK()
}, localUtil.newListValidator(['list', 'funcmap']))

lib.logger = require('./basefunctions/logger');

lib.installLogger = api => {
  api.registerMap('logger', lib.logger);
}

lib.registry = {};
lib.registry.put = (args, context) => {
  let of_ = args[0].value;
  let for_ = args[1].value;
  let filling = args.slice(2).map(item => util.dhelp.listifyData(item));
  memory.registry(of_, for_).def = filling;

  return dres.resOK();
}
lib.registry.pkg = (args, context) => {
  memory.currentPackage = args[0].value;
  return dres.resOK();
}

lib.os = {};
lib.os.args = (args, context) => {
  vals = [];
  memory.env.args.forEach(v => {
    vals.push(['string', v]);
  });
  return dres.resOK(vals, {
    type: 'list'
  });
};

lib.testhacks = {};
lib.testhacks.eval = (args, context) => {
  if ( typeof args[0].value === 'string' ) {
    eval(args[0].value);
  }
  return dres.resOK();
}

lib.dres = {};
lib.dres.invalid = (args, ctx) => {
  return dres.resInvalid(args[0].value);
};

lib.install = api => {
  lib.installLogger(api);
  api.registerMap('', lib.registry);
  api.registerMap('', lib.arithmetic);
  api.registerMap('', lib.lists);
  api.registerMap('', lib.boolean);
  api.registerMap('', lib.controlflow);
  api.registerMap('', lib.variable);
  api.registerMap('', lib.conv);
  api.registerMap('os', lib.os);
  api.registerMap('_node', lib.testhacks);
  api.registerMap('lepot.lang.safety', lib.safety);
  api.registerMap('r', lib.dres);

  api.registerMap(
    'string',
    require('./basefunctions/string'));
  api.registerMap(
    'map',
    require('./basefunctions/map'));
  api.registerMap(
    '',
    require('./basefunctions/debug'));

  let install_script = (s) => {
      // Script is allowed to begin with whitespace
      s = primitives.eat_whitespace(s).stream;

      while ( ! s.eof() ) {
          let result = definitions.try_def(s);
          s = result.stream;
          if ( dres.isNegative(result) ) {
              return result;
          }
          // memory.registry(result.of, result.for).def = result.value;
          if ( result.of === 'bootscript' ) {
            let lis = util.dhelp.processData(null, result.value[0]);
            api.ex(streams.newListStream(lis.value, 0));
          }
          s = primitives.eat_whitespace(s).stream;
      }

      return dres.resOK();
  }

  /*
  install_script(primitives.newStream(`
    def pattern bootscript [ [list] ]

    def pattern any [[either [[string]] [[float]] [[assoc]] [[code]] ]]
    def pattern : [ [symbol] [any] ]
    def pattern :o [ [symbol] [any] ]
    def pattern = [ [symbol] [any] ]
    def pattern :fn [ [symbol] [assoc] [list] ]
    def pattern =fn [ [symbol] [assoc] [list] ]

    def bootscript copy [
      (logger.notice 'LePoT-engaged Pattern-oriented Transpiler')
      (logger.notice 'Version 1.0.0-alpha')
      (logger.notice 'Copyright (C) 2020 Eric Dube')
    ]
    def bootscript if [
      :fn if {a__ _ b__ _} [
        (while (a__) (append (b__) (code [break])))
      ]
    ]
  `, 0));
  */
}

module.exports = lib;
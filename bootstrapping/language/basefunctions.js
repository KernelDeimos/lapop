var lib = {};

var streams = require('../interpreting/streams');
var util = require('../utilities/util');
var dres = util.dres;

// Parsing imports are for processing boot scripts
var memory  = require('../interpreting/memory');
var primitives  = require('../parsing/primitives');
var definitions = require('../parsing/definitions')({
  registry: memory.registry });

let localUtil = {};
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

lib.arithmetic = {};

;[['+',0],['-',0],['*',1]].forEach(op => {
  lib.arithmetic[op[0]] = localUtil.tmplFunc(
    localUtil.varEq(op[1], op[0]+'='),
    localUtil.newVariadicValidator('float'),
    { type: 'float' });
});
;['/','%'].forEach(op => {
  lib.arithmetic[op] = localUtil.tmplFunc(
    localUtil.infix(op),
    localUtil.newVariadicValidator('float'),
    { type: 'float' });
});

lib.variable = {};

lib.variable[':'] = localUtil.newFunc((args, context) => {
  let varName = args[0];
  let varValu = args[1];

  let o = {};
  o[varName.value] = fargs => { return varValu; };
  context.registerMap('', o);

  if ( varValu.type === 'funcmap' ) {
    context.registerMap(varName.value, varValu.value);
  }
}, localUtil.newListValidator(['symbol','ignore']));

lib.variable[':fn'] = localUtil.newFunc((args, context) => {
  let o = {};
  o[args[0].value] = fargs => {
    let sub = context.subContext({
      resultHandler: (api, res) => {
        if ( res.type === 'return' ) {
          // TODO: I think this will fail when returning in
          //       a loop...
          api.stop(res);
          return;
        }
        context.callResultHandler(api, res);
      }
    });
    sub.registerMap('', {
      "return": () => {
        return dres.result({ status: 'populated', type: 'return' });
      }
    });
    let argNames = args[1].value.keysInOrder();
    let argsFmapObj = {};
    for ( let i=0; i < argNames.length; i++ ) {
      argsFmapObj[argNames[i]] = () => fargs[i];
    }
    // ERROR HERE?
    sub.registerMap('', argsFmapObj);
    return sub.ex(streams.newListStream(args[2].value, 0));
  };
  context.registerMap('', o);
}, localUtil.newListValidator(['symbol', 'assoc', 'list'], ':fn'));

lib.variable['='] = localUtil.newFunc((args, context) => {
  let o = {};
  let name = args[0].value;
  let fNew = fargs => { return args[1]; };
  let fmapNodeAPI = context.getOwner(name);
  if ( fmapNodeAPI === null )
    return dres.resInvalid(`attempt to set undefined variable "${name}"`);
  fmapNodeAPI.replace(fNew);
}, localUtil.newListValidator(['symbol','ignore']));

var varOp = (op, isPost) => (args, context) => {
  let name = args[0].value;
  let fmapNodeAPI = context.getOwner(name);
  if ( fmapNodeAPI === null )
    return dres.resInvalid(`attempt to post-increment undefined variable "${name}"`);
  let node = fmapNodeAPI.call([], context);
  let newNode = {...node, value: op(node.value)};
  let fNew = fargs => { return newNode; };
  fmapNodeAPI.replace(fNew);
  return dres.resOK(isPost ? node.value : newNode.value);
};

lib.variable['++'] = localUtil.newFunc(
  varOp(v => v + 1, true),
  localUtil.newListValidator(['symbol']));
lib.variable['+p'] = localUtil.newFunc(
  varOp(v => v + 1, false),
  localUtil.newListValidator(['symbol']));
lib.variable['--'] = localUtil.newFunc(
  varOp(v => v - 1, true),
  localUtil.newListValidator(['symbol']));
lib.variable['-p'] = localUtil.newFunc(
  varOp(v => v - 1, false),
  localUtil.newListValidator(['symbol']));

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

lib.controlflow = {};

lib.controlflow.while = (args, ctx) => {
  let sub = ctx.subContext({
    resultHandler: (api, res) => {
      if ( res.type === 'break' ) {
        api.stop(res);
        return;
      }
      ctx.callResultHandler(api, res);
    }
  });
  sub.registerMap('', {
    "break": () => {
      return dres.result({ status: 'populated', type: 'break' });
    }
  });
  while ( true ) {
    let condRes = sub.ev(streams.newListStream(args[0].value, 0));
    if ( dres.isNegative( condRes ) ) return condRes;
    if ( condRes.value === true ) {
      let wres = sub.ex(streams.newListStream(args[1].value, 0));
      if ( wres.type === 'break' ) break;
    } else break;
  }
  return dres.resOK(null);
}

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

lib.logger = {
  'info': localUtil.newFunc(args => {
    console.log('\x1B[36;1m[info]\x1B[0m',
      ...args.map(a => a.value));
    return dres.resOK(null);
  }, null),
  'dump': (args, ctx) => {
    console.log('\x1B[37;1m[dump]\x1B[0m',
      ...args.map(a => a));
    return dres.resOK(null);
  },
  'notice': localUtil.newFunc(args => {
    console.log('\x1B[37;1m|====|\x1B[0m',
      ...args.map(a => a.value));
    return dres.resOK(null);
  }, null),
  'noticew': localUtil.newFunc(args => {
    console.log('\x1B[33;1m|====|\x1B[0m',
      ...args.map(a => a.value));
    return dres.resOK(null);
  }, null)
}

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
  return dres.resOK(memory.env.args);
};

lib.testhacks = {};
lib.testhacks.eval = (args, context) => {
  if ( typeof args[0].value === 'string' ) {
    eval(args[0].value);
  }
  return dres.resOK();
}

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
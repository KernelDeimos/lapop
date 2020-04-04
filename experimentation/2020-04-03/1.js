'use strict';
const fs = require('fs');

var memory = require(
  '../../bootstrapping/interpreting/memory');
var interpreter = require(
  '../../bootstrapping/interpreting/interpreter')({
    registry: memory.registry });
var streams = require(
  '../../bootstrapping/interpreting/streams');
var evaluators = require(
  '../../bootstrapping/interpreting/evaluators');
var definitions = require(
  '../../bootstrapping/parsing/definitions')({
    registry: memory.registry });
var primitives = require(
  '../../bootstrapping/parsing/primitives');
var dres   = require(
  '../../bootstrapping/utilities/descriptiveresults');
var dhelp  = require(
  '../../bootstrapping/utilities/datahelper');
var fmaps  = require(
  '../../bootstrapping/interpreting/functionmaps');

var codePattern = [['list',['list', ['symbol', 'list']]]];
memory.registry('pattern', 'script').def = codePattern;
memory.registry('pattern', 'now').def = codePattern;

var a = {};

a.process_definitions = (s) => {
    // Script is allowed to begin with whitespace
    s = primitives.eat_whitespace(s).stream;

    while ( ! s.eof() ) {
        let result = definitions.try_def(s);
        s = result.stream;
        if ( dres.isNegative(result) ) {
            return result;
        }
        memory.registry(result.of, result.for).def = result.value;
        if ( result.of === 'now' ) {
          let lis = dhelp.processData(null, result.value[0]);
          a.exec(streams.newListStream(lis.value, 0));
        }
        s = primitives.eat_whitespace(s).stream;
    }

    return dres.resOK();
}

a.create_sub_fmap = parent => {
  let object = {};
  let subObjectFmap = fmaps.newObjectFunctionMap(object);
  let dotted = {};
  let subDottedFmap = fmaps.newDottedCompositeFunctionMap(
    dotted, subObjectFmap
  )

  let subFmap = fmaps.newFallbackFunctionMap([
    subDottedFmap, parent
  ]);

  return {
    subFmap: subFmap,
    object: object,
    dotted: dotted
  }
}

a.create_sub = (parent, config) => {
  config = config || {};
  let create_sub = config.create_sub || a.create_sub;

  let subFmapThings = a.create_sub_fmap(parent);
  let ev = evaluators.newStandardEvaluator(
    subFmapThings.subFmap);
  let ex = interpreter.newBlockExecutor({
    resultHandler: config.resultHandler || ((api, res) => {
      if ( res.type === 'exit' ) api.stop(res);
      else if ( ! res.status === 'empty' )
        console.warn('unrecognized result reached root scope', res);
    }),
    evaluator: ev
  });
  subFmapThings.object.lfun = args => {
    if ( args.length < 3 )
      return dres.resInvalid('func needs 3 args');
    if ( typeof args[0].value !== 'string' )
      return dres.resInvalid('function needs name');
    if ( args[1].type !== 'assoc' )
      return dres.resInvalid('function needs argument map');
    if ( args[2].type !== 'list' )
      return dres.resInvalid('function needs list');

    subFmapThings.object[args[0].value] = fargs => {
      let sub = create_sub(subFmapThings.subFmap);
      let argNames = args[1].value.keysInOrder();
      for ( let i=0; i < argNames.length; i++ ) {
        sub.ctx.object[argNames[i]] = () => fargs[i];
      }
      return sub.ex(streams.newListStream(args[2].value, 0));
    }
    return dres.resOK();
  }
  subFmapThings.object.lset = args => {
    if ( args.length < 2 )
      return dres.resInvalid('lset needs 2 args');
    if ( typeof args[0].value !== 'string' )
      return dres.resInvalid('lset variable needs name');

    subFmapThings.object[args[0].value] = fargs => {
      return args[1];
    }
    return dres.resOK();
  }
  subFmapThings.object.while = args => {
    let org_create_sub = create_sub;
    let new_create_sub = (fmap, config) => {
      config = config || {};
      let org_resultHandler = config.resultHandler || (() => {});
      config.resultHandler = ((api, res) => {
        if ( res.type === 'break' ) {
          api.stop(res);
          return;
        }
        return org_resultHandler(res);
      })
      let sub = org_create_sub(fmap, config);
      sub.ctx.object.break = () => {
        return dres.result({ status: 'populated', type: 'break' });
      }
      return sub;
    }
    let sub = new_create_sub(subFmapThings.subFmap);
    while ( true ) {
      // let condRes = ev(streams.newListStream(args[0].value, 0));
      let condRes = sub.ev(streams.newListStream(args[0].value, 0));
      if ( condRes.value === true ) {
        let wres = sub.ex(streams.newListStream(args[1].value, 0));
        if ( wres.type === 'break' ) break;
      } else break;
    }
    return dres.resOK(null);
  }
  return { ev: ev, ex: ex, ctx: subFmapThings }
}

a.fmap = fmaps.newNullFunctionMap();
let root = a.create_sub(a.fmap);
a.fmap = root.ctx.subFmap;
a.functions = root.ctx.object;
a.objects = root.ctx.dotted;

a.nPending = 0;;

a.eval = evaluators.newStandardEvaluator(a.fmap);
a.exec = interpreter.newBlockExecutor({
  resultHandler: (api, res) => {
    if ( !res || !res.hasOwnProperty('status') ) {
      console.error('invalid result', res);
    }
    else if ( ! res.status === 'empty' )
      console.warn('result reached root scope', res);
  },
  evaluator: a.eval
});


a.load = filename => {
  var data = fs.readFileSync(filename);
  var res = a.process_definitions(primitives.newStream(
    data.toString(), 0));
}

a.argwrap = f => args => {
  for ( let i=0; i < args.length; i++ ) {
    if ( dres.isNegative(args[i]) ) return args[i];
  }

  let res = f(args);
  if ( typeof res === 'undefined' ) {
    return dres.resOK(undefined);
  }
  return res;
}

a.objects.logger = fmaps.newObjectFunctionMap({
  info: a.argwrap(args => {
    console.log('\x1B[36;1m[info]\x1B[0m',
      ...args.map(a => a.value));
  })
});

a.functions.store = a.argwrap(args => {
  if ( args.length < 2 ) return dres.resInvalid(
    'store requires at least 2 args');
  if ( args[1].type === 'assoc' ) {
    a.objects[args[0].value] = args[1].value;
  }
});

/*
a.functions.func = a.argwrap(args => {
  if ( args[1].type !== 'list' ) {
    return dres.resInvalid('func requires a list');
  }
  // TODO: not this; need a function to get
  //       the place to put the function
  a.functions[args[0].value] = fargs => {
    let subFmap = fmaps.newFallbackFunctionMap([
      fmaps.newObjectFunctionMap({
        aget: i => fargs[i]
      }), a.fmap
    ]);
    let ev = evaluators.newStandardEvaluator(subFmap);
    let ex = interpreter.newBlockExecutor({
      resultHandler: (api, res) => {
        if ( ! res.status === 'empty' )
          console.warn('result reached root scope', res);
      },
      evaluator: ev
    });
    return ex(streams.newListStream(args[1].value, 0));
  };
});
*/

a.listifyData = data => {
  if ( data.type === 'code' ) {
    return ['code'].concat(data.value);
  }
}

a.functions['sayhi'] = a.argwrap(args => {
  console.log('hi');
});

a.functions['append'] = a.argwrap(args => {
  let l = [].concat(args[0].value);
  l = l.concat([a.listifyData(args[1])]);
  return dres.resOK(l, {
    type: 'list'
  })
});

a.functions['code'] = a.argwrap(args => {
  return dres.resOK(args[0].value, {
    type: 'code'
  });
});

a.functions['+'] = a.argwrap(args => {
  let v = 0;
  args.forEach(v2 => v += v2.value);
  return dres.resOK(v);
});

a.functions['-'] = a.argwrap(args => {
  let v = 0;
  args.forEach(v2 => v -= v2.value);
  return dres.resOK(v);
});

a.functions['*'] = a.argwrap(args => {
  let v = 0;
  args.forEach(v2 => v *= v2.value);
  return dres.resOK(v);
});

a.functions['/'] = a.argwrap(args => {
  let v = 0;
  args.forEach(v2 => v /= v2.value);
  return dres.resOK(v);
});

a.functions['%'] = a.argwrap(args => {
  let v = 0;
  args.forEach(v2 => v %= v2.value);
  return dres.resOK(v);
});

a.functions['<'] = a.argwrap(args => {
  if ( args.length < 1 ) return dres.resOK(true); // I guess??
  let prev = args[0].value;
  let rest = args.slice(1)
  for ( let i=0; i < rest.length; i++ ) {
    if ( prev >= rest[i].value ) return dres.resOK(false);
    prev = rest[i].value;
  }
  return dres.resOK(true);
});

a.functions['=='] = a.argwrap(args => {
  if ( args.length < 1 ) return dres.resOK(true); // I guess??
  let prev = args[0].value;
  let rest = args.slice(1)
  for ( let i=0; i < rest.length; i++ ) {
    if ( prev != rest[i].value ) return dres.resOK(false);
    prev = rest[i].value;
  }
  return dres.resOK(true);
});

a.functions['T'] = () => dres.resOK(true);
a.functions['F'] = () => dres.resOK(false);

a.load('./1.lepot');

// console.log(memory.registry('script', 'testcursor'));
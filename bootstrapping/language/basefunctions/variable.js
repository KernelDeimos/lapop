var streams = require('../../interpreting/streams');
var util = require('../../utilities/util');
var dres = util.dres;

var localUtil = require('./util');

var lib = {};
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
    if ( args.length < 3 ) {
      let argsFmapObj = {};
      argsFmapObj['args'] = () => { return { type: 'list', value: fargs } };
      sub.registerMap('', argsFmapObj);
      return sub.ex(streams.newListStream(args[1].value, 0));
    }
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
}, null);

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

module.exports = lib.variable;
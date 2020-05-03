var streams = require('../../interpreting/streams');
var util = require('../../utilities/util');
var dres = util.dres;

var lib = {};
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
lib.controlflow.if = (args, ctx) => {
  let sub = ctx.subContext({
    resultHandler: (api, res) => {
      if ( res.type === 'fi' ) {
        api.stop(res);
        return;
      }
      ctx.callResultHandler(api, res);
    }
  });
  while ( args.length > 0 ) {
    if ( args.length > 1 ) {
      if ( args[0].type === 'list' ) {
        let condRes = sub.ev(streams.newListStream(args[0].value, 0));
        if ( dres.isNegative( condRes ) ) return condRes;
        if ( condRes.value !== true ) {
          args = args.slice(2);
          continue;
        }
      } else if ( args[0].value !== true ) {
        args = args.slice(2)
        continue;
      }
      args = args.slice(1);
    }
    let ifres = sub.ex(streams.newListStream(args[0].value, 0));
    return ifres;
  }
}
lib.controlflow.each = (args, ctx) => {
  // TODO: add break; need to factor it out of while

  var sub = ctx.subContext();

  var lis = args[0];
  var sym = args[1];
  var scr = args[2];

  var results = lis.value.map(item => {
    var loopVars = {};
    loopVars[sym.value] = () => {
      return util.dhelp.processData(null, item);
    };
    sub.registerMap('', loopVars);
    return sub.ex(streams.newListStream(scr.value, 0));
  });

  return dres.resOK();
};

module.exports = lib.controlflow;
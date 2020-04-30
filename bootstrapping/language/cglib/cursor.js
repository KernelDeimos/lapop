var dres = require('../../utilities/descriptiveresults');
var util = require('../../utilities/util');

var newCursor = () => {};
newCursor = (file, config) => {
  var msgInvalid = 'invalid use of text cursor: ';
  // TODO: this check is hacky, should be fixed later
  //       to verify type of config arg
  var config = ( config && config.value ) || {
    indent: "\t"
  };

  var newStringHolder = () => {
    var stringHolder = {};
    stringHolder.value = '';
    stringHolder.getValue_ =
      ((holder) => () => holder.value)(stringHolder);
    return stringHolder;
  };

  var stringHolder = newStringHolder();

  var state = {};
  state.stringHolder = stringHolder;
  state.pieces = [ stringHolder ];
  state.indent = 0;
  state.lineStarted = false;
  state.subCursors = {};

  var api = {};

  api['++'] = () => {
    if ( state.lineStarted ) return dres.resInvalid(
      msgInvalid + 'must end current line before changing indent'
    );
    state.indent++;
    return dres.resOK();
  };
  api['--'] = () => {
    if ( state.lineStarted ) return dres.resInvalid(
      msgInvalid + 'must end current line before changing indent'
    );
    state.indent--;
    return dres.resOK();
  };
  api.writeIndent = () => {
    for ( let i=0; i < state.indent; i++ ) {
      state.stringHolder.value += config.indent;
    }
    return dres.resOK();
  }

  api.startLine = () => {
    if ( state.lineStarted ) return dres.resInvalid(
      msgInvalid + 'must end previous line before starting a new one'
    );
    state.lineStarted = true;
    api.writeIndent();
    return dres.resOK();
  };

  api.addLine = str => {
    if ( state.lineStarted ) return dres.resInvalid(
      msgInvalid + 'must end previous line before writing a new one'
    );
    api.startLine();
    api.addString(str);
    api.endLine();
    return dres.resOK();
  };

  api.endLine = () => {
    if ( ! state.lineStarted ) return dres.resInvalid(
      msgInvalid + 'must start a line before ending one'
    );
    state.lineStarted = false;
    state.stringHolder.value += "\n";
    return dres.resOK();
  };

  api.addString = args => {
    var str = args[0].value;

    if ( ! state.lineStarted ) return dres.resInvalid(
      msgInvalid + 'must start a line before writing'
    );
    state.stringHolder.value += str;
    return dres.resOK();
  };

  api.getString = () => {
    return dres.resOK(api.getValue_(), { type: 'string' });
  }

  api.getValue_ = () => {
    var fullString = '';
    for ( let i=0; i < state.pieces.length; i++ ) {
      fullString += state.pieces[i].getValue_();
    }
    return fullString;
  }

  // TODO: in-line subcursors
  api.sub = args => {
    var name = args[0].value;

    var subCursor = newCursor();
    state.subCursors[name] = subCursor;
    state.pieces.push(subCursor.value);
    state.stringHolder = newStringHolder();
    state.pieces.push(state.stringHolder);

    return subCursor;
  }
  
  api.getSub = args => {
    var name = args[0].value;

    if ( ! state.subCursors.hasOwnProperty(name) ) {
      return dres.result({ status: 'unknown' });
    }
    return state.subCursors[name];
  }

  return dres.resOK(api, { type: 'funcmap' });
};

var libcursor = {};
libcursor.new = (args, ctx) => {
  // Pull in some LePoT functions
  let checkInterface =
    ctx.getOwner('lepot.lang.safety.checkFuncmap').call;

  var interface = ['list', ['string', 'write'], ['string', 'close']];
  var ifaceCheck = checkInterface([
    util.dhelp.processData(null, interface), args[0]], ctx)
  if ( dres.isNegative(ifaceCheck) ) return ifaceCheck;

  return newCursor(args[0]);
};

var lib = {};
lib.install = api => {
  api.registerMap('lepot.gen.cursor', libcursor);
}

module.exports = lib;
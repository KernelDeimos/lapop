var fseditor = {};

var fsfactory = {
  //
};

var lib = {};
lib.install = api => {
  api.registerMap('std.fs', lib.fsfactory);
}

module.exports = lib;
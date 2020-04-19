var lib = {};

lib.install = api => {
  require('./cursor').install(api);
}

module.exports = lib;

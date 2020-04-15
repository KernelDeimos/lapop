var lib = {};

lib.install = api => {
  require('./filesystem').install(api);
}

module.exports = lib;
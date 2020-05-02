'use strict';
var lib = {};

lib.newEmitter = () => {
  var api = {};
  api.data_ = {};
  api.data_.nextIndex = 0;
  api.data_.listeners = [];
  api.data_.listenerIndexMap = {};

  api.emit = o => {
    for ( let i=0; i < listeners.length; i++ ) {
      if ( listeners[i] === null ) continue;
      listeners[i](o);
    }
  };

  var listeners = api.data_.listeners;
  var listenerIndexMap = api.data_.listenerIndexMap;
  var _api = api;
  api.addListener = lis => {
    var id = ++_api.data_.nextIndex;
    var api = {};
    api.remove = () => {
      listeners[listenerIndexMap[id]] = null;
      delete listenerIndexMap[id];
    };
    for ( let i=0; i < listeners.length; i++ ) {
      if ( listeners[i] === null ) {
        listeners[i] = lis;
        listenerIndexMap[id] = i;
        return api;
      }
    }
    var i = listeners.push(lis) - 1;
    listenerIndexMap[id] = i;
    return api;
  }

  return api;
};

module.exports = lib;
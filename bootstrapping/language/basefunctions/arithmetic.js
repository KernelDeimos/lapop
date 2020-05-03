var localUtil = require('./util');

var lib = {};
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

module.exports = lib.arithmetic;
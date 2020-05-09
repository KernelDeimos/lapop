var testf = require('../testing/framework');
var util = require('../utilities/util');
var dres = util.dres;

var types = require('./types');

var testStrings = ['a','b','c','d','e','f','g','h'];
var nextTestString_ = 0;
var nextTestString = () => {
  nextTestString_ = ( nextTestString_ + 1 ) % testStrings.length;
  return testStrings[nextTestString_];
};

var testFloats = [1,2,3,4,5,6,7,8];
var nextTestFloat_ = 0;
var nextTestFloat = () => {
  nextTestFloat_ = ( nextTestFloat_ + 1 ) % testFloats.length;
  return testFloats[nextTestFloat_];
};

var testValues = { string: {}, float: {}, list: {}, assoc: {} };
testValues.string.newTestValueAst = () => {
  return { type: 'string', value: nextTestString() };
};
testValues.float.newTestValueAst = () => {
  return { type: 'float', value: nextTestFloat() };
};
testValues.list.newTestValueAst = () => {
  return {
    type: 'list',
    value: [
      testValues.string.newTestValueAst(),
      testValues.float.newTestValueAst(),
      testValues.string.newTestValueAst(),
    ]
  };
};
testValues.assoc.newTestValueAst = () => {
  return {
    type: 'assoc',
    value: [
      testValues.string.newTestValueAst(),
      testValues.float.newTestValueAst(),
      testValues.string.newTestValueAst(),
      testValues.float.newTestValueAst(),
    ]
  }
};

testf.SET('bootstrapping.interpreting.types', ts => {
  var reconstructTest = (tc, fTestVal, type) => {
    tc.RUN((t, d) => {
      var astNode = testValues[type].newTestValueAst();
      var astNodeTestValue = fTestVal(astNode);
      var api = types.fromAstToApi(astNode);
          api = api.value;
      var reconstructedAstNode = api.reconstruct();
      if ( ! t.assert('positive result from reconstruct',
        ! dres.isNegative(reconstructedAstNode)
      )) {
        return;
      }
      if ( ! t.assert('reconstruct returns correct type',
        reconstructedAstNode.type === 'ast'
      )) {
        return;
      }
      reconstructedAstNode = reconstructedAstNode.value;
      t.assert(
        'reconstructed value matches input value',
        fTestVal(reconstructedAstNode) === astNodeTestValue
      );
    });
  };
  ts.CASE('assoc: AST to API, then reconstructed', tc => {
    reconstructTest(tc, astNode => astNode.value[0].value, 'assoc');
  });
  ts.CASE('list: AST to API, then reconstructed', tc => {
    reconstructTest(tc, astNode => astNode.value[0].value, 'list');
  });
  ts.CASE('string: AST to API, then reconstructed', tc => {
    reconstructTest(tc, astNode => astNode.value, 'string');
  });
});

testf.all();
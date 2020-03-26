// The test framework is tested with manual verification of
// the output. While it's possible to use the test framework
// to test itself, it could lead to inaccurate test results.

var testf = require('./framework.js');
testf.SET(
  'PartiallyFailedTestSet',
  ts => {
    ts.CASE('PassingTestCase', (tc) => {
      tc.DEFER((t, d) => {
        console.log('second');
        t.assert('assertion 1', true);
        t.assert('assertion 2', true);
      });
      tc.RUN((t, d) => {
        console.log('first');
        t.assert('assertion 1', true);
        t.assert('assertion 2', true);
      });
    });
    ts.CASE('FailingTestCase', tc => {
      tc.RUN((t, d) => {
        console.log('third');
        t.assert('assertion 1', true);
        t.assert('assertion 2', false);
      });
    });
  }
);

console.log(testf.runTestSet(
  testf.testSets['PartiallyFailedTestSet']));
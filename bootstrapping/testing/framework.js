var testSets = {};

var localUtil = {};
localUtil.adaptMeta = meta =>
  ( typeof meta === 'string' ) ? { name: meta } : meta;
localUtil.adaptExtra = extra =>
  ( typeof extra === 'undefined' ) ? {} : extra;

var lib = {};

lib.configureTestCase = (testCase, callback) => {
  configAPI = {};
  configAPI.RUN = f => {
    var delegate = testCase.f;
    testCase.f = (api, vars) => {
      f(api, vars);
      delegate(api, vars);
    };
  }
  configAPI.DEFER = f => {
    var delegate = testCase.f;
    testCase.f = (api, vars) => {
      delegate(api, vars);
      f(api, vars);
    };
  }
  callback(configAPI);
}

lib.configureTestSet = (testSet, callback) => {
  configAPI = {};
  configAPI.CASE = (meta, caseCallback) => {
    meta = localUtil.adaptMeta(meta);
    testSet.cases[meta.name] = lib.newTestCase(meta, caseCallback);
  }
  configAPI.INIT     = f => { testSet.init     = f; };
  configAPI.DEINIT   = f => { testSet.deinit   = f; };
  configAPI.SETUP    = f => { testSet.setup    = f; };
  configAPI.TEARDOWN = f => { testSet.teardown = f; };
  callback(configAPI);
}

lib.newTestCase = (meta, callback) => {
  var testCase = {
    f: () => {}
  };
  lib.configureTestCase(testCase, callback);
  return testCase;
}

lib.newTestSet = (meta, callback) => {
  var testSet = {};
  testSet.cases = {};
  testSet.init = () => {};
  testSet.deinit = () => {};
  testSet.setup = () => {};
  testSet.teardown = () => {};

  lib.configureTestSet(testSet, callback);
  return testSet;
};

lib.SET = (meta, callback) => {
  meta = localUtil.adaptMeta(meta);
  testSets[meta.name] = lib.newTestSet(meta, callback);
};

lib.runTestCase = (testCase, vars) => {
  var testAPI = {};
  var result = {
    status: 'passed', // optimistic algorithm
    assertLog: []
  };

  testAPI.assert = (label, bool, extra) => {
    extra = localUtil.adaptExtra(extra);
    if ( bool ) {
      result.assertLog.push({
        extra: extra,
        status: 'passed',
        label: label
      })
      return bool
    }
    result.assertLog.push({
      extra: extra,
      status: 'failed',
      label: label
    });
    result.status = 'failed';
    return bool;
  }

  testCase.f(testAPI, vars);

  return result;
}

lib.runTestSet = testSet => {
  var vars = {};
  var setResult = {
    status: 'passed', // optimistic algorithm
    casesPassed: [],
    casesFailed: [],
    caseResults: {},
    caseResultsOrdered: []
  };
  testSet.init(vars);
  Object.keys(testSet.cases).forEach(testCaseName => {
    var testCase = testSet.cases[testCaseName];
    cvars = {...vars};
    testSet.setup(cvars);
    var result = lib.runTestCase(testCase, vars);
    setResult.caseResults[testCaseName] = result;
    setResult.caseResultsOrdered.push({
      name: testCaseName,
      result: result
    });
    if ( result.status === 'passed' ) {
      setResult.casesPassed.push(testCaseName);
    } else {
      setResult.casesFailed.push(testCaseName);
      setResult.status = 'failed';
    }
    testSet.teardown(cvars);
  });
  testSet.deinit(vars);
  return setResult;
};

lib.testSets = testSets;

lib.all = () => {
  console.log('\x1B[37;1m\\|||/ LePoT Bootstrapper Tests');
  Object.keys(testSets).forEach(testSetName => {
    console.log(
      `\x1B[36;1m =+= TEST SET: ${testSetName} =+=\x1B[0m`
    );
    var setResult = lib.runTestSet(lib.testSets[testSetName]);
    console.log(
      `\x1B[37;1m  | ${
        setResult.status === 'passed' ? '\x1B[32;1m' : '\x1B[31;1m'
      }${setResult.status}\x1B[0m`
    );
    setResult.caseResultsOrdered.forEach(caseResult => {
      console.log(
        `\x1B[33;1m  \\-+- TEST CASE: ${caseResult.name} -+-\x1B[0m`
      );
      console.log(
        `  | \x1B[37;1m| ${
          caseResult.result.status === 'passed'
            ? '\x1B[32;1m'
            : '\x1B[31;1m'
        }${caseResult.result.status}\x1B[0m`
      );
      caseResult.result.assertLog.forEach(entry => {
        var mark = entry.status === 'passed'
          ? '\x1B[32;1m+\x1B[0m'
          : '\x1B[31;1m-\x1B[0m'
          ;
        console.log('  | ' + mark + ' ' + entry.label);
        if ( entry.status !== 'passed' ) console.log(entry.extra);
      })
    });
  });
};

module.exports = lib;
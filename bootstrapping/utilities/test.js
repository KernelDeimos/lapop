test = require('../testing/framework');
dres = require('./descriptiveresults');
dhelp = require('./datahelper');

test.SET('bootstrapping.utilities.datahelper', ts => {
  ts.CASE('processData', tc => {
    var input = ['list', ['symbol', 'a']];
    tc.RUN((t, _) => {
      var res = dhelp.processData(null, input);
      if ( ! t.assert(
        'processData returns OK for expected type', dres.isOK(res)
      ) ) {
        console.log(res);
      }
    });
    tc.RUN((t, _) => {
      var res = dhelp.assertData(null, 'list', input);
      if ( ! t.assert(
        'assertData returns OK for expected type', dres.isOK(res)
      ) ) {
        console.log(res);
      }
      var res = dhelp.assertData(null, 'string', input);
      if ( ! t.assert(
        'assertData returns invalid for unexpected type',
        dres.isNegative(res) && res.status === 'invalid'
      ) ) {
        console.log(res);
      }
    });
  });
});

test.all();

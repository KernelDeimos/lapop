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

test.SET('bootstrapping.utilities.equal', ts => {
  ts.CASE('equal function', tc => {
    tc.RUN((t, _) => {
      t.assert('== null null', dhelp.equal(null, null));
      t.assert('== undefined undefined',
        dhelp.equal(undefined, undefined));
      t.assert('!= null undefined', ! dhelp.equal(null, undefined));
      t.assert('!= undefined null', ! dhelp.equal(undefined, null));
      t.assert('!= null {}',   ! dhelp.equal(null, {}));
      t.assert('== "hi" "hi"', dhelp.equal("hi", "hi"));
      t.assert('!= "1" 1',     ! dhelp.equal("1", 1));
      t.assert('!= 1 "1"',     ! dhelp.equal(1, "1"));
      t.assert(
        '!= [1,2,3] [1,3,2]',
        ! dhelp.equal([1,2,3],[1,3,2])
      );
      t.assert(
        '== {a 1 b 2 c 3} {a 1 b 2 c 3}',
        dhelp.equal({a:1,b:2,c:3},{a:1,b:2,c:3})
      );
      t.assert(
        '!= {a 1 b 2 c 3} {a 1 b 3 c 2}',
        ! dhelp.equal({a:1,b:2,c:3},{a:1,b:3,c:2})
      );
      t.assert(
        '== {a 1 b [{a 1 b 2},4]} {a 1 b [{a 1 b 2},4]}',
        dhelp.equal({a:1,b:[{a:1,b:2},4]},{a:1,b:[{a:1,b:2},4]})
      );
      t.assert(
        '!= {a 1 b [{a 1 b 2},4]} {a 1 b [{a 1 b 5},4]}',
        ! dhelp.equal({a:1,b:[{a:1,b:2},4]},{a:1,b:[{a:1,b:5},4]})
      );
      t.assert(
        '!= {a 1 b [{a 1 b 2},4]} {a 1 b [{a 1 b 2},"4"]}',
        ! dhelp.equal({a:1,b:[{a:1,b:2},4]},{a:1,b:[{a:1,b:5},4]})
      );
    });
  });
});

test.all();

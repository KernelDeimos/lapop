var dres = require('../utilities/descriptiveresults');
var lib = {};

lib.newStream = () => {};
lib.newMutableStream = (str, pos) => {
  var o = {};
  o.eof = () => pos >= str.length;
  o.chr = () => str[pos];
  o.next = () => { pos++ }
  o.getStuck = () => lib.newStream(str, pos);
  return o;
}

lib.newStream = (str, pos) => {
  var o = {};
  o.preview = str.split('').slice(pos).join('');
  o.eof = () => pos >= str.length;
  o.chr = () => str[pos];
  o.next = () => lib.newStream(str, pos+1);
  o.getReal = () => lib.newMutableStream(str, pos);
  return o;
}

lib.try_symbol = (s) => {
  var notValid = {};
  '{}[]()\'"` \r\n\t'.split('')
    .forEach(v => { notValid[v] = true; });
  if ( notValid.hasOwnProperty(s.chr()) ) {
    return dres.result({
      status: 'unknown',
      info: `"${s.chr()}" is not a valid symbol character`,
      stream: s
    });
  }
  var value = '';
  var ms = s.getReal();
  for ( ;
    ! ( ms.eof() || notValid.hasOwnProperty(ms.chr()) ) ;
    ms.next()
  ) {
    value += ''+ms.chr();
  }
  return dres.resOK(['symbol', value], {
    status: 'populated',
    type: 'symbol',
    stream: ms.getStuck()
  });
}

lib.try_string = (s) => {
    let validQuotes = ["'", '"', "`"];
    let escapeQuote = null;
    validQuotes.forEach((q) => {
        if ( s.chr() == q ) {
            escapeQuote = q;
            return false;
        }
    })
    if ( escapeQuote == null ) {
        return dres.result({
          status: 'unknown',
          stream: s
        });
    }
    let value = '';
    let escaping = false;
    for (
        let ms = s.next().getReal();
        !ms.eof();
        ms.next()
    ) {
        let c = ms.chr();
        if ( escaping ) {
            escaping = false;
            value += ''+c;
            continue;
        }
        switch (c) {
            case '\\':
                escaping = true;
                continue;
            case escapeQuote:
                return dres.resOK(value, {
                    type: 'string',
                    escapeQuote: escapeQuote,
                    stream: ms.getStuck().next()
                })
            default:
                value += ''+c;
        }
    }
    return dres.resInvalid({
        info: 'string did not terminate',
        stream: s
    })
};


lib.alt = (options, s) => {
    var resultToReturn = dres.result({
        status: 'unknown',
        stream: s
    });
    options.forEach(option => {
        var result = option(s);
        // Unknown types are expected in alt(); keep trying
        if ( result.status === 'unknown' ) return;
        // Invalid means the type matches but has an error; abort
        if ( result.status === 'invalid' ) {
            resultToReturn = result;
            return false;
        }
        // Return the match
        resultToReturn = result;
        return false;
        // the invalid check is purposefully redundant for clarity
    })
    return resultToReturn;
}

lib.eat_whitespace = (s) => {
    var wsMap = {
        "\n": true,
        "\r": true,
        "\t": true,
        " ": true
    };
    for ( ; wsMap.hasOwnProperty(s.chr()) ; s = s.next() );
    return dres.resOK(null, {
        type: 'whitespace',
        stream: s
    })
}

lib.try_assoc = (s) => {
    if ( s.chr() != '{' ) {
        return dres.result({
            status: 'unknown',
            info: `"${s.chr()}" is not '{'`,
            stream: s
        })
    }
    s = s.next();
    s = lib.eat_whitespace(s).stream;

    var members = [];

    while ( true ) {

        if ( s.chr() == '}' ) {
            s = s.next();
            break;
        }

        let key = lib.alt([lib.try_string, lib.try_symbol], s);
        if ( dres.isNegative(key) ) return key;
        s = key.stream;
        s = lib.eat_whitespace(s).stream;
        if ( s.chr() == ':' ) {
            s = s.next();
            s = lib.eat_whitespace(s).stream;
        }
        let value = lib.try_any(s);
        if ( dres.isNegative(value) ) return value;
        s = value.stream;
        s = lib.eat_whitespace(s).stream;

        members.push(key.value);
        members.push(value.value);

        if ( s.chr() == ',' ) {
            s = s.next();
            s = lib.eat_whitespace(s).stream;
        }
    }

    return dres.resOK(['assoc', ...members], {
        type: 'assoc',
        stream: s
    });
}

lib.parse_list_tokens = (terminator, try_item, s) => {
    var items = [];
    var cond = () => s.chr() != terminator;
    if ( terminator === null ) {
        cond = () => ! s.eof();
    }

    while ( cond() ) {
        let result = try_item(s);
        if ( dres.isNegative(result) ) {
            return result;
        }
        items.push(result.value);
        s = result.stream;
        s = lib.eat_whitespace(s).stream;
        if ( s.chr() == ',' ) {
            s = s.next();
            s = lib.eat_whitespace(s).stream;
        }
    }
    return dres.resOK(items, {
        type: 'rawlist',
        stream: s
    });
}

lib.try_list = (begin, term, tryer, s) => {
  if ( s.chr() !== begin ) {
      return dres.result({
          status: 'unknown',
          info: `'${s.chr()}' is not '${begin}'`,
          stream: s
      })
  }
  s = s.next();
  s = lib.eat_whitespace(s).stream;
  var r_items = lib.parse_list_tokens(term, tryer, s);
  if ( dres.isNegative(r_items) ) {
      return r_items;
  }

  s = r_items.stream;
  s = s.next();

  return dres.resOK(r_items.value, {
    type: 'list',
    stream: s,
  });
}

lib.try_any = (s) => {
    let result =  lib.alt([
      lib.try_string,
      lib.try_symbol,
      lib.try_assoc,
      lib.try_data,
      lib.try_code,
    ], s);
    if ( result.status == 'unknown' ) {
        result.status = 'invalid';
    }
    return result;
}

var decorate_try_list = (begin, term, type) => {
  return (s) => {
    let res = lib.try_list(begin, term, lib.try_any, s);
    if ( dres.isOK(res) ) {
      res.value = [type].concat(res.value);
    }
    return res;
  }
}

lib.try_data = decorate_try_list('[', ']', 'list');
lib.try_code = decorate_try_list('(', ')', 'code');

var decorate_eofAsUnknown = (delegate) => (s) => {
  if (s.eof()) {
    return dres.result({
      status: 'unknown',
      stream: s
    });
  }
  return delegate(s);
};
// lib.try_any = decorate_eofAsUnknown(lib.try_any);
// lib.try_data = decorate_eofAsUnknown(lib.try_data);
// lib.try_code = decorate_eofAsUnknown(lib.try_code);


module.exports = lib;

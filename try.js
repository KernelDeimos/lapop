var newStream = () => {};
newMutableStream = (str, pos) => {
    var o = {};
    o.eof = () => pos >= str.length;
    o.chr = () => str[pos];
    o.next = () => { pos++ }
    o.getStuck = () => newStream(str, pos+1);
    return o;
}
newStream = (str, pos) => {
    var o = {};
    o.eof = () => pos >= str.length;
    o.chr = () => str[pos];
    o.next = () => newStream(str, pos+1);
    o.getReal = () => newMutableStream(str, pos);
    return o;
}

var ok = (s, delegate) => {
    if ( s.eof() ) return {
        type: 'eof'
    };
    return delegate(s);
}

var try_symbol = (s) => {
    var notValid = {};
    '{}[]()+=*/^%\\&|\'"` \r\n\t'.split('')
        .forEach(v => { notValid[v] = true; });
    if ( notValid.hasOwnProperty(s.chr()) ) {
        return {
            type: 'unknown',
            stream: s
        }
    }
    var value = '';
    var ms = s.getReal();
    for (
        ;
        !ms.eof();
        ms.next()
    ) {
        if ( notValid.hasOwnProperty(ms.chr()) ) {
            return {
                type: 'symbol',
                value: value,
                stream: ms.getStuck()
            };
        }
        value += ''+ms.chr();
    }
    return {
        type: 'symbol',
        value: value,
        stream: ms.getStuck()
    };
}

var try_string = (s) => {
    let validQuotes = ["'", '"', "`"];
    let escapeQuote = null;
    validQuotes.forEach((q) => {
        if ( s.chr() == q ) {
            escapeQuote = q;
            return false;
        }
    })
    if ( escapeQuote == null ) {
        return {
            type: 'unknown',
            stream: s
        }
    }
    let value = '';
    let escaping = false;
    for (
        let ms = s.next().getReal();
        !ms.eof();
        ms.next()
    ) {
        let c = ms.chr();
        console.log(c)
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
                return {
                    type: 'string',
                    value: value,
                    escapeQuote: escapeQuote,
                    stream: ms.getStuck().next()
                }
            default:
                value += ''+c;
        }
    }
    return {
        type: 'invalid'
    }
};

var alt = (s, ...options) => {
    var resultToReturn = {
        type: 'unknown',
        stream: s
    };
    options.forEach(option => {
        var result = option(s);
        // Unknown types are expected in alt(); keep trying
        if ( result.type === 'unknown' ) return;
        // Invalid means the type matches but has an error; abort
        if ( result.type === 'invalid' ) {
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

var eat_whitespace = (s) => {
    wsMap = {
        "\n": true,
        "\r": true,
        "\t": true,
        " ": true
    };
    for ( ; wsMap.hasOwnProperty(s.chr()) ; s = s.next() );
    return {
        type: 'whitespace',
        stream: s
    }
}

var try_object = (s) => {
    if ( s.chr() != '{' ) {
        return {
            type: 'unknown',
            stream: s
        }
    }
    s = s.next();
    s = eat_whitespace(s).stream;
    key = alt(s, try_string, try_symbol);
    s = eat_whitespace(s).stream;
    if ( s.chr() == ':' ) {
        s = s.next();
        s = eat_whitespace(s).stream;
    }
    //
    return key;
}

(function () {
    var tmp;
    tmp = try_string;
    try_string = (s) => ok(s, s => tmp(s));
})();

with ({
    ...require('./boot.js')
}) {

    console.log(try_string(newStream(`"Hello"`, 0)));
    console.log(try_symbol(newStream(`Hello[]there`, 0)));
    console.log(try_symbol(newStream(`Hello  :  a[]there`, 0)));
    console.log(try_object(newStream(`{ Hello  :  a[]there`, 0)));

}

`

symbol symbol symbol [
    [symbol 'string']
] [symbol symbol] {
    key1: symbol
    key2: "string"
}

`
// Shamelessly stolen from StackOverflow (2343343)
function lnb4() {
  var e = new Error();
  var stack = e.stack.toString().split(/\r\n|\n/);
  var frameRE = /:(\d+):(?:\d+)[^\d]*$/;
  do {
    var frame = stack.shift();
  } while (!frameRE.exec(frame) && stack.length);
  var frame = stack.shift();
  return frameRE.exec(stack.shift())[1];
}

// Install logger
(() => {
    let tmp = console.log;
    console.log = (...items) => {
        tmp(
            '\033[33;1m['+__filename+':'+lnb4()+']\033[0m',
            ...items
        );
    }
})()

// object history tracker (for convenient debugging)
var h_ = (o) => {
    o._h = {};
    for ( k in o ) if ( o.hasOwnProperty(k) ) {
        if ( k == '_h' ) continue;
        o._h[k] = [{
            at: 'origin:' + lnb4(),
            val: JSON.stringify(o[k])
        }]
    }
    var context = 'no_context';
    p = new Proxy(o, {
        set: (o, k, v) => {
            if ( ! o._h.hasOwnProperty(k) ) {
                o._h[k] = [];
            }
            o._h[k].push({
                at: context + ':' + lnb4(),
                val: JSON.stringify(v)
            });
            o[k] = v;
        }
    });
    o.h_setctx_ = newctx => {
        context = newctx;
        return p; // chaining
    }
    return p;
}

var depth = 0;
var depthTrack_ = (f, name) => {
    return (...args) => {
        let tmp = console.log;
        if ( depth === 0 ) console.log = (...args2) => {
            let s = '';
            for ( let x = 0; x < depth; x++) {
                s += '-';
            }
            tmp("\033[36;1m"+s+"\033[0m", ...args2);
        }
        depth++;
        let r = f(...args);
        depth--;
        if ( depth === 0 ) console.log = tmp;
        return r;
    }
}

var uh_javascriptify = () => {};
uh_javascriptify = (lis) => {
    if ( lis.length < 1 ) throw new Error('invalid list');
    switch ( lis[0] ) {
        case 'list':
            return lis.slice(1).map(i => uh_javascriptify(i));
        case 'symbol':
            return {
                type: 'symbol',
                value: lis[1]
            }
        default:
            return lis
    }
}

var newStream = () => {};
newMutableStream = (str, pos) => {
    var o = {};
    o.eof = () => pos >= str.length;
    o.chr = () => str[pos];
    o.next = () => { pos++ }
    o.getStuck = () => newStream(str, pos);
    return o;
}
newStream = (str, pos) => {
    var o = {};
    o.preview = str.split('').slice(pos).join('');
    o.eof = () => pos >= str.length;
    o.chr = () => str[pos];
    o.next = () => newStream(str, pos+1);
    o.getReal = () => newMutableStream(str, pos);
    return o;
}

var ok = (s, delegate) => {
    if ( s.eof() ) return h_({
        type: 'eof'
    });
    return delegate(s);
}

var try_symbol = (s) => {
    var notValid = {};
    '{}[]()+=*/^%\\&|\'"` \r\n\t'.split('')
        .forEach(v => { notValid[v] = true; });
    if ( notValid.hasOwnProperty(s.chr()) ) {
        return h_({
            type: 'unknown',
            info: `"${s.chr()}" is not a valid symbol character`,
            tmp: 'y',
            stream: s
        })
    }
    var value = '';
    var ms = s.getReal();
    for (
        ;
        !ms.eof();
        ms.next()
    ) {
        if ( notValid.hasOwnProperty(ms.chr()) ) {
            return h_({
                type: 'symbol',
                value: ['symbol', value],
                stream: ms.getStuck()
            });
        }
        value += ''+ms.chr();
    }
    return h_({
        type: 'symbol',
        value: value,
        stream: ms.getStuck()
    });
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
        return h_({
            type: 'unknown',
            tmp: 's',
            stream: s
        })
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
                return h_({
                    type: 'string',
                    value: value,
                    escapeQuote: escapeQuote,
                    stream: ms.getStuck().next()
                })
            default:
                value += ''+c;
        }
    }
    return h_({
        type: 'invalid',
        stream: s
    })
};

var alt = (s, ...options) => {
    var resultToReturn = {
        type: 'unknown',
        tmp: 't',
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
    return h_({
        type: 'whitespace',
        stream: s
    })
}

var try_any = () => { throw new Error('noop'); };

var try_assoc = (s) => {
    if ( s.chr() != '{' ) {
        return h_({
            type: 'unknown',
            tmp: 'a',
            info: `"${s.chr()}" is not '{'`,
            stream: s
        })
    }
    s = s.next();
    s = eat_whitespace(s).stream;

    var members = [];

    while ( true ) {

        if ( s.chr() == '}' ) {
            s = s.next();
            break;
        }

        let key = alt(s, try_string, try_symbol);
        if ( key.type == 'invalid' ) return key;
        s = key.stream;
        s = eat_whitespace(s).stream;
        if ( s.chr() == ':' ) {
            s = s.next();
            s = eat_whitespace(s).stream;
        }
        let value = try_any(s);
        if ( value.type == 'invalid' ) return value;
        s = value.stream;
        s = eat_whitespace(s).stream;

        members.push(key.value);
        members.push(value.value);

        if ( s.chr() == ',' ) {
            s = s.next();
            s = eat_whitespace(s).stream;
        }
    }

    return h_({
        type: 'assoc',
        value: ['assoc', ...members],
        stream: s
    });
}

var parse_list_tokens = (s, terminator) => {
    var items = [];
    while ( s.chr() != terminator ) {
        let result = try_any(s);
        if ( result.type == 'invalid' ) {
            result.tmp = 'l' + ( result.tmp ? result.tmp : '' );
            return result;
        }
        items.push(result.value);
        s = result.stream;
        s = eat_whitespace(s).stream;
        if ( s.chr() == ',' ) {
            s = s.next();
            s = eat_whitespace(s).stream;
        }
    }
    return h_({
        type: 'rawlist',
        value: items,
        stream: s
    })
}

var try_list = (s) => {
    if  ( s.chr() !== '[' ) {
        return h_({
            type: 'unknown',
            info: "'"+s.chr()+"' is not '['",
            tmp: 'l',
            stream: s
        })
    }
    s = s.next();
    s = eat_whitespace(s).stream;
    var r_items = parse_list_tokens(s, ']');
    if ( r_items.type === 'invalid' ) {
        return r_items;
    }

    s = r_items.stream;
    r_items.stream = s.next();

    r_items.value = ['list'].concat(r_items.value);
    r_items.type = 'list';
    return r_items;
}

var try_code = (s) => {}

var try_any = (s) => {
    let result =  alt(s,
        try_string,
        try_symbol,
        try_assoc,
        try_list,
    );
    if ( result.type == 'unknown' ) {
        result.type = 'invalid';
    }
    return result;
}

var emptyToken = (token) => false
    || token.type === 'unknown' // not recognized by sub-processor
    || token.type === 'defiant' // doesn't match attempted pattern
    || token.type === 'invalid' // is recognized but bad form
    ;

var setAsDefiant = (token) => {
    if ( token.type === 'unknown' ) token.type = 'defiant';
    return token;
};

var process_pattern = () => {};

var process_pattern_by_name = (name, s) => {
    if ( s === undefined ) {
        console.log('undefined s', name);
    }
    console.log('process_pattern_by_name: ', name);
    let result = null;
    switch ( name ) {
        case 'list':
            result = try_list(s);
            if ( emptyToken(result) ) return setAsDefiant(result);
            s = result.stream;
            return h_({
                type: 'filling',
                value: [ result.value ],
                stream: s
            })
        case 'object':
            result = try_assoc(s);
            if ( emptyToken(result) ) return setAsDefiant(result);
            s = result.stream;
            return h_({
                type: 'filling',
                value: [ result.value ],
                stream: s
            })
        default:
            maybeDef = l('pattern', name);
            if ( maybeDef.hasOwnProperty('def') ) {
                result = process_pattern(maybeDef.def[0], s);
                if ( emptyToken(result) )
                    return setAsDefiant(result);
                console.log('pattern result', JSON.stringify(result.value));
                return result;
            }
            return h_({
                type: 'invalid',
                info: `pattern name "${name}" not recognized`,
                stream: s
            });
    }
}

process_pattern = (pattern, s) => {
    console.log('process_pattern: ', JSON.stringify(pattern));
    var result = h_({
        type: 'unknown',
        stream: s
    });
    var tokens = [];
    var outerForEachReturn = null;

    // Temporary hack until list processing is handled properly
    pattern = uh_javascriptify(pattern);

    for ( let iTop = 0; iTop < pattern.length; iTop++ ) {
        let patternNode = pattern[iTop];
        var patternName = patternNode[0];
        if ( typeof patternName !== 'string' ) {
            // temporary?
            patternName = patternName.value;
        }
        console.log('processing patternName', patternName);
        if ( s === undefined ) console.log('undefined s');
        switch ( patternName ) {
            case 'either':
                let success = false;
                for (
                    let iEither = 0;
                    iEither < patternNode.slice(1).length;
                    iEither++
                ) {
                    let currentPattern = patternNode.slice(1)[iEither];
                    console.log('trying', currentPattern);
                    var intermediateResult = process_pattern(currentPattern, s);
                    if ( intermediateResult.type === 'invalid' ) {
                        // A type matched but it was invalid; abort and
                        // report the intermediate result
                        console.log('Syntax error!');
                        return intermediateResult;
                    }
                    if ( emptyToken(intermediateResult) ) {
                        console.log('Nope!');
                        // Try the next pattern
                        continue;
                    }
                    // If we got here, the pattern matched
                    tokens.push(...intermediateResult.value);
                    console.log('That worked!');
                    s = intermediateResult.stream;
                    s = eat_whitespace(s).stream;
                    success = true;
                    break;
                }
                if ( ! success ) {
                    console.log('Nothing worked!');
                    return h_({
                        type: 'invalid',
                        info: 'no patterns matched',
                        stream: s
                    });
                }
                break;
            default:
                let result = process_pattern_by_name(patternName, s);
                if ( emptyToken(result) ) {
                    result.info = `pattern could not apply due to `
                        +result.type
                        +' token'+(result.info ? '; ' + result.info : '');
                    return setAsDefiant(result);
                }
                tokens.push(...result.value);
                if ( s === undefined ) console.log('undefined s');
                s = result.stream;
                if ( s === undefined ) console.log('undefined s');
                s = eat_whitespace(s).stream;
                if ( s === undefined ) console.log('undefined s');
        }
    }
    if ( outerForEachReturn !== null ) {
        return outerForEachReturn;
    }
    return h_({
        type: 'filling',
        value: tokens,
        stream: s
    })
}

process_pattern = depthTrack_(process_pattern);
process_pattern_by_name = depthTrack_(process_pattern_by_name);

try_def = (s) => {
    command = try_symbol(s);
    if ( emptyToken(command) ) {
        command.type = 'invalid';
        return command;
    }
    s = command.stream;
    s = eat_whitespace(s).stream;

    // TODO: maybe instead of command.value[1] use actual parser
    if ( command.value[1] != 'def' ) {
        return h_({
            type: 'invalid',
            info: '"def" keyword not found; malformed pattern or filling?',
            expected: 'def',
            found: command.value,
            stream: s
        });
    }

    // assume def command (for now)
    let pattern = try_symbol(s);
    if ( pattern.type != 'symbol' ) return { type: 'invalid' }
    s = pattern.stream;
    s = eat_whitespace(s).stream;

    let identifier = try_symbol(s);
    if ( identifier.type != 'symbol' ) return { type: 'invalid' }
    s = identifier.stream;
    s = eat_whitespace(s).stream;

    console.log(s.chr());

    let result = process_pattern_by_name(pattern.value[1], s);
    if ( emptyToken(result) ) {
        console.log(result);
        // result.h_setctx_('try_def');
        result.type = 'invalid';
        return result;
    }
    s = result.stream;
    return h_({
        type: 'definition',
        of: pattern.value[1],
        for: identifier.value[1],
        value: result.value,
        stream: s
    })
}

var process_definitions = (s) => {
    // Script is allowed to begin with whitespace
    s = eat_whitespace(s).stream;

    while ( ! s.eof() ) {
        let result = try_def(s)
        s = result.stream;
        if ( emptyToken(result) ) {
            result.type = 'invalid';
            return result;
        }
        console.log('of=', result.of);
        console.log('for=', result.for);
        l(result.of, result.for).def = result.value;
        s = eat_whitespace(s).stream;
    }

    return {
        type: 'success'
    }
}

['try_string', 'try_symbol', 'try_assoc', 'try_any'].forEach(name => {
    var tmp = this[name];
    this[name] = (s) => ok(s, s => tmp(s));
});

with ({
    ...require('./boot.js')
}) {

    // console.log(try_string(newStream(`"Hello"`, 0)));
    // console.log(try_symbol(newStream(`Hello[]there`, 0)));
    // console.log(try_symbol(newStream(`Hello  :  a[]there`, 0)));
    // console.log(try_assoc(newStream(`{ Hello  :  a }[]there`, 0)));
    // console.log(JSON.stringify(try_script(newStream(`
    //     def function lame.example.sayhello [
    //         (env.logger.info 'Hello, World!')
    //     ]
    // `, 0))));
    // console.log(JSON.stringify(try_def(newStream(
    //     `def tester test.example.list {a b c d} [e f g h]
    // `, 0)),null,4));

    let result = process_definitions(newStream(`
        def pattern function [
            [either [
                [object]
                [list]
            ] [
                [list]
                [list]
            ]]
        ]

        def function sayhello {a b} [e f g]
        def function saynoodles [a b c] [e f g]
        def function breakit [a b c] {e f g h}
    `, 0));
    console.log('result', JSON.stringify(result, null, 4));
    console.log('test object', JSON.stringify(l('pattern', 'funtimes'), null, 4))
    console.log('test object', JSON.stringify(l('function', 'sayhello'), null, 4))
    console.log('test object', JSON.stringify(l('function', 'breakit'), null, 4))


}

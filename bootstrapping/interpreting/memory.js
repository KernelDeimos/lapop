'use strict';

var new_lame_object = (cb, type, name) => {
    var o = {
    };
    var def = null;
    Object.defineProperty(o, 'def', {
        get: () => def,
        set: v => {
            def = v;
            cb(type, name, v);
        }
    });
    return o;
}

var stores = {};
var orders = {};

var listeners = [];
var listenerIndexMap = {};

var callListeners = (type, name, value) => {
    for ( let i=0; i < listeners.length; i++ ) {
        if ( listeners[i] === null ) continue;
        listeners[i]({
            type: 'put',
            value: {
                of: type,
                for: name,
                value: value
            }
        });
    }
};

var lib = {};
lib.getDebugVals = () => {
    return {
        stores: stores,
        orders: orders
    }
}
lib.registry = ((cb) => {
    var cb = cb || (() => {});
    return (type, name) => {
        if ( name === undefined ) {
            throw new Error('wut');
        }
        if ( name.startsWith('.') ) {
            name = name.substr(1);
            if ( lib.currentPackage ) {
                name = lib.currentPackage + '.' + name;
            }
        }

        var _b = () => {
            stores[type][name] = new_lame_object(cb, type, name);
            orders[type].push(name);
        }
        if ( ! stores.hasOwnProperty(type) ) {
            stores[type] = {};
            orders[type] = [];
            _b();
        } else if ( ! stores[type].hasOwnProperty(name) ) {
            _b();
        }
        return stores[type][name];
    };
})(callListeners);

lib.registry('pattern', 'pattern').def = [
    // First (and only) item in a pattern
    ['list',
        // A list that defines a type
        ['list',
            // The type list contains one symbol that
            //   specifies the type as 'list'
            ['symbol', 'list']
        ]
    ]
];

lib.nextIndex = 0;

lib.addListener = lis => {
    var id = ++lib.nextIndex;
    var index = -1;
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

lib.env = {};
lib.env.args = [];

lib.select = optionsIn => {
    optionsIn = optionsIn || {};
    var options = {
        under: {
            startsWith: '',
            recursive: true
        },
        pattern: 'any',
    };
    for ( k in options ) {
        options[k] = optionsIn[k] || options[k];
    }

    var patternIter = () => {};
    if ( options.pattern === 'any' ) {
        patternIter = cb => {
            Object.keys(stores).forEach(pattern => {
                cb(pattern);
            })
        }
    } else {
        patternIter = cb => {
            cb(options.pattern);
        }
    }

    var results = [];

    patternIter(pattern => {
        var store = stores[pattern];
        Object.keys(store).forEach(name => {
            if ( ! name.startsWith(options.under.startsWith) ) return;
            var rest = name.slice(options.under.startsWith.length);
            if ( 1
                && ! options.under.recursive
                && rest.indexOf('.') !== -1
            ) return;
            results.push({
                type: 'definition',
                of: pattern,
                for: name,
                value: store[name].def
            });
        });
    });

    return results;
}

lib.install_in_soup = soup_ => {
    soup_.registry = lib.registry;
    return soup_;
};

lib.id = 1;
lib.debugv = 0;

// Hacky variables
lib.currentPackage = '';

module.exports = lib;
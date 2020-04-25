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

var callListeners = (type, name, value) => {
    for ( let i=0; i < listeners.length; i++ ) {
        listeners[i]({
            type: 'def',
            of: type,
            for: name,
            value: value
        });
    }
};

var lib = {};
lib.registry = ((cb) => {
    var cb = cb || (() => {});
    return (type, name) => {
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

lib.addListener = lis => {
    listeners.push(lis);
}

lib.install_in_soup = soup_ => {
    soup_.registry = lib.registry;
    return soup_;
};

module.exports = lib;
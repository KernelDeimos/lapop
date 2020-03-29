'use strict';

var new_lame_object = () => {
    var o = {
        def: null
    };
    return o;
}

var stores = {};
var orders = {};

var lib = {};
lib.registry = (() => {
    return (type, name) => {
        var _b = () => {
            stores[type][name] = new_lame_object();
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
})();

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

lib.install_in_soup = soup_ => {
    soup_.registry = lib.registry;
    return soup_;
};

module.exports = lib;
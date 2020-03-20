// Bootstrapping library
var lame = {};
lame.model = {};
lame.model.listprocess = require('./boot/listprocess.js');

new_lame_object = () => {
    var o = {
        def: null
    };
    return o;
}

l = (() => {
    stores = {};
    orders = {};
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

l('pattern', 'lame.patterns.typeswitch').def = [
    ['object', {
        with: ['statement'],
        as: ['string']
    }],
    ['map', ['type'], ['block']]
];

l('pattern', 'lame.language.def').def = [
    ['symbol'],
    ['set', 'subPattern', ['symbol']],
    ['get', 'subPattern']
]

module.exports = {
    lame: lame,
    l: l
}
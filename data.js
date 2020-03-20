pkg = {};

dp = (() => {
    var listeners = [];
    var value;
    return {
        listen: (cb) => {
            listeners.push(cb);
            cb(value);
        },
        update: (val) => {
            value = val;
            listeners.forEach(cb => {
                cb(value);
            })
        },
    }
})()

l('interface', 'l.data.DataPlug') = {
    private: [
        ['type', 'listeners', ['list', 'l.data.Listener']],
        ['type', 'value', ['any']],
    ],
    public:  [
        ['']
    ]
}
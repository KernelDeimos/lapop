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

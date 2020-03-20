var listprocess = (function() {
    var exec = () => { throw new Error('noop'); };
    exec = (opts, lisCode, funcMap) => {
        var ex = (lc) => exec(opts, lc, funcMap);
        if ( Array.isArray(lisCode) ) {
            if ( lisCode.length == 0 ) {
                return [];
            }
            let firstElem = lisCode[0];
            if ( Array.isArray(firstElem) ) {
                return lisCode.map(elem => ex(elem));
            }
            let f = funcMap[firstElem];
            let args = lisCode.slice(1).map(
                (arg) => ex(arg)
            );
            console.log(args);
            if ( typeof f !== 'function' ) {
                if ( opts.partial ) {
                    return [firstElem].concat(args);
                } else {
                    let err = new Error(
                        `No registered operation for "${firstElem}"`);
                    console.error(err, firstElem)
                    return err;
                }
            }
            // Call registered function with arguments
            return f(...args);
        } else if (
            opts.objects && typeof lisCode === 'object' &&
            lisCode !== null
        ) {
            console.log('parsing object', lisCode)
            for ( k in lisCode ) {
                lisCode[k] = ex(lisCode[k]);
            }
            return lisCode;
        } else {
            return lisCode;
        }
    }
    return exec;
})()

module.exports = listprocess;

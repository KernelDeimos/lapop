// l: LaME package definition manager
// p: parser hints
l('function', 'lame.interpret.listprocess').def = [{
    recursive: true,
    args: {
        /*
            Note:
                ['object'] by itself is invalid,
                since ['map', ['any']] does that.
        */
        options: ['object', {
            partial: ['bool'],
            objects: ['bool'],
        }],
        funcMap: ['map', ['string'], ['function']],
        input: ['any'],
    },
}, [
    ['typeswitch', {
        with: ['get', 'input'],
        as: 'subject',
    }, [
        ['list'],
        [
            ['if', ['eq', ['subject', 'length'], 0], [
                ['return', ['literal', ['list'], p.list()]]
            ]]
            ['vset', 'firstElem', ['subject', 'get', 0]]
        ]
    ]]
]]

text(`
def function lame.interpret.listprocess {
    recursive: true
    args: []
} [
    typeswitch {
        with (get input)
        as subject
    } {
        list [
            if eq2 subject.length 0 [
                return new list []
            ]
            vset firstElem (subject.get 0)
            if is list subject [
                return (map subject elem
                    (recur {
                        options: options
                        funcMap: funcMap
                        input: elem
                    })
                )
            ]
            
        ]
    }
]
`)
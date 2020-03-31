package pkg

type DataPlug struct {
	listeners []func(val interface{})
	value     interface{}
}

func (dp *DataPlug) listen(cb func(val interface{})) {
	dp.listeners = append(dp.listeners, cb)
	cb(dp.value)
}

func (dp *DataPlug) update(val interface{}) {
	dp.value = val
	for _, cb := range dp.listeners {
		cb(dp.value)
	}
}

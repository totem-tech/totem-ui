import { Bond } from 'oo7'
import createHash from 'create-hash/browser'
import { hashToStr } from './convert'

/*
 * Copies supplied string to system clipboard
 */
export const copyToClipboard = str => {
	const el = document.createElement('textarea')
	el.value = str
	el.setAttribute('readonly', '')
	el.style.position = 'absolute'
	el.style.left = '-9999px'
	document.body.appendChild(el)
	el.select()
	document.execCommand('copy')
	document.body.removeChild(el)
}

// generateHash generates a 
export const generateHash = (seed, algo, asBytes) => {
	var hash = createHash(algo || 'sha256')
	seed = !isDefined(seed) || isStr(seed) ? seed : JSON.stringify(seed)
	if (seed) {
		hash.update(seed) // optional encoding parameter
		hash.digest() // synchronously get result with optional encoding parameter
	}

	hash.write('write to it as a stream')
	hash.end()
	const bytesArr = hash.read()
	return asBytes ? bytesArr : hashToStr(bytesArr)
}

/*
 * Data validation
 */
export const isArr = x => Array.isArray(x)
export const isBool = x => typeof x === 'boolean'
export const isBond = x => x instanceof Bond
export const isDefined = x => x !== undefined && x !== null
export const isFn = x => typeof x === 'function'
export const isMap = x => x instanceof Map
export const isObj = x => x !== null && !isArr(x) && typeof x === 'object'
// Checks if argument is an Array of Objects. Each element type must be object, otherwise will return false.
export const isObjArr = x => !isArr(x) ? false : !x.reduce((no, item) => no || !isObj(item), false)
// Checks if argument is an Map of Objects. Each element type must be object, otherwise will return false.
export const isObjMap = x => !isMap(x) ? false : !Array.from(x).reduce((no, item) => no || !isObj(item[1]), false)
export const isPromise = x => x instanceof Promise
export const isStr = x => typeof x === 'string'
export const isUint8Arr = arr => arr instanceof Uint8Array
export const isValidNumber = x => typeof x == 'number' && !isNaN(x) && isFinite(x)
export const hasValue = x => {
	if (!isDefined(x)) return false
	switch (typeof x) {
		case 'string':
			return isStr(x) && !!x.trim()
		case 'number':
			return isValidNumber(x)
		case 'object':
			const len = isArr(x) ? x.length : Object.keys(x)
			return len > 0
		case 'boolean':
		default:
			// already defined
			return true
	}
}

// forceClearCachedData removes any cached data from localStorage
export const forceClearCachedData = () => {
	const keys = ['totem__cache_', 'totem__static']
	Object.keys(localStorage).forEach(key => keys.includes(key) && localStorage.removeItem(key))
	forceRefreshPage()
}
// force refresh page from server
export const forceRefreshPage = () => window.location.reload(true)

// randomInt generates random number within a range
//
// Params:
// @min		number
// @max		number
// 
// returns number
export const randomInt = (min, max) => parseInt(Math.random() * (max - min) + min)

// getKeys returns an array of keys or indexes depending on object type
export const getKeys = source => {
	if (isArr(source)) return source.map((_, i) => i)
	if (isMap(source)) return Array.from(source).map(x => x[0])
	if (isObj(source)) return Object.keys(source)
	return []
}

// arrMapSlice mimics the behaviour of Array.prototype.map() with the
// convenience of only executing callback on range of indexes
//
// Params:
// @arr         array
// @startIndex  number
// @endIndex    number    : inclusive
// @callback    function  : callback to be executed on each item within the set range
//              Params:
//              @currentValue
//              @currentIndex
//              @array
//
// Returns array of items all returned by @callback
export const arrMapSlice = (data, startIndex, endIndex, callback) => {
	const isAMap = isMap(data)
	if (!isArr(data) && !isAMap) return []
	const len = isAMap ? data.size : data.length
	data = isAMap ? Array.from(data) : data
	startIndex = startIndex || 0
	endIndex = !endIndex || endIndex >= len ? len - 1 : endIndex
	let result = []
	for (var i = startIndex; i <= endIndex; i++) {
		let key = i, value = data[i]
		if (isAMap) {
			key = data[i][0]
			value = data[i][1]
		}
		result.push(callback(value, key, data, isAMap))
	}
	return result
}

// Read-only array
export const arrReadOnly = (arr = [], strict = false) => objReadOnly(arr, strict)

// Reverse array items
export const arrReverse = (arr, reverse) => reverse ? arr.reverse() : arr

// arrSearch search for objects by key-value pairs
//
// Params:
// @map			Map
// @keyValues	Object	: key-value pairs
// @matchAll	boolean 	: match all supplied key-value pairs
// @ignoreCase	boolean	: case-insensitive search for strings
//
// Returns Map (key = original index) or Array (index not preserved) if @returnArr == true
export const arrSearch = (arr, keyValues, matchExact, matchAll, ignoreCase, returnArr) => {
	const result = returnArr ? new Array() : new Map()
	if (!isObj(keyValues) || !isObjArr(arr)) return result
	const keys = Object.keys(keyValues)
	for (var index = 0; index < arr.length; index++) {
		let matched = false
		const item = arr[index]
		for (const i in keys) {
			const key = keys[i]
			let keyword = keyValues[key]
			let value = item[key]

			if (ignoreCase && isStr(value)) {
				value = value.toLowerCase()
				keyword = isStr(keyword) ? keyword.toLowerCase() : keyword
			}

			matched = !matchExact && (isStr(value) || isArr(value)) ? value.indexOf(keyword) >= 0 : value === keyword
			if ((matchAll && !matched) || (!matchAll && matched)) break
		}
		matched && (returnArr ? result.push(item) : result.set(index, item))
	}
	return result
}

// Returns new array sorted by key. If sortOriginal is 'truty', existing array will be sorted and returned.
export const arrSort = (arr, key, reverse, sortOriginal) => {
	if (!isObjArr(arr)) return []
	const sortedArr = sortOriginal ? arr : arr.map(x => objCopy(x, {}))
	return arrReverse(sortedArr.sort((a, b) => a[key] > b[key] ? 1 : -1), reverse)
}

export const arrUnique = (arr = []) => Object.values(
	arr.reduce((itemsObj, item) => {
		itemsObj[item] = item
		return itemsObj
	}, {})
)

// objCopy copies top level properties and returns another object
//
// Params:
// @source  object
// @dest    object (optional)
// @force	boolean (optional) force create new object
export const objCopy = (source, dest, force) => !isObj(source) ? dest || {} : (
	Object.keys(source).reduce((obj, key) => {
		obj[key] = source[key]
		return obj
	}, !force ? (dest || {}) : objCopy(dest, {}))
)

// objClean produces a clean object with only the supplied keys and their respective values
//
// Params:
// @obj		object/array
// @keys	array : if empty/not array, an empty object will be returned
//
// Returns object
export const objClean = (obj, keys) => !isObj(obj) || !isArr(keys) ? {} : keys.reduce((cleanObj, key) => {
	if (obj.hasOwnProperty(key)) {
		cleanObj[key] = obj[key]
	}
	return cleanObj
}, {})

// objHasKeys checks if all the supplied keys exists in a object
//
// Params:
// @obj				object
// @keys			array
// @requireValue	book	: (optional) if true, will check if all keys has valid value
//
// returns boolean
export const objHasKeys = (obj = {}, keys = [], requireValue = false) => {
	return !keys.reduce((no, key) => no || (requireValue ? !hasValue(obj[key]) : !obj.hasOwnProperty(key)), false)
}

// objReadOnly returns a new read-only object where only new properties can be added.
//
// Params:
// @obj	   object/array : (optional) if valid object supplied, new object will be created based on @obj.
//					 Otherwise, new empty object will be used.
//					 PS: original supplied object's properties will remain writable, unless re-assigned to the returned object.
// @strict boolean: (optional) if true, any attempt to add or update property to returned object will throw a TypeError.
//					 Otherwise, only new properties can be added. Attempts to update properties will be silently ignored.
// @silent boolean: (optional) whether to throw error when in strict mode
//
// Returns  object
export const objReadOnly = (obj = {}, strict = false, silent = false) => new Proxy(obj, {
	setProperty: (self, key, value) => {
		// prevents adding new or updating existing property
		if (strict === true) {
			if (silent) return true;
			throw new TypeError(`Assignment to constant ${Array.isArray(obj) ? 'array' : 'object'} key: ${key}`)
		} else if (!self.hasOwnProperty(key)) {
			self[key] = value
		}
		return true
	},
	get: (self, key) => self[key],
	set: function (self, key, value) { return this.setProperty(self, key, value) },
	defineProperty: function (self, key) { return this.setProperty(self, key, value) },
	// Prevent removal of properties
	deleteProperty: () => false
})

// objWithoutKeys creates a new object excluding specified keys
// 
// Params:
// @obj		object
// @keys	array
//
// Returns object
export const objWithoutKeys = (obj, keys) => !isObj(obj) || !isArr(keys) ? {} : (
	Object.keys(obj).reduce((result, key) => {
		if (keys.indexOf(key) === -1) {
			result[key] = obj[key]
		}
		return result
	}, {})
)

// mapCopy copies items from @source Map to @dest Map (overrides if already exists)
export const mapCopy = (source, dest) => !isMap(source) ? (
	!isMap(dest) ? new Map() : dest
) : (
		Array.from(source).reduce((dest, x) => dest.set(x[0], x[1]), dest)
	)

export const mapFilter = (map, callback) => {
	const result = new Map()
	if (!isMap(map)) return result

	Array.from(map).forEach(x => {
		const key = x[0]
		const value = x[1]
		if (callback(value, key, map)) {
			result.set(key, value)
		}
	})
	return result
}
// mapFindByKey finds a specific object by supplied object property/key and value within
//
// Params:
// @map		Map: Map of objects
// @key		any: object key to match or null if value is not an object
// @value	any
//
// Returns Object: first item partial/fully matching @value with supplied @key
export const mapFindByKey = (map, key, value, matchExact) => {
	for (let [_, item] of map.entries()) {
		const val = key === null ? item : item[key]
		if (!matchExact && (isStr(val) || isArr(val)) ? val.indexOf(value) >= 0 : val === value) return item
	}
}

// mapJoin joins (and overrides) key-value pairs from @source to @dest
export const mapJoin = (source = new Map(), dest = new Map()) => {
	Array.from(source).forEach(([key, value]) => dest.set(key, value))
	return dest
}

// mapSearch search for objects by key-value pairs
//
// Params:
// @map			Map
// @keyValues	Object	: key-value pairs
// @matchAll	boolean 	: match all supplied key-value pairs
// @ignoreCase	boolean	: case-insensitive search for strings
//
// Returns Map
export const mapSearch = (map, keyValues, matchExact, matchAll, ignoreCase) => {
	const result = new Map()
	if (!isObj(keyValues) || !isMap(map)) return result
	const keys = Object.keys(keyValues)
	for (let [itemKey, item] of map.entries()) {
		let matched = false
		for (const i in keys) {
			const key = keys[i]
			let keyword = keyValues[key]
			let value = item[key]

			if (ignoreCase && isStr(value)) {
				value = value.toLowerCase()
				keyword = isStr(keyword) ? keyword.toLowerCase() : keyword
			}

			matched = !matchExact && (isStr(value) || isArr(value)) ? value.indexOf(keyword) >= 0 : value === keyword
			if ((matchAll && !matched) || (!matchAll && matched)) break
		}
		matched && result.set(itemKey, item)
	}
	return result
}

// Returns a new map sorted by key. Must be a map of objects
export const mapSort = (map, key, reverse) => !isObjMap(map) ? map : new Map(arrReverse(
	Array.from(map).sort((a, b) => a[1][key] > b[1][key] ? 1 : -1),
	reverse
))

// Search Array or Map
export const search = (data, keywords, keys) => {
	if (!keywords || keywords.length === 0 || !(isArr(data) || isMap(data))) return data
	const fn = isMap(data) ? mapSearch : arrSearch
	const keyValues = keys.reduce((obj, key) => {
		obj[key] = keywords
		return obj
	}, {})
	return fn(data, keyValues, false, false, true, false)
}

// Semantic UI Dropdown search defaults to only "text" option property.
// This enables search by any option property (`searchKeys`).
//
// Params:
// @searchKeys	array of strings
//
// Returns function: a callback function
// 					Callback params:
//					@options 		array of objects
//					@searchQuery	string
//					returns array of objects
export const searchRanked = (searchKeys = ['text']) => (options, searchQuery) => {
	if (!options || options.length === 0) return []
	const uniqueValues = {}
	searchQuery = (searchQuery || '').toLowerCase().trim()
	if (!searchQuery) return options
	const search = key => {
		const matches = options.map((option, i) => {
			try {
				// catches errors caused by the use of some special characters with .match() below
				let x = (option[key] || '').toLowerCase().match(searchQuery)
				if (!x || uniqueValues[options[i].value]) return
				const matchIndex = x.index
				uniqueValues[options[i].value] = 1
				return { index: i, matchIndex }
			} catch (e) {
				console.log(e)
			}
		}).filter(r => !!r)
		return arrSort(matches, 'matchIndex').map(x => options[x.index])
	}
	return searchKeys.reduce((result, key) => result.concat(search(key)), [])
}

// Sort Array or Map
export const sort = (data, key, reverse, sortOriginal) => isArr(data) ? arrSort(data, key, reverse, sortOriginal) : (
	isMap(data) ? mapSort(data, key, reverse) : data
)

/*
 * State management
 */
// setStateTimeout sets state property value before and after timeout
//
// Params: 
// @instance React component instance : state of the instance that will be changed
//                        Make sure the component is ready beforehand
// @key         string  : state property name to be manipulated
// @dataBefore  any     : value to be applied immediately & before timeout
// @dataAfter   any     : value to be applied after timeout
// @delay       number  : duration in miliseconds.
//                        Default value: 2000
//
// Returns:
// @timeoutId   number  : Use this to cancel timeout. Handy when component is about to unmount
export function setStateTimeout(instance, key, dataBefore, dataAfter, delay) {
	if (!isFn(instance.setState)) return
	dataBefore !== undefined && setState(instance, key, dataBefore)
	return setTimeout(() => {
		setState(instance, key, dataAfter)
	}, delay || 2000)
}

// setState changes state property value immediately
// TODO: deprecate
//
// Params: 
// @instance React component instance : state of the instance that will be changed
//                        Make sure the component is ready beforehand
// @key         string  : state property name to be manipulated
// @value       any     : value to be applied immediately
//
// Returns void
export function setState(instance, key, value) {
	const data = {}
	data[key] = value
	instance.setState(data)
}

// deferred returns a function that invokes the callback function after certain delay/timeout
// If the returned function is invoked again before timeout,
// the invokation will be deferred further with the duration supplied in @delay
//
// Params:
// @callback  function  : function to be invoked after deferred delay
// @delay     number    : number of milliseconds to be delayed.
//                        Default value: 50
// @thisArg    object   : optional, makes sure callback is bounded to supplied object 
export function deferred(callback, delay, thisArg) {
	let timeoutId
	return function () {
		const args = arguments
		if (timeoutId) clearTimeout(timeoutId)
		timeoutId = setTimeout(function () {
			isFn(callback) && callback.apply(thisArg, args)
		}, delay || 50)
	}
}

// textCapitalize capitalizes the first letter of the given string(s)
//
// Params:
// @text			string/array/object
// @fullSentence	bool: whether to capitalize every single word or just the first word
//
// Returns string/array/object (same as input if supported otherwise undefined)
export const textCapitalize = (input, fullSentence = false) => {
	if (isStr(input)) {
		if (!fullSentence) return input[0].toUpperCase() + input.slice(1)
		return input.split(' ').map(word => textCapitalize(word, false)).join(' ')
	}
	if (isObj(input)) return Object.keys(input).reduce((obj, key) => {
		obj[key] = textCapitalize(input[key], fullSentence)
		return obj
	}, isArr(input) ? [] : {})
}

// textEllipsis shortens string into 'abc...xyz' or 'abcedf... form
//
// Params: 
// @text    string
// @maxLen  number: maximum length of the shortened text including dots
// @numDots number: number of dots to be inserted in the middle. Default: 3
// @split   boolean: if false, will add dots at the end
//
// Returns string
export const textEllipsis = (text, maxLen, numDots, split = true) => {
	text = !isStr(text) ? '' : text
	maxLen = maxLen || text.length
	if (text.length <= maxLen || !maxLen) return text;
	numDots = numDots || 3
	const textLen = maxLen - numDots
	const partLen = Math.floor(textLen / 2)
	const isEven = textLen % 2 === 0
	const arr = text.split('')
	const dots = new Array(numDots).fill('.').join('')
	const left = arr.slice(0, split ? partLen : maxLen).join('')
	const right = !split ? '' : arr.slice(text.length - (isEven ? partLen : partLen + 1)).join('')
	return left + dots + right
}

export const icons = {
	basic: '',
	error: 'exclamation circle',
	loading: { name: 'circle notched', loading: true },
	info: 'info',
	success: 'check circle outline',
	warning: 'lightning'
}
import React from 'react'
import { Responsive } from 'semantic-ui-react'
import { Bond } from 'oo7'
import createHash from 'create-hash/browser'
import { bytesToHex } from 'oo7-substrate/src/utils'

/*
 * Copies supplied string to system clipboard
 */
export const copyToClipboard = str => {
	const el = document.createElement('textarea');
	el.value = str;
	el.setAttribute('readonly', '');
	el.style.position = 'absolute';
	el.style.left = '-9999px';
	document.body.appendChild(el);
	el.select();
	document.execCommand('copy');
	document.body.removeChild(el);
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
	return asBytes ? bytesArr : '0x' + bytesToHex(bytesArr)
}

/*
 * Data validation
 */
export const isArr = x => Array.isArray(x)
export const isBond = x => x instanceof Bond
export const isDefined = x => x !== undefined && x !== null
export const isFn = x => typeof (x) === 'function'
export const isMap = x => x instanceof Map
export const isObj = x => x !== null && !isArr(x) && typeof(x) === 'object'
// Checks if argument is an Array of Objects. Each element type must be object, otherwise will return false.
export const isObjArr = x => !isArr(x) ? false : !x.reduce((no, item) => no || !isObj(item), false)
// Checks if argument is an Map of Objects. Each element type must be object, otherwise will return false.
export const isObjMap = x => !isMap(x) ? false : !Array.from(x).reduce((no, item) => no || !isObj(item[1]), false)
export const isStr = x => typeof (x) === 'string'
export const isValidNumber = x => typeof (x) == 'number' && !isNaN(x) && isFinite(x)
export const hasValue = x => isDefined(x) && (isValidNumber(x) || (isStr(x) && !!x))

export const isMobile = () => window.innerWidth <= Responsive.onlyMobile.maxWidth

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
	if (!isArr(data) && !isAMap) return [];
	const len = isAMap ? data.size : data.length
	// if (len === 0) return [];
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
		result.push(callback( value, key, data, isAMap))
	}
	return result
}

// arrSearch search for objects by key-value pairs
//
// Params:
// @map			Map
// @keyValues	Object	: key-value pairs
// @matchAll	bool 	: match all supplied key-value pairs
// @ignoreCase	bool	: case-insensitive search for strings
//
// Returns Map (key = original index) or Array (index not preserved) if @returnArr == true
export const arrSearch = (arr, keyValues, matchExact, matchAll, ignoreCase, returnArr) => {
	const result = returnArr ? new Array() : new Map()
	if (!isObj(keyValues) || !isMap(arr)) return result;
	const keys = Object.keys(keyValues)
	for (var index = 0; index < arr.length; i++) {
		let matched = false
		const item = arr[index]
		for (const i in keys) {
			const key = keys[i]
			let keyword = keyValues[key]
			let value =  item[key]

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

export const arrSort = (arr, key, reverse) => !isObjArr(arr) ? arr : arrReverse(arr.sort((a, b) => a[key] > b[key] ? 1 : -1), reverse)

export const arrReverse = (arr, reverse) => reverse ? arr.reverse() : arr

// objCopy copies top level properties and returns another object
//
// Params:
// @source  object
// @dest    object (optional)
export const objCopy = (source, dest) => !isObj(source) ? dest || {} : (
	Object.keys(source).reduce((obj, key) => {
		obj[key] = source[key]
		return obj
	}, dest || {})
)

// objClean produces a new object with supplied keys and values from supplied object
//
// Params:
// @obj		object
// @keys	array : if empty/not array, an empty object will be returned
//
// Returns object
export const objClean = (obj, keys) => !isObj(obj) || !isArr(keys) ? {} : keys.reduce((cleanObj, key) => {
	if (obj.hasOwnProperty(key)) {
		cleanObj[key] = obj[key]
	}
	return cleanObj
}, {})


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

// mapFindByKey finds a specific object by supplied key and value
//
// Params:
// @map		Map: Map of objects
// @key		any: object key to match
// @value	any
//
// Returns Object: first item partial/fully matching @value with supplied @key
export const mapFindByKey = (map, key, value, matchExact) => {
	for (let [_, item] of map.entries()) {
		const val = item[key]
		if (!matchExact && (isStr(val) || isArr(val)) ? val.indexOf(value) >= 0 : val === value) return item;
	}
}

// mapSearch search for objects by key-value pairs
//
// Params:
// @map			Map
// @keyValues	Object	: key-value pairs
// @matchAll	bool 	: match all supplied key-value pairs
// @ignoreCase	bool	: case-insensitive search for strings
//
// Returns Map
export const mapSearch = (map, keyValues, matchExact, matchAll, ignoreCase) => {
	const result = new Map()
	if (!isObj(keyValues) || !isMap(map)) return result;
	const keys = Object.keys(keyValues)
	for (let [itemKey, item] of map.entries()) {
		let matched = false
		for (const i in keys) {
			const key = keys[i]
			let keyword = keyValues[key]
			let value =  item[key]

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

// Returns a new map sorted by key. Must be a map obects
export const mapSort = (map, key, reverse) => !isObjMap(map) ? map : new Map(arrReverse(
	Array.from(map).sort((a, b) => a[1][key] > b[1][key] ? 1 : -1),
	reverse
))

// Search Array or Map
export const search = (data, keywords, keys) => {
	if (!keywords || keywords.length === 0 || !(isArr(data) || isMap(data))) return data;
	const fn = isMap(data) ? mapSearch : arrSearch
	const keyValues = keys.reduce((obj, key) => {
		obj[key] = keywords
		return obj
	}, {})
	return fn(data, keyValues, false, false, true, false)
}

// Sort Array or Map
export const sort = (data, key, reverse) => isArr(data) ? arrSort(data, key, reverse) : (
	isMap(data) ? mapSort(data, key, reverse) : data
)

/*
 * Date formatting etc.
 */
// prepend0 prepends '0' if number is less than 10
const prepend0 = n => (n < 10 ? '0' : '') + n

// For todays date;
Date.prototype.today = function () {
	return prepend0(this.getDate()) + "/" + prepend0(this.getMonth() + 1) + "/" + this.getFullYear();
}

// For the time now
Date.prototype.timeNow = function () {
	return prepend0(this.getHours()) + ":" + prepend0(this.getMinutes()) + ":" + prepend0(this.getSeconds())
}

export const getNow = () => new Date().today() + " @ " + new Date().timeNow()

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
	if (!isFn(instance.setState)) return;
	dataBefore !== undefined && setState(instance, key, dataBefore)
	return setTimeout(() => {
		setState(instance, key, dataAfter)
	}, delay || 2000)
}

// setState changes state property value immediately
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
	let timeoutId;
	return function () {
		const args = arguments
		if (timeoutId) clearTimeout(timeoutId);
		timeoutId = setTimeout(function () {
			isFn(callback) && callback.apply(thisArg, args);
		}, delay || 50)
	}
}

// textEllipsis shortens string into 'abc...xyz' form
//
// Params: 
// @text    string
// @maxLen  number: maximum length of the shortened text including dots
// @numDots number: number of dots to be inserted in the middle. Default: 3
//
// Returns string
export const textEllipsis = (text, maxLen, numDots) => {
	text = !isStr(text) ? '' : text
	maxLen = maxLen || text.length
	if (text.length <= maxLen || !maxLen) return text;
	numDots = numDots || 3
	const textLen = maxLen - numDots
	const partLen = Math.floor(textLen / 2)
	const isEven = textLen % 2 === 0
	const arr = text.split('')
	const dots = new Array(numDots).fill('.').join('')
	const left = arr.slice(0, partLen).join('')
	const right = arr.slice(text.length - (isEven ? partLen : partLen + 1)).join('')
	return left + dots + right
}

/*
 * Functional Components
 */
export function IfFn(props) {
	const content = props.condition ? props.then : props.else
	return (isFn(content) ? content() : content) || ''
}

// IfMobile component can be used to switch between content when on mobile and/or not
export function IfMobile(props) {
	return (
		<React.Fragment>
			{isDefined(props.then) && (
				<Responsive 
					maxWidth={Responsive.onlyMobile.maxWidth} 
					onUpdate={props.onUpdate}
					className={props.thenClassName}
				>
					<IfFn condition={true} then={props.then} />
				</Responsive>
			)}

			{isDefined(props.else) && (
				<Responsive
					minWidth={Responsive.onlyMobile.maxWidth}
					onUpdate={props.then ? undefined : props.onUpdate}
					className={props.elseClassName}
				>
					<IfFn condition={true} then={props.else} />
				</Responsive>
			)}
		</React.Fragment>
	)
}

export function IfNotMobile(props) {
	return <IfMobile else={props.then} elseClassName={props.thenClassName} onUpdate={props.onUpdate} />
}
import React from 'react'
import { Responsive } from 'semantic-ui-react'

// Copies supplied string to system clipboard
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
export const isFn = (fn) => typeof(fn) === 'function'

export const isValidNumber = num => typeof(num) == 'number' && !isNaN(num)

// Prepends 0 if number is less than 10
const prepend0 = n => n < 10 ? '0' + n : n

// For todays date;
Date.prototype.today = function () { 
  return prepend0(this.getDate()) +"/"+ prepend0(this.getMonth()+1) +"/"+ this.getFullYear();
}

// For the time now
Date.prototype.timeNow = function () {
  return prepend0(this.getHours()) + ":"+ prepend0(this.getMinutes()) +":"+ prepend0(this.getSeconds())
}

export const getNow = () => new Date().today() + " @ " + new Date().timeNow()

export function setStateTimeout(compInstance, key, dataBefore, dataAfter, delay){
  if (typeof(compInstance.setState) != 'function') return;
  dataBefore !== undefined && setState(compInstance, key, dataBefore)
  setTimeout(() => {
    setState(compInstance, key, dataAfter)
  }, delay || 2000)
}

export function setState(compInstance, key, value){
  const data = {}
  data[key] = value
  compInstance.setState(data)
}

export function deferred(callback, delay, bindTo) {
  let timeoutId;
  return function(){
    const args = arguments
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(function() {
      callback.apply(bindTo, args);
    }, delay)
  }
}

// textEllipsis shortens string into 'abc...xyz' form
// Params: 
// @text    string
// @maxLen  number: maximum length of the shortened text including dots
// @numDots number: number of dots to be inserted in the middle. Default: 3
//
// Returns string
export const textEllipsis = (text, maxLen, numDots) => {
  text = typeof(text) != 'string' ? '' : text
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
  const isMobile = window.innerWidth <= Responsive.onlyMobile.maxWidth
  const content = isMobile ? props.then : props.else 
  return <IfFn condition={true} then={content} />
}

export function IfNotMobile(props) {
  return <IfMobile else={props.then} />
}
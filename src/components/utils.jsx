// import React from 'react'

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

export const setStateTimeout = (compInstance, key, dataBefore, dataAfter, delay) => {
  if (typeof(compInstance.setState) != 'function') return;
  const data = {}
  data[key] = dataBefore
  compInstance.setState(data)
  setTimeout(() => {
    data[key] = dataAfter
    compInstance.setState(data)
  }, delay || 2000)
}
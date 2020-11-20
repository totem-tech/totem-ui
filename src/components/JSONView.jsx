import React, { isValidElement } from 'react'
import PropTypes from 'prop-types'
import {
    isAddress, isArr, isBool, isHex, isMap, isObj, isSet, isStr, isValidNumber, textEllipsis
} from '../utils/utils'
import LabelCopy from './LabelCopy'
import { useRxSubject } from '../services/react'
import { MOBILE, rxLayout } from '../services/window'

export default function JSONView({ data, asEl = true }) {
    const [[spaces, maxLength]] = useRxSubject(rxLayout, l => {
        const isMobile = l === MOBILE
        return isMobile
            ? [2, 13]
            : [4, 20]
    })
    const isArrLike = x => isSet(x) || isMap(x)
    const dataX = isObj(data)
        ? { ...data }
        : isArr(data) || isArrLike(data)
            ? [...Array.from(data)]
            : isValidNumber(data) || isBool(data)
                ? data
                : [`${data}`]
    let ellipsed = {}

    Object.keys(dataX)
        .forEach(key => {
            let value = dataX[key]
            if (key === 'UnitPrice') console.log({key, value})
            if (isArr(value) || isArrLike(value) || isObj(value)) {
                const res = JSONView({ data: value, asEl: false })
                value = res[0]
                ellipsed = { ...ellipsed, ...res[1] }
                dataX[key] = value
                return
            }
            const useElipsis = (isHex(value) && value.length > maxLength)
                || isAddress(value, 'ethereum')
                || isAddress(value)
                if (useElipsis) {
                    const valueShort = textEllipsis(value, maxLength)
                    ellipsed[valueShort] = value
                    value = valueShort
                }
            value === '0x1200' && console.log({value, useElipsis})
            dataX[key] = value
        })
    
    if (!asEl) return [dataX, ellipsed]
    
    const str = isStr(dataX)
        ? dataX
        : JSON.stringify(dataX, null, spaces)
    let arr = [str]

    Object.keys(ellipsed).forEach(shortValue => {
        arr = arr.map(x => isValidElement(x)
            ? x
            : x.split(shortValue)
                .map(next => [
                    <LabelCopy {...{
                        content: shortValue,
                        maxLength,
                        numDots: 3,
                        split: true,
                        value: ellipsed[shortValue],
                    }} />,
                    next,
                ])
                .flat()
                // remove 
                .slice(1)
        ).flat()
    })

    return (
        <span style={{
            fontFamily: 'monospace, courier',
            fontSize: 11,
            whiteSpace: 'pre-wrap',
        }}>
            {arr
                .map((x, i) => <span key={i}>{x}</span>)}
        </span>
    )
}
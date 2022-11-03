import React, { isValidElement } from 'react'
import PropTypes from 'prop-types'
import {
    isAddress, isArr, isArrLike, isBool, isHex, isObj, isStr, isValidNumber, strFill, textEllipsis
} from '../utils/utils'
import LabelCopy from './LabelCopy'
import { useRxSubject } from '../services/react'
import { MOBILE, rxLayout } from '../services/window'

function JSONView(props) {
    const { asEl, data } = props
    const [isMobile] = useRxSubject(rxLayout, l => l === MOBILE)
    const [spaces, maxLength, size] = isMobile
        ? [2, 11, 'mini']
        : [4, 17, 'tiny']
    const dataX = isObj(data)
        ? { ...data }
        : isArrLike(data)
            ? [...Array.from(data)]
            : isValidNumber(data) || isBool(data)
                ? data
                : [`${data}`]
    let ellipsed = {}
    const elements = new Map()
    const elementKeyPrefix = '_________ELEMENT_________'

    Object.keys(dataX)
        .forEach(key => {
            let value = dataX[key]
            if (isValidElement(value)) {
                const id = `${elementKeyPrefix}${strFill(elements.size + 1, 6, '_')}`
                elements.set(id, value)
                dataX[key] = id
                return 
            }
            if (isArr(value) || isArrLike(value) || isObj(value)) {
                const res = JSONView({
                    data: value,
                    asEl: false,
                })
                value = res[0]
                ellipsed = { ...ellipsed, ...res[1] }
                Array
                    .from(res[2])
                    .forEach(([key, value]) => elements.set(key, value))
                dataX[key] = value
                return
            }
            // whether to shorten the value or leave as is
            const useElipsis = (isHex(value) && value.length > maxLength)
                || isAddress(value, 'ethereum')
                || isAddress(value)
            if (useElipsis) {
                const valueShort = textEllipsis(value, maxLength, 3, true)
                ellipsed[valueShort] = value
                value = valueShort
            }
            dataX[key] = value
        })
    
    if (!asEl) return [dataX, ellipsed, elements]
    
    const str = !isStr(dataX)
        ? JSON.stringify(dataX, null, spaces)
        : dataX
    let arr = [str]

    Object
        .keys(ellipsed)
        .forEach(shortValue => {
            arr = arr.map(x => isValidElement(x)
                ? x
                : x.split(shortValue)
                    .map(next => [
                        <LabelCopy {...{
                            as: 'span',
                            content: shortValue,
                            size,
                            style: { margin: 0 },
                            value: ellipsed[shortValue],
                        }} />,
                        next,
                    ])
                    .flat()
                    // remove 
                    .slice(1)
            ).flat()
        })
    Array.from(elements)
        .forEach(([elementId, element]) => {
            arr = arr.map(x =>
                isValidElement(x)
                    ? x
                    : x.split(elementId)
                        .map(next => [element, next])
                        .flat()
                        // remove 
                        .slice(1)
            )
                .flat()
        })

    return (
        <span style={{
            fontFamily: 'monospace, courier',
            fontSize: 11,
            whiteSpace: 'pre-wrap',
        }}>
            {arr.map((x, i) => <span key={i}>{x}</span>)}
        </span>
    )
}
JSONView.propTypes = {
    // @asEl whether to return as a plain text or element
    // If true, will include copy icon for shortened property values.
    // Values are shortened if value is:
    //     - a Polkadot/Totem address
    //     - an Ethereum address
    //     - a hex string and has length higher than `maxLength`
    //        - maxLength: on mobile view 11, otherwise 17.
    // Default: true
    asEl: PropTypes.bool,
    data: PropTypes.any.isRequired,
    maxLength: PropTypes.number,
}
JSONView.defaultProps = {
    asEl: true,
}
export const jsonView = JSONView
export default React.memo(JSONView)
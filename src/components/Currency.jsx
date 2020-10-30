import React, { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { isValidNumber, isFn, isDefined } from '../utils/utils'
import { convertTo, currencyDefault, rxSelected } from '../services/currency'
import { useRxSubject } from '../services/react'

export const Currency = props => {
    let {
        className,
        decimalPlaces,
        EL,
        emptyMessage,
        onChange,
        onClick,
        prefix,
        style,
        suffix,
        title,
        unit,
        unitDisplayed,
        value,
    } = props
    const [selected] = !unit && !unitDisplayed ? [] : useRxSubject(rxSelected)
    unit = unit || selected
    unitDisplayed = unitDisplayed || selected
    const isSame = unit === unitDisplayed
    let [valueConverted, setValueConverted] = useState(isSame ? value : undefined)
    let [error, setError] = useState()

    useEffect(() => {
        if (!isValidNumber(value)) return () => { }
        let mounted = true
        const convert = async (value) => {
            if (!mounted) return
            try {
                const [_, rounded] = await convertTo(
                    value || 0,
                    unit,
                    unitDisplayed,
                    decimalPlaces,
                )
                error = null
                valueConverted = rounded
            } catch (err) {
                error = err
                valueConverted = 0
            }

            if (!mounted) return
            setError(error)
            setValueConverted(valueConverted)
            isFn(onChange) && onChange(valueConverted, error)
        }

        // convert and display value supplied
        convert(value)

        return () => mounted = false
    }, [unit, unitDisplayed, value])

    const content = !isDefined(valueConverted) ? (emptyMessage || '') : (
        <span>{prefix || ''}{valueConverted} {unitDisplayed}{suffix || ''}</span>
    )
    return (
        <EL {...{
            className,
            onClick,
            style: { color: error ? 'red' : undefined, ...style },
            title: error ? `${error}` : title || (
                !isDefined(value) || isSame ? '' : `${value || 0} ${unit}`
            ),
        }}>
            {content}
        </EL>
    )
}
Currency.propTypes = {
    className: PropTypes.string,
    decimalPlaces: PropTypes.number,
    // @EL (optional) HTML element to use. Default: 'span'
    EL: PropTypes.string,
    emptyMessage: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.element,
    ]),
    // @onChange is invoked whenever the account balance/value changes. 
    onChange: PropTypes.func,
    onClick: PropTypes.func,
    prefix: PropTypes.any,
    style: PropTypes.object,
    suffix: PropTypes.any,
    title: PropTypes.any,
    unit: PropTypes.string,
    // Display currency. Default: selected currency from currency service
    unitDisplayed: PropTypes.string,
    value: PropTypes.number,
}
Currency.defaultProps = {
    EL: 'span',
    unit: currencyDefault, // XTX
}
export default React.memo(Currency)
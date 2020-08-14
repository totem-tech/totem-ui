import React, { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { isValidNumber, isFn, isDefined } from '../utils/utils'
import { round } from '../utils/number'
import { convertTo, currencyDefault, useSelected } from '../services/currency'

export const Currency = props => {
    const {
        className,
        decimalPlaces,
        EL,
        emptyMessage,
        onChange,
        prefix,
        style,
        suffix,
        unit,
        unitDisplayed: pUnitD,
        value,
    } = props
    // console.log({ pUnitD })
    const [unitDisplayed] = pUnitD ? [pUnitD] : useSelected()
    const isSame = unit === unitDisplayed
    let [valueConverted, setValueConverted] = useState(isSame ? value : undefined)
    let [error, setError] = useState()

    useEffect(() => {
        if (!isValidNumber(value)) return () => { }
        let mounted = true
        const convert = async (value) => {
            if (!mounted) return
            try {
                valueConverted = !value || isSame ? value || 0 : await convertTo(value, unit, unitDisplayed)
                valueConverted = round(valueConverted, decimalPlaces)
                error = null
            } catch (err) {
                error = err
                valueConverted = 0.00
            }

            if (!mounted) return
            setError(error)
            setValueConverted(valueConverted)
            isFn(onChange) && onChange(valueConverted, error)
        }

        // convert and display value supplied
        convert(value)

        return () => mounted = false
    }, [unitDisplayed, value])

    const content = !isDefined(valueConverted) ? (emptyMessage || '') : (
        `${prefix || ''}${valueConverted} ${unitDisplayed}${suffix || ''}`
    )
    return (
        <EL {...{
            className,
            style: { color: error ? 'red' : undefined, ...style },
            title: error ? `${error}` : (
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
    prefix: PropTypes.any,
    style: PropTypes.object,
    suffix: PropTypes.any,
    unit: PropTypes.string,
    // Display currency. Default: selected currency from currency service
    unitDisplayed: PropTypes.string,
    value: PropTypes.number,
}
Currency.defaultProps = {
    decimalPlaces: 2,
    EL: 'span',
    unit: currencyDefault, // XTX
}
export default React.memo(Currency)
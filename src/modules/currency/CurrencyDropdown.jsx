import React from 'react'
import PropTypes from 'prop-types'
import { Icon } from 'semantic-ui-react'
import { getCurrencies, rxCurrencies} from './currency'
import { usePromise, useRxSubject } from '../../utils/reactHelper'
import FormInput from '../../components/FormInput'
import { Reveal } from '../../components/buttons'
import { isFn, objWithoutKeys } from '../../utils/utils'

const CurrencyDropdown = React.memo((props) => {
    const { autoHideName, onCurrencies } = props
    props = objWithoutKeys(props, ['autoHideName', 'onCurrencies'])
    const [options = []] = usePromise(async () => {
        const currencies = await getCurrencies()
        isFn(onCurrencies) && onCurrencies(currencies)
        return currencies.map(({ _id, currency, name, ticker, type }) => {
            const withName = (
                <span key={_id}>
                    <span style={{ fontWeight: 'bold' }}>
                        {currency}
                    </span>
                    {' - '}
                    <span style={{ color: 'grey' }}>
                        {name}
                    </span>
                </span>
            )
            return {
                key: _id,
                text: !autoHideName
                    ? withName
                    : (
                        <Reveal {...{
                            content: currency,
                            contentHidden: withName,
                            El: 'div',
                            style: {
                                margin: '-10px -15px',
                                padding: '10px 15px',
                                whiteSpace: 'pre-wrap',
                            }
                        }} />
                    ),
                ticker,
                title: name,
                type,
                value: currency,
            }
        })
    })
    const style = {
        ...props.secondary && {
            borderRadius: props.secondaryPosition === 'right'
                ? '0 3px 3px 0'
                : '3px 0 0 3px',
            minWidth: 100,
        },
        ...props.style,
    }

    return (
        <FormInput {...{
            lazyLoad: true,
            openOnFocus: true,
            selection: true,
            search: [
                'key',
                'ticker',
                'title',
                'type',
                'value',
            ],
            ...props,
            icon: (
                <Icon {...{
                    className: 'no-margin',
                    name: 'dropdown',
                    style: { 
                        position: 'absolute',
                        right: 15,
                        top: 0,
                    },
                }} />
            ),
            ignoreAttributes: [
                'secondary',
                'secondaryPosition',
            ],
            // fixes search keyword not showing up
            searchInput: { style: { width: '100%' }},
            name: props.name || 'CurrencyDropdown',
            options,
            style,
            styleContainer: {
                padding: props.secondary ? 0 : undefined,
                ...props.styleContainer,
            },
            type: 'dropdown',
        }} />
    )
})

CurrencyDropdown.propTypes = {
    // whether to autohide currency name
    autoHideName: PropTypes.bool,
    // callback triggered once currencies list is received
    // Args: [Array currencies]
    onCurrencies: PropTypes.func,
}
CurrencyDropdown.defaultProps = {
    secondary: false,
    secondaryPosition: 'right',
}
export const asInput = (props) => ({
    ...props,
    content: <CurrencyDropdown {...objWithoutKeys(props, ['onChange'])} />,
    type: 'html',
})
export const asInlineLabel = (props, inputWidth = '60%', labelPosition = 'right') => ({
    inlineLabel: (
        <CurrencyDropdown {...{
            autoHideName: true,
            ...props,
            secondary: true,
            secondaryPosition: labelPosition,
        }} />
    ),
    input: <input style={{ width: inputWidth }} />,
    labelPosition, // inlineLabel position
})
export default CurrencyDropdown
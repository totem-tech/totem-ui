import React, { useEffect } from 'react'
import Currency from '../../components/Currency'
import { currencyDefault } from '../../services/currency'
import { translated } from '../../services/language'
import { iUseReducer, useRxSubject } from '../../services/react'
import {
    calculateAllocation,
    calculateToNextLevel,
    rxCrowdsaleData,
    Level_NEGOTIATE_Entry_XTX,
} from './crowdsale'

const textsCap = translated({  
    amountAllocated: 'your allocation',
    amountContributed: 'you contributed',
    amountToNextLevel: 'contribution required for next multiplier',
    lastLevelReached: 'Yeey! You have reached the highest multiplier level. Contact us for special bonus multiplier if you would like to invest more than',
}, true)[1]

export default React.memo(() => {
    const [deposits] = useRxSubject(rxCrowdsaleData, ({ deposits = {} }) => ({ ...deposits }))
    const [state, setState] = iUseReducer(null, {})

    useEffect(() => {
        let mounted = true
        const calculate = async () => {
            const [
                amtDepositedXTX = 0,
                amtMultipliedXTX = 0,
                currentLevel = 0,
                multiplier = 1,
            ] = await calculateAllocation(deposits)
            const [
                nextLevelAmountXTX,
                _,
                nextLevel,
                nextMultiplier,
            ] = await calculateToNextLevel('XTX', amtDepositedXTX)

            setState({ 
                amtDepositedXTX,
                amtMultipliedXTX,
                currentLevel,
                multiplier,
                nextLevelAmountXTX,
                nextLevel,
                nextMultiplier,
            })
        }

        // ignore errors | shouldn't happen
        calculate().catch(console.log)

        return () => mounted = false
    }, [deposits, setState])

    const {
        amtDepositedXTX,
        amtMultipliedXTX,
        currentLevel,
        multiplier,
        nextLevelAmountXTX,
        nextLevel,
        nextMultiplier,
    } = state

    return (
        <div>
            <div>
                <h4 style={{ margin: 0 }}>
                    {textsCap.amountContributed}:
                    <Currency {...{
                        prefix: ' ',
                        style: styles.initialFont,
                        unit: currencyDefault,
                        value: amtDepositedXTX,
                    }} />
                </h4>
                <h4 style={{ margin: 0 }}>
                    {textsCap.amountAllocated} (x{multiplier}):
                    <Currency {...{
                        prefix: ' ',
                        style: styles.initialFont,
                        unit: currencyDefault,
                        value: amtMultipliedXTX,
                    }} />
                </h4>
                {!!nextLevelAmountXTX && (
                    <h4 style={{ margin: 0 }}>
                        {textsCap.amountToNextLevel} (x{nextMultiplier}):
                        <Currency {...{
                            prefix: ' ',
                            style: styles.initialFont,
                            unit: currencyDefault,
                            value: nextLevelAmountXTX,
                        }} />
                    </h4>
                )}
                
                {!nextLevelAmountXTX && (
                    <Currency {...{
                        EL: 'h4',
                        prefix: `${textsCap.lastLevelReached} `,
                        // style: styles.initialFont,
                        unit: currencyDefault,
                        value: Level_NEGOTIATE_Entry_XTX,
                        style: { color: 'green', marginTop: 10 }
                    }} />
                )}
            </div>
        </div>
    )
})

const styles = {
    initialFont: {
        fontSize: 'initial',
        fontWeight: 'initial',
    },
}
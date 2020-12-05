import React from 'react'
import { Button } from 'semantic-ui-react'
import DataTable from '../../components/DataTable'
import LabelCopy from '../../components/LabelCopy'
import { translated } from '../../services/language'
import { showForm } from '../../services/modal'
import { addToQueue, QUEUE_TYPES } from '../../services/queue'
import { useRxSubject } from '../../services/react'
import { setToast } from '../../services/toast'
import CalculatorForm from './CalculatorForm'
import { BLOCKCHAINS, crowdsaleData, rxCrowdsaleData } from './crowdsale'
import DAAForm from './DAAForm'
import { showFaqs } from './FAQ'
import KYCViewForm from './KYCViewForm'

const textsCap = translated({
    amountDeposited: 'amount deposited',
    blockchain: 'blockchain',
    checkDepositStatus: 'check deposit status',
    calculator: 'calculator',
    despositAddress: 'pay to address',
    faqs: 'FAQs',
    requestBtnTxt: 'request address',
    viewCrowdsaleData: 'view crowdsale data',
}, true)[1]
// list of deposit addresses and balances using rxCrowdsaleData
export default function AddressList(props) {
    const [state] = useRxSubject(rxCrowdsaleData, csData => {
        const { depositAddresses: addresses = {}, deposits = {} } = csData || {}
        const data = Object.keys(BLOCKCHAINS)
            .map(chain =>  [
                chain,
                {
                    address: addresses[chain] && (
                        <LabelCopy
                            maxLength={null}
                            value={addresses[chain]}
                        />
                    ),
                    amount: addresses[chain] && `${deposits[chain] || 0.00} ${chain}`,
                    blockchain: chain,
                    _blockchain: BLOCKCHAINS[chain],
                },
            ])
        return {
            ...getTableProps(deposits),
            data: new Map(data),
        }
    })

    return <DataTable {...{...props, ...state }} />
}


const getTableProps = deposits => ({
    columns: [
        { key: '_blockchain', title: textsCap.blockchain },
        {
            content: ({ address, blockchain }) => address || (
                <Button {...{
                    content: textsCap.requestBtnTxt,
                    onClick: () => showForm(DAAForm, { values: { blockchain } }),
                }} />
            ),
            key: 'address',
            textAlign: 'center',
            title: textsCap.despositAddress,
        },
        {
            key: 'amount',
            textAlign: 'center',
            title: textsCap.amountDeposited,
        },
    ],
    searchable: false,
    tableProps: {
        basic: 'very',
        celled: false,
        compact: true,
        unstackable: true,
    },
    topLeftMenu: [
        {
            content: textsCap.faqs,
            icon: 'info',
            onClick: () => showFaqs(),
        },
        {
            content: textsCap.viewCrowdsaleData,
            icon: 'eye',
            onClick: () => showForm(KYCViewForm),
        },
        {
            content: textsCap.checkDepositStatus,
            icon: 'find',
            onClick: () => {
                addToQueue({
                    args: [false],
                    func: 'crowdsaleCheckDeposits',  
                    type: QUEUE_TYPES.CHATCLIENT,
                    silent: true,
                    then: (ok, result) => ok && crowdsaleData({
                        ...rxCrowdsaleData.value,
                        ...result,
                    })
                })
            }
        },
        {
            hidden: !deposits,
            content: textsCap.calculator,
            icon: 'calculator',
            onClick: () => showForm(CalculatorForm, { deposits }),
        },
    ],
})
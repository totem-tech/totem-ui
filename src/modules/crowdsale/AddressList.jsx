import React from 'react'
import { Button } from 'semantic-ui-react'
import DataTable from '../../components/DataTable'
import LabelCopy from '../../components/LabelCopy'
import { translated } from '../../services/language'
import { showForm } from '../../services/modal'
import { useRxSubject } from '../../services/react'
import CalculatorForm from './CalculatorForm'
import { BLOCKCHAINS, rxCrowdsaleData } from './crowdsale'
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
        const { depositAddresses = {}, deposits = {} } = csData || {}
        const data = Object.keys(BLOCKCHAINS)
            .map(blockchain =>  [
                blockchain,
                {
                    address: depositAddresses[blockchain] && (
                        <LabelCopy
                            maxLength={null}
                            value={depositAddresses[blockchain]}
                        />
                    ),
                    amount: undefined,
                    blockchain,
                    _blockchain: BLOCKCHAINS[blockchain],
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
            onClick: () => alert('To be implemented')
        },
        {
            hidden: !deposits,
            content: textsCap.calculator,
            icon: 'calculator',
            onClick: () => showForm(CalculatorForm, { deposits }),
        },
    ],
})
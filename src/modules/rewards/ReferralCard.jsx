import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { Accordion, Card, Icon } from 'semantic-ui-react'
import { format } from '../../utils/time'
import { className, isDefined } from '../../utils/utils'
import DataTable from '../../components/DataTable'
import LabelCopy from '../../components/LabelCopy'
import Text from '../../components/Text'
import { translated } from '../../services/language'
import { useInverted } from '../../services/window'
import { getUser } from '../chat/ChatClient'
import Currency from '../currency/Currency'
import { currencyDefault } from '../currency/currency'

const initialRewardAmount = 108154 // only used where amount has not been saved (initial drop)
const textsCap = translated({
    copyLink: 'copy your referral link',
    friendsReferred: 'friends referred',
    paid: 'paid',
    referralDesc1: 'Totem works best when you have partners. Referring will get both you and your friends free coins.',
    referralDesc2: 'Invite your friends to join Totem using the following link:',
    referralHeader: 'referral Reward',
    totalEarned: 'total earned',
}, true)[1]

function ReferralCard({ referralRewards = {} }) {
    const inverted = useInverted()
    const [showList, setShowList] = useState(false)
    const [tableData, setTableData] = useState(new Map())
    const [amountTotal, setAmountTotal] = useState(0)

    useEffect(() => {
        const userIds = Object.keys(referralRewards)
        let amountTotal = 0
        const list = userIds.map(userId => {
            const item = referralRewards[userId]
            if (!isDefined(item.amount)) {
                item.amount = initialRewardAmount
            }
            const { amount, status, tsCreated, twitterReward = {} } = item
            const _amountSum = amount + (twitterReward.amount || 0)
            amountTotal += _amountSum
            return [
                userId,
                {
                    ...item,
                    userId,
                    _amountSum,
                    _amount: (
                        <Currency {...{
                            unit: currencyDefault,
                            value: _amountSum,
                        }} />
                    ),
                    _status: status === 'success'
                        ? textsCap.paid
                        : '',
                    _tsCreated: format(tsCreated, false, false),
                }
            ]
        })
        setAmountTotal(amountTotal)
        setTableData(new Map(list))
    }, [referralRewards])

    const referralHeader = (
        <Text className='header'>
            <Icon name={tableData.size > 0 ? 'check' : 'play'} />
            {textsCap.referralHeader}
        </Text>
    )
    const referralContent = (
        <Text>
            <p>{textsCap.referralDesc1}</p>
            <p>
                {textsCap.referralDesc2}
                <LabelCopy {...{
                    as: 'span',
                    content: textsCap.copyLink,
                    maxLength: null,
                    value: getReferralURL(),
                }} />
            </p>

            {tableData.size > 0 && (
                <Accordion>
                    <Text {...{
                        El: Accordion.Title,
                        onClick: () => setShowList(!showList)
                    }}>
                        <Icon name={showList ? 'caret down' : 'caret right'} />
                        {textsCap.friendsReferred}: {tableData.size}
                    </Text>
                    <Accordion.Content active={showList}>
                        <DataTable {...{
                            ...tableProps,
                            data: tableData,
                        }} />
                    </Accordion.Content>
                </Accordion>
            )}
        </Text>
    )
    return (
        <Card {...{
            fluid: true,
            className: className({ inverted }),
        }}>
            <Card.Content header={referralHeader} />
            <Card.Content description={referralContent} />
            <Card.Content extra>
                <Text>
                    <Icon name='money' />
                    <Currency {...{
                        title: textsCap.totalEarned,
                        unit: currencyDefault,
                        value: amountTotal,
                    }} />
                </Text>
            </Card.Content>
        </Card>
    )
}
ReferralCard.propTypes = {
    referralRewards: PropTypes.object,
}
const tableProps = {
    columns: [
        {
            collapsing: true,
            key: '_tsCreated',
            textAlign: 'center',
            title: 'Date',
        },
        {
            key: 'userId',
            title: 'User ID',
        },
        {
            key: '_amount',
            sortKey: 'amount',
            title: 'Amount',
        },
        {
            key: '_status',
            textAlign: 'center',
            title: 'Status',
        }
    ],
    // searchable: false,
}
export const getReferralURL = () => location.protocol
    + '//'
    + location.hostname
    + (location.port ? ':' + location.port : '')
    + '?ref=' + getUser().id

export default React.memo(ReferralCard)
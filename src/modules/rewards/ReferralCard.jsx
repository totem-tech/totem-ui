import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { Accordion, Button, Card, Icon } from 'semantic-ui-react'
import { format } from '../../utils/time'
import { className, isArr, isDefined } from '../../utils/utils'
import DataTable from '../../components/DataTable'
import LabelCopy from '../../components/LabelCopy'
import Text from '../../components/Text'
import { translated } from '../../services/language'
import { useInverted } from '../../services/window'
import { getUser } from '../chat/ChatClient'
import Currency from '../currency/Currency'
import { currencyDefault } from '../currency/currency'
import { generateCrowdloanTweet } from './rewards'

const initialRewardAmount = 108154 // only used where amount has not been saved (initial drop)
const textsCap = translated({
    copyLink: 'copy your referral link',
    friendsReferred: 'friends referred',
    paid: 'paid',
    tweetWithReferral: 'post a Tweet with your referral link',
    referralDesc1: 'Totem works best when you have partners. Referring will get both you and your friends free $TOTEM.',
    referralDesc1: 'Totem works best when you have partners. Referring will get both you and your friends free $KAPEX when they contribute to Totem\'s crowdloan.',
    referralDesc2: 'Invite your friends to join Totem using the following link:',
    referralHeader: 'referral rewards',
    totalEarned: 'total earned',
}, true)[1]

export default function ReferralCard({ referralRewards = [] }) {
    const inverted = useInverted()
    const [showList, setShowList] = useState(false)
    const [tableData, setTableData] = useState(new Map())
    const [amountTotal, setAmountTotal] = useState(0)
    const [referralUrl] = useState(() => getReferralURL())

    useEffect(() => {
        let amountTotal = 0
        const list = !isArr(referralRewards)
            ? []
            : referralRewards.map(item => {
                const { data: { referredUserId } = {} } = item
                if (!isDefined(item.amount)) {
                    item.amount = initialRewardAmount
                }
                const { amount, status, tsCreated, twitterReward = {} } = item
                const _amountSum = amount + (twitterReward.amount || 0)
                amountTotal += _amountSum
                return [
                    referredUserId,
                    {
                        ...item,
                        referredUserId,
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
            <Icon name={tableData.size > 0 ? 'play' : 'hand point right'} />
            {textsCap.referralHeader}
        </Text>
    )
    const accordionTitle = (
        <Text {...{
            El: Accordion.Title,
            key: 0,
            onClick: () => setShowList(!showList),
        }}>
            <Icon name={showList ? 'caret down' : 'caret right'} />
            {textsCap.friendsReferred}: {tableData.size}
        </Text>
    )
    const referralContent = (
        <Text El='div'>
            <p>{textsCap.referralDesc1}</p>
            <p>
                {textsCap.referralDesc2 + ' '}
                <LabelCopy {...{
                    as: 'span',
                    content: textsCap.copyLink,
                    maxLength: null,
                    value: referralUrl,
                }} />
            </p>

            <p>
                <Button {...{
                    content: textsCap.tweetWithReferral,
                    onClick: () => {
                        const tweetText = encodeURIComponent(
                            generateCrowdloanTweet()                        
                        )
                        const url = `https://twitter.com/intent/tweet?button_hashtag=share&text=${tweetText}`
                        window.open(url, '_blank')
                     },
                    size: 'mini',
                    style: {
                        background: 'deeppink',
                        color: 'white',
                    },
                }} />
            </p>

            {tableData.size > 0 && (
                <Accordion>
                    {!showList && accordionTitle}
                    <Accordion.Content active={showList}>
                        <DataTable {...{
                            ...tableProps,
                            topLeftMenu: [accordionTitle],
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
    referralRewards: PropTypes.array,
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
            key: 'referredUserId',
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

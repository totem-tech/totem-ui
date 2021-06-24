import React, { useEffect, useState } from 'react'
import DataTable from '../../components/DataTable'
import { format } from '../../utils/time'
import client from '../chat/ChatClient'

function ReferralList({ referralRewards = {} }) {
    const [data, setData] = useState()

    useEffect(() => {
        const data = Object.keys(referralRewards || {})
            .map(userId => {
                const item = referralRewards[userId]
                return [
                    userId,
                    {
                        ...item,
                        userId,
                        _status: item.status === 'success'
                            ? 'paid'
                            : item.status,
                        _tsCreated: format(item.tsCreated, false, false),
                    }
                ]
            })
        setData(new Map(data))
    }, [referralRewards])

    return <DataTable {...{ ...tableProps, data }} />
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
            key: '_status',
            textAlign: 'center',
            title: 'Status',
        }
    ],
    // searchable: false,
}

export default React.memo(ReferralList)
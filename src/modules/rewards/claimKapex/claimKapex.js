import React, { isValidElement, useCallback, useEffect, useState } from 'react'
import { Button, Icon, Step } from 'semantic-ui-react'
import { BehaviorSubject } from 'rxjs'
import uuid from 'uuid'
import chatClient, {
    getUser,
    rxIsLoggedIn,
    rxIsRegistered,
} from '../../../utils/chatClient'
import { bytesToHex } from '../../../utils/convert'
import PromisE from '../../../utils/PromisE'
import {
    subjectAsPromise,
    unsubscribe,
    useRxSubject,
} from '../../../utils/reactHelper'
import storage from '../../../utils/storageHelper'
import {
    BLOCK_DURATION_SECONDS,
    durationToSeconds,
} from '../../../utils/time'
import {
    arrUnique,
    deferred,
    isFn,
    isHex,
    isInteger,
    isObj,
    isStr,
    objClean,
    objToUrlParams,
    objWithoutKeys,
} from '../../../utils/utils'
import FAQ from '../../../components/FAQ'
import FormBuilder, { findInput } from '../../../components/FormBuilder'
import Message, { statuses } from '../../../components/Message'
import { setActiveExclusive, setContentProps } from '../../../services/sidebar'
import {
    getAll as getHistory,
    limit,
    rxHistory,
} from '../../history/history'
import identities, {
    rxIdentities,
    rxSelected,
} from '../../identity/identity'
import partners, { rxPartners } from '../../partner/partner'
import Embolden from '../../../components/Embolden'
import { MOBILE, rxLayout } from '../../../services/window'
import { listTypes } from '../../task/TaskList'

export const generateTweet = () => {
    const { endDate } = statusCached()
    const diffMs = new Date(endDate || undefined) - new Date()
    let count = Math.floor(diffMs / 1000 / 60 / 60 / 24)
    let title = 'days'
    if (count < 1) {
        title = 'hours'
        count = Math.floor(diffMs / 1000 / 60 / 60)
    }
    const tweet = encodeURIComponent(
        `Only ${count} ${title} @totem_live_ to claim $KAPEX for your testnet $TOTEM rewards!`
        + '\n\nIf you have participated in the Totem rewards campaign you must complete the claim process to be '
        + 'eligible to migrate your reward tokens to $KAPEX.'
        + '\n\nSubmit your claim now!\nhttps://totem.live?module=claim-kapex'
    )
    return `https://twitter.com/intent/tweet?button_hashtag=share&text=${tweet}`
}

export const getRewardIdentity = () => {
    const {
        user: {
            address
        } = {},
    } = storage.settings.module('messaging') || {}
    return address
}

// invoke with status object to save to storage
export const statusCached = status => storage.cache(
    'rewards',
    'KAPEXClaimStatus',
    isObj(status)
        ? objClean(status, [ // only store these values in the localStorage
            'eligible',
            'endDate',
            'startDate',
            'submitted',
        ])
        : undefined,
) || {}
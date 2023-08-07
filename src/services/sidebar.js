import React from 'react'
import { BehaviorSubject } from 'rxjs'
import { Icon } from 'semantic-ui-react'
import uuid from 'uuid'
// Views (including lists and forms)
import ActivityList from '../modules/activity/ActivityList'
import AssetFormView from '../modules/assets/AssetsFormView'
import ClaimKAPEXForm from '../modules/rewards/claimKapex/ClaimKapexView'
import FinancialStatement from '../modules/financialStatement/FinancialStatement'
import GettingStarted from '../modules/gettingStarted/GettingStarted'
import HistoryList from '../modules/history/HistoryList'
import IdentityList from '../modules/identity/IdentityList'
import PartnerList from '../modules/partner/PartnerList'
import SettingsForm, { inputNames } from '../forms/Settings'
import Tasks from '../modules/task/Main'
import TimekeepingView from '../modules/timekeeping/TimekeepingView'
import TransferFundsForm from '../modules/identity/TransferFundsForm'
import UtilitiesView from '../views/UtilitiesView'
// temp
// import KeyRegistryPlayground from '../forms/KeyRegistryPlayGround'
import RewardsView from '../modules/rewards/RewardsView'
// import CrowdsaleView from '../modules/crowdsale/Crowdsale'
// utils
import TaskList from '../modules/task/TaskList'
import { rxIsRegistered } from '../utils/chatClient'
import DataStorage from '../utils/DataStorage'
import { translated } from '../utils/languageHelper'
import storage from '../utils/storageHelper'
import {
    isBool,
    isSubjectLike,
    objToUrlParams,
    objWithoutKeys,
} from '../utils/utils'
import {
    getUrlParam,
    MOBILE,
    rxLayout,
    setClass,
} from '../utils/window'

const textsCap = translated({
    crowdloanTitle: 'Crowdloan DApp',

    claimKapexTitle: 'claim KAPEX',

    financialStatementTitle: 'Financial Statement',

    gettingStartedTitle: 'Getting Started',

    historyTitle: 'history',
    historySubheader: 'List of actions recently taken by you. This data is only stored locally on your computer.',

    identityTitle: 'identities',
    identitySubheader: 'Identities are like companies - and you can create as many as you like!',
    identitySubheaderDetails1: `
        In Totem, you can create multiple identities to suit your needs. 
        Identities are private, but you can choose which ones you share.
    `,
    identitySubheaderDetails2: `
        You can give each shared Identity a name, add tags, and define it any way you want, and you can associate it with partners. 
        You can think of an Identity as behaving like a company. 
        It will associate all your activities in Totem under the Identity in which it was created.
    `,
    identitySubheaderDetails3: `
        There is a default identity which is created for you when you start Totem for the first time. 
        This Identity is your master backup key and you must record the seed phrase as a backup. 
        Do not lose this phrase! It allows you to backup all your data and also to recover the data on different devices.
    `,
    identitySubheaderDetails4: `
        Other identities you create are used to manage personal or business activities. 
        Each Identity has it's own set of accounting modules. 
        To keep the information separate you can only see the activities of one identity at a time. 
        Select the identity you want to view in the top right corner of the header.
    `,
    identitySubheaderDetails5: `
        Once an Identity is stored in this list you can use it all over Totem. 
        To find out more, watch the video!
    `,

    marketplace: 'marketplace',

    partnersTitle: 'partners',
    partnersHeader: 'Partner Contact List',
    partnersSubheader: 'Manage suppliers, customers, and any other party that you have contact with in Totem.',
    partnersSubheaderDetails1: 'In Totem, a partner is anyone that you intend to interact with.',
    partnersSubheaderDetails2: `
        Each partner has one or more identities that they can share with you. 
        The best way to get someone\'s identity is to request it, which you can do using the request button.
        Simply enter their userid and click request.
    `,
    partnersSubheaderDetails3: `
        You can give each shared Partner a name, add tags, and define it any way you want.
        The table can be sorted and searched to suit your needs.
    `,
    partnersSubheaderDetails4: 'Once a partner is stored here it will become available all over Totem.',
    partnersSubheaderDetails: `
        In Totem, a partner is anyone that you intend to interact with. Each partner has one or more identities,
        that they can share with you. (See the Identities Module for more information on Identities.)
        The best way to get someone's identity is to request it, which you can do using the internal messaging service.
        Click Request, and enter the partner's User ID and hopefully they will share one with you.
        You can give each shared Partner Identity a new name, add tags, and define it any way you want.
        Once a partner is stored in this list you can use it all over Totem.
    `,

    projectTitle: 'activities',
    projectSubheader: 'manage activities',
    projectSubheaderDetails1: `
        You can use the activity module to account for any activity, task project.
        You can invite team members to activities or assign individuals an activity,
        manage and approve all time booked against an activity.
    `,
    projectSubheaderDetails2: 'Activities are then automatically mapped to invoices or other payments, and all accounting will be correctly posted even into your partner\'s accounts.',
    projectSubheaderDetails: `
        You can use the activity module to account for any activity, task project.
        You can invite team members to activities or assign individuals an activity, manage and approve all time booked against an activity. 
        Activities are then automatically mapped to invoices or other payments, and all accounting will be correctly posted even into your partners' accounts.
    `,

    refereceRates: 'Reference Rates',

    rewards: 'rewards',

    tasksTitle: 'tasks',
    tasksSubheader: 'Create and manage tasks',

    timekeepingTitle: 'timekeeping',
    timekeepingSubheader: 'Manage timekeeping against activities that you have been invited to, or that you have created yourself.',

    transferTitle: 'transfer',
    transferHeader: 'Transfer Funds',
    transferSubheader: 'Make payments to anyone in your partners list',
    transferSubheaderDetails: 'Use this module to make payments in any currency using the Totem Network. No matter which currency you use, payments will be converted automatically and instantly to any other currency.',

    invoicesTitle: 'Manage Invoices',
    creditNoteTitle: 'Credit Note',
    purchaseOrderTitle: 'Purchase Order',
    manageOrderTitle: 'Manage Orders',
    expenseTitle: 'expense',
    disputedItemsTitle: 'Disputed Items',
    editAccountingTitle: 'Edit Accounting',
    productsTitle: 'products',
    settingsTitle: 'settings',
    utilitiesTitle: 'utilities',
    utilitiesSubheader: 'blockchain utilities',
}, true)[1]
// store items' "active" status in the localStorage
const MODULE_KEY = 'sidebar'
const rw = value => storage.settings.module(MODULE_KEY, value)
const settings = rw() || {} //initial settings
// in-memory storage. However, values are automatically stored to the settings, on change.
const statuses = new DataStorage(
    null,
    null,
    new Map(settings.items),
    // whenever value changes save to localStorage
    map => rw({ items: Array.from(map) })
)
export const rxAllInactive = new BehaviorSubject(false)
export const rxSidebarState = new BehaviorSubject({
    ...settings.status,
    visible: rxLayout.value !== MOBILE,
})

export const setSidebarState = (collapsed, visible) => {
    const prev = { ...rxSidebarState.value }
    const isMobile = rxLayout.value === MOBILE
    // force expand on mobile mode
    collapsed = !isMobile && collapsed
    // always visible when not on mobile mode
    visible = !isMobile || visible
    const changed = prev.collapsed !== collapsed
        || prev.visible !== visible
    changed && rxSidebarState.next({ collapsed, visible })
}

export const toggleSidebarState = () => {
    let { collapsed, visible } = rxSidebarState.value
    setSidebarState(!collapsed, !visible)
}
const gsName = 'getting-started'
const sidebarItemNames = []
export const sidebarItems = [
    {
        content: GettingStarted,
        // headerDividerHidden: true,
        icon: 'play circle outline',
        name: gsName,
        title: textsCap.gettingStartedTitle,
    },
    {
        anchorStyle: { background: 'deeppink' },
        anchorStyleActive: { background: undefined },
        content: ClaimKAPEXForm,
        contentProps: { style: { maxWidth: 600 } },
        icon: 'gift',
        name: 'claim-kapex',
        title: textsCap.claimKapexTitle,
    },
    // {
    //     content: KeyRegistryPlayground,
    //     icon: 'play circle outline',
    //     hidden: true,
    //     name: 'key-registry',
    //     title: 'Key Registry Playground'
    // },
    // {
    //     hidden: true,
    //     content: LedgerTransactionList,
    //     icon: 'object group outline',
    //     subHeader: '',
    //     title: 'Overview',
    // },
    {
        content: IdentityList,
        icon: 'id badge outline',
        name: 'identities',
        subHeader: textsCap.identitySubheader,
        subHeaderDetails: (
            <div>
                <p>{textsCap.identitySubheaderDetails1}</p>
                <p>{textsCap.identitySubheaderDetails2}</p>
                <p>{textsCap.identitySubheaderDetails3}</p>
                <p>{textsCap.identitySubheaderDetails4}</p>
                <p>{textsCap.identitySubheaderDetails5}</p>
            </div>
        ),
        title: textsCap.identityTitle,
    },
    {
        content: PartnerList,
        icon: 'users',
        header: textsCap.partnersHeader,
        name: 'partners',
        subHeader: textsCap.partnersSubheader,
        subHeaderDetails: (
            <div>
                <p>{textsCap.partnersSubheaderDetails1}</p>
                <p>{textsCap.partnersSubheaderDetails2}</p>
                <p>{textsCap.partnersSubheaderDetails3}</p>
                <p>{textsCap.partnersSubheaderDetails4}</p>
            </div>
        ),
        title: textsCap.partnersTitle,
    },
    {
        content: ActivityList,
        // headerDividerHidden: true,
        icon: 'briefcase',
        name: 'activities',
        subHeader: textsCap.projectSubheader,
        subHeaderDetails: (
            <div>
                <p>{textsCap.projectSubheaderDetails1}</p>
                <p>{textsCap.projectSubheaderDetails2}</p>
            </div>
        ),
        title: textsCap.projectTitle,
    },
    {
        content: TimekeepingView,
        icon: 'clock outline',
        name: 'timekeeping',
        settings: () => (
            <SettingsForm {...{
                // only show timekeeping settings
                inputsHidden: Object
                    .values(inputNames)
                    .filter(x => x !== inputNames.timekeeping),
                style: { maxWidth: 350 }
            }} />
        ),
        subHeader: textsCap.timekeepingSubheader,
        title: textsCap.timekeepingTitle,
    },
    {
        content: Tasks,
        icon: 'tasks',
        name: 'tasks',
        title: textsCap.tasksTitle,
        subHeader: textsCap.tasksSubheader,
    },
    {
        content: TaskList,
        contentProps: {
            type: 'marketplace'
        },
        // href: `${window.location.protocol}//${window.location.host}/?module=tasks&tab=marketplace`,
        icon: 'shop',
        name: 'marketplace',
        // onClick: e => {
        //     e.preventDefault()
        //     const item = setContentProps(
        //         'tasks',
        //         { tab: 'marketplace' },)
        //     console.log({ item })
        // },
        target: '_blank',
        title: textsCap.marketplace,
    },
    {
        content: TransferFundsForm,
        contentProps: { style: { maxWidth: 450 } },
        icon: 'send',
        header: textsCap.transferHeader,
        name: 'transfer',
        subHeader: textsCap.transferSubheader,
        subHeaderDetails: textsCap.transferSubheaderDetails,
        title: textsCap.transferTitle,
    },
    {
        content: FinancialStatement,
        icon: 'list alternate outline',
        name: 'financial-statement',
        title: textsCap.financialStatementTitle,
    },
    {
        content: AssetFormView,
        icon: 'money bill alternate outline',
        name: 'reference-rates',
        title: textsCap.refereceRates,
    },
    // {
    //     icon: 'file alternate',
    //     title: 'Invoice',
    //     subHeader: '',
    //     active: false,
    //     content: <Invoice />,
    // },
    // {
    //     icon: 'file alternate',
    //     name: 'invoices',
    //     title: textsCap.invoicesTitle,
    // },
    // {
    //     icon: 'file alternate outline',
    //     name: 'credit-note',
    //     title: textsCap.creditNoteTitle,
    // },
    // {
    //     icon: 'exchange',
    //     name: 'purchase-order',
    //     title: textsCap.purchaseOrderTitle,
    // },
    // {
    //     icon: 'inbox',
    //     name: 'manage-orders',
    //     title: textsCap.manageOrderTitle,
    // },
    // {
    //     icon: 'cc mastercard',
    //     name: 'expense',
    //     title: textsCap.expenseTitle,
    // },
    // {
    //     icon: 'exclamation circle',
    //     name: 'disputed-items',
    //     title: textsCap.disputedItemsTitle,
    // },
    // {
    //     icon: 'chart bar outline',
    //     name: 'edit-accounting',
    //     title: textsCap.editAccountingTitle,
    // },
    // {
    //     icon: 'lightbulb',
    //     name: 'products',
    //     title: textsCap.productsTitle,
    // },
    {
        content: HistoryList,
        icon: 'history',
        name: 'history',
        settings: () => (
            <SettingsForm {...{
                // only show timekeeping settings
                inputsHidden: Object
                    .values(inputNames)
                    .filter(x => x !== inputNames.historyLimit),
                style: { maxWidth: 350 }
            }} />
        ),
        title: textsCap.historyTitle,
        subHeader: textsCap.historySubheader
    },
    {
        content: props => <SettingsForm {...props} />,
        contentProps: { style: { maxWidth: 350 } },
        icon: 'cogs',
        name: 'settings',
        title: textsCap.settingsTitle,
    },
    {
        content: UtilitiesView,
        icon: 'stethoscope',
        name: 'utilities',
        subHeader: textsCap.utilitiesSubheader,
        title: textsCap.utilitiesTitle,
    },
    {
        href: `${window.location.protocol}//${window.location.host}/crowdloan`,
        icon: 'rocket',
        name: 'crowdloan',
        target: '_blank',
        title: (
            <span>
                {textsCap.crowdloanTitle} <Icon name='forward mail' />
            </span>
        ),
        titleStr: textsCap.crowdloanTitle,
    },
    {
        content: RewardsView,
        icon: 'gift',
        name: 'rewards',
        title: textsCap.rewards,
    },
].map(item => {
    const {
        active = false,
        contentProps = {},
        rxTrigger = new BehaviorSubject(uuid.v1()),
        title,
        // use title if name not provided
        name = title
    } = item
    const activeX = statuses.get(name)
    sidebarItemNames.push(name)
    return {
        ...item,
        active: isBool(activeX)
            ? activeX
            : active,
        contentProps,
        elementRef: React.createRef(),
        name,
        // used for auto scrolling to element
        rxTrigger,
    }
})

export const findItem = name => sidebarItems.find(x => x.name === name)
export const getItem = name => findItem(name)

export const setActive = (name, active = true, contentProps, hidden, toggle = true) => {
    const item = findItem(name)
    if (!item) return

    const activeChanged = !!active !== !!item.active
    item.active = active
    item.hidden = isBool(hidden)
        ? hidden
        : item.hidden
    item.contentProps = { ...item.contentProps, ...contentProps }
    statuses.set(name, active)
    item.rxTrigger.next(uuid.v1())
    const allInactive = sidebarItems
        .every(({ active, hidden }) => !active || hidden)
    rxAllInactive.next(allInactive)

    const isMobile = rxLayout.value === MOBILE
    toggle && isMobile && activeChanged && setSidebarState(false, false)
    scrollTo(name)
    return item
}

/**
 * @name    setActiveExclusive
 * @summary set active status for specified modules and reverse all other modules
 * 
 * @param   {Array}     names   module names
 * @param   {Boolean}   active  whether to show/hide modules.
 *                              Default: `true`
 */
export const setActiveExclusive = (names = [], active = true, contentProps = {}) => {
    const items = []
    sidebarItems.forEach(({ name }) => {
        const _active = names.includes(name) && !!active
        const item = setActive(name, _active, contentProps)
        if (names.includes(name)) items.push(item)
    })
    return items
}

export const setContentProps = (name, props = {}, scrollToItem = true) => {
    const item = findItem(name)
    if (!item) return

    if (!item.active) return setActive(name, true, props)
    Object
        .keys(props)
        .forEach(key =>
            item.contentProps[key] = props[key]
        )
    isSubjectLike(item.rxTrigger)
        && item.rxTrigger.next(uuid.v1())

    scrollToItem && scrollTo(name)
    return item
}

export const scrollTo = name => {
    const item = getItem(name)
    const activeItems = sidebarItems.filter(x => !x.hidden && x.active).length
    if (!item || !item.active || item.hidden || activeItems === 1) return
    // Scroll down to the content segment if more than one item active
    setTimeout(() => {
        const elRef = item.elementRef
        if (!elRef || !elRef.current) return
        document.getElementById('main-content')
            .scrollTo(elRef.current.offsetLeft, elRef.current.offsetTop - 15)
    }, 100)

    return item
}

export const toggleActive = name => setActive(name, !(getItem(name) || {}).active)

const init = () => {
    // adds new and removes any deprecated items
    const sanitisedStatuses = sidebarItems.reduce((map, { active, name }) =>
        map.set(name, active),
        new Map(),
    )
    const changed = JSON.stringify(statuses.toArray()) !== JSON.stringify(Array.from(sanitisedStatuses))
    changed && statuses.setAll(sanitisedStatuses, true)
    // if all items are inactive show getting started module
    sidebarItems.every(x => x.hidden || !x.active) && setActive(gsName, true, null, null, false)
    // update sidebar state on layout change
    rxLayout.subscribe(() => {
        const { collapsed, visible } = rxSidebarState.value || {}
        setSidebarState(collapsed, visible)
    })
    // automatically save to the settings storage
    // save to local storage to preseve state
    rxSidebarState.subscribe(() => {
        const { collapsed, visible } = rxSidebarState.value
        setClass('body', {
            'sidebar-visible': visible,
            'sidebar-collapsed': collapsed,
        })

        if (!rxSidebarState.ignoredFirst) {
            rxSidebarState.ignoredFirst = true
            return
        }

        rw({ status: rxSidebarState.value })
    })
}

setTimeout(() => {
    init()
    if (rxIsRegistered.value) {
        let params = getUrlParam()
        const modules = `${params.module || ''}`
            .trim()
            .toLowerCase()
        const exclusive = `${params.exclusive}`.toLowerCase() !== 'false'
        if (!modules) return
        const names = modules.split(',')
            .map(x => x.trim().toLowerCase())
        const items = exclusive
            ? setActiveExclusive(names, true, params)
            : names.map(name =>
                setActive(name, true, params)
            )
        if (!items.filter(Boolean).length) return

        // only reset URL if exclusive
        if (!exclusive) return

        params = objToUrlParams(
            objWithoutKeys(
                params,
                ['module', 'exclusive'],
            )
        )
        const url = [
            location.protocol,
            '//',
            location.host,
            params && '?',
            params
        ]
            .filter(Boolean)
            .join('')
        history.pushState({}, null, url)
    }
})
export default {
    getItem,
    setActive,
    setActiveExclusive,
    setContentProps,
    scrollTo,
    setSidebarState,
    rxAllInactive,
    rxSidebarState,
    toggleActive,
    toggleSidebarState,
}
import React from 'react'
import uuid from 'uuid'
import { Bond } from 'oo7'
// Components
import GettingStarted from '../views/GettingStartedView'
import HistoryList from '../lists/HistoryList'
import IdentityList from '../lists/IdentityList'
import PartnerList from '../lists/PartnerList'
import ProjectList from '../lists/ProjectList'
import SettingsView from '../views/SettingsView'
import TimeKeepingView from '../views/TimeKeepingView'
import TransferForm from '../forms/Transfer'
import UtilitiesView from '../views/UtilitiesView'
// temp
import KeyRegistryPlayground from '../forms/KeyRegistryPlayGround'
// utils
import DataStorage from '../utils/DataStorage'
import { isBool, isBond } from '../utils/utils'
import { findInput as findItem } from '../components/FormBuilder'
// services
import { translated } from './language'
import { getLayout, layoutBond } from './window'

// const [words, wordsCap] = translated({
// }, true)
const [texts] = translated({
    gettingStartedTitle: 'Getting Started',
    historyTitle: 'History',
    historySubheader: 'History List of actions recently taken by you. This data is only stored locally on your computer.',
    identityTitle: 'Identities',
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
    identitySubheaderDetails5: 'Once an Identity is stored in this list you can use it all over Totem. To find out more, watch the video!',
    partnersTitle: 'Partners',
    partnersHeader: 'Partner Contact List',
    partnersSubheader: 'Manage suppliers, customers, and any other party that you have contact with in Totem.',
    partnersSubheaderDetails1: `In Totem, a partner is anyone that you intend to interact with.`,
    partnersSubheaderDetails2: `Each partner has one or more identities that they can share with you. The best way to get 
        someone\'s identity is to request it, which you can do using the request button. Simply enter their userid and click request.`,
    partnersSubheaderDetails3: `You can give each shared Partner a name, add tags, and define it any way you want. The table can be sorted and searched to suit your needs.`,
    partnersSubheaderDetails4: `Once a partner is stored here it will become available all over Totem.`,
    partnersSubheaderDetails: `
        In Totem, a partner is anyone that you intend to interact with. Each partner has one or more identities,
        that they can share with you. (see the Identities Module for more information on Identities.)
        The best way to get someone's identity is to request it, which you can do using the internal messaging service.
        Click Request, and enter the partner's User ID and hopefully they will share one with you.
        You can give each shared Partner Identity a new name, add tags, and define it any way you want.
        Once a partner is stored in this list you can use it all over Totem.
    `,
    projectTitle: 'Activities',
    projectSubheader: 'Manage activities',
    projectSubheaderDetails1: `You can use the activity module to account for any activity, task project. You can invite team members to activities or assign individuals an activity, manage and approve all time booked against an activity.`,
    projectSubheaderDetails2: `Activities are then automatically mapped to invoices or other payments, and all accounting will be correctly posted even into your partner\'s accounts.`,
    projectSubheaderDetails: `
        You can use the activity module to account for any activity, task project.
        You can invite team members to activities or assign individuals an activity, manage and approve all time booked against an activity. 
        Activities are then automatically mapped to invoices or other payments, and all accounting will be correctly posted even into your partners' accounts.
    `,
    timekeepingTitle: 'Timekeeping',
    timekeepingSubheader: 'Manage timekeeping against activities that you have been invited to, or that you have created yourself.',

    transferTitle: 'Transfer',
    transferHeader: 'Transfer Transactions',
    transferSubheader: 'Transfer transaction between your Identities and  Partners.',
    transferSubheaderDetails: 'You can use the transfer module to send some of your transaction balance to other parties on the Totem Network.',
    invoicesTitle: 'Manage Invoices',
    creditNoteTitle: 'Credit Note',
    purchaseOrderTitle: 'Purchase Order',
    manageOrderTitle: 'Manage Orders',
    expenseTitle: 'Expense',
    disputedItemsTitle: 'Disputed Items',
    editAccountingTitle: 'Edit Accounting',
    productsTitle: 'Products',
    settingsTitle: 'Settings',
    utilitiesTitle: 'Utilities',
    utilitiesSubheader: 'Blockchain utilities',
})

// store items' "active" status in the localStorage
const statuses = new DataStorage('totem_sidebar-items-status')
export const allInactiveBond = new Bond().defaultTo(false)
export const sidebarStateBond = new Bond().defaultTo({
    collapsed: false,
    visible: getLayout() !== 'mobile',
})
export const setSidebarState = (collapsed, visible) => {
    const lastState = sidebarStateBond._value
    const isMobile = getLayout() === 'mobile'
    // force expand on mobile mode
    collapsed = !isMobile && collapsed
    // always visible when not on mobile mode
    visible = !isMobile || visible
    // state hasn't changed
    if (lastState.collapsed === collapsed && lastState.visible === visible) return
    sidebarStateBond.changed({ collapsed, visible })
    // set class
    const classNames = {
        'sidebar-visible': visible,
        'sidebar-collapsed': collapsed,
    }
    setTimeout(() => {
        const { classList } = document.querySelector('#app > .wrapper') || {}
        classList && Object.keys(classNames).forEach(key => classList[classNames[key] ? 'add' : 'remove'](key))
    })
}
export const toggleSidebarState = () => {
    const { collapsed, visible } = sidebarStateBond._value
    setSidebarState(!collapsed, !visible)
}
// update sidebar state on layout change
layoutBond.tie(() => {
    const { collapsed, visible } = sidebarStateBond._value || {}
    setSidebarState(collapsed, visible)
})
const gsName = 'getting-started'
const sidebarItemNames = []
export const sidebarItems = [
    {
        active: true,
        content: GettingStarted,
        // headerDividerHidden: true,
        icon: 'play circle outline',
        name: gsName,
        title: texts.gettingStartedTitle,
    },
    {
        content: KeyRegistryPlayground,
        icon: 'play circle outline',
        hidden: true,
        name: 'key-registry',
        title: 'Key Registry Playground'
    },
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
        subHeader: texts.identitySubheader,
        subHeaderDetails: (
            <div>
                <p>{texts.identitySubheaderDetails1}</p>
                <p>{texts.identitySubheaderDetails2}</p>
                <p>{texts.identitySubheaderDetails3}</p>
                <p>{texts.identitySubheaderDetails4}</p>
                <p>{texts.identitySubheaderDetails5}</p>
            </div>
        ),
        title: texts.identityTitle,
    },
    {
        content: PartnerList,
        icon: 'users',
        header: texts.partnersHeader,
        name: 'partners',
        subHeader: texts.partnersSubheader,
        subHeaderDetails: (
            <div>
                <p>{texts.partnersSubheaderDetails1}</p>
                <p>{texts.partnersSubheaderDetails2}</p>
                <p>{texts.partnersSubheaderDetails3}</p>
                <p>{texts.partnersSubheaderDetails4}</p>
            </div>
        ),
        title: texts.partnersTitle,
    },
    {
        content: ProjectList,
        // headerDividerHidden: true,
        icon: 'tasks',
        name: 'projects',
        subHeader: texts.projectSubheader,
        subHeaderDetails: (
            <div>
                <p>{texts.projectSubheaderDetails1}</p>
                <p>{texts.projectSubheaderDetails2}</p>
            </div>
        ),
        title: texts.projectTitle,
    },
    {
        content: TimeKeepingView,
        contentArgs: {},
        icon: 'clock outline',
        name: 'timekeeping',
        subHeader: texts.timekeepingSubheader,
        title: texts.timekeepingTitle,
    },
    {
        content: TransferForm,
        contentProps: { style: { maxWidth: 620 } },
        icon: 'money bill alternate outline',
        header: texts.transferHeader,
        name: 'transfer',
        subHeader: texts.transferSubheader,
        subHeaderDetails: texts.transferSubheaderDetails,
        title: texts.transferTitle,
    },
    // { icon: 'file alternate', title: 'Invoice', subHeader: '', active: false, content: <Invoice /> },
    {
        icon: 'file alternate',
        name: 'invoices',
        title: texts.invoicesTitle,
    },
    {
        icon: 'file alternate outline',
        name: 'credit-note',
        title: texts.creditNoteTitle,
    },
    {
        icon: 'exchange',
        name: 'purchase-order',
        title: texts.purchaseOrderTitle,
    },
    {
        icon: 'inbox',
        name: 'manage-orders',
        title: texts.manageOrderTitle,
    },
    {
        icon: 'cc mastercard',
        name: 'expense',
        title: texts.expenseTitle,
    },
    {
        icon: 'exclamation circle',
        name: 'disputed-items',
        title: texts.disputedItemsTitle,
    },
    {
        icon: 'chart bar outline',
        name: 'edit-accounting',
        title: texts.editAccountingTitle,
    },
    {
        icon: 'lightbulb',
        name: 'products',
        title: texts.productsTitle,
    },
    {
        content: HistoryList,
        icon: 'history',
        name: 'history',
        title: texts.historyTitle,
        subHeader: texts.historySubheader
    },
    {
        content: SettingsView,
        icon: 'cogs',
        name: 'settings',
        title: texts.settingsTitle,
    },
    {
        content: UtilitiesView,
        icon: 'stethoscope',
        name: 'utilities',
        subHeader: texts.utilitiesSubheader,
        title: texts.utilitiesTitle,
    }
].map(item => {
    const {
        active = false,
        // indicates contentArgs is variable and forces content to be re-rendered
        bond = new Bond().defaultTo(uuid.v1()),
        contentProps = {},
        title,
        // use title if name not provided
        name = title
    } = item
    const activeX = statuses.get(name)
    sidebarItemNames.push(name)
    return {
        ...item,
        active: isBool(activeX) ? activeX : active,
        bond,
        contentProps,
        name,
        // used for auto scrolling to element
        elementRef: React.createRef(),
    }
})

export const getItem = name => findItem(sidebarItems, name)

export const setActive = (name, active = true, contentProps, hidden) => {
    const item = findItem(sidebarItems, name)
    if (!item) return
    item.active = active
    item.hidden = isBool(hidden) ? hidden : item.hidden
    item.contentProps = { ...item.contentProps, ...contentProps }
    statuses.set(name, active)
    item.bond.changed(uuid.v1())
    allInactiveBond.changed(sidebarItems.every(({ active, hidden }) => !active || hidden))

    scrollTo(name)
    return item
}

export const setContentProps = (name, props = {}, scrollToItem = true) => {
    const item = findItem(sidebarItems, name)
    if (!item) return

    if (!item.active) return setActive(name, true, props)
    Object.keys(props).forEach(key => item.contentProps[key] = props[key])
    isBond(item.bond) && item.bond.changed(uuid.v1())

    scrollToItem && scrollTo(name)
    return item
}

export const scrollTo = name => {
    const item = getItem(name)
    const activeItems = sidebarItems.filter(({ active, hidden }) => !hidden && active).length
    if (!item || !item.active || item.hidden || activeItems === 1) return
    // Scroll down to the content segment if more than one item active
    setTimeout(() => {
        const elRef = item.elementRef
        if (!elRef || !elRef.current) return
        document.getElementById('main-content').scrollTo(0,
            elRef.current.offsetTop - 15
        )
    }, 100)
    return item
}

export const toggleActive = name => setActive(name, !(getItem(name) || {}).active)

// store/replace localStorage data
// adds new and removes any item that's no longer being used (eg: name changed)
statuses.setAll(sidebarItems.reduce((map, { active, name }) => map.set(name, active), new Map()))
// if all items are inactive show getting started module
sidebarItems.every(x => x.hidden || !x.active) && setActive(gsName)

export default {
    allInactiveBond,
    getItem,
    setActive,
    setContentProps,
    scrollTo,
    setSidebarState,
    sidebarStateBond,
    toggleActive,
    toggleSidebarState,
}
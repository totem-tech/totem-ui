import React from 'react'
import DataStorage from '../utils/DataStorage'
// Components
import TransferForm from '../forms/Transfer'
import IdentityList from '../lists/IdentityList'
import PartnerList from '../lists/PartnerList'
import ProjectList from '../lists/ProjectList'
import GettingStarted from '../views/GettingStartedView'
import UtilitiesView from '../views/UtilitiesView'
import TimeKeepingView from '../views/TimeKeepingView'
// temp
import KeyRegistryPlayground from '../forms/KeyRegistryPlayGround'
import { isBool } from '../utils/utils'
import { findInput as findItem } from '../components/FormBuilder'

const statuses = new DataStorage('totem_sidebar-items-status')

export const setActive = (name, active = true, hidden) => {
    const item = findItem(sidebarItems, name)
    if (!item) return
    item.active = active
    item.hidden = isBool(hidden) ? hidden : item.hidden
    statuses.set(name, active)
    return item
}
export const setContentProps = (name, props) => (findItem(sidebarItems, name) || {}).contentProps = props
export const gsName = 'getting-started'
export const sidebarItems = [
    {
        active: true,
        content: GettingStarted,
        // headerDividerHidden: true,
        icon: 'play circle outline',
        name: gsName,
        title: 'Getting Started',
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
        subHeader: 'Manage your Identities',
        subHeaderDetails: (
            <div>
                In Totem, you can create multiple identites to suit your needs. Identities are private, but you can choose which ones you share
                There is a default identity which is created for you when you start Totem for the first time. This Identity is your master backup key
                and you must not lose this. It allows you to backup all your data and also to recover the data on different devices.
                The other identities you create are used to manage personal or business activities. Each Identity has it's own set of accounting modules,
                so this means that you can only see the activities of one identity at a time. You can think of an Identity like running a company, grouping things together
                You can give each shared Identity a name, add tags, and define it any way you want, and you can associate it with partners.
                Once a identity is stored in this list you can use it all over Totem. To find out more, watch the video!
            </div>
        ),
        title: 'Identities',
    },
    {
        content: PartnerList,
        icon: 'users',
        header: 'Partner Contact List',
        name: 'partners',
        subHeader: 'Manage suppliers or customers, or any other party that you have contact with in Totem.',
        subHeaderDetails:
            'In Totem, a partner is anyone that you intend to interact with. Each partner has one or more identities,\n ' +
            'that they can share with you. (see the Identities Module for more information on Identities.) \n ' +
            'The best way to get someone\'s identity is to request it, which you can do using the internal messaging service. \n' +
            'Click Request, and enter the partner\'s userID and hopefully they will share one with you. \n' +
            'You can give each shared Partner Identity a new name, add tags, and define it any way you want. \n' +
            'Once a partner is stored in this list you can use it all over Totem.',
        title: 'Partners',
    },
    {
        content: ProjectList,
        headerDividerHidden: true,
        icon: 'tasks',
        name: 'projects',
        subHeader: 'Manage projects.',
        subHeaderDetails:
            'You can use the project module to account for individual tasks as well as projects. You can invite team members to projects or assign individuals tasks, manage and approve \n' +
            'all time booked against a task/project. Projects and tasks are then automatically mapped to invoices or other payments, and all accounting will be correctly posted, without you \n' +
            'needing to do anything else.',
        title: 'Project Module',
    },
    {
        content: TimeKeepingView,
        icon: 'clock outline',
        name: 'timekeeping',
        subHeader: 'Manage timekeeping against projects and tasks.',
        title: 'Timekeeping',
    },
    {
        content: TransferForm,
        contentProps: { style: { maxWidth: 620 } },
        icon: 'money bill alternate outline',
        header: 'Transfer Transaction Allocations',
        name: 'transfer',
        subHeader: 'Use this module to send your transaction allocations to \n another Identity. You can send to any Identity on the network, including your own',
        title: 'Transfer',
    },
    // { icon: 'file alternate', title: 'Invoice', subHeader: '', active: false, content: <Invoice /> },
    {
        icon: 'file alternate',
        name: 'invoices',
        title: 'Manage Invoices',
    },
    {
        icon: 'file alternate outline',
        name: 'credit-note',
        title: 'Credit Note',
    },
    {
        icon: 'exchange',
        name: 'purchase-order',
        title: 'Purchase Order',
    },
    {
        icon: 'inbox',
        name: 'manage-orders',
        title: 'Manage Orders',
    },
    {
        icon: 'cc mastercard',
        name: 'expense',
        title: 'Expense',
    },
    {
        icon: 'exclamation circle',
        name: 'disputed-items',
        title: 'Disputed Items',
    },
    {
        icon: 'chart bar outline',
        name: 'edit-accounting',
        title: 'Edit Accounting',
    },
    {
        icon: 'lightbulb',
        name: 'products',
        title: 'Products',
    },
    {
        icon: 'cogs',
        name: 'settings',
        title: 'Settings',
    },
    {
        content: UtilitiesView,
        icon: 'stethoscope',
        name: 'utilities',
        subHeader: 'Blockchain utilities',
        // subHeaderDetails: 'This is a sample detailed subheader', // for extra information that extends subHeader
        title: 'Utilities',
    }
].map(item => {
    const {
        active = false,
        title,
        // use title if name not provided
        name = title
    } = item
    const activeX = statuses.get(name)
    return {
        ...item,
        active: isBool(activeX) ? activeX : active,
        name,
        elementRef: React.createRef(),
    }
})

// store/replace localStorage data
// adds new and removes any item that's no longer being used (eg: name changed)
statuses.setAll(sidebarItems.reduce((map, { active, name }) => map.set(name, active), new Map()))
// if all items are inactive show getting started module
sidebarItems.every(x => x.hidden || !x.active) && setActive(gsName)
// not ready

import DataStorage from '../utils/DataStorage'

// Sidebar Item Content components
import GettingStarted from './components/GettingStartedView'
import SendFundsView from './views/SendFundsView'
import UtilitiesView from './views/UtilitiesView'
import IdentitiesView from './views/WalletView'
import TimeKeepingView from './views/TimeKeepingView'
import PartnerList from './lists/PartnerList'
import ProjectList from './lists/ProjectList'
import { isBool, isObj } from '../utils/utils'
const sidebarItemStatus = new DataStorage('totem_sidebarItemStatus')
const sidebarItems = [
    {
        active: false,
        content: <GettingStarted />,
        headerDividerHidden: true,
        icon: "play circle outline",
        title: "Getting Started"
    },
    // { icon: "object group outline", title: "Overview", subHeader: "", active: true, content: <LedgerTransactionList />},
    {
        icon: "users", title: "Partners",
        header: "Vendors and Customers",
        subHeader: "Store, manage, request and share partner identities",
        active: true,
        content: <PartnerList />
    },
    // { icon: "file alternate", title: "Invoice", subHeader: "", active: false, content: <Invoice /> },
    { icon: "file alternate", title: "Manage Invoices", subHeader: "" },
    { icon: "file alternate outline", title: "Credit Note", subHeader: "" },
    { icon: "exchange", title: "Purchase Order", subHeader: "" },
    { icon: "inbox", title: "Manage Orders", subHeader: "" },
    { icon: "cc mastercard", title: "Expense", subHeader: "" },
    { icon: "exclamation circle", title: "Disputed Items", subHeader: "" },
    { icon: "chart bar outline", title: "Edit Accounting", subHeader: "" },
    {
        active: false,
        content: <ProjectList />,
        headerDividerHidden: true,
        icon: "tasks",
        title: "Projects",
        subHeader: "View and/or manage your projects"
    },
    {
        active: false,
        content: <TimeKeepingView />,
        icon: "clock outline",
        subHeader: "Manage timekeeping against projects and tasks. You can create projects and tasks for yourself, or others can assign them to you.",
        title: "Timekeeping",
    },
    { icon: "lightbulb", title: "Products", subHeader: "" },
    {
        icon: "money bill alternate outline",
        title: "Payment",
        header: "Direct payments",
        subHeader: "Send funds from your account to another",
        active: false,
        content: <SendFundsView />
    },
    {
        icon: "id badge outline",
        title: "Identities",
        subHeader: "Manage your Identity keys",
        active: true,
        content: <IdentitiesView />
    },
    {
        active: false,
        icon: "stethoscope",
        title: "Utilities",
        subHeader: "Blockchain utilities",
        // subHeaderDetails: 'This is a sample detailed subheader', // for extra information that extends subHeader
        content: <UtilitiesView />
    },
    { icon: "cogs", title: "Settings", subHeader: "" }
]

// const setActive = (item, active) => {
//     const { active: activeOriginal, title } = item
//     if (isBool(active)) {
//         item.active = active
//     } 
//     // (item.children || []).forEach((child) => setStatus(child, null))
// }

// sidebarItems.forEach()

/************************* 
 * 
 * Use arrow on the right side as trigger to show child items
 * show arrow only on hover
 * 'active' => item's content is visible
 * 'open' => submenu visible
 * 
 * show submenu below or right (outside sidebar)????????????????
 * %%%%%%%%%%%%%%%%%%%%%%%%%% initial discussion
 * Only one level submenu? (submenu below?)
 * If parent is set to active = false, all children should be too?
 * Alternative to children: use tabs inside the content segment <<<<<<========= recommended
 * Tabs might also be better for use with TimeKeeping (entries, summary)???
 * %%%%%%%%%%%%%%5
 * 
 * Tabs/menu can be places on the right side (below if mobile) of the contnet segment header left to close button
 * 
 ****************/

// example localStorage data:
const sidebarsItemStatus =
{
    GettingStarted: { active: true },
    Projects: {
        active: true,
        children: {
            WatchList: { active: false },
            Team: { active: false },
            Invitations: {
                active: true,
                TimeKeeping: { active: true },
            }
        }
    }
}

// sample setActive by using object:
const childItemExample = {
    Projects: {
        active: true,
        children: {
            // only include child items that should be changed
            Invitations: true
            // or
            // Invitations: {TimeKeeping: true}
        }
    }
}

/* or
 const setActive = ['Projects',]
*/
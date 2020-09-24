// import React, { Component } from 'react'
// import PropTypes from 'prop-types'
// import { Bond } from 'oo7'
// import { Button } from 'semantic-ui-react'
// import ContentSegment from '../components/ContentSegment'
// import CheckboxGroup from '../components/CheckboxGroup'
// // forms
// import TimeKeepingForm from '../forms/Timekeeping'
// // lists
// import TimekeepingList from '../modules/timekeeping/timekeepingList'
// import TimekeepingSummaryList from '../lists/TimekeepingSummaryList'
// // services
// import { translated } from '../services/language'
// import { showForm } from '../services/modal'
// import storage from '../services/storage'
// import { MODULE_KEY } from '../modules/timekeeping/timekeeping'
// import { layoutBond } from '../services/window'

// const [words, wordsCap] = translated({
//     archive: 'archive',
//     manage: 'manage',
//     overview: 'overview',
//     summary: 'summary',
//     timer: 'timer',
//     unknown: 'unknown'
// }, true)
// const [texts] = translated({
//     createProjectOrRequestInvite: `Create a new activity or request to be invited to some else's activity`,
//     manageTeamTime: 'Manage team records',
//     manageArchive: 'Team records archive',
//     myRecords: 'My records',
//     myRecordsArchive: 'My records archive',
//     myTimeKeepingSummary: 'My timekeeping overview',
//     selectAProject: 'Select a activity',
// })
// const rw = value => storage.settings.module(MODULE_KEY, value) || {}
// export default class TimekeepingView extends Component {
//     constructor(props) {
//         super(props)

//         const style = { textAlign: 'left' }
//         this.state = {
//             optionsInput: {
//                 bond: new Bond(),
//                 multiple: true,
//                 name: 'option',
//                 onChange: (_, { value: viewOptions }) => {
//                     this.setState({ viewOptions })
//                     // update local storage with module settings
//                     rw({ viewOptions })
//                 },
//                 toggle: true,
//                 options: [
//                     { label: wordsCap.overview, style, value: 'summary' },
//                     { label: texts.myRecords, style, value: 'records' },
//                     { label: texts.manageTeamTime, style, value: 'manage' },
//                     { label: texts.myRecordsArchive, style, value: 'records-archive' },
//                     { label: texts.manageArchive, style, value: 'manage-archive' },
//                 ],
//                 style: { display: 'inline', paddingTop: 7, textAlign: 'center' },
//                 value: props.viewOptions,
//             },
//             timerButton: {
//                 active: false,
//                 content: wordsCap.timer,
//                 icon: 'clock outline',
//                 key: 'timer',
//                 onClick: () => showForm(TimeKeepingForm, { projectHash: this.props.projectHash }),
//                 style: { display: 'inline' }
//             },
//             viewOptions: props.viewOptions
//         }
//         this.originalSetState = this.setState
//         this.setState = (s, cb) => this._mounted && this.originalSetState(s, cb)
//     }

//     componentWillMount() {
//         this._mounted = true
//         this.tieIdLayout = layoutBond.tie(layout => this.setState({ isMobile: layout === 'mobile' }))
//     }
//     componentWillUnmount() {
//         this._mounted = false
//         layoutBond.untie(this.tieIdLayout)
//     }

//     render() {
//         const { isMobile, optionsInput, timerButton, viewOptions } = this.state
//         const showSummary = viewOptions.includes('summary')
//         const manage = viewOptions.includes('manage')
//         const records = viewOptions.includes('records')
//         const recordsArchive = viewOptions.includes('records-archive')
//         const manageArchive = viewOptions.includes('manage-archive')
//         optionsInput.inline = !isMobile
//         let hideTimer = true
//         const contents = [
//             showSummary && {
//                 content: TimekeepingSummaryList,
//                 header: texts.myTimeKeepingSummary,
//             },
//             records && {
//                 content: TimekeepingList,
//                 contentProps: { hideTimer },
//                 header: texts.myRecords,
//             },
//             manage && {
//                 content: TimekeepingList,
//                 contentProps: { hideTimer, manage: true },
//                 header: texts.manageTeamTime,
//             },
//             recordsArchive && {
//                 content: TimekeepingList,
//                 contentProps: { archive: true, hideTimer },
//                 header: texts.myRecordsArchive,
//             },
//             manageArchive && {
//                 content: TimekeepingList,
//                 contentProps: { archive: true, hideTimer, manage: true },
//                 header: texts.manageArchive,
//             },
//         ].filter(Boolean)


//         // if (showSummary) contents.push({
//         //     content: <TimekeepingSummaryList />,
//         //     header: texts.myTimeKeepingSummary,
//         //     key: `TimekeepingSummaryList`,
//         // })
//         // if (records) contents.push({
//         //     content: <TimekeepingList {...{ hideTimer }} />,
//         //     header: texts.myRecords,
//         //     key: 'TimekeepingList-records' + hideTimer,
//         // })
//         // if (manage) contents.push({
//         //     content: <TimekeepingList {...{ hideTimer, manage: true }} />,
//         //     header: texts.manageTeamTime,
//         //     key: 'TimekeepingList-manage' + hideTimer,
//         // })
//         // if (recordsArchive) contents.push({
//         //     content: <TimekeepingList {...{ archive: true, hideTimer }} />,
//         //     header: texts.myRecordsArchive,
//         //     key: 'TimekeepingList-records-archive' + hideTimer,
//         // })
//         // if (manageArchive) contents.push({
//         //     content: <TimekeepingList {...{ archive: true, hideTimer, manage: true }} />,
//         //     header: texts.manageArchive,
//         //     key: 'TimekeepingList-manage-archive' + hideTimer,
//         // })

//         return (
//             <div>
//                 <Button {...timerButton} />
//                 <CheckboxGroup {...optionsInput} />
//                 {contents.map(item => (
//                     <ContentSegment {...{
//                         ...item,
//                         active: true,
//                         basic: true,
//                         headerTag: 'h3',
//                         key: JSON.stringify({ ...item.contentProps, header: item.header }),
//                         style: { padding: 0 },
//                     }}
//                     />
//                 ))}
//             </div>
//         )
//     }
// }
// TimekeepingView.propTypes = {
//     viewOptions: PropTypes.array.isRequired,
// }
// TimekeepingView.defaultProps = {
//     viewOptions: rw().viewOptions || ['records']
// }
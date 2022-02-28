import React, { useState } from 'react'
import PropTypes from 'prop-types'
import { BehaviorSubject } from 'rxjs'
import FormBuilder, { fillValues, findInput } from '../../components/FormBuilder'
import { MOBILE, rxLayout } from '../../services/window'
import { translated } from '../../utils/languageHelper'
import storage, { backup } from '../../utils/storageHelper'
import { iUseReducer } from '../../utils/reactHelper'
import { deferred, generateHash, isFn } from '../../utils/utils'

const [texts, textsCap] = translated({
    backupLater: 'backup later',
    backupNow: 'backup now',
    backupConfirmHeader: 'confirm backup',
    backupFileInvalid: `
		Uploaded file contents do not match the backup file contents!
		If you did not save the backup file, please click on the close icon and initiate the backup process again.
	`,
    backupFileinvalidType: 'please select the .json file you have just downloaded',
    backupFileLabel: 'select backup file',
    backupFileLabelDetails: 'Please select the file you have just downloaded. This is to make sure your backup was successfully downloaded.',
    backupFileLabelDetailsLocation: 'Check for the following file in your default downloads folder (if you have NOT manually selected the download location).',
    backupFileLabelDetailsDesktop: 'You can drag-and-drop the backup file on the file chooser below.',
    backupSuccessContent: `
		Excellent! You have just downloaded your account data. 
		You can use this file to restore your account on any other devices you choose.
		Make sure to keep the downloaded file in a safe place.
		To keep your account safe, never ever share your backup file with anyone else.
		Totem team will never ask you to share your backup file.
	`,
    backupSuccessHeader: 'backup complete!',
    close: 'close',
    confirmBackupTypes: 'history, identities, locations, notifications, partners, recent chat messages, settings, user credentials',
    confirmBackupContent: `
		You are about to download your Totem application data as a JSON file. 
		The following information will be included: 
	`,
    downloadAgain: 'download again',
    fileName: 'file name',
    invalidFileType: 'selected file name must end with .json extension.',
    header: 'backup your account',
    headerConfirmed: 'confirm backup'
}, true)
const inputNames = {
    confirmed: 'confirmed',
    downloadData: 'downloadData',
    file: 'file',
    notes: 'notes',
	redirectTo: 'redirectTo',
}
export default function BackupForm(props) {
    const [state] = iUseReducer(null, rxState => {
        const { onSubmit } = props
        const filename = backup.generateFilename()
        const isMobile = rxLayout.value === MOBILE
        const checkConfirmed = values => (values[inputNames.confirmed] || '')
            .toLowerCase() === 'yes'

        const handleConfirmChange = deferred((_, values) => {
            const isConfirmed = checkConfirmed(values)
            const downloadData = isConfirmed && backup.download(filename)
            const ddIn = findInput(inputs, inputNames.downloadData)
            // store downloaded data for confirmation
            ddIn && ddIn.rxValue.next(downloadData)

            // update form header
            const header = isConfirmed
                ? textsCap.headerConfirmed
                : textsCap.header
            rxState.next({ header })
        }, 50)

        // on file select, check if the uploaded file matches the downloaded file
        const handleFileSelected = (e, _, values) => new Promise(resolve => {
            try {
                const file = e.target.files[0]
                const name = e.target.value
                var reader = new FileReader()
                if (name && !name.endsWith('.json')) throw textsCap.invalidFileType

                reader.onload = file => {
                    const {
                        data,
                        hash,
                        timestamp,
                    } = values[inputNames.downloadData] || {}
                    const redirectTo = values[inputNames.redirectTo]
                    const hashUpload = generateHash(file.target.result)
                    const match = hash === hashUpload

                    setTimeout(() => resolve(!match && textsCap.backupFileInvalid))

                    if (!match) {
                        file.target.value = null // reset file
                        return
                    }

                    // update timestamp of identities and partners
                    backup.updateFileBackupTS(data, timestamp)

                    rxState.next({
                        message: {
                            content: textsCap.backupSuccessContent,
                            header: textsCap.backupSuccessHeader,
                            status: 'success'
                        },
                        success: true,
                    })
                    isFn(onSubmit) && onSubmit(true, values)
                    if (redirectTo) window.location.href = redirectTo

                }
                reader.readAsText(file)
            } catch (err) {
                resolve(err)
            }
        })

        const inputs = [
            {
                name: inputNames.confirmed,
                onChange: handleConfirmChange,
                rxValue: new BehaviorSubject('no'),
                type: 'hidden',
            },
            {
                name: inputNames.redirectTo,
                type: 'hidden',
            },
            {
                hidden: true,
                name: inputNames.downloadData,
                rxValue: new BehaviorSubject(),
                type: 'hidden',
            },
            {
                hidden: checkConfirmed,
                name: inputNames.notes,
                type: 'html',
                content: (
                    <div>
                        {texts.confirmBackupContent}
                        <ul>
                            {texts.confirmBackupTypes
                                .split(',')
                                .map((str, i) => <li key={i}>{str}</li>)
                            }
                        </ul>
                    </div>
                )
            },
            {
                accept: '.json',
                disabled: () => rxState.value.success,
                hidden: values => !checkConfirmed(values),
                label: textsCap.backupFileLabel,
                labelDetails: (
                    <div>
                        <p>
                            {textsCap.backupFileLabelDetails}
                            <b style={{ color: 'red' }}>
                                {' ' + textsCap.backupFileLabelDetailsLocation}
                            </b>
                        </p>

                        <p>
                            {textsCap.fileName}:
                            <br />
                            <b style={{ color: 'green' }}>{filename}</b>
                        </p>

                        {!isMobile && <p>{textsCap.backupFileLabelDetailsDesktop}</p>}
                    </div>
                ),
                name: inputNames.file,
                type: 'file',
                validate: handleFileSelected,
            }
        ]

        return {
            ...props,
            inputs: fillValues(
                inputs,
                props.values || {},
            ),
			onClose: (...args) => {
				let { values: { redirectTo } = {}} = props
                isFn(props.onClose) && props.onClose(...args)
                try { 
                    redirectTo = new URL(redirectTo)
                    window.location.href = redirectTo.href
                } catch (err) {}
            },
            onSubmit: null, // trigger onSubmit locally
            values: { ...props.values },
            closeText: (values, props) => ({
                content: !checkConfirmed(values)
                    ? textsCap.backupLater
                    : textsCap.close,
                negative: false,
            }),
            submitText: (values, props = {}) => !checkConfirmed(values)
                ? {
                    content: textsCap.backupNow,
                    primary: true,
                    onClick: () => {
                        findInput(inputs, inputNames.confirmed)
                            .rxValue
                            .next('yes')
                    },
                }
                : {
                    content: textsCap.downloadAgain,
                    disabled: props.success, // forces button to be not disabled even when inputs are invalid
                    icon: 'download',
                    // primary: true,
                    positive: false,
                    onClick: () => {
                        findInput(inputs, inputNames.confirmed)
                            .rxValue
                            .next('no')
                    },
                }
        }
    })

    return (
        <FormBuilder {...{
            ...props,
            ...state,
        }} />
    )
}
BackupForm.defaultProps = {
    closeOnSubmit: false,
    header: textsCap.header,
    values: {
        // confirmed: 'yes'
    }
}
BackupForm.propTypes = {
    values: PropTypes.object
}

// const getInitialState = (rxState, props = {}) => {
//     const { onSubmit } = props
//     const filename = backup.generateFilename()
//     const isMobile = rxLayout.value === MOBILE
//     const checkConfirmed = values => (values[inputNames.confirmed] || '')
//         .toLowerCase() === 'yes'

//     const handleConfirmChange = deferred((_, values) => {
//         const isConfirmed = checkConfirmed(values)
//         const downloadData = isConfirmed && backup.download(filename)
//         const ddIn = findInput(inputs, inputNames.downloadData)
//         // store downloaded data for confirmation
//         ddIn && ddIn.rxValue.next(downloadData)

//         // update form header
//         const header = isConfirmed
//             ? textsCap.headerConfirmed
//             : textsCap.header
//         rxState.next({ header })
//     }, 50)

//     // on file select, check if the uploaded file matches the downloaded file
//     const handleFileSelected = (e, _, values) => new Promise(resolve => {
//         try {
//             const file = e.target.files[0]
//             const name = e.target.value
//             var reader = new FileReader()
//             if (name && !name.endsWith('.json')) throw textsCap.invalidFileType

//             reader.onload = file => {
//                 const {
//                     data,
//                     hash,
//                     timestamp,
//                 } = values[inputNames.downloadData] || {}
//                 const hashUpload = generateHash(file.target.result)
//                 const match = hash === hashUpload

//                 setTimeout(() => resolve(!match && textsCap.backupFileInvalid))

//                 if (!match) {
//                     file.target.value = null // reset file
//                     return
//                 }

//                 // update timestamp of identities and partners
//                 backup.updateFileBackupTS(data, timestamp)

//                 rxState.next({
//                     message: {
//                         content: textsCap.backupSuccessContent,
//                         header: textsCap.backupSuccessHeader,
//                         status: 'success'
//                     },
//                     success: true,
//                 })
//                 isFn(onSubmit) && onSubmit(true, values)
//             }
//             reader.readAsText(file)
//         } catch (err) {
//             resolve(err)
//         }
//     })

//     const inputs = [
//         {
//             name: inputNames.confirmed,
//             onChange: handleConfirmChange,
//             rxValue: new BehaviorSubject('no'),
//             type: 'hidden',
//         },
//         {
//             hidden: true,
//             name: inputNames.downloadData,
//             rxValue: new BehaviorSubject(),
//             type: 'hidden',
//         },
//         {
//             hidden: checkConfirmed,
//             name: inputNames.notes,
//             type: 'html',
//             content: (
//                 <div>
//                     {texts.confirmBackupContent}
//                     <ul>
//                         {texts.confirmBackupTypes
//                             .split(',')
//                             .map((str, i) => <li key={i}>{str}</li>)
//                         }
//                     </ul>
//                 </div>
//             )
//         },
//         {
//             accept: '.json',
//             disabled: () => rxState.value.success,
//             hidden: values => !checkConfirmed(values),
//             label: textsCap.backupFileLabel,
//             labelDetails: (
//                 <div>
//                     <p>
//                         {textsCap.backupFileLabelDetails}
//                         <b style={{ color: 'red' }}>
//                             {' ' + textsCap.backupFileLabelDetailsLocation}
//                         </b>
//                     </p>

//                     <p>
//                         {textsCap.fileName}:
//                         <br />
//                         <b style={{ color: 'green' }}>{filename}</b>
//                     </p>

//                     {!isMobile && <p>{textsCap.backupFileLabelDetailsDesktop}</p>}
//                 </div>
//             ),
//             name: inputNames.file,
//             type: 'file',
//             validate: handleFileSelected,
//         }
//     ]

//     return {
//         ...props,
//         inputs: fillValues(
//             inputs,
//             props.values || [],
//         ),
//         onSubmit: null, // trigger onSubmit locally
//         values: { ...props.values },


//         closeText: (values, props) => ({
//             content: !checkConfirmed(values)
//                 ? textsCap.backupLater
//                 : textsCap.close,
//             negative: false,
//         }),
//         submitText: (values, props = {}) => !checkConfirmed(values)
//             ? {
//                 content: textsCap.backupNow,
//                 primary: true,
//                 onClick: () => {
//                     findInput(inputs, inputNames.confirmed)
//                         .rxValue
//                         .next('yes')
//                 },
//             }
//             : {
//                 content: textsCap.downloadAgain,
//                 disabled: props.success, // forces button to be not disabled even when inputs are invalid
//                 icon: 'download',
//                 // primary: true,
//                 positive: false,
//                 onClick: () => {
//                     findInput(inputs, inputNames.confirmed)
//                         .rxValue
//                         .next('no')
//                 },
//             }
//     }
// }
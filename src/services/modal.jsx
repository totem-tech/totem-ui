import React, {
    createRef,
    isValidElement,
    useEffect,
    useState,
} from 'react'
import { render } from 'react-dom'
import {
    Button,
    Confirm,
    Icon,
} from 'semantic-ui-react'
import { rxIsRegistered } from '../utils/chatClient'
import DataStorage from '../utils/DataStorage'
import PromisE from '../utils/PromisE'
import {
    className,
    generateHash,
    isArr,
    isBool,
    isFn,
    isObj,
    isStr,
    objWithoutKeys,
} from '../utils/utils'
import { translated } from '../utils/languageHelper'
import {
    getUrlParam,
    toggleFullscreen,
    useInverted,
} from './window'

const modals = new DataStorage()
export const rxModals = modals.rxData
const onCloseHandlers = new Map()
const textsCap = translated({
    areYouSure: 'are you sure?',
    cancel: 'cancel',
    close: 'close',
    ok: 'ok',
}, true)[1]

export const ModalsConainer = React.memo(() => {
    const [modalsArr, setModalsArr] = useState([])

    useEffect(() => {
        let mounted = true
        const subscribed = rxModals.subscribe(map => {
            if (!mounted) return
            setModalsArr(Array.from(map))

            // add/remove class to element to inticate at least one modal is open
            const func = !!map.size ? 'add' : 'remove'
            document.body.classList[func]('modal-open')
        })
        return () => {
            mounted = false
            subscribed.unsubscribe
        }
    }, [])

    return modalsArr.map(([id, modalEl]) => (
        <span {...{ key: id, id }}>{modalEl}</span>
    ))
})

/**
 * 
 * @param   {String}    id       Modal ID
 * @param   {Element}   element  Modal Element
 * @param   {*}         focusRef element reference to auto focus on
 */
const add = (id, element, focusRef, onClose) => {
    id = id || newId()
    modals.set(id, element)
    isFn(onClose) && onCloseHandlers.set(id, onClose)
    // If already in fullscreen, exit. Otherwise, modal will not be visible.
    toggleFullscreen()

    focusRef && setTimeout(() => {
        const focus = focusRef.focus
            || focusRef.current
            && focusRef.current.focus
        isFn(focus) && focus()
    }, 100)
    return id
}
/**
 * @name    closeModal
 * 
 * @param   {String|Array}  id 
 * @param   {Number}        delayMs (optional)
 */
export const closeModal = (id, delayMs = 0) => {
    if (delayMs > 0) return setTimeout(() => closeModal(id), delayMs)

    if (isArr(id)) return id.forEach(idx => closeModal(idx))

    const onClose = onCloseHandlers.get(id)
    modals.delete(id)
    isFn(onClose) && onClose(id)
}

/**
 * @name        confirm
 * @summary     opens a confirm modal/dialog
 * 
 * @param   {Object|String} confirmProps props to be used in Semantic UI Confirm component.
 *                                       If string supplied, it will be used as `content` prop
 * @param   {String}        modalId      (optional) if supplied and any existing modal with this ID will be replaced.
 *                                       Otherwise, a random ID will be generated.
 * @param   {Object}        contentProps (optional) props to be passed on to the content element
 * @param   {Boolean}       focusConfirm (optional) If value is
 *                                          - true or no cancel button, will focus confirm button.
 *                                          2. if false or no `confirmButton`, will focus `cancelButton`
 *                                        Default: false
 * 
 * @returns {String}        @modalId      can be used with `closeModal` function to externally close the modal
 */
export const confirm = (confirmProps, modalId, contentProps = {}, focusConfirm = false) => {
    const focusRef = createRef()
    modalId = modalId || newId()
    confirmProps = !isStr(confirmProps)
        ? confirmProps
        : { content: confirmProps }
    let {
        cancelButton,
        collapsing,
        confirmButton,
        content,
        header,
        open,
        onCancel,
        onConfirm,
        subheader,
    } = confirmProps
    if (confirmButton !== null && !confirmButton) {
        // use default translated text for confirm button
        confirmButton = textsCap.ok
    }
    if (cancelButton !== null && !cancelButton) {
        // use default translated text for cancel button
        cancelButton = !confirmButton
            ? textsCap.close
            : textsCap.cancel
    }
    // use default translated text for content
    content = !content && content !== null
        ? textsCap.areYouSure
        : content
    // add a close button if both confirm and cancel buttons are hidden
    // (Semantic confirm dialoge doesn't have a close icon by default)
    if (!confirmButton && !cancelButton && (header || content)) {
        content = (
            <div>
                <div style={{
                    position: 'absolute',
                    right: 15,
                    top: 15,
                }}>
                    <Icon {...{
                        className: 'grey large link icon no-margin',
                        name: 'times circle outline',
                        onClick: () => closeModal(modalId),
                        ref: focusRef,
                    }} />
                </div>
                {content}
            </div>
        )
    }
    const attachRef = btn => (
        <Button {...{
            ...(isValidElement(btn)
                ? btn.props
                : isObj(btn)
                    ? btn
                    : { content: btn }),
            ref: focusRef,
        }} />
    )

    if (cancelButton && (!focusConfirm || !confirmButton)) {
        cancelButton = attachRef(cancelButton)
    } else if (confirmButton) {
        confirmButton = attachRef(confirmButton)
    }
    if (subheader) {
        header = (
            <div className='header'>
                {header}
                <div style={{
                    fontWeight: 'initial',
                    fontSize: '75%',
                    lineHeight: 1,
                    color: 'grey',
                }}>
                    {subheader}
                </div>
            </div>
        )
    }

    const modalEl = (
        <IConfirm {...{
            ...objWithoutKeys(confirmProps, [
                'collapsing',
                'contentProps',
                'subheader',
            ]),
            cancelButton,
            className: className([
                'confirm-modal',
                confirmProps.className,
                { collapsing },
            ]),
            confirmButton,
            content: content && (
                <div {...{
                    ...contentProps,
                    children: content,
                    className: className([
                        'content',
                        contentProps.className,
                    ]),
                }} />
            ),
            header,
            open: !isBool(open) || open,
            onCancel: () => closeModal(modalId),
            onConfirm: () => {
                isFn(onConfirm) && onConfirm()
                closeModal(modalId)
            },
        }} />
    )
    return add(
        modalId,
        modalEl,
        focusRef,
        onCancel,
    )
}

/**
 * @name    confirmAsPromise
 * @summary opens a confirm modal and returns a promise that resolves with `true` or `false`
 *          indicating user accepted or rejected respectively
 * 
 * @param   {Object|String} confirmProps 
 * @param   {String}        modalId (optional)
 * @param   {...any}        args    (optional) see `confirm` for rest of the accepted arguments
 * 
 * @returns {Promise}       promise will reject only if there was an uncaught error 
 */
export const confirmAsPromise = (confirmProps, modalId, ...args) => new PromisE((resolve, reject) => {
    try {
        confirmProps = !isStr(confirmProps)
            ? confirmProps
            : { content: confirmProps }
        const { onCancel, onConfirm } = confirmProps
        const resolver = (defaultValue = false, func) => async () => {
            let value = isFn(func)
            ? await func()
            : undefined
            value = isBool(value)
            ? value
            : defaultValue
            resolve(value)
        }
        confirmProps.onCancel = resolver(false, onCancel)
        confirmProps.onConfirm = resolver(true, onConfirm)
        confirm(confirmProps, modalId, ...args)
    } catch (err) {
        reject(err)
    }
})

// Invertible Confirm component
// This is a sugar for the Confirm component with auto inverted/dark mode
const IConfirm = props => {
    const inverted = useInverted()
    return (
        <Confirm {...{
            ...props,
            className: className([
                props.className,
                { inverted },
            ]),
            collapsing: undefined,
            style: {
                borderRadius: inverted ? 5 : undefined,
                ...props.style,
            }
        }} />
    )
}

/**
 * @name    get
 * @summary get modal elememnt by it's ID
 * 
 * @param {String} modalId 
 * 
 * @returns {Element}
 */
export const get = modalId => modals.get(modalId)

export const newId = (prefix = 'modal_', seed) => prefix
    + generateHash(seed, undefined, 32)
        .replace('0x', '')

/**
 * @name    showForm
 * @summary opens form in a modal dialog
 * 
 * @param   {Function}  FormComponent FormBuilder or any other form that uses FormBuilder component (not element) class 
 * @param   {Object}    props         (optional) any props to supply when instantiating the form element
 * @param   {String}    modalId       (optional) if not supplied, will generate a random UUID
 * @param   {*}         focusRef      (optional) if supplied will focus element on form open.
 *                                    Otherwise, will attempt to focus first form input element.
 * 
 * @returns {String}    @modalId      can be used with `closeModal` function to externally close the modal
 */
export const showForm = (FormComponent, props = {}, modalId, focusRef) => {
    // Invalid component supplied
    if (!isFn(FormComponent)) return
    const { onClose } = props
    // grab the default modalId if already defined in the defualtProps
    modalId = modalId
        || (FormComponent.defaultProps || {}).modalId
        || newId('form_')
    const form = (
        <FormComponent {...{
            ...props,
            modal: true,
            modalId,
            open: true,
            onClose: () => closeModal(modalId),
        }} />
    )
    if (!focusRef) setTimeout(() => {
        // if focusRef not supplied attempt to auto-focus first input element
        const selector = `#${modalId} input:first-child`
        const firstInputEl = document.querySelector(selector)
        firstInputEl && firstInputEl.focus()
    }, 50)
    return add(
        modalId,
        form,
        focusRef,
        onClose,
    )
}

/**
 * @name    showInfo
 * 
 * @param   {String|any}    modalProps
 * @param   {String}        modalId (optional)
 * @param   {...any}        args    (optional) 
 * 
 * @returns {Promise}
 */
export const showInfo = (modalProps, modalId, ...args) => confirmAsPromise(
    {
        ...modalProps,
        confirmButton: null,
        cancelButton: null,
    },
    modalId,
    ...args,
)

// enable user to open any form within './forms/ in a modal by using URL parameter `?form=FormComponentFileName`
// any other URL parameter will be supplied to the from as the `values` prop.
// Exception: `?ref=XXX` is a shortcut to `?form=registration&user=XXX`
setTimeout(() => {
    let fileName = (getUrlParam('form') || '')
        .trim()
        .toLowerCase()
    const referralCode = !fileName && getUrlParam('ref')
    if (!!referralCode) fileName = 'registration'
    if (!fileName) return

    // if user is not registered, only allow registration, backup and restore forms
    // to be opened through URL param
    if (!rxIsRegistered.value) {
        const allowedForms = [
            'backup',
            'reg', // short for registration
            'restore',
            'settings',
        ]
        const isValid = allowedForms.find(x => !fileName.startsWith(x))
        if (!isValid) return
    }
    try {
        fileName = (require('./languageFiles').default || [])
            .map(x => x.split('./src/forms/')[1])
            .filter(Boolean)
            .find(x => x.toLowerCase().startsWith(fileName))
        if (!fileName) return

        const Form = require(`../forms/${fileName}`)
        const values = !referralCode
            ? getUrlParam()
            : { referralCode }
        const props = {
            inputsDisabled: values.inputsDisabled,
            inputsHidden: values.inputsHidden,
            inputsReadOnly: values.inputsReadOnly,
            values,
        }

        showForm(Form.default, props)
        history.pushState({}, null, `${location.protocol}//${location.host}`)
    } catch (e) {
        fileName && console.log(e)
    }
})

const el = document.getElementById('modals-container')
el && render(<ModalsConainer />, el)
export default {
    closeModal,
    confirm,
    confirmAsPromise,
    ModalsConainer,
    rxModals,
    showForm,
    showInfo,
}
import React, { createRef, isValidElement, useEffect, useState } from 'react'
import { render } from 'react-dom'
import uuid from 'uuid'
import { Button, Confirm, Icon } from 'semantic-ui-react'
import DataStorage from '../utils/DataStorage'
import { isBool, isFn, className, isStr, isObj, isDefined, objWithoutKeys } from '../utils/utils'
import { translated } from './language'
import { toggleFullscreen, useInverted, getUrlParam } from './window'
import PromisE from '../utils/PromisE'

const modals = new DataStorage()
export const rxModals = modals.rxData
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
const add = (id, element, focusRef) => {
    id = id || uuid.v1()
    modals.set(id, element)
    // If already in fullscreen, exit. Otherwise, modal will not be visible.
    toggleFullscreen()

    focusRef && setTimeout(() => {
        const focus = focusRef.focus || focusRef.current && focusRef.current.focus
        isFn(focus) && focus()
    }, 100)
    return id
}

export const closeModal = (id, delay = 0) => setTimeout(() => modals.delete(id), delay)

/**
 * @name        confirm
 * @summary     opens a confirm modal/dialog
 * 
 * @param   {Object|String} confirmProps props to be used in Semantic UI Confirm component.
 *                                       If string supplied, it will be used as `content` prop
 * @param   {String}        modalId      (optional) if supplied and any existing modal with this ID will be replaced.
 *                                       Otherwise, a random UUID will be generated.
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
    modalId = modalId || uuid.v1()
    confirmProps = !isStr(confirmProps)
        ? confirmProps
        : { content: confirmProps }
    let {
        cancelButton,
        confirmButton,
        content,
        header,
        open,
        onCancel,
        onConfirm,
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
                        onClick: (...args) => {
                            closeModal(modalId)
                            isFn(onCancel) && onCancel(...args)
                        },
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

    return add(
        modalId,
        <IConfirm {...{
            ...objWithoutKeys(confirmProps, ['contentProps']),
            cancelButton,
            className: className([
                'confirm-modal',
                confirmProps.className,
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
                    style: {}
                }} />
            ),
            open: !isBool(open) || open,
            onCancel: (...args) => {
                closeModal(modalId)
                isFn(onCancel) && onCancel(...args)
            },
            onConfirm: (...args) => {
                closeModal(modalId)
                isFn(onConfirm) && onConfirm(...args)
            },
        }} />,
        focusRef,
    )
}

/**
 * @name    confirmAsPromise
 * @summary opens a confirm modal and returns a promise that resolves with `true` or `false`
 *          indicating user accepted or rejected respectively
 * 
 * @param   {Object|String} props 
 * @param   {...any}        args    see `confirm` for rest of the accepted arguments
 * 
 * @returns {Promise}       promise will reject only if there was an uncaught error 
 */
export const confirmAsPromise = (props, ...args) => new PromisE((resolve, reject) => {
    try {
        props = !isStr(props)
            ? props
            : { content: props }
        const { onCancel, onConfirm } = props
        const resolver = (defaultValue = false, func) => async (...args) => {
            let value = isFn(func)
                ? await func(...args)
                : undefined
            value = isBool(value)
                ? value
                : defaultValue
            resolve(value)
        }
        props.onCancel = resolver(false, onCancel)
        props.onConfirm = resolver(true, onConfirm)
        confirm(props, ...args)
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
                { inverted }
            ]),
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
export const showForm = (FormComponent, props, modalId, focusRef) => {
    // Invalid component supplied
    if (!isFn(FormComponent)) return
    // grab the default modalId if already defined in the defualtProps
    modalId = modalId || (FormComponent.defaultProps || {}).modalId || uuid.v1()
    const form = (
        <FormComponent {...{
            ...props,
            modal: true,
            modalId,
            open: true,
            onClose: (e, d) => {
                const { onClose } = props || {}
                closeModal(modalId)
                isFn(onClose) && onClose(e, d)
            },
        }} />
    )
    if (!focusRef) setTimeout(() => {
        // if focusRef not supplied attempt to auto-focus first input element
        const selector = `#form-${modalId} input:first-child`
        const firstInputEl = document.querySelector(selector)
        firstInputEl && firstInputEl.focus()
    }, 50)
    return add(modalId, form, focusRef)
}

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

        showForm(Form.default, { values })
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
    ModalsConainer,
    rxModals,
    showForm,
}
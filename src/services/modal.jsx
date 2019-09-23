import React from 'react'
import uuid from 'uuid'
import { Bond } from 'oo7'
import { ReactiveComponent } from 'oo7-react'
import { Confirm } from 'semantic-ui-react'
import { isDefined, isFn, isStr } from '../utils/utils'
const modals = new Map()
// Use Bond as a way to trigger update to the ModalService component
const trigger = new Bond()

class ModalService extends ReactiveComponent {
    constructor() {
        super([], {trigger})
    }
    render() {
        return (
            <div className="modal-service">
                {Array.from(modals).map(item => <span key={item[0]}>{item[1]}</span>)}
            </div>
        ) 
    }
}
export default ModalService

const add = (id, element) => {
    id = id || uuid.v1()
    modals.set(id, element)
    trigger.changed(modals.size)
    return id
}

export const closeModal = id => modals.delete(id) | trigger.changed(modals.size)

// confirm opens a confirm dialog
//
// Params: 
// @confirmProps    object: properties to be supplied to the Confirm component
// @id              string: if supplied and any modal with this ID will be replaced
//
// returns
// @id              string : random id assigned to the modal. Can be used to remove using the remove function
export const confirm = (confirmProps, id) => {
    id = id || uuid.v1()
    const { content, open, onCancel, onConfirm } = confirmProps
    return add(
        id,
        <Confirm
          {...confirmProps}
          content={<div className="content">{content}</div>}
          open={isDefined(open) ? open : true}
          onCancel={(e, d) => closeModal(id) | isFn(onCancel) && onCancel(e, d)}
          onConfirm={(e, d) => closeModal(id) | isFn(onConfirm) && onConfirm(e, d)}
        />
    )
}
// showForm opens form in a modal dialog
//
// Params: 
// @FormComponent   function/class  : FormBuilder or any other form that uses FormBuilder component (not element) class 
// @id              string          : if supplied and any modal with this ID will be replaced
//
// returns
// @id              string : random id assigned to the modal. Can be used to remove using the remove function
export const showForm = (FormComponent, props, id) => {
    // Invalid component supplied
    if (!isFn(FormComponent)) return;
    id = id || uuid.v1()
    props = props || {}
    return add(
        id,
        <FormComponent
            {...props}
            modal={true}
            open={true}
            onClose={(e, d)=> {
                closeModal(id)
                isFn(props.onClose) && props.onClose(e, d)
            }}
        />
    )
}
import React from 'react'
import uuid from 'uuid'
import { Bond } from 'oo7'
import { ReactiveComponent } from 'oo7-react'
import { Confirm } from 'semantic-ui-react'
import { isDefined, isFn } from '../components/utils'
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

export const remove = id => modals.delete(id) | trigger.changed(modals.size)

// confirm opens a confirm dialog
//
// Params: 
// @confirmProps    object: properties to be supplied to the Confirm component
//
// returns
// @id              string : random id assigned to the modal. Can be used to remove using the remove function
export const confirm = (confirmProps) => {
    const id = uuid.v1()
    return add(
        id,
        <Confirm
          {...confirmProps}
          open={isDefined(confirmProps.open) ? confirmProps.open : true}
          onCancel={(e, d) => {remove(id); isFn(confirmProps.onCancel) && confirmProps.onCancel(e, d)}}
          onConfirm={(e, d) => {remove(id); isFn(confirmProps.onConfirm) && confirmProps.onConfirm(e, d)}}
        />
    )
}

// ToDo: add function to show modal forms from the forms directory
export const showForm = (FormClass, props) => {
    const id = uuid.v1()
    props = props || {}
    return add(
        id,
        <FormClass
            {...props}
            modal={true}
            open={true}
            onClose={(e, d)=> {
                remove(id)
                isFn(props.onClose) && props.onClose(e, d)
            }}
        />
    )
}
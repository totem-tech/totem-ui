import React from 'react'
import { ButtonAcceptOrReject } from '../../components/buttons'
import { find as findIdentity } from '../../services/identity'
import { translated } from '../../services/language'
import { statuses } from '../../services/queue'
import { remove, search } from '../notification/notification'

const textsCap = translated({
    assigntTaskMsg: 'assigned a task to your identity:',
}, true)[1]

export const handleTaskAssignment = async (taskId, assigneeAddress, accepted) => {
    console.log(taskId, assigneeAddress, accepted)
}

const handleAssignmentItemView = (id, notification = {}, { senderIdBtn }) => {
    const { data, status } = notification
    const { assigneeAddress, taskId } = data || {}
    const { name } = findIdentity(assigneeAddress) || {}
    if (!name) {
        // assigneeAddress doesn't belong to the user!
        remove(id)
        return ''
    }

    return {
        content: (
            <span>
                {senderIdBtn} {textsCap.assigntTaskMsg} {name}
                <ButtonAcceptOrReject {...{
                    acceptColor: 'blue',
                    disabled: status === statuses.LOADING,
                    onClick: accepted => confirm({
                        onConfirm: () => handleTaskAssignment(taskId, assigneeAddress, accepted),
                        size: 'mini',
                    })
                }} />

            </span>
        ),
        icon: 'tasks',
        // header: 'this is a test notification ' + id
    }
}

// export const handleAssignmentResponseItemView

const itemViewHandlers = [
    {
        childType: 'assignment',
        handler: handleAssignmentItemView,
        type: 'task',
    }
]

export const setHandlers = () => itemViewHandlers.forEach(x => setItemViewHandler(x.type, x.childType, x.handler))
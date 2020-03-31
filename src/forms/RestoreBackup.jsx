// {
//     accept: 'application/json',
//     hidden: true,
//     type: 'file',
//     onChange: (e, value) => {

//         return console.log(e, value)
//         const { action } = value
//         try {
//             const { inputs } = this.state
//             const file = e.target.files[0]
//             var reader = new FileReader()
//             const { accept } = findInput(inputs, 'action').options.find(x => x.value === action) || {}
//             if (!file.name.endsWith(accept || '')) {
//                 e.target.value = null
//                 alert('File type not acceptable. Select a file with the following extension: ' + accept)
//                 return
//             }
//             reader.onload = le => {
//                 findInput(this.state.inputs, 'text').bond.changed(le.target.result)
//                 e.target.value = null
//             }
//             reader.readAsText(file)
//         } catch (err) {
//             alert(err)
//         }
//     }
// }
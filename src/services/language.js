import DataStorage from '../utils/DataStorage'
import { getUrlParam } from './window'
import { textCapitalize } from '../utils/utils'
import storage from './storage'

const translations = new DataStorage('totem_translations')
const buildMode = getUrlParam('build-translation-list') == 'true' && window.location.hostname !== 'totem.live'
const EN = 'EN'
const moduleKey = 'language'
const clearClutter = x => x.split('\n').map(y => y.trim()).join(' ')
// get selected language code
export const getSelected = () => storage.settings.global(moduleKey).selected || EN
// set selected language code
export const setSelected = selected => storage.settings.global(moduleKey, { selected: selected || EN })
// export const translated = (strObj = {}, capitalized = false) => {
//     // const languageCode = 'en' // use from default settings
//     const enList = translations.get(EN) || {}
//     // attempt to build a single list of english texts for translation
//     if (buildMode) {
//         Object.keys(strObj).forEach(key => {
//             enList[key] = enList[key] || strObj[key]
//         })
//         translations.set(EN, enList)
//     }

//     // const translatedObj = translations.get(languageCode)
//     // if (languageCode === EN || !translatedObj) return [strObj, capitalized && textCapitalize(strObj)]
//     // process...
//     return [strObj, capitalized && textCapitalize(strObj)]
// }
//
export const translated = (texts = {}, capitalized = false) => {
    const en = translations.get(EN) || []
    // list of selected language texts
    const selected = translations.get(getSelected()) || []
    // attempt to build a single list of english texts for translation
    if (buildMode) {
        window.enList = window.enList || []
        Object.values(texts).forEach(text => enList.indexOf(text) === -1 && enList.push(text))
        window.enList = enList.sort()
    }

    Object.keys(texts).forEach(key => {
        const text = clearClutter(texts[key])
        const enIndex = en.indexOf(text)
        const translatedText = selected[enIndex]
        // fall back to original/English,
        // if selected language is not supported 
        // or due to network error language data download failed
        // or somehow supplied text wasn't translated
        if (!translatedText) return
        texts[key] = translatedText
    })
    return [texts, capitalized && textCapitalize(texts)]
}

export const getEnList = () => {
    const enList = translations.get(EN) || {}
    return Object.keys(enList).map(key => enList[key]).sort()
}
export const setList = (languageCode, texts) => {
    if (languageCode === EN) return
    translations.set(languageCode, texts)
}

export default {
    translations,
    translated,
    getEnList,
    setList,
    getSelected,
    setSelected,
}
if (buildMode) {
    // list of files that needs translation
    // todo: services/modal++
    const files = buildMode && {
        components: [
            'CatchReactErrors.jsx',
            'ChatWidget.jsx',
            'CheckboxGroup.jsx',
            'ContentSegment.jsx',
            'DataTable.jsx',
            'FileUploadBond.jsx',
            'FormBuilder.jsx',
            'FormInput.jsx',
            'Message.jsx',
            'PageHeader.jsx',
            'Paginator.jsx',
            'SidebarLeft.jsx',
            'UserIdInput.jsx',
            'buttons.jsx',
        ],
        forms: [
            'Company.jsx',
            'Identity.jsx',
            'IdentityDetails.jsx',
            'IdentityRequest.jsx',
            'IdentityShare.jsx',
            'IntroduceUser.jsx',
            'KeyRegistryPlayGround.jsx',
            'Partner.jsx',
            'Project.jsx',
            'ProjectReassign.jsx',
            'Register.jsx',
            'TimeKeeping.jsx',
            'TimeKeepingInvite.jsx',
            'Transfer.jsx',
        ],
        lists: [
            'IdentityList.jsx',
            'PartnerList.jsx',
            'ProjectList.jsx',
            'ProjectTeamList.jsx',
            'TimeKeepingList.jsx',
            'TimeKeepingSummary.jsx',
        ],
        services: [
            'blockchain.js',
            'chatClient.js',
            'data.js',
            'identity.js',
            'language.js',
            'modal.jsx',
            'notification.jsx',
            'partner.js',
            'project.js',
            'queue.js',
            'sidebar.js',
            'storage.js',
            'timeKeeping.js',
            'toast.jsx',
            'window.js',
        ],
        views: [
            'GettingStartedView.jsx',
            'PageUtilitiesView.jsx',
            'PokeView.jsx',
            'TimeKeepingView.jsx',
            'TransactionsView.jsx',
            'UpgradeView.jsx',
            'UtilitiesView.jsx',
        ],
    }
    // import files to force run translated on each file and therefore force rebuild 'en' list
    Object.keys(files).forEach(dir => files[dir].forEach(filename => require(`../${dir}/${filename}`)))
    console.log('Language build mode. English text/words list build done.')

    // todo: move to utils
    window.downloadFile = (content, fileName, contentType) => {
        const a = document.createElement("a");
        const file = new Blob([content], { type: contentType });
        a.href = URL.createObjectURL(file);
        a.download = fileName;
        a.click();
    }

    setTimeout(() => {
        const languages = ['EN', 'DE', 'FR', 'BN']
        const rest = languages.slice(1)
        const cols = ['A', 'B', 'C', 'D']
        const str = languages.join(',') + '\n' + window.enList.map((x, i) => {
            const rowNo = i + 2
            const functions = rest.map((_, c) => `"=GOOGLETRANSLATE($A${rowNo}, $A$1, ${cols[c + 1]}$1)"`).join(',')
            return `"${clearClutter(x)}", ` + functions
        }).join(',\n')
        downloadFile(str, 'texts.csv', 'text/csv')
    }, 3000)

    // remove later
    window.getArr = str => `
        [
            ${ str.split('\n').join(' ').split(' ').filter(Boolean).sort().map(x => `    '${x}',`).join('\n')}
        ]
    `
    // assumes first line is column title
    window.tsvToJson = str => {
        const res = new Map()
        const lines = str.split('\n')
        const langCodes = lines[0].split('\t')
        lines.slice(1).forEach(line => {
            const cells = line.split('\t')
            cells.forEach((text, i) => {
                const langTexts = res.get(langCodes[i]) || []
                langTexts.push(text)
                res.set(langCodes[i], langTexts)
            })
        })
        return res
    }
    // localStorage.setItem('totem_translations', JSON.stringify(Array.from(tsvToJson(str))))
}

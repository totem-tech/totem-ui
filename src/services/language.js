import { BUILD_MODE } from '../utils/languageHelper'

if (BUILD_MODE) {
	require('./languageFiles').default.forEach(path =>
		require(`../${path.split('./src/')[0]}`)
	)
	console.log(
		'%cEnglish texts are ready to be downloaded for translation.\nGo to the "Utilities > Admin Tools"',
		'background: orange; color: white; font-weight:bold; font-size: 150%; padding: 5px 10px'
	)
}

const { setNetworkDefault, denominationInfo: { init } } = require('oo7-substrate')
/*
init({
	denominations: {
		bbq: 15,
	},
	primary: 'bbq',
	unit: 'birch',
	ticker: 'BBQ'
})
*/


// init({
// 	denominations: {
// 		eighteen: 18,
// 		twelve: 12,
// 		zero: 0,
// 	},
// 	primary: 'twelve',
// 	unit: 'zero',
// 	ticker: 'XTT'
// })

init({
	denominations: { 
		unit: 10, 
	},
	primary: 'unit',
	unit: 'unit',
	ticker: 'UNIT'
})

setNetworkDefault(42)

/*const denominationInfoDOT = {
	denominations: {
		dot: 15,
		point: 12,
		µdot: 9,
	},
	primary: 'dot',
	unit: 'planck',
	ticker: 'DOT'
}*/

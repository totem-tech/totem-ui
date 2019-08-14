const { setNetworkDefault, denominationInfo: { init } } = require('oo7-substrate')
init({
	denominations: {
		Ytx: 24,
		Ztx: 21,
		Etx: 18,
		Ptx: 15,
		Ttx: 12,
		Gtx: 9,
		Mtx: 6,
		ktx: 3,
		Transactions: 0,
	},
	primary: 'Etx',
	unit: 'Transactions',
	ticker: 'XTX'
})
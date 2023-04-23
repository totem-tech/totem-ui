// webpack v4
const webpack = require('webpack')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const path = require('path')
const Dotenv = require('dotenv-webpack')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const uuid = require('uuid')

module.exports = {
	entry: {
		main: ['babel-polyfill', './src/index.js'],
	},
	module: {
		rules: [
			{
				test: /\.(js|jsx)$/,
				exclude: /node_modules/,
				use: {
					loader: 'babel-loader',
					options: {
						presets: [
							// Use the latest version of ECMAScript
							[
								'@babel/preset-env',
								{ targets: 'last 2 versions' },
							],
							// Use the React preset for JSX support
							'@babel/preset-react',
						],
					},
				},
			},
			{
				test: /\.css$/i,
				use: [
					'style-loader',
					{
						loader: 'css-loader',
						options: {
							esModule: false,
						}
					},
				],
			},
			{
				test: /\.(png|jpg|woff|woff2|eot|ttf|svg)$/i,
				use: [
					{
						loader: 'url-loader',
						options: {
							limit: 1000000,
							// Specify the fallback loader for non-data URIs
							fallback: 'file-loader',
							// Enable or disable encoding the URI as a base64 string
							// If you set this to `false`, the loader will generate a plain-text URI instead
							// This option only applies when the URI is smaller than the limit specified above
							// Default is `true`
							esModule: false,
						},
					},
				],
			},
			{
				test: /\.(md)$/,
				use: 'ignore-loader',
			},
		],
	},
	// ignore nodejs modules and not found warning
	plugins: [
		// Copy static assets
		new CopyWebpackPlugin({
			patterns: [
				'./public/android-chrome-192x192.png',
				'./public/android-chrome-256x256.png',
				'./public/apple-touch-icon.png',
				'./public/browserconfig.xml',
				'./public/favicon.ico',
				'./public/favicon-16x16.png',
				'./public/favicon-32x32.png',
				'./public/mstile-150x150.png',
				'./public/safari-pinned-tab.svg',
				'./public/site.webmanifest',
				// {
				//   from: path.resolve(__dirname, 'public/'),
				//   // to: './dist',
				// }
			],
		}),

		...[
			// /path/,
			/abort-controller/, // utils/PromisE.js
			/discord.js/, // utils/PromisE.js
			/form-data/, // utils/utils.js
			/nano/, // utils/CouchDBStorage.js
			/node-localstorage/, // utils/DataStorage.js
			/node-fetch/, // utils/PromisE.js
			/twitter-lite/, // utils/twitterHelper.js
			/\@polkadot\/extension-dapp/, // utils/twitterHelper.js
		].map(regExp => new webpack.IgnorePlugin({ resourceRegExp: regExp })),
		// Includes .env variables into the frontend app
		new Dotenv(),

		//
		new webpack.ProvidePlugin({
            Buffer: ['buffer', 'Buffer'],
        }),

		new HtmlWebpackPlugin({
			cache: true,
			hash: true,
			minify: 'auto',
			template: 'public/index.html',
		}),
	],
	resolve: {
		extensions: ['*', '.js', '.jsx', '.mjs', '.ts'],
		// ignore or use a fallback plugin
		fallback: {
			assert: false,
			buffer: require.resolve('buffer'),
			crypto: require.resolve('crypto-browserify'),
			path: false, // ignore NodeJS 'path' module used in the utils/DataStorage.js file
			stream: require.resolve('stream-browserify'),
			util: require.resolve('util'),
		},
	},
	output: {
		path: __dirname + '/dist',
		publicPath: '/',
		filename: `bundle.js`, //`bundle-${uuid.v1()}.js`
	},
	devServer: {
		static: path.join(__dirname, 'dist'),
		hot: true,
	},
	devtool: 'eval-source-map',
	// // solves "Can't resolve 'fs'" error
	// node: {
	// 	fs: 'empty',
	// },
}

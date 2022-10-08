// webpack v4
const webpack = require('webpack')
const CopyWebpackPlugin = require('copy-webpack-plugin');
const path = require('path');
const Dotenv = require('dotenv-webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin')
const uuid = require('uuid')

module.exports = {
  entry: {
    main: './src/index.js',
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: ['babel-loader']
      },
      {
        test: /\.css$/,
        loader: 'style-loader!css-loader'
      },
      {
        test: /\.(png|woff|woff2|eot|ttf|svg)$/,
        loader: 'url-loader?limit=100000'
      },
      {
        test: /\.(md)$/,
        loader: 'ignore-loader',
      },
      // {}
    ]
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
      ]
    }),
    new webpack.IgnorePlugin(/abort-controller/), // utils/PromisE.js
    new webpack.IgnorePlugin(/discord.js/), // utils/PromisE.js
    new webpack.IgnorePlugin(/form-data/), // utils/utils.js
    new webpack.IgnorePlugin(/nano/), // utils/CouchDBStorage.js
    new webpack.IgnorePlugin(/node-localstorage/), // utils/DataStorage.js
    new webpack.IgnorePlugin(/node-fetch/), // utils/PromisE.js
    new webpack.IgnorePlugin(/twitter-lite/), // utils/twitterHelper.js
    // Includes .env variables into the frontend app
    new Dotenv(),
    new HtmlWebpackPlugin({
      cache: true,
      hash: true,
      minify: 'auto',
      template: 'public/index.html',
    }),
  ],
  resolve: {
    extensions: ['*', '.js', '.jsx']
  },
  output: {
    path: __dirname + '/dist',
    publicPath: '/',
    filename: `bundle.js`,//`bundle-${uuid.v1()}.js`
  },
  devServer: {
    contentBase: './dist'
  },
  // solves "Can't resolve 'fs'" error
  node: {
    'fs': "empty",
  }
}



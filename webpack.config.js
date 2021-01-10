/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path')
const webpack = require('webpack')
const ejs = require('ejs')
const Dotenv = require('dotenv-webpack')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const CopyPlugin = require('copy-webpack-plugin')
const ExtensionReloader = require('webpack-extension-reloader')
const { VueLoaderPlugin } = require('vue-loader')
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin
const { version } = require('./package.json')

const config = {
  mode: process.env.NODE_ENV,
  context: path.resolve(__dirname, 'src'),
  entry: {
    background: './backgrounds/background.ts',
    contentscript: './content-scripts/content-script.ts',
    'popup/popup': './popup/popup.ts',
    'options/options': './options/options.ts',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
  },
  resolve: {
    extensions: ['.js', '.vue', '.ts'],
  },
  module: {
    rules: [
      {
        test: /\.vue$/,
        loader: 'vue-loader',
      },
      {
        test: /\.js$/,
        loader: 'babel-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.ts$/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              appendTsSuffixTo: [/\.vue$/],
            },
          },
        ],
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader'],
      },
      {
        test: /\.scss$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader', 'sass-loader'],
      },
      {
        test: /\.sass$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader', 'sass-loader?indentedSyntax'],
      },
      {
        test: /\.(png|jpg|jpeg|gif|svg|ico)$/,
        loader: 'file-loader',
        options: {
          name: '[path][name].[ext]',
          outputPath: '/images/',
          emitFile: true,
          esModule: false,
        },
      },
      {
        test: /\.(woff(2)?|ttf|eot|svg)(\?v=\d+\.\d+\.\d+)?$/,
        loader: 'file-loader',
        options: {
          name: '[path][name].[ext]',
          outputPath: '/fonts/',
          emitFile: true,
          esModule: false,
        },
      },
    ],
  },
  plugins: [
    new Dotenv(),
    new webpack.DefinePlugin({
      global: 'window',
    }),
    new VueLoaderPlugin(),
    new MiniCssExtractPlugin({
      filename: '[name].css',
    }),
    new CopyPlugin([
      { from: 'icons', to: 'icons', ignore: ['icon.xcf'] },
      { from: 'popup/popup.html', to: 'popup/popup.html', transform: transformHtml },
      { from: 'options/options.html', to: 'options/options.html', transform: transformHtml },
      {
        from: 'manifest.json',
        to: 'manifest.json',
        transform: content => {
          const jsonContent = JSON.parse(content)
          jsonContent.version = version

          if (config.mode === 'development') {
            jsonContent.content_security_policy = "script-src 'self' 'unsafe-eval'; object-src 'self'"
          }

          return JSON.stringify(jsonContent, null, 2)
        },
      },
    ]),
  ],
}

if (config.mode === 'production') {
  config.plugins = (config.plugins || []).concat([
    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: '"production"',
      },
    }),
  ])
}

if (process.env.ANALYSIS === 'true') {
  config.plugins = (config.plugins || []).concat([
    new BundleAnalyzerPlugin(),
  ])
}

if (process.env.HMR === 'true') {
  config.plugins = (config.plugins || []).concat([
    new ExtensionReloader({
      manifest: path.resolve(__dirname, 'src/manifest.json'),
    }),
  ])
}

function transformHtml(content) {
  return ejs.render(content.toString(), {
    ...process.env,
  })
}

module.exports = config

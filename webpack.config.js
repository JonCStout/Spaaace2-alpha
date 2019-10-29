const path = require('path');
const fs = require('fs');

module.exports = {
    entry: './src/client/clientEntryPoint.js',
    output: {
        path: path.join(__dirname, 'dist'),
        filename: 'bundle.js'
    },
    mode: 'development',
    devtool: 'source-map',
    resolve: {
        symlinks: false
    },
    module: {
        rules: [
            { test: /\.css$/, loader: 'style!css' },
            {
                test: /\.scss$/,
                loader: ['style-loader', 'raw-loader', 'sass-loader']
            },
            {
                test: /\.js$/,
                include: [
                    path.resolve(__dirname, 'src'),
                    path.resolve(__dirname, 'node_modules/lance-gg/'),
                    fs.realpathSync('./node_modules/lance-gg/')
                ],
                use: [
                    { loader: 'thread-loader' },
                    { loader: 'cache-loader' },
                    {
                        loader: 'babel-loader',       
                        query: { presets: ['@babel/preset-env'].map(require.resolve) }
                    }
                ],
            }
        ]
    }
};
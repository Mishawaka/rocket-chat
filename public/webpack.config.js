const NODE_ENV = process.env.NODE_ENV || 'development';
const webpack = require('webpack');
var regex = /\.js$/;
module.exports = {
    entry: './js/components/'+regex,
    output: {
        filename: 'built.js' 
    },
    watch: NODE_ENV == 'development',
    watchOptions: {
        aggregateTimeout: 100
    },
    devtool: NODE_ENV == 'development' ? 'cheap-inline-module-source-map' : null,
    plugins: [
        new webpack.DefinePlugin({
            NODE_ENV: JSON.stringify(NODE_ENV),
            LANG: JSON.stringify('ru')
        })
    ],
    module: {
        loaders: [{
            test: /\.js$/,
            loader: 'babel?optional[]=runtime&stage=0'
        }]
    }
};
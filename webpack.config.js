const path = require('path');
const webpack = require("webpack");
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');


module.exports = () => {
    const mode = process.argv.find(arg => arg.includes('--mode'));
    const isDev = !mode || mode.split('=')[1] === 'development';

    // By default source-maps are created for development build and omitted for production builds.
    // When you want to control it separately use following const in your webpack config and set `--env=source-maps` as additional parameter in your `scripts` section of your package.json
    const useSourceMaps = !!process.argv.find(arg => arg.includes('--env=source-maps'));

    const sourceMapRule = isDev ? {
        test: /\.js$/,
        enforce: 'pre',
        use: ['source-map-loader'],
    } : {}

    return {
        // see here for different options: https://webpack.js.org/configuration/devtool/
        devtool: isDev ? 'eval-source-map' : undefined,
        target: 'web', // necessary for Hot reloading to work right now with newest webpack: See: https://github.com/webpack/webpack-dev-server/issues/2758
        entry: './projects/auto-buyer-foreground/src/index',
        output: {
            path: path.join(__dirname, '/dist/app'),
            filename: isDev ? '[name].js' : '[name].[contenthash:8].js',
            chunkFilename: isDev ? '[name].chunk.js' : '[name].[contenthash:8].chunk.js',
        },
        resolve: {
            extensions: ['.ts', '.tsx', '.js'],
            // alias used to access assets via '@assets' import
            alias: {
                "@assets": path.resolve(__dirname, 'src/assets/')
            }
        },

        module: {
            rules: [
                {
                    // Loader to transpile your ts and tsx files to js. Use .babelrc file for configuration
                    test: /\.(ts|js)x?$/,
                    exclude: /node_modules/,
                    use: {
                        loader: 'babel-loader'
                    },
                },
                {
                    // Loader to copy files to your dist/output folder
                    test: /\.(png|svg|jpg|jpeg|gif)$/i,
                    use: [{
                        loader: 'file-loader',
                        options: {
                            name: isDev ? '[name].[ext]' : '[name].[contenthash:8].[ext]',
                            outputPath: 'assets/'
                        }
                    }]
                },
                {
                    // Loader that allows using scss files
                    test: /\.s?css$/,
                    // Replace MiniCssExtractPlugin with 'style-loader' to have styles included in JS
                    use: [
                        MiniCssExtractPlugin.loader,
                        // 'style-loader',
                        'css-loader',
                        'sass-loader'
                    ]
                },
                sourceMapRule
            ]
        },
        plugins: [
            // Needed for working with hot reloading
            new webpack.HotModuleReplacementPlugin(),
            // To copy your index.html to the dist/output folder
            new HtmlWebpackPlugin({
                template: './src/index.html',
                favicon: './src/assets/favicon.ico'
            }),
            // Used for deleting dist/output folder before each build
            new CleanWebpackPlugin({ }),
            // Used to extract styles in separate css files.
            new MiniCssExtractPlugin({ chunkFilename: isDev ? '[name].css' : '[name].[contenthash:8].css' })
        ]
    };
}
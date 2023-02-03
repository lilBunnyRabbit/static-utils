const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");
const path = require("path");
const fs = require("fs");

const createView = (folder) => ({
  entry: `./src/views/${folder}/index.ts`,
  mode: "production",
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
      {
        test: /\.(sa|sc|c)ss$/,
        use: [MiniCssExtractPlugin.loader, "css-loader", "postcss-loader", "sass-loader"],
      },
    ],
  },
  resolve: {
    extensions: [".ts", ".js"],
  },
  output: {
    filename: "[hash].min.js",
    path: path.resolve(__dirname, `dist/${folder}`),
    clean: true,
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: "[contenthash].min.css",
    }),
    new HtmlWebpackPlugin({
      template: `./src/views/${folder}/index.html`,
    }),
  ],
  optimization: {
    minimize: true,
    minimizer: [new CssMinimizerPlugin()],
  },
});

const views = fs
  .readdirSync(path.resolve(__dirname, "src/views"))
  .filter((filename) => fs.statSync(path.resolve(__dirname, "src/views", filename)).isDirectory())
  .map(createView);

module.exports = [...views];

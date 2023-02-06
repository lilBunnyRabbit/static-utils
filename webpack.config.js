const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");
const path = require("path");
const fs = require("fs");

const viewPath = (...paths) => path.resolve(__dirname, "src/views", ...paths);

const devView = (folder) => ({
  entry: viewPath(`${folder}/index.ts`),
  mode: "development",
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
    filename: "index.js",
    path: path.resolve(__dirname, `dist/${folder}`),
    clean: true,
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: "index.css",
    }),
    new HtmlWebpackPlugin({
      template: viewPath(`${folder}/index.html`),
    }),
  ],
  optimization: {
    minimize: false,
  },
});

const prodView = (folder) => ({
  entry: viewPath(`${folder}/index.ts`),
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
    filename: "[contenthash].min.js",
    path: path.resolve(__dirname, `dist/${folder}`),
    clean: true,
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: "[contenthash].min.css",
    }),
    new HtmlWebpackPlugin({
      template: viewPath(`${folder}/index.html`),
    }),
  ],
  optimization: {
    minimize: true,
    minimizer: [new CssMinimizerPlugin(), new TerserPlugin()],
  },
});

const viewNames = fs.readdirSync(viewPath()).filter((filename) => fs.statSync(viewPath(filename)).isDirectory());

module.exports = ({ WEBPACK_WATCH }) => [...viewNames.map(WEBPACK_WATCH ? devView : prodView)];

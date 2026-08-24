import { minify } from 'html-minifier-terser';
import { defineConfig, type Plugin } from 'vite';

function minifyHtml(): Plugin {
  return {
    name: 'minify-html-output',
    apply: 'build',
    enforce: 'post',
    async generateBundle(_options, bundle) {
      await Promise.all(
        Object.values(bundle).map(async (asset) => {
          if (asset.type !== 'asset' || !asset.fileName.endsWith('.html')) return;
          asset.source = await minify(String(asset.source), {
            collapseBooleanAttributes: true,
            collapseWhitespace: true,
            minifyCSS: true,
            minifyJS: true,
            processScripts: ['application/ld+json'],
            removeComments: true,
            removeRedundantAttributes: true,
            useShortDoctype: true,
          });
        })
      );
    },
  };
}

export default defineConfig({
  plugins: [minifyHtml()],
});

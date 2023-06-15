import { fileURLToPath } from 'url';
import fs from 'node:fs';
import { rollup } from 'rollup';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';

const files = fileURLToPath(new URL('./files', import.meta.url).href);
const hookContent = `
import { get_hooks } from './internal.js';

async function initHook(httpServer) {
    const hooks = await get_hooks();
    const handler = hooks['setup'];
    handler(httpServer);
}

export { initHook };
`;

/** @type {import('.').default} */
export default function (options = {}) {
    const { out = 'build', precompress, envPrefix = '', polyfill = true } = options;

    return {
        name: 'sveltekit-adapter-custom',

        async adapt(builder) {
            const tmp = builder.getBuildDirectory('adapter-node');

            // cleanup
            builder.rimraf(out);
            builder.rimraf(tmp);
            builder.mkdirp(tmp);

            // copy assets
            builder.log.minor('Copying assets..');
            builder.writeClient(`${out}/client${builder.config.kit.paths.base}`);
            builder.writePrerendered(`${out}/prerendered${builder.config.kit.paths.base}`);

            // precompress
            if (precompress) {
                builder.log.minor('Compressing assets');
                const jobs = [builder.compress(`${out}/client`), builder.compress(`${out}/prerendered`)];
                await Promise.all(jobs);
            }

            // copy sveltekit server
            builder.log.minor('Copying server');
            builder.writeServer(tmp);

            // generate manifest
            builder.log.minor('Generating manifest..');
            let manifest = `export const manifest = ${builder.generateManifest({ relativePath: './' })};\n\n`;
            manifest += `export const prerendered = new Set(${JSON.stringify(builder.prerendered.paths)});\n`;
            fs.writeFileSync(`${tmp}/manifest.js`, manifest);

            // generate hook file
            builder.log.minor('Generating hook..');
            fs.writeFileSync(`${tmp}/hook.js`, hookContent);

            // build sveltekit server
            builder.log.minor('Building server');
            const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
            const bundle = await rollup({
                input: {
                    index: `${tmp}/index.js`,
                    manifest: `${tmp}/manifest.js`,
                    hook: `${tmp}/hook.js`,
                },
                external: [
                    // dependencies could have deep exports, so we need a regex
                    ...Object.keys(pkg.dependencies || {}).map((d) => new RegExp(`^${d}(\\/.*)?$`)),
                ],
                plugins: [
                    nodeResolve({
                        preferBuiltins: true,
                        exportConditions: ['node'],
                    }),
                    commonjs({ strictRequires: true }),
                    json(),
                ],
            });

            await bundle.write({
                dir: `${out}/server`,
                format: 'esm',
                sourcemap: true,
                chunkFileNames: 'chunks/[name]-[hash].js',
            });

            // build node server
            builder.copy(files, out, {
                replace: {
                    ENV: './env.js',
                    HANDLER: './handler.js',
                    MANIFEST: './server/manifest.js',
                    SERVER: './server/index.js',
                    SHIMS: './shims.js',
                    HOOK: './server/hook.js',
                    ENV_PREFIX: JSON.stringify(envPrefix),
                },
            });

            // If polyfills aren't wanted then clear the file
            if (!polyfill) {
                fs.writeFileSync(`${out}/shims.js`, '', 'utf-8');
            }

            // copy dependencies
            builder.log.minor('Copying dependencies..');
            fs.writeFileSync(
                `${out}/package.json`,
                JSON.stringify({
                    ...pkg,
                    private: pkg.private ?? true,
                    type: pkg.type ?? 'module',
                    name: pkg.name || 'sveltekit-custom-server',
                    version: pkg.version || '1.0.0',
                    main: pkg.main || 'index.js',
                })
            );
        },
    };
}

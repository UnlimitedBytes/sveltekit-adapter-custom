// @ts-ignore
import { fileURLToPath } from 'url';
import fs from 'node:fs';
import path from 'node:path';
import { rollup } from 'rollup';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';

const files = fileURLToPath(new URL('./files', import.meta.url).href);

/** @type {import('.').default} */
export default function (options = {}) {
    // @ts-ignore
    const { out = 'build', precompress, envPrefix = '', polyfill = true } = options;

    return {
        name: 'sveltekit-adapter-custom',

        async adapt(builder) {
            const tmp = builder.getBuildDirectory('adapter-node');

            // TODO: extract all of this blocks in own functions
            {
                builder.rimraf(out);
                builder.rimraf(tmp);
                builder.mkdirp(tmp);
            }

            {
                builder.log.minor('Copying assets..');
                builder.writeClient(`${out}/client${builder.config.kit.paths.base}`);
                builder.writePrerendered(`${out}/prerendered${builder.config.kit.paths.base}`);
            }

            if (precompress) {
                builder.log.minor('Compressing assets');
                const jobs = [builder.compress(`${out}/client`), builder.compress(`${out}/prerendered`)];
                await Promise.all(jobs);
            }

            {
                builder.log.minor('Generating manifest..');
                let manifest = `export const manifest = ${builder.generateManifest({ relativePath: './' })};\n\n`;
                manifest += `export const prerendered = new Set(${JSON.stringify(builder.prerendered.paths)});\n`;
                fs.writeFileSync(`${tmp}/manifest.js`, manifest);
            }

            {
                builder.log.minor('Building server');
                builder.writeServer(tmp);

                const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
                const bundle = await rollup({
                    input: {
                        index: `${tmp}/index.js`,
                        manifest: `${tmp}/manifest.js`,
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

                builder.copy(files, out, {
                    replace: {
                        ENV: './env.js',
                        HANDLER: './handler.js',
                        MANIFEST: './server/manifest.js',
                        SERVER: './server/index.js',
                        SHIMS: './shims.js',
                        ENV_PREFIX: JSON.stringify(envPrefix),
                    },
                });
            }

            // If polyfills aren't wanted then clear the file
            if (!polyfill) {
                fs.writeFileSync(`${out}/shims.js`, '', 'utf-8');
            }

            // TODO: extract this block in it's own function too
            builder.log.minor('Copying dependencies..');
            let packageJson = null;
            try {
                const packageJsonContent = fs.readFileSync(path.resolve('./package.json'), {
                    encoding: 'utf-8',
                });
                packageJson = JSON.parse(packageJsonContent);
            } catch (
                /** @type {any} */
                error
            ) {
                builder.log.error("Couldn't load package.json from your sveltekit project.");
                builder.log.error(error);
                return;
            }

            fs.writeFileSync(
                `${out}/package.json`,
                JSON.stringify({
                    ...packageJson,
                    private: packageJson.private ?? true,
                    type: packageJson.type ?? 'module',
                    name: packageJson.name || 'sveltekit-custom-server',
                    version: packageJson.version || '1.0.0',
                    main: 'index.js',
                    dependencies: {
                        ...(packageJson.dependencies || {}),
                    },
                })
            );
        },
    };
}

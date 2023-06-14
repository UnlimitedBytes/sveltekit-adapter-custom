import { fileURLToPath } from 'url';
import fs from 'node:fs';
import path from 'node:path';

const files = fileURLToPath(new URL('./files', import.meta.url).href);

/** @type {import('.').default} */
export default function (options = {}) {
    const { out = 'build', precompress, envPrefix = '', polyfill = true } = options;

    return {
        name: 'sveltekit-adapter-custom',

        async adapt(builder) {
            builder.rimraf(out);

            builder.log.minor('Copying assets..');
            builder.writeClient(`${out}/client`);
            builder.writeServer(`${out}/server`);
            builder.writePrerendered(`${out}/prerendered`);

            builder.log.minor('Copying dependencies..');
            let packageJson = null;
            try {
                const packageJsonContent = fs.readFileSync(path.resolve('./package.json'), {
                    encoding: 'utf-8',
                });
                packageJson = JSON.parse(packageJsonContent);
            } catch (error) {
                builder.log.error("Couldn't load package.json from your sveltekit project.");
                builder.log.error(error);
                return;
            }

            fs.writeFileSync(
                `${out}/package.json`,
                JSON.stringify({
                    private: true,
                    type: 'module',
                    name: packageJson.name,
                    version: packageJson.version,
                    main: 'index.js',
                    dependencies: {
                        ...(packageJson.dependencies || {}),
                        '@sveltejs/kit': '^1.0.0-next.377',
                        'mrmime': '^1.0.1',
                        'totalist': '^3.0.0',
                    },
                })
            );

            builder.log.minor('Generating manifest..');
            fs.writeFileSync(
                `${out}/manifest.js`,
                `export const manifest = ${builder.generateManifest({
                    relativePath: './server',
                })};\n`
            );

            builder.log.minor('Generating configuration..');
            fs.writeFileSync(`${out}/config.js`, `export const config = ${JSON.stringify({})};\n`);

            // builder.log.minor('Generating Server..');
            // builder.copy(files, out, {
            //     replace: {
            //         SERVER: './server/index.js',
            //         MANIFEST: './manifest.js',
            //     },
            // });
        },
    };
}

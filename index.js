// @ts-ignore
import { fileURLToPath } from 'url';
import fs from 'node:fs';
import path from 'node:path';

// @ts-ignore
const files = fileURLToPath(new URL('./files', import.meta.url).href);

/** @type {import('.').default} */
export default function (options = {}) {
    // @ts-ignore
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

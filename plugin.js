import { readFileSync } from 'fs';

const sym = 'sveltekit-adapter-custom.http-server';

/** @returns {import('./plugin').default} */
export default function () {
    let command;
    let root;

    return {
        name: 'sveltekit-adapter-custom',

        configResolved(config) {
            command = config.command;
            root = config.root;
        },

        configureServer({ httpServer }) {
            globalThis[Symbol.for(sym)] = httpServer;
        },

        configurePreviewServer({ httpServer }) {
            globalThis[Symbol.for(sym)] = httpServer;
        },

        load(file) {
            if (command !== 'build' && file === `${root}/src/hooks.server.ts`) {
                const lines = readFileSync(file, 'utf-8').split('\n');
                lines.push('');
                lines.push(`setup(globalThis[Symbol.for('${sym}')]);`);
                lines.push('');

                return { code: lines.join('\n') };
            }
        },
    };
}

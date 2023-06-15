import type { Polka } from 'polka';
import type { Adapter } from '@sveltejs/kit';
import type { Server as HTTPServer } from 'http';

declare global {
    export const ENV_PREFIX: string;

    export namespace globalThis {
        var httpServer: Promise<Polka>;
    }
}

interface AdapterOptions {
    out?: string;
    precompress?: boolean;
    envPrefix?: string;
    polyfill?: boolean;
}

export type SetupHook = (httpServer: HTTPServer) => Promise<void>;

export default function adapter(options?: AdapterOptions): Adapter;

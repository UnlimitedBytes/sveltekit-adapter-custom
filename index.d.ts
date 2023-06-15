import type { Adapter } from '@sveltejs/kit';

declare global {
    const ENV_PREFIX: string;
}

interface AdapterOptions {
    out?: string;
    precompress?: boolean;
    envPrefix?: string;
    polyfill?: boolean;
}

export default function plugin(options?: AdapterOptions): Adapter;

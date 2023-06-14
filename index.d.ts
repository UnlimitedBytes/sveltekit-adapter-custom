import type { Adapter } from '@sveltejs/kit';

interface AdapterOptions {
    out?: string;
    precompress?: boolean;
    envPrefix?: string;
    polyfill?: boolean;
}

export default function plugin(options?: AdapterOptions): Adapter;

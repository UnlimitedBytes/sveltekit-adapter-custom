import 'SHIMS';
import fs from 'node:fs';
import path from 'node:path';
import sirv from 'sirv';
import { fileURLToPath } from 'node:url';
import { parse as polka_url_parser } from '@polka/url';
import { getRequest, setResponse } from '@sveltejs/kit/node';
// @ts-expect-error
import { Server } from 'SERVER';
// @ts-expect-error
import { manifest, prerendered } from 'MANIFEST';
// @ts-expect-error
import { env } from 'ENV';

const server = new Server(manifest);
await server.init({ env: process.env });
const origin = env('ORIGIN', undefined);
const xff_depth = parseInt(env('XFF_DEPTH', '1'));
const address_header = env('ADDRESS_HEADER', '').toLowerCase();
const protocol_header = env('PROTOCOL_HEADER', '').toLowerCase();
const host_header = env('HOST_HEADER', 'host').toLowerCase();
const body_size_limit = parseInt(env('BODY_SIZE_LIMIT', '524288'));

const dir = path.dirname(fileURLToPath(import.meta.url));

/**
 * @param {string} path
 * @param {boolean} client
 */
function serve(path, client = false) {
    /** @type {import('sirv').Options} */
    let options = {
        etag: true,
        gzip: true,
        brotli: true,
    };

    if (client) {
        options.setHeaders = (res, pathname) => {
            // only apply to build directory, not e.g. version.json
            if (pathname.startsWith(`/${manifest.appPath}/immutable/`) && res.statusCode === 200) {
                res.setHeader('cache-control', 'public,max-age=31536000,immutable');
            }
        };
    }
    return fs.existsSync(path) && sirv(path, options);
}

// required because the static file server ignores trailing slashes
/** @returns {import('polka').Middleware} */
function serve_prerendered() {
    const handler = serve(path.join(dir, 'prerendered'));

    return (req, res, next) => {
        let { pathname, search, query } = polka_url_parser(req);

        try {
            pathname = decodeURIComponent(pathname);
        } catch {
            // ignore invalid URI
        }

        if (prerendered.has(pathname)) {
            // TODO: check if this can error and remove ts-ignore
            // @ts-ignore
            return handler(req, res, next);
        }

        // remove or add trailing slash as appropriate
        let location = pathname.at(-1) === '/' ? pathname.slice(0, -1) : pathname + '/';
        if (prerendered.has(location)) {
            if (query) location += search;
            res.writeHead(308, { location }).end();
        } else {
            next();
        }
    };
}

/** @type {import('polka').Middleware} */
const ssr = async (req, res) => {
    /** @type {Request | undefined} */
    let request;

    try {
        request = await getRequest({
            base: origin || get_origin(req.headers),
            request: req,
            bodySizeLimit: body_size_limit,
        });
    } catch (err) {
        // TODO: check if error always is what we expect and type it.
        // @ts-ignore
        res.statusCode = err.status || 400;
        res.end('Invalid request body');
        return;
    }

    if (address_header && !(address_header in req.headers)) {
        throw new Error(
            `Address header was specified with ${
                ENV_PREFIX + 'ADDRESS_HEADER'
            }=${address_header} but is absent from request`
        );
    }

    setResponse(
        res,
        await server.respond(request, {
            platform: { req },
            getClientAddress: () => {
                if (address_header) {
                    const value = /** @type {string} */ (req.headers[address_header]) || '';

                    if (address_header === 'x-forwarded-for') {
                        const addresses = value.split(',');

                        if (xff_depth < 1) {
                            throw new Error(`${ENV_PREFIX + 'XFF_DEPTH'} must be a positive integer`);
                        }

                        if (xff_depth > addresses.length) {
                            throw new Error(
                                `${ENV_PREFIX + 'XFF_DEPTH'} is ${xff_depth}, but only found ${
                                    addresses.length
                                } addresses`
                            );
                        }
                        // TODO: check why this can be undefined and fix it or add a check for it
                        // @ts-ignore
                        return addresses[addresses.length - xff_depth].trim();
                    }

                    return value;
                }

                // TODO: deprecated stuff may should be removed?
                // discuss if we want to break adapter-node compatibility here or not
                return (
                    req.connection?.remoteAddress ||
                    // @ts-expect-error
                    req.connection?.socket?.remoteAddress ||
                    req.socket?.remoteAddress ||
                    // @ts-expect-error
                    req.info?.remoteAddress
                );
            },
        })
    );
};

/** @param {import('polka').Middleware[]} handlers */
function sequence(handlers) {
    /** @type {import('polka').Middleware} */
    return (req, res, next) => {
        /**
         * @param {number} i
         * @returns {ReturnType<import('polka').Middleware>}
         */
        function handle(i) {
            if (i < handlers.length) {
                // TODO: check why this is undefined - fix typing or add check for it
                // @ts-ignore
                return handlers[i](req, res, () => handle(i + 1));
            } else {
                return next();
            }
        }

        return handle(0);
    };
}

/**
 * @param {import('http').IncomingHttpHeaders} headers
 * @returns
 */
function get_origin(headers) {
    const protocol = (protocol_header && headers[protocol_header]) || 'https';
    const host = headers[host_header];
    return `${protocol}://${host}`;
}

export const handler = sequence(
    // TODO: I don't know what to say... make this cleaner and fix possible issues..
    // @ts-ignore
    [serve(path.join(dir, 'client'), true), serve(path.join(dir, 'static')), serve_prerendered(), ssr].filter(Boolean)
);

# sveltekit-adapter-custom &middot; [![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

`sveltekit-adapter-custom` is the openest SvelteKit adapter in town.

## 📖 Table of Contents

-   [📢 IMPORTANT NOTICE](#-important-notice)
-   [👋 Introduction](#-introduction)
-   [🎩 Acknowledgements](#-acknowledgements)
-   [📖 Docs](#-docs)
    -   [📦 Getting Started](#-getting-started)
    -   [🚀 Deployment](#-deployment)
-   [💻 Technologies](#-technologies)
-   [📝 Ways to contribute](#-ways-to-contribute)
-   [🏋️ Motivation](#%EF%B8%8F-motivation)
-   [📄 License](#-license)

## 📢 IMPORTANT NOTICE

**This adapter heavily modifies SvelteKit's internal workings and build process also it's still in alpha.**

Because of the way this package achives it's goals and the maintainers of SvelteKit disagreeing with the
idea of an open node framework ([Reference](https://github.com/sveltejs/kit/issues/334#issuecomment-804543781)).
We need to do a fair amount of modifications to the internal workings of SvelteKit, especially to the build process
in order to make this package work.

Therefore it's extremly likely that new releases of SvelteKit (especially major releases) will not directly work with it.
**We try to update the adapter ASAP when breaking changes arrive in SvelteKit.** Still it's more than possible that
this adapter isn't directly compatible with the newest SvelteKit version. Especially shortly after an SvelteKit update.

Also another important part is that this adapter package is currently in **alpha**. We are still continuously adding new
features, improving existing ones, as well as introducing breaking changes. We try to keep the amount of breaking changes
as low as possible but it's likely that even not major releases will still introduce some.

**That said when you still want to test out the adapter we highly recommend you, for the time being, to pin your SvelteKit
version as well as the version of this adapter package.**

## 👋 Introduction

`sveltekit-adapter-custom` is a SvelteKit adapter based on the `@sveltejs/adapter-node` build because of a strong disagree
with the maintainers of `adapter-node` ([Refer to motivation](#-motivation)). It's goal is to be a drop in replacement for
users which want to customize the underlying server to their liking. In order to achive this it gives it's users access to
a wide variety of custom options and custom hooks.

## 🎩 Acknowledgements

**A big shoutout to [@dmoebius](https://github.com/dmoebius)** which wrote a beautiful
[comment](https://github.com/sveltejs/kit/issues/927#issuecomment-1589404762) on injecting custom code into all three
environments of SvelteKit's workflow (dev, preview and production).

**And a big shoutout to [@carlosV2](https://github.com/carlosV2)** which released an awesome SvelteKit
[adapter](https://github.com/carlosV2/adapter-node-ws) to inject a `ws` websocket server into SvelteKit.

## 📖 Docs

> **NOTICE**: The documentation is currently not complete.

For more information refer to the
original [adapter-node Documentation](https://kit.svelte.dev/docs/adapter-node). Which is mostly valid for this adapter
too.

### 📦 Getting Started

Simply run `npm i -D sveltekit-adapter-custom`, change the adapter in your `svelte.config.js`:

```js
// svelte.config.js
import adapter from 'sveltekit-adapter-custom';

/** @type {import('@sveltejs/kit').Config} */
const config = {
    // ...
    kit: {
        adapter: adapter(),
    },
};

export default config;
```

install the vite plugin to your `vite.config.js`

```js
// vite.config.js
import { sveltekit } from '@sveltejs/kit/vite';
import svelteKitCustom from 'sveltekit-adapter-custom/plugin';
import { defineConfig } from 'vite';

export default defineConfig({
    // ...
    plugins: [sveltekit(), svelteKitCustom()],
});
```

and add the provided hooks to your `hooks.server.js` file:

```js
// hooks.server.js
// ...
/** @type {import('sveltekit-adapter-custom').SetupHook} */
export const setup = async (httpServer) => {
    // run your custom setup
};
```

### 🚀 Deployment

You just need the output directory (`build` by default) and the production dependencies to run the application.
Production dependencies can be installed with the command `npm install --production` inside your output directory.
You can then start your app with:

```sh
$ node index.js # inside your output directory
```

Your development dependencies get automatically bundled when needed.

## 💻 Technologies

## 📝 Ways to contribute

Everyone interested in contributing should read the [Code of Conduct][code_of_conduct].

Developers interested in contributing should also read the [Contribution Guide][contributing].

Aside from code contributions that make the project better, there are a few other specific ways that you can contribute to this project.

-   [☕ Buy me a coffee][coffee]

-   [💡 Submit your idea][new_issue]

## 🏋️ Motivation

This adapter was created because SvelteKit's maintainers don't like the idea of SvelteKit being an open node.js framework
([Reference](https://github.com/sveltejs/kit/issues/334#issuecomment-804543781)). While users wanting to add established
node.js libraries or custom functionality to their node.js based SvelteKit applications.

## 📄 License

All parts of this project are free to use and abuse under the open-source [MIT License](LICENSE).

Copyright 2023 &copy; UnlimitedBytes

[coffee]: https://www.buymeacoffee.com/unlimitedbytes
[new_issue]: https://github.com/UnlimitedBytes/sveltekit-adapter-custom/issues/new
[code_of_conduct]: CODE_OF_CONDUCT.md
[contributing]: CONTRIBUTING.md
[svelte_kit]: https://kit.svelte.dev/

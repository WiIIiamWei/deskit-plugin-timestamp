# DesKit Plugin Template

Starter template for building a [DesKit](https://github.com/WiIIiamWei/DesKit) plugin. Click **"Use this template"** on GitHub to create your own plugin repository, then edit `deskit.json` and `src/index.ts`.

A DesKit plugin is a declarative command provider: it registers commands, returns UI _descriptions_ (list / detail / form / toast), and the DesKit host renders them. Plugins never touch the DOM, never bundle a UI framework, and run in a lightweight sandbox in the host's main process.

## Layout

```
deskit.json                 # manifest: id, commands, permissions, engines
src/index.ts                # your plugin — exports { commands }
types/deskit-plugin-sdk.d.ts# vendored @deskit/plugin-sdk types (no install needed)
schema/                     # manifest JSON schema (editor + CI validation)
scripts/                    # validate + pack helpers
.github/workflows/          # ci.yml (PR gate) + release.yml (tag → .deskit)
```

The SDK is **types-only** and is not published to npm — this template vendors its type surface as an ambient declaration, so `import type { PluginModule } from "@deskit/plugin-sdk"` just works and the build erases it.

## Develop

```bash
npm install
npm run typecheck   # tsc --noEmit against the vendored SDK types
npm run build       # esbuild → dist/index.js (CJS, what the host loads)
npm run validate    # check deskit.json against the manifest schema
npm run check       # all three above
```

Edit `src/index.ts`. Each command id must match a `contributes.commands[].id` in `deskit.json`. The module's default export must be `{ commands: {...} }` — the host loads it as CommonJS (`module.exports`).

## Publish

1. Bump `version` in `deskit.json`.
2. Tag and push:

   ```bash
   git tag v0.1.0
   git push --tags
   ```

   The `release` workflow typechecks, builds, validates, packs a `<id>-<version>.deskit` computes its SHA-256, and attaches both to a GitHub Release.

3. List it on the marketplace: open a PR to [DesKit-Marketplace](https://github.com/WiIIiamWei/DesKit-Marketplace) adding `plugins/<your-id>.json` with the Release asset's `downloadUrl` and the `sha256` from the release output.

## Manifest notes

- `engines.deskit` — semver range of DesKit host versions you support (e.g. `^0.1.0`). The host refuses plugins outside this range.
- `permissions` — declare what your plugin uses (`clipboard:read`, `clipboard:write`, `notification`, `system:open-url`, `system:open-path`, `system:capture-screen`, `storage:plugin`). Calling an API without its permission throws at runtime.
- `mode` per command — `"view"` shows a view; `"no-view"` is fire-and-forget (return a `toast`).

## License

MIT — see `LICENSE`. Re-license your own plugin as you wish.

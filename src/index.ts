import type { ListView, PluginModule } from "@deskit/plugin-sdk"

// A minimal DesKit plugin. Replace the command id, the manifest in
// deskit.json, and this logic with your own. The host loads the built
// CJS bundle and reads `module.exports.commands`.
const plugin: PluginModule = {
  commands: {
    // The command id MUST match a `contributes.commands[].id` in deskit.json.
    "hello.greet": {
      // `run` is required — called when the command is activated. The
      // trailing launcher token is passed as `initialQuery`.
      run({ initialQuery }, ctx) {
        return makeView(initialQuery ?? "", ctx.locale)
      },
      // Optional — called as the user types in the command's search box.
      onSearchChange(text, ctx) {
        return makeView(text, ctx.locale)
      },
    },
  },
}

function makeView(text: string, _locale: string): ListView {
  const trimmed = text.trim()
  const greeting = trimmed ? `Hello, ${trimmed}!` : "Hello, DesKit!"
  return {
    type: "list",
    searchPlaceholder: "Type a name…",
    emptyText: { en: "Type something", "zh-CN": "输入点什么" },
    items: [
      {
        id: "greeting",
        title: greeting,
        subtitle: { en: "Press Enter to copy", "zh-CN": "回车复制" },
        actions: [{ type: "copy", value: greeting }],
      },
    ],
  }
}

// The host loads plugins as CommonJS. Compile to CJS and export the module
// object — `export = plugin` (TS) becomes `module.exports = plugin` (JS).
export = plugin

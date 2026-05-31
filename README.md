# DesKit Timestamp Converter

Timestamp Converter is a DesKit plugin for converting between Unix timestamps and readable dates directly from the launcher.

## Features

- Converts Unix timestamps to dates.
- Converts readable date strings back to seconds and milliseconds.
- Detects seconds vs. milliseconds automatically.
- Lets you override timestamp parsing with `unit=seconds`, `unit=milliseconds`, `123s`, or `123ms`.
- Supports time zone display with `tz=<IANA time zone>`, for example `tz=UTC` or `tz=Asia/Shanghai`.
- Provides copy actions for date time, seconds, milliseconds, and ISO UTC output.

## Usage

Open DesKit, run **Convert Timestamp**, then type one of:

```text
1717027200
1717027200000
2026-05-31 12:30
2026-05-31T12:30:00Z tz=Asia/Shanghai
1717027200 unit=seconds
```

The plugin also exposes **Input timestamp unit** and **Default time zone** preferences in DesKit's plugin settings page.

## Develop

```bash
npm install
npm run check
npm run pack
```

The package script writes `release/com.deskit.timestamp-0.2.0.deskit` and a matching `.sha256` file.

## Publish

```bash
git tag v0.2.0
git push --tags
```

The release workflow builds the `.deskit` package and attaches it to the GitHub Release. Submit the generated release asset URL and SHA-256 to [DesKit-Marketplace](https://github.com/WiIIiamWei/DesKit-Marketplace).

## License

MIT — see `LICENSE`.

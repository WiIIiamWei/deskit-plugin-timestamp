import type { ListItem, ListView, PluginContext, PluginModule } from "@deskit/plugin-sdk"

const COMMAND_ID = "timestamp.convert"
const DEFAULT_TIME_ZONE = "local"
const DEFAULT_TIMESTAMP_UNIT: TimestampUnit = "auto"
const COMMON_TIME_ZONES = [
  "UTC",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Europe/London",
  "America/New_York",
  "America/Los_Angeles",
]

const plugin: PluginModule = {
  commands: {
    [COMMAND_ID]: {
      run({ initialQuery }, ctx) {
        return makeView(initialQuery ?? "", ctx)
      },
      onSearchChange(text, ctx) {
        return makeView(text, ctx)
      },
    },
  },
}

function makeView(rawInput: string, ctx: PluginContext): ListView {
  const locale = normalizeLocale(ctx.locale)
  const parsed = parseQuery(rawInput, defaultTimeZone(ctx), defaultTimestampUnit(ctx))
  const now = new Date()

  const sections = [
    {
      title: t(locale, "Result", "转换结果"),
      items: resultItems(parsed, locale),
    },
    {
      title: t(locale, "Current time", "当前时间"),
      items: timestampItems(now, parsed.timeZone, locale, "now"),
    },
    {
      title: t(locale, "Time zone hints", "时区提示"),
      items: timeZoneHintItems(parsed.timeZone, locale),
    },
  ].filter((section) => section.items.length > 0)

  return {
    type: "list",
    searchPlaceholder: t(
      locale,
      "Try 1717027200, 1717027200000, 2026-05-31 12:30, or tz=UTC",
      "试试 1717027200、1717027200000、2026-05-31 12:30 或 tz=UTC"
    ),
    emptyText: t(locale, "Type a timestamp or date", "输入时间戳或日期"),
    sections,
  }
}

function resultItems(parsed: ParsedQuery, locale: Locale): ListItem[] {
  if (!parsed.main) {
    return [
      {
        id: "usage",
        title: t(locale, "Type a timestamp or date to convert", "输入时间戳或日期进行转换"),
        subtitle: t(
          locale,
          "Supports seconds, milliseconds, ISO dates, and tz=Asia/Shanghai",
          "支持秒、毫秒、ISO 日期和 tz=Asia/Shanghai"
        ),
        icon: "lucide:clock",
        actions: [],
      },
    ]
  }

  if (!parsed.main.ok) {
    return [
      {
        id: "invalid",
        title: t(locale, "Could not parse input", "无法解析输入"),
        subtitle: parsed.main.message,
        icon: "lucide:alert-circle",
        actions: [],
      },
    ]
  }

  return timestampItems(parsed.main.date, parsed.timeZone, locale, "result")
}

function timestampItems(date: Date, timeZone: string, locale: Locale, prefix: string): ListItem[] {
  const seconds = Math.floor(date.getTime() / 1000).toString()
  const milliseconds = date.getTime().toString()
  const zoned = formatDateTime(date, timeZone, locale)
  const iso = date.toISOString()

  return [
    copyItem({
      id: `${prefix}:datetime`,
      title: zoned,
      subtitle: t(locale, `Date time · ${timeZoneLabel(timeZone)}`, `日期时间 · ${timeZoneLabel(timeZone)}`),
      value: zoned,
      icon: "lucide:calendar-clock",
      locale,
    }),
    copyItem({
      id: `${prefix}:seconds`,
      title: seconds,
      subtitle: t(locale, "Unix timestamp in seconds", "Unix 秒级时间戳"),
      value: seconds,
      icon: "lucide:hash",
      locale,
    }),
    copyItem({
      id: `${prefix}:milliseconds`,
      title: milliseconds,
      subtitle: t(locale, "Unix timestamp in milliseconds", "Unix 毫秒级时间戳"),
      value: milliseconds,
      icon: "lucide:hash",
      locale,
    }),
    copyItem({
      id: `${prefix}:iso`,
      title: iso,
      subtitle: t(locale, "ISO 8601 UTC", "ISO 8601 UTC 时间"),
      value: iso,
      icon: "lucide:globe",
      locale,
    }),
  ]
}

function timeZoneHintItems(activeTimeZone: string, locale: Locale): ListItem[] {
  return COMMON_TIME_ZONES.map((zone) => {
    const query = `tz=${zone}`
    return copyItem({
      id: `tz:${zone}`,
      title: zone,
      subtitle:
        zone === activeTimeZone
          ? t(locale, "Current conversion time zone", "当前转换时区")
          : t(locale, `Copy "${query}" and append it to your query`, `复制 "${query}" 并追加到查询中`),
      value: query,
      icon: "lucide:globe-2",
      locale,
    })
  })
}

function copyItem({
  icon,
  id,
  locale,
  subtitle,
  title,
  value,
}: {
  icon: string
  id: string
  locale: Locale
  subtitle: string
  title: string
  value: string
}): ListItem {
  return {
    id,
    title,
    subtitle,
    icon,
    actions: [
      {
        type: "copy",
        label: t(locale, "Copy", "复制"),
        value,
      },
    ],
  }
}

function parseQuery(
  rawInput: string,
  fallbackTimeZone: string,
  fallbackTimestampUnit: TimestampUnit
): ParsedQuery {
  const input = rawInput.trim()
  const timeZone = extractTimeZone(input, fallbackTimeZone)
  const timestampUnit = extractTimestampUnit(input, fallbackTimestampUnit)
  const cleaned = input
    .replace(/\b(?:tz|timezone|zone)=("[^"]+"|'[^']+'|[^\s]+)/gi, "")
    .replace(/\b(?:unit|input-unit)=("[^"]+"|'[^']+'|[^\s]+)/gi, "")
    .replace(/\s+/g, " ")
    .trim()

  if (!cleaned) return { main: null, timeZone }

  const timestamp = parseTimestamp(cleaned, timestampUnit)
  if (timestamp) return { main: timestamp, timeZone }

  const date = parseDateInput(cleaned, timeZone)
  if (date) return { main: { ok: true, date }, timeZone }

  return {
    main: {
      ok: false,
      message: `Unsupported date or timestamp: ${cleaned}`,
    },
    timeZone,
  }
}

function parseTimestamp(input: string, defaultUnit: TimestampUnit): ParsedMain | null {
  const normalized = input.replace(/[,，_\s]/g, "")
  const match = /^([+-]?\d+(?:\.\d+)?)(ms|s)?$/i.exec(normalized)
  if (!match) return null

  const numeric = match[1]
  const value = Number(numeric)
  if (!Number.isFinite(value)) {
    return {
      ok: false,
      message: `Timestamp is too large: ${input}`,
    }
  }

  const digits = numeric.replace(/^[+-]/, "").replace(/\..*$/, "").length
  const unit = timestampUnitFromSuffix(match[2]) ?? inferTimestampUnit(digits, defaultUnit)
  const milliseconds = unit === "seconds" ? value * 1000 : value
  const date = new Date(milliseconds)

  if (Number.isNaN(date.getTime())) {
    return {
      ok: false,
      message: `Timestamp is outside the supported Date range: ${input}`,
    }
  }

  return { ok: true, date }
}

function parseDateInput(input: string, timeZone: string): Date | null {
  const normalized = normalizeDateInput(input)
  if (!hasExplicitTimeZone(normalized)) {
    const localParts = parseLocalDateTimeParts(normalized)
    if (localParts) {
      const zonedDate =
        timeZone === DEFAULT_TIME_ZONE
          ? new Date(
              localParts.year,
              localParts.month - 1,
              localParts.day,
              localParts.hour,
              localParts.minute,
              localParts.second,
              localParts.millisecond
            )
          : zonedTimeToUtc(localParts, timeZone)
      return Number.isNaN(zonedDate.getTime()) ? null : zonedDate
    }
  }

  const date = new Date(normalized)
  return Number.isNaN(date.getTime()) ? null : date
}

function normalizeDateInput(input: string): string {
  let normalized = input.trim()
  normalized = normalized.replace(/^(\d{4})[./](\d{1,2})[./](\d{1,2})/, "$1-$2-$3")
  if (/^\d{4}-\d{1,2}-\d{1,2}\s+\d{1,2}:\d{2}/.test(normalized)) {
    normalized = normalized.replace(/\s+/, "T")
  }
  return normalized
}

function extractTimeZone(input: string, fallback: string): string {
  const match = /\b(?:tz|timezone|zone)=("[^"]+"|'[^']+'|[^\s]+)/i.exec(input)
  const candidate = unquote(match?.[1] ?? "")
  if (candidate && isValidTimeZone(candidate)) return candidate
  return fallback
}

function extractTimestampUnit(input: string, fallback: TimestampUnit): TimestampUnit {
  const match = /\b(?:unit|input-unit)=("[^"]+"|'[^']+'|[^\s]+)/i.exec(input)
  return normalizeTimestampUnit(unquote(match?.[1] ?? "")) ?? fallback
}

function defaultTimeZone(ctx: PluginContext): string {
  const preferred = ctx.preferences.defaultTimeZone
  return typeof preferred === "string" && isValidTimeZone(preferred) ? preferred : DEFAULT_TIME_ZONE
}

function defaultTimestampUnit(ctx: PluginContext): TimestampUnit {
  const preferred = ctx.preferences.timestampUnit
  return typeof preferred === "string"
    ? normalizeTimestampUnit(preferred) ?? DEFAULT_TIMESTAMP_UNIT
    : DEFAULT_TIMESTAMP_UNIT
}

function normalizeTimestampUnit(value: string): TimestampUnit | null {
  const normalized = value.toLowerCase()
  if (normalized === "auto") return "auto"
  if (normalized === "second" || normalized === "seconds" || normalized === "s") return "seconds"
  if (normalized === "millisecond" || normalized === "milliseconds" || normalized === "ms") {
    return "milliseconds"
  }
  return null
}

function timestampUnitFromSuffix(value: string | undefined): TimestampUnit | null {
  if (!value) return null
  return value.toLowerCase() === "s" ? "seconds" : "milliseconds"
}

function inferTimestampUnit(digits: number, defaultUnit: TimestampUnit): Exclude<TimestampUnit, "auto"> {
  if (defaultUnit !== "auto") return defaultUnit
  return digits <= 10 ? "seconds" : "milliseconds"
}

function formatDateTime(date: Date, timeZone: string, locale: Locale): string {
  const formatter = new Intl.DateTimeFormat(locale === "zh-CN" ? "zh-CN" : "en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: timeZone === DEFAULT_TIME_ZONE ? undefined : timeZone,
    timeZoneName: "short",
  })
  return formatter.format(date)
}

function isValidTimeZone(value: string): boolean {
  if (value === DEFAULT_TIME_ZONE) return true
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format(0)
    return true
  } catch {
    return false
  }
}

function hasExplicitTimeZone(value: string): boolean {
  return /(?:z|[+-]\d{2}:?\d{2})$/i.test(value)
}

function parseLocalDateTimeParts(input: string): DateTimeParts | null {
  const match =
    /^(\d{4})-(\d{1,2})-(\d{1,2})(?:T(\d{1,2})(?::(\d{1,2})(?::(\d{1,2})(?:\.(\d{1,3}))?)?)?)?$/.exec(
      input
    )
  if (!match) return null

  const parts = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4] ?? 0),
    minute: Number(match[5] ?? 0),
    second: Number(match[6] ?? 0),
    millisecond: Number((match[7] ?? "0").padEnd(3, "0")),
  }
  if (
    parts.month < 1 ||
    parts.month > 12 ||
    parts.day < 1 ||
    parts.day > 31 ||
    parts.hour > 23 ||
    parts.minute > 59 ||
    parts.second > 59
  ) {
    return null
  }
  return parts
}

function zonedTimeToUtc(parts: DateTimeParts, timeZone: string): Date {
  const targetUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
    parts.millisecond
  )
  let candidate = new Date(targetUtc)

  for (let i = 0; i < 3; i += 1) {
    const actual = formatPartsInTimeZone(candidate, timeZone)
    const actualUtc = Date.UTC(
      actual.year,
      actual.month - 1,
      actual.day,
      actual.hour,
      actual.minute,
      actual.second,
      parts.millisecond
    )
    candidate = new Date(candidate.getTime() + targetUtc - actualUtc)
  }

  return candidate
}

function formatPartsInTimeZone(date: Date, timeZone: string): DateTimeParts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    hourCycle: "h23",
    timeZone,
  })
  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, part.value])
  )
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
    millisecond: date.getMilliseconds(),
  }
}

function timeZoneLabel(timeZone: string): string {
  return timeZone === DEFAULT_TIME_ZONE ? "local" : timeZone
}

function normalizeLocale(locale: string): Locale {
  return locale.toLowerCase().startsWith("zh") ? "zh-CN" : "en"
}

function t(locale: Locale, en: string, zhCN: string): string {
  return locale === "zh-CN" ? zhCN : en
}

function unquote(value: string): string {
  const trimmed = value.trim()
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1)
  }
  return trimmed
}

type Locale = "en" | "zh-CN"
type TimestampUnit = "auto" | "seconds" | "milliseconds"

interface DateTimeParts {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
  millisecond: number
}

type ParsedMain =
  | {
      ok: true
      date: Date
    }
  | {
      ok: false
      message: string
    }

interface ParsedQuery {
  main: ParsedMain | null
  timeZone: string
}

export = plugin

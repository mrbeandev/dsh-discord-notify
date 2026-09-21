import z from '@deepseek-ai/schemastery'
import safeRegex from 'safe-regex2'

export const name = 'discord-notify'
export const SETTINGS_NAMESPACE = 'dsh-discord-notify'
export const inject = ['settings']

const DEFAULTS = Object.freeze({
  webhookUrl: '',
  notifyTurnStart: false,
  notifyTurnEnd: true,
  notifyToolCalls: false,
  toolNames: [],
  notifyBashMatches: false,
  bashRegex: '',
  includeToolArguments: false,
  username: 'DeepSeek Harness',
})

export const Config = z.object({
  webhookUrl: z.string().role('secret').default(DEFAULTS.webhookUrl),
  notifyTurnStart: z.boolean().default(DEFAULTS.notifyTurnStart),
  notifyTurnEnd: z.boolean().default(DEFAULTS.notifyTurnEnd),
  notifyToolCalls: z.boolean().default(DEFAULTS.notifyToolCalls),
  toolNames: z.array(z.string()).default(DEFAULTS.toolNames),
  notifyBashMatches: z.boolean().default(DEFAULTS.notifyBashMatches),
  bashRegex: z.string().default(DEFAULTS.bashRegex),
  includeToolArguments: z.boolean().default(DEFAULTS.includeToolArguments),
  username: z.string().default(DEFAULTS.username),
})

function normalizeString(value, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback
}

export function normalizeConfig(value = {}) {
  const toolNames = Array.isArray(value.toolNames)
    ? [...new Set(value.toolNames.map((item) => normalizeString(item)).filter(Boolean))]
    : []
  return {
    webhookUrl: normalizeString(value.webhookUrl),
    notifyTurnStart: value.notifyTurnStart === true,
    notifyTurnEnd: value.notifyTurnEnd === undefined ? DEFAULTS.notifyTurnEnd : value.notifyTurnEnd === true,
    notifyToolCalls: value.notifyToolCalls === true,
    toolNames,
    notifyBashMatches: value.notifyBashMatches === true,
    bashRegex: normalizeString(value.bashRegex),
    includeToolArguments: value.includeToolArguments === true,
    username: normalizeString(value.username, DEFAULTS.username).slice(0, 80) || DEFAULTS.username,
  }
}

export function validateWebhookUrl(value) {
  if (!value) return
  let url
  try {
    url = new URL(value)
  } catch {
    throw new TypeError('Discord webhook URL must be a valid URL')
  }
  const allowedHost = url.hostname === 'discord.com'
    || url.hostname === 'discordapp.com'
    || url.hostname === 'canary.discord.com'
    || url.hostname === 'ptb.discord.com'
  if (url.protocol !== 'https:' || !allowedHost || !/^\/api(?:\/v\d+)?\/webhooks\/[^/]+\/[^/]+\/?$/.test(url.pathname)) {
    throw new TypeError('Webhook URL must be an HTTPS Discord webhook URL')
  }
}

export function compileBashRegex(value) {
  if (!value) return null
  if (value.length > 256) throw new TypeError('Bash command regex must be 256 characters or fewer')
  if (!safeRegex(value)) throw new TypeError('Bash command regex is potentially unsafe')
  try {
    return new RegExp(value)
  } catch (error) {
    throw new TypeError(`Bash command regex is invalid: ${error.message}`)
  }
}

function validateConfig(value) {
  validateWebhookUrl(value.webhookUrl)
  compileBashRegex(value.bashRegex)
  if (value.username.trim() === '') throw new TypeError('Webhook display name cannot be empty')
}

function escapeMarkdown(value) {
  return String(value).replace(/([\\`*_{}[\]()#+\-.!|>~])/g, '\\$1')
}

function truncate(value, limit) {
  const text = String(value)
  return text.length <= limit ? text : `${text.slice(0, Math.max(0, limit - 1))}…`
}

function sessionLabel(session) {
  return `session \`${escapeMarkdown(session?.id || 'unknown')}\``
}

function turnEndLabel(reason) {
  const kind = reason && typeof reason.kind === 'string' ? reason.kind : 'unknown'
  return escapeMarkdown(kind)
}

function parseToolArguments(raw) {
  if (typeof raw !== 'string' || raw === '') return undefined
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : undefined
  } catch {
    return undefined
  }
}

export function bashCommandFromEvent(event) {
  if (event?.type !== 'tool/call' || event.data?.name !== 'bash') return undefined
  const args = parseToolArguments(event.data.arguments)
  return typeof args?.command === 'string' ? args.command : undefined
}

function codeBlock(value, language, limit) {
  const safe = truncate(value, limit).replaceAll('```', '``\u200b`')
  return `\`\`\`${language}\n${safe}\n\`\`\``
}

function formatArguments(raw) {
  if (typeof raw !== 'string' || raw === '') return ''
  return `\n${codeBlock(raw, 'json', 900)}`
}

export function notificationForEvent(session, event, config, bashRegex = compileBashRegex(config.bashRegex)) {
  const data = event?.data || {}
  if (event?.type === 'turn/start' && config.notifyTurnStart) {
    return `▶️ **Agent turn started** — ${sessionLabel(session)}, turn ${data.turn}`
  }
  if (event?.type === 'turn/end' && config.notifyTurnEnd) {
    return `⏹️ **Agent turn ended** — ${sessionLabel(session)}, turn ${data.turn} (${turnEndLabel(data.reason)})`
  }
  if (event?.type !== 'tool/call') return undefined

  const toolName = typeof data.name === 'string' ? data.name : 'unknown'
  const command = bashCommandFromEvent(event)
  if (command !== undefined && config.notifyBashMatches && bashRegex) {
    bashRegex.lastIndex = 0
    if (bashRegex.test(command.slice(0, 16_384))) {
      return `💻 **Matching bash command** — ${sessionLabel(session)}\n${codeBlock(command, 'sh', 1400)}`
    }
  }

  const selected = config.toolNames.length === 0 || config.toolNames.includes(toolName)
  if (!config.notifyToolCalls || !selected) return undefined
  const details = config.includeToolArguments ? formatArguments(data.arguments) : ''
  return `🛠️ **Tool called:** \`${escapeMarkdown(toolName)}\` — ${sessionLabel(session)}${details}`
}

export async function sendDiscordWebhook(webhookUrl, username, content, options = {}) {
  const fetchImpl = options.fetchImpl || globalThis.fetch
  if (typeof fetchImpl !== 'function') throw new Error('This Node.js runtime does not provide fetch')
  const timeout = AbortSignal.timeout(10_000)
  const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout
  const response = await fetchImpl(webhookUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username, content: truncate(content, 2000), allowed_mentions: { parse: [] } }),
    signal,
  })
  if (!response.ok) {
    const body = typeof response.text === 'function' ? await response.text().catch(() => '') : ''
    throw new Error(`Discord webhook returned HTTP ${response.status}${body ? `: ${truncate(body, 200)}` : ''}`)
  }
}

export function apply(ctx, config = {}) {
  let live = normalizeConfig(config)
  validateConfig(live)
  let bashRegex = compileBashRegex(live.bashRegex)
  const scope = ctx.settings.register(SETTINGS_NAMESPACE, Config, {
    base: config || {},
    validate(value) {
      validateConfig(normalizeConfig(value))
    },
  })
  live = normalizeConfig(scope.get())
  bashRegex = compileBashRegex(live.bashRegex)

  let alive = true
  let queued = 0
  let queue = Promise.resolve()
  const lifetime = new AbortController()
  const unwatch = scope.watch((next) => {
    live = normalizeConfig(next)
    bashRegex = compileBashRegex(live.bashRegex)
  })

  const disposeEvent = ctx.on('session/event', (session, event) => {
    if (!alive || !live.webhookUrl) return
    const content = notificationForEvent(session, event, live, bashRegex)
    if (!content) return
    if (queued >= 100) {
      ctx.logger?.warn?.('discord-notify: delivery queue is full; dropping notification')
      return
    }
    const target = live.webhookUrl
    const username = live.username
    queued += 1
    queue = queue
      .then(() => alive ? sendDiscordWebhook(target, username, content, { signal: lifetime.signal }) : undefined)
      .catch((error) => {
        if (!lifetime.signal.aborted) ctx.logger?.warn?.(`discord-notify: delivery failed: ${error?.message || error}`)
      })
      .finally(() => { queued -= 1 })
  })

  ctx.effect(() => () => {
    alive = false
    lifetime.abort()
    unwatch()
    disposeEvent()
    return queue
  }, 'discord-notify: session event delivery')
}

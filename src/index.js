import z from '@deepseek-ai/schemastery'
import safeRegex from 'safe-regex2'

export const name = 'discord-notify'
export const SETTINGS_NAMESPACE = 'dsh-discord-notify'
export const inject = ['settings', 'tools', 'agentPresets']

export const TEMPLATE_SPECS = Object.freeze({
  turnStart: Object.freeze({
    label: 'Agent turn started',
    allowed: Object.freeze(['sessionId', 'turn']),
    required: Object.freeze(['sessionId', 'turn']),
    default: '▶️ **Agent turn started** — session `{{sessionId}}`, turn {{turn}}',
  }),
  turnEnd: Object.freeze({
    label: 'Agent turn ended',
    allowed: Object.freeze(['sessionId', 'turn', 'reason']),
    required: Object.freeze(['sessionId', 'turn', 'reason']),
    default: '⏹️ **Agent turn ended** — session `{{sessionId}}`, turn {{turn}} ({{reason}})',
  }),
  toolCall: Object.freeze({
    label: 'Selected tool call',
    allowed: Object.freeze(['sessionId', 'turn', 'step', 'toolName', 'arguments']),
    required: Object.freeze(['sessionId', 'toolName']),
    default: '🛠️ **Tool called:** `{{toolName}}` — session `{{sessionId}}`{{arguments}}',
  }),
  bashMatch: Object.freeze({
    label: 'Matching bash command',
    allowed: Object.freeze(['sessionId', 'turn', 'step', 'command']),
    required: Object.freeze(['sessionId', 'command']),
    default: '💻 **Matching bash command** — session `{{sessionId}}`\n{{command}}',
  }),
  test: Object.freeze({
    label: 'Test notification',
    allowed: Object.freeze(['sentAt']),
    required: Object.freeze(['sentAt']),
    default: '✅ **Discord notifications are working**\nTest sent from DeepSeek Harness at {{sentAt}}.',
  }),
})

const DEFAULT_TEMPLATES = Object.freeze(Object.fromEntries(Object.entries(TEMPLATE_SPECS).map(([key, spec]) => [key, spec.default])))
const DEFAULTS = Object.freeze({
  webhookUrl: '', notifyTurnStart: false, notifyTurnEnd: true, notifyToolCalls: false,
  toolNames: [], notifyBashMatches: false, bashRegex: '', includeToolArguments: false,
  username: 'DeepSeek Harness', templates: DEFAULT_TEMPLATES, testNonce: 0, availableTools: [],
})

const TemplateConfig = z.object(Object.fromEntries(Object.keys(TEMPLATE_SPECS).map((key) => [key, z.string().default(DEFAULT_TEMPLATES[key])])))
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
  templates: TemplateConfig.default(DEFAULT_TEMPLATES),
  testNonce: z.number().step(1).min(0).default(DEFAULTS.testNonce),
  availableTools: z.array(z.string()).default(DEFAULTS.availableTools),
})

function normalizeString(value, fallback = '') { return typeof value === 'string' ? value.trim() : fallback }
export function normalizeConfig(value = {}, availableTools = value.availableTools) {
  const uniqueStrings = (items) => Array.isArray(items) ? [...new Set(items.map((item) => normalizeString(item)).filter(Boolean))].sort() : []
  const templates = {}
  for (const [key, spec] of Object.entries(TEMPLATE_SPECS)) templates[key] = typeof value.templates?.[key] === 'string' ? value.templates[key] : spec.default
  return {
    webhookUrl: normalizeString(value.webhookUrl),
    notifyTurnStart: value.notifyTurnStart === true,
    notifyTurnEnd: value.notifyTurnEnd === undefined ? DEFAULTS.notifyTurnEnd : value.notifyTurnEnd === true,
    notifyToolCalls: value.notifyToolCalls === true,
    toolNames: uniqueStrings(value.toolNames),
    notifyBashMatches: value.notifyBashMatches === true,
    bashRegex: normalizeString(value.bashRegex),
    includeToolArguments: value.includeToolArguments === true,
    username: normalizeString(value.username, DEFAULTS.username).slice(0, 80) || DEFAULTS.username,
    templates,
    testNonce: Number.isSafeInteger(value.testNonce) && value.testNonce >= 0 ? value.testNonce : 0,
    availableTools: uniqueStrings(availableTools),
  }
}

export function validateWebhookUrl(value) {
  if (!value) return
  let url
  try { url = new URL(value) } catch { throw new TypeError('Discord webhook URL must be a valid URL') }
  const allowedHost = ['discord.com', 'discordapp.com', 'canary.discord.com', 'ptb.discord.com'].includes(url.hostname)
  if (url.protocol !== 'https:' || !allowedHost || !/^\/api(?:\/v\d+)?\/webhooks\/[^/]+\/[^/]+\/?$/.test(url.pathname)) throw new TypeError('Webhook URL must be an HTTPS Discord webhook URL')
}

export function compileBashRegex(value) {
  if (!value) return null
  if (value.length > 256) throw new TypeError('Bash command regex must be 256 characters or fewer')
  if (!safeRegex(value)) throw new TypeError('Bash command regex is potentially unsafe')
  try { return new RegExp(value) } catch (error) { throw new TypeError(`Bash command regex is invalid: ${error.message}`) }
}

export function templateVariables(template) {
  if (typeof template !== 'string') return []
  const stripped = template.replace(/{{\s*([A-Za-z][A-Za-z0-9]*)\s*}}/g, '')
  if (stripped.includes('{{') || stripped.includes('}}')) throw new TypeError('Template contains an incomplete variable; use {{variableName}}')
  return [...template.matchAll(/{{\s*([A-Za-z][A-Za-z0-9]*)\s*}}/g)].map((match) => match[1])
}

export function validateTemplate(key, template) {
  const spec = TEMPLATE_SPECS[key]
  if (!spec) throw new TypeError(`Unknown notification template: ${key}`)
  if (typeof template !== 'string' || template.trim() === '') throw new TypeError(`${spec.label} template cannot be empty`)
  if (template.length > 1900) throw new TypeError(`${spec.label} template must be 1900 characters or fewer`)
  const variables = templateVariables(template)
  const unknown = [...new Set(variables.filter((variable) => !spec.allowed.includes(variable)))]
  if (unknown.length) throw new TypeError(`${spec.label} template uses unknown variable(s): ${unknown.map((item) => `{{${item}}}`).join(', ')}`)
  const missing = spec.required.filter((variable) => !variables.includes(variable))
  if (missing.length) throw new TypeError(`${spec.label} template is missing required variable(s): ${missing.map((item) => `{{${item}}}`).join(', ')}`)
}

function validateConfig(value, catalog) {
  validateWebhookUrl(value.webhookUrl)
  compileBashRegex(value.bashRegex)
  if (value.username.trim() === '') throw new TypeError('Webhook display name cannot be empty')
  if (value.testNonce > 0 && !value.webhookUrl) throw new TypeError('Configure a Discord webhook URL before sending a test notification')
  for (const [key, template] of Object.entries(value.templates)) validateTemplate(key, template)
  if (catalog && (value.availableTools.length !== catalog.length || value.availableTools.some((tool, index) => tool !== catalog[index]))) throw new TypeError('Available tool catalog is Host-managed')
}

function truncate(value, limit) { const text = String(value); return text.length <= limit ? text : `${text.slice(0, Math.max(0, limit - 1))}…` }
function safeValue(value) { return String(value ?? '').replaceAll('```', '``\u200b`').replaceAll('`', '\\`').replace(/([*_{}[\]()#+\-.!|>~])/g, '\\$1') }
function codeBlock(value, language, limit) { return `\`\`\`${language}\n${truncate(value, limit).replaceAll('```', '``\u200b`')}\n\`\`\`` }
export function renderTemplate(template, values) {
  return template.replace(/{{\s*([A-Za-z][A-Za-z0-9]*)\s*}}/g, (_match, key) => values[key] ?? '')
}
function parseToolArguments(raw) { try { const parsed = JSON.parse(raw); return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : undefined } catch { return undefined } }
export function bashCommandFromEvent(event) { const args = event?.type === 'tool/call' && event.data?.name === 'bash' ? parseToolArguments(event.data.arguments) : undefined; return typeof args?.command === 'string' ? args.command : undefined }

export function notificationForEvent(session, event, config, bashRegex = compileBashRegex(config.bashRegex)) {
  const data = event?.data || {}; const common = { sessionId: safeValue(session?.id || 'unknown'), turn: safeValue(data.turn), step: safeValue(data.step) }
  if (event?.type === 'turn/start' && config.notifyTurnStart) return renderTemplate(config.templates.turnStart, common)
  if (event?.type === 'turn/end' && config.notifyTurnEnd) return renderTemplate(config.templates.turnEnd, { ...common, reason: safeValue(data.reason?.kind || 'unknown') })
  if (event?.type !== 'tool/call') return undefined
  const toolName = typeof data.name === 'string' ? data.name : 'unknown'; const command = bashCommandFromEvent(event)
  if (command !== undefined && config.notifyBashMatches && bashRegex) { bashRegex.lastIndex = 0; if (bashRegex.test(command.slice(0, 16_384))) return renderTemplate(config.templates.bashMatch, { ...common, command: codeBlock(command, 'sh', 1400) }) }
  const selected = config.toolNames.length === 0 || config.toolNames.includes(toolName)
  if (!config.notifyToolCalls || !selected) return undefined
  const args = config.includeToolArguments && data.arguments ? `\n${codeBlock(data.arguments, 'json', 900)}` : ''
  return renderTemplate(config.templates.toolCall, { ...common, toolName: safeValue(toolName), arguments: args })
}

export async function sendDiscordWebhook(webhookUrl, username, content, options = {}) {
  const fetchImpl = options.fetchImpl || globalThis.fetch; if (typeof fetchImpl !== 'function') throw new Error('This Node.js runtime does not provide fetch')
  const timeout = AbortSignal.timeout(10_000); const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout
  const response = await fetchImpl(webhookUrl, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username, content: truncate(content, 2000), allowed_mentions: { parse: [] } }), signal })
  if (!response.ok) { const body = typeof response.text === 'function' ? await response.text().catch(() => '') : ''; throw new Error(`Discord webhook returned HTTP ${response.status}${body ? `: ${truncate(body, 200)}` : ''}`) }
}

async function availableToolNames(ctx) {
  const names = new Set()
  for (const preset of await ctx.agentPresets.list()) {
    if (preset.broken) continue
    try { const scope = await ctx.agentPresets.standingKeyFor(preset.id); for (const schema of ctx.tools.schemas(scope)) if (schema?.name) names.add(schema.name) } catch (error) { ctx.logger?.warn?.(`discord-notify: could not inspect tools for preset ${preset.id}: ${error?.message || error}`) }
  }
  if (names.size === 0) for (const schema of ctx.tools.schemas()) if (schema?.name) names.add(schema.name)
  return [...names].sort((a, b) => a.localeCompare(b))
}

export async function apply(ctx, config = {}) {
  const catalog = await availableToolNames(ctx)
  let live = normalizeConfig({ ...config, availableTools: catalog }, catalog); validateConfig(live, catalog)
  let bashRegex = compileBashRegex(live.bashRegex); let alive = true; let queued = 0; let queue = Promise.resolve(); const lifetime = new AbortController()
  const enqueue = (target, username, content) => {
    if (!alive || !target) return false
    if (queued >= 100) { ctx.logger?.warn?.('discord-notify: delivery queue is full; dropping notification'); return false }
    queued += 1; queue = queue.then(() => alive ? sendDiscordWebhook(target, username, content, { signal: lifetime.signal }) : undefined).catch((error) => { if (!lifetime.signal.aborted) ctx.logger?.warn?.(`discord-notify: delivery failed: ${error?.message || error}`) }).finally(() => { queued -= 1 }); return true
  }
  const scope = ctx.settings.register(SETTINGS_NAMESPACE, Config, { base: { ...config, availableTools: catalog }, validate(value) { validateConfig(normalizeConfig(value, catalog), catalog) } })
  live = normalizeConfig(scope.get(), catalog); bashRegex = compileBashRegex(live.bashRegex)
  const unwatch = scope.watch((next, prev) => {
    live = normalizeConfig(next, catalog); bashRegex = compileBashRegex(live.bashRegex)
    const previousNonce = normalizeConfig(prev, catalog).testNonce
    if (live.testNonce > previousNonce && live.webhookUrl) enqueue(live.webhookUrl, live.username, renderTemplate(live.templates.test, { sentAt: safeValue(new Date().toISOString()) }))
  })
  const disposeEvent = ctx.on('session/event', (session, event) => { if (!alive || !live.webhookUrl) return; const content = notificationForEvent(session, event, live, bashRegex); if (content) enqueue(live.webhookUrl, live.username, content) })
  ctx.effect(() => () => { alive = false; lifetime.abort(); unwatch(); disposeEvent(); return queue }, 'discord-notify: session event delivery')
}

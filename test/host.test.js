import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  apply, bashCommandFromEvent, compileBashRegex, normalizeConfig, notificationForEvent,
  renderTemplate, sendDiscordWebhook, validateTemplate, validateWebhookUrl,
} from '../src/index.js'

const session = { id: 'session-123', header: { cwd: '/tmp/e2e' } }
const base = normalizeConfig({ webhookUrl: 'https://discord.com/api/webhooks/1/token' })

describe('Discord notification matching and templates', () => {
  it('validates Discord webhook URLs and rejects arbitrary destinations', () => {
    assert.doesNotThrow(() => validateWebhookUrl('https://discord.com/api/webhooks/123/token'))
    assert.doesNotThrow(() => validateWebhookUrl('https://discord.com/api/v10/webhooks/123/token'))
    assert.throws(() => validateWebhookUrl('https://example.com/api/webhooks/123/token'), /Discord webhook/)
  })

  it('validates allowed and required variables per template', () => {
    assert.doesNotThrow(() => validateTemplate('turnEnd', '{{sessionId}} {{turn}} {{reason}}'))
    assert.throws(() => validateTemplate('turnEnd', '{{sessionId}} {{turn}} {{bogus}}'), /unknown variable.*bogus/)
    assert.throws(() => validateTemplate('turnEnd', '{{sessionId}} {{turn}}'), /missing required.*reason/)
    assert.throws(() => validateTemplate('toolCall', '{{sessionId}} {{toolName'), /incomplete variable/)
  })

  it('renders custom templates', () => {
    assert.equal(renderTemplate('Turn {{turn}} in {{sessionId}}', { turn: '3', sessionId: 'abc' }), 'Turn 3 in abc')
    const config = { ...base, notifyTurnStart: true, templates: { ...base.templates, turnStart: 'Started {{sessionName}} in {{workspaceName}} ({{sessionId}}) #{{turn}}' } }
    assert.equal(notificationForEvent(session, { type: 'turn/start', data: { turn: 2 } }, config, null, { sessionName: 'Release work', workspaceName: 'Harness plugins' }), 'Started Release work in Harness plugins (session\\-123) #2')
  })

  it('formats turn boundaries and filters tool calls by exact name', () => {
    assert.match(notificationForEvent(session, { type: 'turn/end', data: { turn: 2, reason: { kind: 'completed' } } }, base), /completed/)
    const config = { ...base, notifyToolCalls: true, toolNames: ['web_search'] }
    assert.match(notificationForEvent(session, { type: 'tool/call', data: { turn: 1, step: 1, name: 'web_search', arguments: '{}' } }, config), /web\\_search/)
    assert.equal(notificationForEvent(session, { type: 'tool/call', data: { name: 'read', arguments: '{}' } }, config), undefined)
  })

  it('extracts and regex-matches bash commands', () => {
    const event = { type: 'tool/call', data: { turn: 1, step: 1, name: 'bash', arguments: JSON.stringify({ command: 'npm test' }) } }
    assert.equal(bashCommandFromEvent(event), 'npm test')
    assert.match(notificationForEvent(session, event, { ...base, notifyBashMatches: true, bashRegex: '^npm test$' }), /npm test/)
    assert.equal(notificationForEvent(session, event, { ...base, notifyBashMatches: true, bashRegex: '^pnpm' }), undefined)
  })

  it('rejects unsafe regexes and contains untrusted code fences', () => {
    assert.throws(() => compileBashRegex('(a+)+$'), /potentially unsafe/)
    assert.throws(() => compileBashRegex('a'.repeat(257)), /256 characters/)
    const event = { type: 'tool/call', data: { name: 'bash', arguments: JSON.stringify({ command: 'echo ``` @everyone' }) } }
    const message = notificationForEvent(session, event, { ...base, notifyBashMatches: true, bashRegex: 'echo' })
    assert.doesNotMatch(message, /``` @everyone/)
    assert.match(message, /``\u200b`/)
  })
})

describe('Discord delivery and Host integration', () => {
  it('posts a safe Discord webhook payload', async () => {
    let request
    await sendDiscordWebhook('https://discord.com/api/webhooks/1/token', 'DSH', '@everyone hello', {
      signal: new AbortController().signal,
      fetchImpl: async (url, options) => { request = { url, options }; return { ok: true, status: 204 } },
    })
    assert.equal(request.options.method, 'POST')
    assert.deepEqual(JSON.parse(request.options.body), { username: 'DSH', content: '@everyone hello', allowed_mentions: { parse: [] } })
  })

  it('publishes the preset tool catalog and sends a test via the saved secret', async () => {
    const listeners = new Map(); let watcher; let registeredBase
    const requests = []; const originalFetch = globalThis.fetch
    globalThis.fetch = async (_url, options) => { requests.push(JSON.parse(options.body)); return { ok: true, status: 204 } }
    let current = { ...base, notifyTurnStart: true }
    const ctx = {
      agentPresets: { async list() { return [{ id: 'standard' }] }, async standingKeyFor() { return 'standard-scope' } },
      tools: { schemas(scope) { assert.equal(scope, 'standard-scope'); return [{ name: 'bash' }, { name: 'web_search' }] } },
      sessionTitle: { get() { return { title: 'E2E session' } } },
      workspaceRegistry: { list() { return [{ title: 'E2E workspace', path: '/tmp/e2e', sessionIds: [session.id] }] } },
      settings: { register(_ns, _schema, options) { registeredBase = options.base; current = normalizeConfig({ ...current, availableTools: options.base.availableTools }); options.validate(current); return { get: () => current, watch(callback) { watcher = callback; return () => {} }, async update(patch) { current = normalizeConfig({ ...current, ...patch }) } } } },
      on(name, callback) { listeners.set(name, callback); return () => listeners.delete(name) },
      effect(callback) { this.cleanup = callback() }, logger: { warn() {} },
    }
    try {
      await apply(ctx, {})
      assert.deepEqual(registeredBase.availableTools, ['bash', 'web_search'])
      listeners.get('session/event')(session, { type: 'turn/start', data: { turn: 1 } })
      await new Promise((resolve) => setImmediate(resolve))
      assert.equal(requests.length, 1)
      const previous = current
      current = { ...current, testNonce: 1 }
      watcher(current, previous)
      await new Promise((resolve) => setImmediate(resolve))
      assert.equal(requests.length, 2)
      assert.match(requests[1].content, /notifications are working/)
      await ctx.cleanup()
    } finally { globalThis.fetch = originalFetch }
  })
})

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  apply,
  bashCommandFromEvent,
  compileBashRegex,
  normalizeConfig,
  notificationForEvent,
  sendDiscordWebhook,
  validateWebhookUrl,
} from '../src/index.js'

const session = { id: 'session-123' }
const base = normalizeConfig({ webhookUrl: 'https://discord.com/api/webhooks/1/token' })

describe('Discord notification matching', () => {
  it('validates Discord webhook URLs and rejects arbitrary destinations', () => {
    assert.doesNotThrow(() => validateWebhookUrl('https://discord.com/api/webhooks/123/token'))
    assert.doesNotThrow(() => validateWebhookUrl('https://discord.com/api/v10/webhooks/123/token'))
    assert.throws(() => validateWebhookUrl('https://example.com/api/webhooks/123/token'), /Discord webhook/)
    assert.throws(() => validateWebhookUrl('http://discord.com/api/webhooks/123/token'), /Discord webhook/)
  })

  it('formats turn start and turn end notifications', () => {
    assert.match(notificationForEvent(session, { type: 'turn/start', data: { turn: 2 } }, { ...base, notifyTurnStart: true }), /turn started/)
    assert.match(notificationForEvent(session, { type: 'turn/end', data: { turn: 2, reason: { kind: 'completed' } } }, base), /completed/)
  })

  it('filters tool calls by exact tool name', () => {
    const config = { ...base, notifyToolCalls: true, toolNames: ['web_search'] }
    assert.match(notificationForEvent(session, { type: 'tool/call', data: { name: 'web_search', arguments: '{}' } }, config), /web\\_search/)
    assert.equal(notificationForEvent(session, { type: 'tool/call', data: { name: 'read', arguments: '{}' } }, config), undefined)
  })

  it('extracts and regex-matches bash commands', () => {
    const event = { type: 'tool/call', data: { name: 'bash', arguments: JSON.stringify({ command: 'npm test' }) } }
    assert.equal(bashCommandFromEvent(event), 'npm test')
    assert.match(notificationForEvent(session, event, { ...base, notifyBashMatches: true, bashRegex: '^npm test$' }), /npm test/)
    assert.equal(notificationForEvent(session, event, { ...base, notifyBashMatches: true, bashRegex: '^pnpm' }), undefined)
  })

  it('rejects unsafe or oversized bash regular expressions', () => {
    assert.throws(() => compileBashRegex('(a+)+$'), /potentially unsafe/)
    assert.throws(() => compileBashRegex('a'.repeat(257)), /256 characters/)
  })

  it('keeps untrusted tool content inside Discord code fences', () => {
    const event = { type: 'tool/call', data: { name: 'bash', arguments: JSON.stringify({ command: 'echo ``` @everyone' }) } }
    const message = notificationForEvent(session, event, { ...base, notifyBashMatches: true, bashRegex: 'echo' })
    assert.doesNotMatch(message, /``` @everyone/)
    assert.match(message, /``\u200b`/)
  })
})

describe('Discord delivery', () => {
  it('posts a safe Discord webhook payload', async () => {
    let request
    await sendDiscordWebhook('https://discord.com/api/webhooks/1/token', 'DSH', '@everyone hello', {
      signal: new AbortController().signal,
      fetchImpl: async (url, options) => {
        request = { url, options }
        return { ok: true, status: 204 }
      },
    })
    assert.equal(request.options.method, 'POST')
    assert.deepEqual(JSON.parse(request.options.body), {
      username: 'DSH',
      content: '@everyone hello',
      allowed_mentions: { parse: [] },
    })
  })

  it('observes session events and uses live settings', async () => {
    const listeners = new Map()
    let watcher
    let current = { ...base, notifyTurnStart: true }
    const requests = []
    const originalFetch = globalThis.fetch
    globalThis.fetch = async (_url, options) => { requests.push(JSON.parse(options.body)); return { ok: true, status: 204 } }
    const ctx = {
      settings: { register(_ns, _schema, options) { options.validate(current); return { get: () => current, watch(callback) { watcher = callback; return () => {} } } } },
      on(name, callback) { listeners.set(name, callback); return () => listeners.delete(name) },
      effect(callback) { this.cleanup = callback() },
      logger: { warn() {} },
    }
    try {
      apply(ctx, {})
      listeners.get('session/event')(session, { type: 'turn/start', data: { turn: 1 } })
      await new Promise((resolve) => setImmediate(resolve))
      assert.equal(requests.length, 1)
      current = { ...current, notifyTurnStart: false }
      watcher(current)
      listeners.get('session/event')(session, { type: 'turn/start', data: { turn: 2 } })
      await new Promise((resolve) => setImmediate(resolve))
      assert.equal(requests.length, 1)
      ctx.cleanup()
    } finally { globalThis.fetch = originalFetch }
  })
})

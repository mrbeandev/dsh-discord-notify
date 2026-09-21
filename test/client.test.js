import { afterEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'

afterEach(() => { delete globalThis.window })

describe('Discord settings card', () => {
  it('registers a keyed Plugins settings accordion', async () => {
    let plugin
    globalThis.window = { __ModuleLoader__: { load({ factory }) { const module = { exports: {} }; plugin = factory(() => ({}), module, module.exports) } } }
    await import(`../src/client.js?test=${Date.now()}`)
    let options
    const scope = { getSnapshot() {}, subscribe() {}, mutate() {} }
    plugin.apply({
      settingsScope: { bind(input) { assert.deepEqual(input, { namespace: 'dsh-discord-notify' }); return scope } },
      slots: { inject(name, register) { assert.equal(name, 'settings.plugin.item'); register() }, register(value) { options = value } },
    })
    assert.equal(options.name, 'settings.plugin.item')
    assert.equal(options.key, 'dsh-discord-notify')
    assert.equal(options.inject().scope, scope)
    assert.deepEqual(plugin.inject, ['slots', 'settingsScope'])
  })
})

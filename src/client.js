window.__ModuleLoader__.load({ id: 'dsh-discord-notify', factory: (require) => {
  var module = { exports: {} }
  var exports = module.exports
  Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })

  const react = require('react')
  const { useEffect, useState, useSyncExternalStore } = react
  const e = react.createElement
  const SETTINGS_NAMESPACE = 'dsh-discord-notify'
  const FIELDS = ['webhookUrl', 'notifyTurnStart', 'notifyTurnEnd', 'notifyToolCalls', 'toolNames', 'notifyBashMatches', 'bashRegex', 'includeToolArguments', 'username']

  const bindSnapshotSelector = (source) => {
    const subscribe = (listener) => source.subscribe(listener)
    const getSnapshot = () => source.getSnapshot()
    return (selector) => selector(useSyncExternalStore(subscribe, getSnapshot, getSnapshot))
  }

  const cardStyle = { border: '1px solid var(--dsw-alias-border-l2)', background: 'var(--dsw-alias-bg-layer-3)', borderRadius: 12, listStyle: 'none' }
  const headerStyle = { appearance: 'none', width: '100%', font: 'inherit', color: 'inherit', textAlign: 'left', cursor: 'pointer', background: 'none', border: 0, borderRadius: 12, alignItems: 'center', gap: 12, padding: '14px 16px', display: 'flex' }
  const headTextStyle = { flexDirection: 'column', flex: 1, gap: 4, minWidth: 0, display: 'flex' }
  const nameStyle = { color: 'var(--dsw-alias-label-primary)', fontSize: 15, fontWeight: 600, lineHeight: 1.4 }
  const descriptionStyle = { color: 'var(--dsw-alias-label-tertiary)', fontSize: 13, lineHeight: 1.5 }
  const bodyStyle = { borderTop: '1px solid var(--dsw-alias-border-l2)', margin: '0 16px', paddingBottom: 8 }
  const fieldStyle = { flexDirection: 'column', gap: 6, padding: '10px 0', display: 'flex' }
  const rowStyle = { alignItems: 'center', justifyContent: 'space-between', gap: 12, display: 'flex' }
  const labelStyle = { color: 'var(--dsw-alias-label-primary)', fontSize: 13, fontWeight: 500, lineHeight: 1.5 }
  const hintStyle = { color: 'var(--dsw-alias-label-tertiary)', margin: 0, fontSize: 12, lineHeight: 1.5 }
  const inputStyle = { border: '1px solid var(--dsw-alias-border-l2)', background: 'var(--dsw-alias-bg-layer-3)', minHeight: 34, width: '100%', boxSizing: 'border-box', font: 'inherit', color: 'var(--dsw-alias-label-primary)', borderRadius: 8, padding: '6px 10px', fontSize: 13 }
  const footerStyle = { borderTop: '1px solid var(--dsw-alias-border-l2)', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, padding: '12px 0 4px' }
  const buttonBase = { appearance: 'none', font: 'inherit', cursor: 'pointer', border: '1px solid transparent', borderRadius: 8, padding: '5px 14px', fontSize: 13 }
  const secondaryStyle = { ...buttonBase, borderColor: 'var(--dsw-alias-border-l2)', color: 'var(--dsw-alias-label-secondary)', background: 'none' }
  const saveStyle = { ...buttonBase, background: 'var(--dsw-alias-brand-primary)', color: 'var(--dsw-alias-label-on-brand, #fff)' }
  const errorStyle = { color: 'var(--dsw-alias-label-error)', flex: 1, margin: 0, fontSize: 12 }
  const badgeStyle = { whiteSpace: 'nowrap', background: 'var(--dsw-alias-bg-module-platform)', color: 'var(--dsw-alias-label-secondary)', borderRadius: 999, padding: '1px 8px', fontSize: 11 }

  function Field(props) {
    return e('div', { style: fieldStyle },
      e('label', { htmlFor: props.id, style: labelStyle }, props.label),
      props.children,
      props.hint ? e('p', { style: hintStyle }, props.hint) : null)
  }

  function Toggle(props) {
    return e('div', { style: fieldStyle },
      e('div', { style: rowStyle },
        e('label', { htmlFor: props.id, style: labelStyle }, props.label),
        e('input', { id: props.id, type: 'checkbox', checked: props.checked, disabled: props.disabled, onChange: props.onChange })),
      props.hint ? e('p', { style: hintStyle }, props.hint) : null)
  }

  function DiscordNotifyCard({ useScope, scope }) {
    const snapshot = useScope((value) => value)
    const [open, setOpen] = useState(false)
    const [base, setBase] = useState(null)
    const [revision, setRevision] = useState(undefined)
    const [webhookUrl, setWebhookUrl] = useState('')
    const [notifyTurnStart, setNotifyTurnStart] = useState(false)
    const [notifyTurnEnd, setNotifyTurnEnd] = useState(true)
    const [notifyToolCalls, setNotifyToolCalls] = useState(false)
    const [toolNames, setToolNames] = useState('')
    const [notifyBashMatches, setNotifyBashMatches] = useState(false)
    const [bashRegex, setBashRegex] = useState('')
    const [includeToolArguments, setIncludeToolArguments] = useState(false)
    const [username, setUsername] = useState('DeepSeek Harness')
    const [dirty, setDirty] = useState(false)
    const [saving, setSaving] = useState(false)
    const [failed, setFailed] = useState('')

    const load = (next, nextRevision) => {
      const value = next && typeof next === 'object' ? next : {}
      setBase(value)
      setRevision(nextRevision)
      setWebhookUrl('')
      setNotifyTurnStart(value.notifyTurnStart === true)
      setNotifyTurnEnd(value.notifyTurnEnd !== false)
      setNotifyToolCalls(value.notifyToolCalls === true)
      setToolNames(Array.isArray(value.toolNames) ? value.toolNames.join(', ') : '')
      setNotifyBashMatches(value.notifyBashMatches === true)
      setBashRegex(typeof value.bashRegex === 'string' ? value.bashRegex : '')
      setIncludeToolArguments(value.includeToolArguments === true)
      setUsername(typeof value.username === 'string' ? value.username : 'DeepSeek Harness')
    }

    useEffect(() => {
      if (snapshot.status !== 'ready' || dirty) return
      load(snapshot.value, snapshot.revision)
      setFailed('')
    }, [snapshot.status, snapshot.value, snapshot.revision, dirty])

    const touch = (setter, value) => { setter(value); setDirty(true); setFailed('') }
    const draft = () => ({
      notifyTurnStart,
      notifyTurnEnd,
      notifyToolCalls,
      toolNames: toolNames.split(',').map((item) => item.trim()).filter(Boolean),
      notifyBashMatches,
      bashRegex: bashRegex.trim(),
      includeToolArguments,
      username: username.trim() || 'DeepSeek Harness',
    })

    const save = async () => {
      setSaving(true); setFailed('')
      try {
        const before = scope.getSnapshot()
        if (before.revision !== revision) throw new Error('Settings changed after editing began. Discard and retry.')
        const next = draft()
        const ops = Object.keys(next).filter((field) => !Object.is(JSON.stringify(base && base[field]), JSON.stringify(next[field]))).map((field) => ({ op: 'set', path: [field], value: next[field] }))
        if (webhookUrl.trim()) ops.push({ op: 'set', path: ['webhookUrl'], value: webhookUrl.trim() })
        if (ops.length) await scope.mutate(ops, revision)
        const accepted = scope.getSnapshot()
        const visibleOps = ops.filter((operation) => operation.path[0] !== 'webhookUrl')
        const rejected = ops.length > 0 && accepted.revision === revision
        const mismatched = visibleOps.some((operation) => !Object.is(JSON.stringify(accepted.value && accepted.value[operation.path[0]]), JSON.stringify(operation.value)))
        if (rejected || mismatched) throw new Error('The Host did not accept these settings. Check the webhook URL and regular expression.')
        load(accepted.value, accepted.revision)
        setDirty(false)
      } catch (error) {
        console.warn('[Discord Notify] settings save failed:', error)
        setFailed(error && error.message ? error.message : 'Could not save settings.')
      } finally { setSaving(false) }
    }

    const reset = async () => {
      setSaving(true); setFailed('')
      try {
        const before = scope.getSnapshot()
        await scope.mutate(FIELDS.map((field) => ({ op: 'unset', path: [field] })), before.revision)
        const accepted = scope.getSnapshot()
        const user = accepted.user && typeof accepted.user === 'object' ? accepted.user : {}
        if (accepted.revision === before.revision || FIELDS.some((field) => Object.hasOwn(user, field))) {
          throw new Error('The Host did not restore the default settings.')
        }
        load(accepted.value, accepted.revision)
        setDirty(false)
      } catch (error) { setFailed(error && error.message ? error.message : 'Could not restore defaults.') }
      finally { setSaving(false) }
    }

    if (snapshot.status !== 'ready') return e('li', { style: cardStyle }, e('div', { style: headerStyle }, e('span', { style: hintStyle }, 'Discord notification settings are loading or unavailable.')))

    return e('li', { style: cardStyle },
      e('button', { type: 'button', style: headerStyle, 'aria-expanded': open, 'aria-label': (open ? 'Collapse' : 'Expand') + ': Discord notifications', onClick: () => setOpen(!open) },
        e('span', { style: headTextStyle }, e('span', { style: nameStyle }, 'Discord notifications'), e('span', { style: descriptionStyle }, 'Send one-way webhook alerts for turns, tools, and matching bash commands.')),
        dirty ? e('span', { style: badgeStyle }, 'Unsaved') : null,
        e('span', { style: { transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .16s', color: 'var(--dsw-alias-label-tertiary)' } }, '▾')),
      open ? e('div', { style: bodyStyle },
        e(Field, { id: 'discord-notify-webhook', label: 'Discord webhook URL', hint: 'Write-only secret. Leave blank to keep the current value, or paste a URL to set or replace it.' },
          e('input', { id: 'discord-notify-webhook', type: 'password', autoComplete: 'off', placeholder: 'https://discord.com/api/webhooks/…', style: inputStyle, value: webhookUrl, disabled: saving || !snapshot.writable, onChange: (event) => touch(setWebhookUrl, event.target.value) })),
        e(Field, { id: 'discord-notify-username', label: 'Webhook display name', hint: 'The sender name shown in Discord.' },
          e('input', { id: 'discord-notify-username', style: inputStyle, maxLength: 80, value: username, disabled: saving || !snapshot.writable, onChange: (event) => touch(setUsername, event.target.value) })),
        e(Toggle, { id: 'discord-notify-turn-start', label: 'Agent turn started', hint: 'Notify when DSH opens a new agent turn.', checked: notifyTurnStart, disabled: saving || !snapshot.writable, onChange: () => touch(setNotifyTurnStart, !notifyTurnStart) }),
        e(Toggle, { id: 'discord-notify-turn-end', label: 'Agent turn ended', hint: 'Notify when a turn completes, is blocked, aborts, or errors.', checked: notifyTurnEnd, disabled: saving || !snapshot.writable, onChange: () => touch(setNotifyTurnEnd, !notifyTurnEnd) }),
        e(Toggle, { id: 'discord-notify-tools', label: 'Selected tool calls', hint: 'Notify when a selected tool starts. An empty tool list matches every tool.', checked: notifyToolCalls, disabled: saving || !snapshot.writable, onChange: () => touch(setNotifyToolCalls, !notifyToolCalls) }),
        e(Field, { id: 'discord-notify-tool-names', label: 'Tool names', hint: 'Comma-separated exact names, for example: web_search, present, subagent' },
          e('input', { id: 'discord-notify-tool-names', style: inputStyle, placeholder: 'web_search, present', value: toolNames, disabled: saving || !snapshot.writable || !notifyToolCalls, onChange: (event) => touch(setToolNames, event.target.value) })),
        e(Toggle, { id: 'discord-notify-tool-arguments', label: 'Include tool arguments', hint: 'Potentially sensitive. Disabled by default; bash-match alerts still include the matched command.', checked: includeToolArguments, disabled: saving || !snapshot.writable || !notifyToolCalls, onChange: () => touch(setIncludeToolArguments, !includeToolArguments) }),
        e(Toggle, { id: 'discord-notify-bash', label: 'Regex-matched bash commands', hint: 'Notify only when the bash command text matches the regular expression below.', checked: notifyBashMatches, disabled: saving || !snapshot.writable, onChange: () => touch(setNotifyBashMatches, !notifyBashMatches) }),
        e(Field, { id: 'discord-notify-bash-regex', label: 'Bash command regular expression', hint: 'JavaScript regular expression syntax without slash delimiters. Example: ^(npm test|pnpm build)$' },
          e('input', { id: 'discord-notify-bash-regex', style: inputStyle, placeholder: 'npm (test|run build)', value: bashRegex, disabled: saving || !snapshot.writable || !notifyBashMatches, onChange: (event) => touch(setBashRegex, event.target.value) })),
        e('div', { style: footerStyle },
          failed ? e('p', { style: errorStyle, role: 'status' }, failed) : null,
          e('button', { type: 'button', style: secondaryStyle, disabled: saving || !snapshot.writable, onClick: () => { void reset() } }, 'Restore defaults'),
          e('button', { type: 'button', style: secondaryStyle, disabled: !dirty || saving, onClick: () => { load(base, revision); setDirty(false); setFailed('') } }, 'Discard changes'),
          e('button', { type: 'button', style: saveStyle, disabled: !dirty || saving || !snapshot.writable, onClick: () => { void save() } }, saving ? 'Saving…' : 'Save')))
        : null)
  }

  function apply(ctx) {
    const scope = ctx.settingsScope.bind({ namespace: SETTINGS_NAMESPACE })
    const useScope = bindSnapshotSelector(scope)
    ctx.slots.inject('settings.plugin.item', () => ctx.slots.register({ name: 'settings.plugin.item', key: SETTINGS_NAMESPACE, inject: () => ({ useScope, scope }) }, DiscordNotifyCard), 'dsh-discord-notify: plugin settings card')
  }

  exports.apply = apply
  exports.inject = ['slots', 'settingsScope']
  return module.exports
} })

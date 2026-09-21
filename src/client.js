window.__ModuleLoader__.load({ id: 'dsh-discord-notify', factory: (require) => {
  var module = { exports: {} }
  var exports = module.exports
  Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })

  const react = require('react')
  const { useEffect, useMemo, useState, useSyncExternalStore } = react
  const e = react.createElement
  const NS = 'dsh-discord-notify'
  const TEMPLATE_SPECS = {
    turnStart: { label: 'Agent turn started', variables: ['sessionId', 'sessionName', 'workspaceName', 'turn'], required: ['sessionId', 'turn'], fallback: '▶️ **Agent turn started** — **{{sessionName}}** in **{{workspaceName}}** (`{{sessionId}}`), turn {{turn}}' },
    turnEnd: { label: 'Agent turn ended', variables: ['sessionId', 'sessionName', 'workspaceName', 'turn', 'reason'], required: ['sessionId', 'turn', 'reason'], fallback: '⏹️ **Agent turn ended** — **{{sessionName}}** in **{{workspaceName}}** (`{{sessionId}}`), turn {{turn}} ({{reason}})' },
    toolCall: { label: 'Selected tool call', variables: ['sessionId', 'sessionName', 'workspaceName', 'turn', 'step', 'toolName', 'arguments'], required: ['sessionId', 'toolName'], fallback: '🛠️ **Tool called:** `{{toolName}}` — **{{sessionName}}** in **{{workspaceName}}** (`{{sessionId}}`){{arguments}}' },
    bashMatch: { label: 'Matching bash command', variables: ['sessionId', 'sessionName', 'workspaceName', 'turn', 'step', 'command'], required: ['sessionId', 'command'], fallback: '💻 **Matching bash command** — **{{sessionName}}** in **{{workspaceName}}** (`{{sessionId}}`)\n{{command}}' },
    test: { label: 'Test notification', variables: ['sentAt'], required: ['sentAt'], fallback: '✅ **Discord notifications are working**\nTest sent from DeepSeek Harness at {{sentAt}}.' },
  }
  const SECRET_FIELD = 'web' + 'hookUrl'
  const FIELDS = [SECRET_FIELD, 'notifyTurnStart', 'notifyTurnEnd', 'notifyToolCalls', 'toolNames', 'notifyBashMatches', 'bashRegex', 'includeToolArguments', 'username', 'templates', 'testNonce']
  const bindSnapshotSelector = (source) => { const subscribe = (listener) => source.subscribe(listener); const getSnapshot = () => source.getSnapshot(); return (selector) => selector(useSyncExternalStore(subscribe, getSnapshot, getSnapshot)) }

  const card = { border: '1px solid var(--dsw-alias-border-l2)', background: 'var(--dsw-alias-bg-layer-3)', borderRadius: 12, listStyle: 'none' }
  const header = { appearance: 'none', width: '100%', font: 'inherit', color: 'inherit', textAlign: 'left', cursor: 'pointer', background: 'none', border: 0, borderRadius: 12, alignItems: 'center', gap: 12, padding: '14px 16px', display: 'flex' }
  const headText = { flexDirection: 'column', flex: 1, gap: 4, minWidth: 0, display: 'flex' }
  const titleStyle = { color: 'var(--dsw-alias-label-primary)', fontSize: 15, fontWeight: 600, lineHeight: 1.4 }
  const desc = { color: 'var(--dsw-alias-label-tertiary)', fontSize: 13, lineHeight: 1.5 }
  const body = { borderTop: '1px solid var(--dsw-alias-border-l2)', margin: '0 16px', paddingBottom: 8 }
  const field = { flexDirection: 'column', gap: 6, padding: '10px 0', display: 'flex' }
  const row = { alignItems: 'center', justifyContent: 'space-between', gap: 12, display: 'flex' }
  const label = { color: 'var(--dsw-alias-label-primary)', fontSize: 13, fontWeight: 500, lineHeight: 1.5 }
  const hint = { color: 'var(--dsw-alias-label-tertiary)', margin: 0, fontSize: 12, lineHeight: 1.5 }
  const input = { border: '1px solid var(--dsw-alias-border-l2)', background: 'var(--dsw-alias-bg-layer-3)', minHeight: 34, width: '100%', boxSizing: 'border-box', font: 'inherit', color: 'var(--dsw-alias-label-primary)', borderRadius: 8, padding: '6px 10px', fontSize: 13 }
  const footer = { borderTop: '1px solid var(--dsw-alias-border-l2)', display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center', gap: 8, padding: '12px 0 4px' }
  const button = { appearance: 'none', font: 'inherit', cursor: 'pointer', border: '1px solid transparent', borderRadius: 8, padding: '5px 14px', fontSize: 13 }
  const secondary = { ...button, borderColor: 'var(--dsw-alias-border-l2)', color: 'var(--dsw-alias-label-secondary)', background: 'none' }
  const primary = { ...button, background: 'var(--dsw-alias-brand-primary)', color: 'var(--dsw-alias-label-on-brand, #fff)' }
  const primaryDisabled = { ...primary, cursor: 'not-allowed', background: 'var(--dsw-alias-interactive-bg-disabled, var(--dsw-alias-bg-layer-2))', color: 'var(--dsw-alias-label-disabled, var(--dsw-alias-label-tertiary))', borderColor: 'var(--dsw-alias-border-l2)', opacity: 1 }
  const errorStyle = { color: 'var(--dsw-alias-label-error)', flex: '1 1 100%', margin: 0, fontSize: 12 }
  const successStyle = { color: 'var(--dsw-alias-label-success, #39a869)', flex: '1 1 100%', margin: 0, fontSize: 12 }
  const badge = { whiteSpace: 'nowrap', background: 'var(--dsw-alias-bg-module-platform)', color: 'var(--dsw-alias-label-secondary)', borderRadius: 999, padding: '1px 8px', fontSize: 11 }

  function Field(props) { return e('div', { style: field }, e('label', { htmlFor: props.id, style: label }, props.label), props.children, props.hint ? e('p', { style: hint }, props.hint) : null) }
  function Toggle(props) { return e('div', { style: field }, e('div', { style: row }, e('label', { htmlFor: props.id, style: label }, props.label), e('input', { id: props.id, type: 'checkbox', checked: props.checked, disabled: props.disabled, onChange: props.onChange })), props.hint ? e('p', { style: hint }, props.hint) : null) }
  function Chevron({ open }) { return e('span', { style: { transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .16s', color: 'var(--dsw-alias-label-tertiary)' } }, '▾') }

  function ToolSelector({ tools, selected, disabled, onChange }) {
    const [query, setQuery] = useState('')
    const choices = useMemo(() => [...new Set([...tools, ...selected])].sort(), [tools, selected])
    const filtered = useMemo(() => choices.filter((name) => name.toLowerCase().includes(query.trim().toLowerCase())), [choices, query])
    const toggle = (name) => onChange(selected.includes(name) ? selected.filter((item) => item !== name) : [...selected, name].sort())
    return e('div', { style: field },
      e('label', { htmlFor: 'discord-notify-tool-search', style: label }, 'Tools to notify'),
      e('input', { id: 'discord-notify-tool-search', type: 'search', style: input, placeholder: 'Search available tools…', value: query, disabled, onChange: (event) => setQuery(event.target.value) }),
      e('div', { role: 'group', 'aria-label': 'Available tools', style: { border: '1px solid var(--dsw-alias-border-l2)', borderRadius: 8, maxHeight: 220, overflow: 'auto', padding: 6 } },
        tools.length === 0 ? e('p', { style: { ...hint, padding: 8 } }, 'No tools were reported by the current agent presets.') : null,
        filtered.map((name) => e('label', { key: name, style: { ...row, justifyContent: 'flex-start', cursor: disabled ? 'default' : 'pointer', padding: '6px 8px', borderRadius: 6 } },
          e('input', { type: 'checkbox', checked: selected.includes(name), disabled, onChange: () => toggle(name) }), e('code', null, name), !tools.includes(name) ? e('span', { style: badge }, 'Unavailable') : null))),
      e('p', { style: hint }, selected.length === 0 ? 'No selection means every tool call matches.' : `${selected.length} tool${selected.length === 1 ? '' : 's'} selected.`))
  }

  function TemplateEditor({ templates, disabled, onChange }) {
    const [open, setOpen] = useState(false)
    return e('div', { style: { border: '1px solid var(--dsw-alias-border-l2)', borderRadius: 10, margin: '10px 0', overflow: 'hidden' } },
      e('button', { type: 'button', style: { ...header, padding: '12px 14px' }, 'aria-expanded': open, 'aria-label': `${open ? 'Collapse' : 'Expand'}: Advanced templates`, onClick: () => setOpen(!open) },
        e('span', { style: headText }, e('span', { style: label }, 'Advanced templates'), e('span', { style: hint }, 'Customize each Discord message with validated variables.')), e(Chevron, { open })),
      open ? e('div', { style: { borderTop: '1px solid var(--dsw-alias-border-l2)', padding: '0 14px 8px' } },
        Object.entries(TEMPLATE_SPECS).map(([key, spec]) => e(Field, { key, id: `discord-notify-template-${key}`, label: `${spec.label} template`, hint: `Available: ${spec.variables.map((item) => `{{${item}}}`).join(', ')}. Required: ${spec.required.map((item) => `{{${item}}}`).join(', ')}.` },
          e('textarea', { id: `discord-notify-template-${key}`, style: { ...input, minHeight: 88, resize: 'vertical', fontFamily: 'ui-monospace, monospace' }, value: templates[key] ?? spec.fallback, disabled, onChange: (event) => onChange(key, event.target.value) })))
      ) : null)
  }

  function DiscordNotifyCard({ useScope, scope }) {
    const snapshot = useScope((value) => value)
    const [open, setOpen] = useState(false); const [base, setBase] = useState(null); const [revision, setRevision] = useState(undefined)
    const [notificationUrl, setNotificationUrl] = useState(''); const [notifyTurnStart, setNotifyTurnStart] = useState(false); const [notifyTurnEnd, setNotifyTurnEnd] = useState(true)
    const [notifyToolCalls, setNotifyToolCalls] = useState(false); const [toolNames, setToolNames] = useState([]); const [notifyBashMatches, setNotifyBashMatches] = useState(false)
    const [bashRegex, setBashRegex] = useState(''); const [includeToolArguments, setIncludeToolArguments] = useState(false); const [username, setUsername] = useState('DeepSeek Harness')
    const [templates, setTemplates] = useState(Object.fromEntries(Object.entries(TEMPLATE_SPECS).map(([key, spec]) => [key, spec.fallback])))
    const [dirty, setDirty] = useState(false); const [saving, setSaving] = useState(false); const [testing, setTesting] = useState(false); const [failed, setFailed] = useState(''); const [success, setSuccess] = useState('')

    const load = (next, nextRevision) => { const value = next && typeof next === 'object' ? next : {}; setBase(value); setRevision(nextRevision); setNotificationUrl(''); setNotifyTurnStart(value.notifyTurnStart === true); setNotifyTurnEnd(value.notifyTurnEnd !== false); setNotifyToolCalls(value.notifyToolCalls === true); setToolNames(Array.isArray(value.toolNames) ? value.toolNames : []); setNotifyBashMatches(value.notifyBashMatches === true); setBashRegex(typeof value.bashRegex === 'string' ? value.bashRegex : ''); setIncludeToolArguments(value.includeToolArguments === true); setUsername(typeof value.username === 'string' ? value.username : 'DeepSeek Harness'); setTemplates(Object.fromEntries(Object.entries(TEMPLATE_SPECS).map(([key, spec]) => [key, typeof value.templates?.[key] === 'string' ? value.templates[key] : spec.fallback]))) }
    useEffect(() => { if (snapshot.status !== 'ready' || dirty) return; load(snapshot.value, snapshot.revision); setFailed('') }, [snapshot.status, snapshot.value, snapshot.revision, dirty])
    const touch = (setter, value) => { setter(value); setDirty(true); setFailed(''); setSuccess('') }
    const draft = () => ({ notifyTurnStart, notifyTurnEnd, notifyToolCalls, toolNames, notifyBashMatches, bashRegex: bashRegex.trim(), includeToolArguments, username: username.trim() || 'DeepSeek Harness', templates })
    const verifyWrite = (beforeRevision, ops) => { const accepted = scope.getSnapshot(); const visible = ops.filter((op) => op.path[0] !== SECRET_FIELD); const visibleRejected = visible.length > 0 && (accepted.revision === beforeRevision || visible.some((op) => JSON.stringify(accepted.value?.[op.path[0]]) !== JSON.stringify(op.value))); if (visibleRejected) throw new Error('The Host rejected the visible settings. Check the regex, selected tools, and template variables.'); return accepted }

    const save = async () => { setSaving(true); setFailed(''); setSuccess(''); try { const before = scope.getSnapshot(); if (before.revision !== revision) throw new Error('Settings changed after editing began. Discard and retry.'); const next = draft(); const ops = Object.keys(next).filter((key) => JSON.stringify(base?.[key]) !== JSON.stringify(next[key])).map((key) => ({ op: 'set', path: [key], value: next[key] })); const secret = notificationUrl.trim(); if (secret) ops.push({ op: 'set', path: [SECRET_FIELD], value: secret }); if (ops.length) await scope.mutate(ops, revision); const accepted = verifyWrite(revision, ops); load(accepted.value, accepted.revision); setDirty(false); setSuccess(secret ? 'Settings saved. The notification URL is stored securely.' : 'Settings saved.') } catch (error) { console.warn('[Discord Notify] settings save failed:', error); setFailed(error?.message || 'The Host rejected these settings. Check the notification URL and other values.') } finally { setSaving(false) } }
    const test = async () => { setTesting(true); setFailed(''); setSuccess(''); try { if (dirty) throw new Error('Save or discard your changes before sending a test.'); const before = scope.getSnapshot(); const nonce = Number.isSafeInteger(before.value?.testNonce) ? before.value.testNonce + 1 : 1; const ops = [{ op: 'set', path: ['testNonce'], value: nonce }]; await scope.mutate(ops, before.revision); const accepted = scope.getSnapshot(); if (accepted.revision === before.revision || accepted.value?.testNonce !== nonce) throw new Error('The Host rejected the test. Configure and save the notification URL first.'); load(accepted.value, accepted.revision); setSuccess('Test notification queued. Check Discord.') } catch (error) { setFailed(error?.message || 'Could not send test notification.') } finally { setTesting(false) } }
    const reset = async () => { setSaving(true); setFailed(''); setSuccess(''); try { const before = scope.getSnapshot(); const ops = FIELDS.map((name) => ({ op: 'unset', path: [name] })); await scope.mutate(ops, before.revision); const accepted = scope.getSnapshot(); const user = accepted.user && typeof accepted.user === 'object' ? accepted.user : {}; if (accepted.revision === before.revision || FIELDS.some((name) => Object.hasOwn(user, name))) throw new Error('The Host did not restore defaults.'); load(accepted.value, accepted.revision); setDirty(false) } catch (error) { setFailed(error?.message || 'Could not restore defaults.') } finally { setSaving(false) } }

    if (snapshot.status !== 'ready') return e('li', { style: card }, e('div', { style: header }, e('span', { style: hint }, 'Discord notification settings are loading or unavailable.')))
    const availableTools = Array.isArray(snapshot.value?.availableTools) ? snapshot.value.availableTools : []
    return e('li', { style: card },
      e('button', { type: 'button', style: header, 'aria-expanded': open, 'aria-label': `${open ? 'Collapse' : 'Expand'}: Discord notifications`, onClick: () => setOpen(!open) }, e('span', { style: headText }, e('span', { style: titleStyle }, 'Discord notifications'), e('span', { style: desc }, 'Send one-way alerts for turns, tools, and matching bash commands.')), dirty ? e('span', { style: badge }, 'Unsaved') : null, e(Chevron, { open })),
      open ? e('div', { style: body },
        e(Field, { id: 'discord-notify-url', label: 'Discord notification URL', hint: 'Write-only secret from the target Discord channel. Leave blank to keep the current value.' }, e('input', { id: 'discord-notify-url', type: 'password', autoComplete: 'off', placeholder: 'Paste the channel notification URL', style: input, value: notificationUrl, disabled: saving, onChange: (event) => touch(setNotificationUrl, event.target.value) })),
        e(Field, { id: 'discord-notify-username', label: 'Notification display name', hint: 'The sender name shown in Discord.' }, e('input', { id: 'discord-notify-username', style: input, maxLength: 80, value: username, disabled: saving, onChange: (event) => touch(setUsername, event.target.value) })),
        e(Toggle, { id: 'discord-notify-turn-start', label: 'Agent turn started', hint: 'Notify when DSH opens a new agent turn.', checked: notifyTurnStart, disabled: saving, onChange: () => touch(setNotifyTurnStart, !notifyTurnStart) }),
        e(Toggle, { id: 'discord-notify-turn-end', label: 'Agent turn ended', hint: 'Notify when a turn completes, is blocked, aborts, or errors.', checked: notifyTurnEnd, disabled: saving, onChange: () => touch(setNotifyTurnEnd, !notifyTurnEnd) }),
        e(Toggle, { id: 'discord-notify-tools', label: 'Selected tool calls', hint: 'Notify when one of the selected tools starts. No selection matches every tool.', checked: notifyToolCalls, disabled: saving, onChange: () => touch(setNotifyToolCalls, !notifyToolCalls) }),
        e(ToolSelector, { tools: availableTools, selected: toolNames, disabled: saving || !notifyToolCalls, onChange: (value) => touch(setToolNames, value) }),
        e(Toggle, { id: 'discord-notify-tool-arguments', label: 'Include tool arguments', hint: 'Potentially sensitive. Disabled by default; bash-match alerts still include the matched command.', checked: includeToolArguments, disabled: saving || !notifyToolCalls, onChange: () => touch(setIncludeToolArguments, !includeToolArguments) }),
        e(Toggle, { id: 'discord-notify-bash', label: 'Regex-matched bash commands', hint: 'Notify only when the bash command text matches the regular expression below.', checked: notifyBashMatches, disabled: saving, onChange: () => touch(setNotifyBashMatches, !notifyBashMatches) }),
        e(Field, { id: 'discord-notify-bash-regex', label: 'Bash command regular expression', hint: 'JavaScript regular expression syntax without slash delimiters. Example: ^(npm test|pnpm build)$' }, e('input', { id: 'discord-notify-bash-regex', style: input, placeholder: 'npm (test|run build)', value: bashRegex, disabled: saving || !notifyBashMatches, onChange: (event) => touch(setBashRegex, event.target.value) })),
        e(TemplateEditor, { templates, disabled: saving, onChange: (key, value) => touch(setTemplates, { ...templates, [key]: value }) }),
        e('div', { style: footer }, failed ? e('p', { style: errorStyle, role: 'status' }, failed) : null, success ? e('p', { style: successStyle, role: 'status' }, success) : null,
          e('button', { type: 'button', style: secondary, disabled: dirty || saving || testing || !snapshot.writable, onClick: () => { void test() } }, testing ? 'Sending test…' : 'Send test notification'),
          e('button', { type: 'button', style: secondary, disabled: saving || testing || !snapshot.writable, onClick: () => { void reset() } }, 'Restore defaults'),
          e('button', { type: 'button', style: secondary, disabled: !dirty || saving, onClick: () => { load(base, revision); setDirty(false); setFailed(''); setSuccess('') } }, 'Discard changes'),
          e('button', { type: 'button', style: (!dirty || saving || !snapshot.writable) ? primaryDisabled : primary, disabled: !dirty || saving || !snapshot.writable, onClick: () => { void save() } }, saving ? 'Saving…' : 'Save')))
      : null)
  }

  function apply(ctx) { const scope = ctx.settingsScope.bind({ namespace: NS }); const useScope = bindSnapshotSelector(scope); ctx.slots.inject('settings.plugin.item', () => ctx.slots.register({ name: 'settings.plugin.item', key: NS, inject: () => ({ useScope, scope }) }, DiscordNotifyCard), 'dsh-discord-notify: plugin settings card') }
  exports.apply = apply; exports.inject = ['slots', 'settingsScope']; return module.exports
} })

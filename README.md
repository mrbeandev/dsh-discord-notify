# dsh-discord-notify

One-way Discord webhook notifications for DeepSeek Harness (DSH).

The plugin can notify a Discord channel when:

- an agent turn starts;
- an agent turn ends;
- a selected tool is called; or
- a `bash` tool command matches a JavaScript regular expression.

It only sends messages to Discord. It does not read Discord messages, expose commands, or allow Discord users to interact with DSH.

## Security and privacy

- The webhook URL is registered as a DSH `role('secret')` setting. It is removed from remote settings reads and never returned to the browser after saving.
- Discord mentions are disabled with `allowed_mentions.parse: []`.
- Tool arguments are excluded by default because they may contain prompts, file paths, tokens, or other sensitive data.
- Regex-matched bash alerts include the matching command text by design.
- Delivery failures are logged without printing the webhook URL or request body.

Treat a Discord webhook URL like a password. Revoke it in Discord if it is exposed.

## Installation

```sh
dsh plugin --profile web add dsh-discord-notify
```

Restart the running DSH web profile, then open:

**Settings → Plugins → Plugin configuration → Discord notifications**

For local development:

```sh
dsh plugin --profile web add ./dsh-discord-notify
```

Installing a packed tarball is recommended for release testing:

```sh
npm pack
dsh plugin --profile web add ./dsh-discord-notify-0.1.0.tgz
```

## Configuration

The settings accordion exposes:

| Setting | Default | Behavior |
| --- | --- | --- |
| Discord webhook URL | empty | Write-only Discord webhook secret; no notifications are sent until configured |
| Webhook display name | `DeepSeek Harness` | Sender name shown in Discord |
| Agent turn started | off | Sends a message for each durable `turn/start` event |
| Agent turn ended | on | Sends a message for each durable `turn/end` event and includes its reason |
| Selected tool calls | off | Sends when a `tool/call` event matches the exact-name filter |
| Tool names | empty | Comma-separated exact names; empty means every tool |
| Include tool arguments | off | Includes raw tool arguments in selected-tool alerts |
| Regex-matched bash commands | off | Enables command-specific matching for the `bash` tool |
| Bash command regular expression | empty | JavaScript regex syntax without `/` delimiters |

Example bash patterns:

```text
^(npm test|pnpm run build)$
```

```text
(deploy|publish|terraform apply)
```

Invalid, oversized, or potentially catastrophic regular expressions and non-Discord webhook URLs are rejected before settings are saved. Regex matching is limited to the first 16 KiB of a bash command to protect the shared Host event loop.

## Composition configuration

The package installs itself through `cordis.patch.yml`. A manual equivalent is:

```yaml
- insert:
    - id: discord-notify
      name: dsh-discord-notify
      config:
        notifyTurnEnd: true
        notifyTurnStart: false
        notifyToolCalls: false
        toolNames: []
        notifyBashMatches: false
        bashRegex: ''
        includeToolArguments: false
        username: DeepSeek Harness
```

Avoid putting `webhookUrl` in a committed composition. Configure it through the settings accordion or a private local configuration file.

## Event semantics

The Host plugin observes DSH's canonical post-commit `session/event` feed. This provides exact durable `turn/start`, `turn/end`, and `tool/call` events across active sessions. Notifications are queued in event order and sent without blocking the agent loop.

A bash match is evaluated against `arguments.command` from the `bash` tool's JSON arguments. Bash alerts are independent from the general tool-call filter, so a matching command can be enabled without enabling notifications for every bash invocation.

## Development

Requires Node.js `^22.19.0` or `>=24.0.0`. The initial compatibility target is DSH `0.1.5-rc.2`; the plugin uses that release's live settings scope and `session/event` contracts.

```sh
npm install
npm run check
```

`npm run check` validates syntax, runs tests, and inspects the npm package payload.

## License

MIT

# Security

Oficina Opencode is a **local** dashboard for opencode. It binds to `127.0.0.1`
and stores state in memory.

## Scope

- The app can create opencode sessions and send prompts from the browser. Agents
  act with their own permissions (edit files, run commands). Prefer read-only
  agents such as `investigador` when demoing.
- External processes can report agent state to `/api/agents/report`. This only
  stores status, task, file and logs; it does not execute anything.
- No telemetry, no external assets, no CDN.

## Recommendations

- Do not expose ports `5174`, `5180` or `4096` to untrusted networks.
- If you set `OPENCODE_SERVER_PASSWORD`, the proxy forwards Basic auth, but the
  dashboard itself remains a local-only tool.
- Review agent permissions before giving them access to sensitive folders.

## Reporting

Use GitHub's private vulnerability reporting on this repository (Security tab →
Report a vulnerability). Please do not open a public issue for vulnerabilities.

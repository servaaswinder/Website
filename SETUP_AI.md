# AI Setup — Antigravity MCP Servers

Dit bestand beschrijft welke tools je moet installeren op een nieuwe pc om AI-nakijken te gebruiken.

## Vereisten

1. **Antigravity** geïnstalleerd (https://antigravity.google)
2. **Node.js LTS** geïnstalleerd (https://nodejs.org) — vereist voor Firebase en GitHub MCP
3. **PowerShell ExecutionPolicy** op `RemoteSigned` zetten:
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
   ```

## MCP Configuratie

Maak het bestand `%USERPROFILE%\.gemini\antigravity\mcp_config.json` aan met de volgende inhoud.
Vervang de placeholders door de echte tokens/strings (vraag deze op bij Servaas Winder).

```json
{
  "mcpServers": {
    "firebase-mcp-server": {
      "$typeName": "exa.cascade_plugins_pb.CascadePluginCommandTemplate",
      "command": "npx",
      "args": ["-y", "firebase-tools@latest", "mcp"],
      "env": {}
    },
    "github": {
      "$typeName": "exa.cascade_plugins_pb.CascadePluginCommandTemplate",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "<JOUW_GITHUB_PAT>"
      }
    },
    "postgres": {
      "$typeName": "exa.cascade_plugins_pb.CascadePluginCommandTemplate",
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-postgres",
        "<RAILWAY_CONNECTION_STRING>"
      ],
      "env": {}
    }
  }
}
```

### GitHub PAT aanmaken
1. Ga naar https://github.com/settings/tokens/new
2. Scopes: `repo`, `workflow`, `read:org`, `read:user`, `user:email`, `notifications`, `read:packages`, `gist`
3. Vul het token in bij `GITHUB_PERSONAL_ACCESS_TOKEN`

### Railway connection string
Vraag de PostgreSQL connection string op bij Servaas (Railway → Nakijk-app project → Postgres → Connect).

## Herstart Antigravity

Na het aanmaken van de config: sluit Antigravity volledig af en open een **nieuw gesprek**.

## AI Nakijken gebruiken

Typ in Antigravity: `/nakijken`

De AI haalt openstaande inleveringen op, bekijkt het werk van de leerling en schrijft een concept-beoordeling in Firebase. Jij ziet dit terug in de inbox van `docenten.html` met een 🤖 label. Open de inlevering, controleer de beoordeling (gele vakjes = AI) en rond af.

# addevent-mcp-server

An MCP server that wraps the [AddEvent Calendar & Events API v2](https://docs.addevent.com/reference/getting-started), so Claude can create, search, retrieve, update, and delete events, calendars, and RSVP attendees on your AddEvent account.

## Tools

**Events** — `addevent_create_event`, `addevent_search_events`, `addevent_get_event`, `addevent_update_event`, `addevent_delete_event`

**Calendars** — `addevent_create_calendar`, `addevent_search_calendars`, `addevent_get_calendar`, `addevent_update_calendar`, `addevent_delete_calendar`

**RSVP attendees** — `addevent_create_rsvp`, `addevent_search_rsvps`, `addevent_get_rsvp`, `addevent_update_rsvp`, `addevent_delete_rsvp`

**Helper** — `addevent_list_timezones` (looks up valid timezone values for events/calendars)

## 1. Get your AddEvent API key

Sign in at [dashboard.addevent.com](https://dashboard.addevent.com), go to **Settings > API**, and copy the API token. This is the value the server sends as `Authorization: Bearer <token>` on every request.

## 2. Run it locally (stdio, for Claude Desktop)

```bash
npm install
cp .env.example .env    # then paste your API key into ADDEVENT_API_KEY
npm run build
npm start
```

To use it from Claude Desktop, add it to your MCP config (Claude Desktop settings > Developer > Edit Config):

```json
{
  "mcpServers": {
    "addevent": {
      "command": "node",
      "args": ["/absolute/path/to/addevent-mcp-server/dist/index.js"],
      "env": {
        "ADDEVENT_API_KEY": "your-api-token-here"
      }
    }
  }
}
```

## 3. Deploy to Vercel (remote connector, works from any device)

This mirrors your existing `ghl-mcp-remote` setup.

```bash
npm install -g vercel   # if you don't already have it
vercel login
cd addevent-mcp-server
vercel
```

Then, in the Vercel project dashboard: **Settings > Environment Variables**, add `ADDEVENT_API_KEY` with your token, and redeploy so the function picks it up.

Your MCP endpoint will be:

```
https://<your-project-name>.vercel.app/api/mcp
```

Add that URL as a custom connector in Claude (claude.ai > Settings > Connectors, or wherever your workspace manages MCP connectors), the same way `ghl-mcp-remote.vercel.app` shows up in your tool list now.

## 4. Test before connecting

The [MCP Inspector](https://github.com/modelcontextprotocol/inspector) is the fastest way to sanity-check tool calls before wiring the server into Claude:

```bash
npx @modelcontextprotocol/inspector
```

Point it at `node dist/index.js` (stdio) or `http://localhost:3000/mcp` (after running `TRANSPORT=http npm start` locally).

## Notes on the AddEvent API

- Base URL: `https://api.addevent.com/calevent/v2`. Auth is a Bearer token, not an API-key header.
- Search endpoints return up to `page_size` (max 20) results per call — use `page` to page through more.
- The AddEvent docs list the search-calendars response's array key as `calendar` (singular), which is inconsistent with `events` and `rsvps` elsewhere. The client code (`src/format.ts`, `extractArray`) checks both `calendar` and `calendars` defensively so this doesn't silently return an empty list — worth confirming against a real response the first time you run `addevent_search_calendars`, and simplifying once confirmed.
- Deleting an event, calendar, or RSVP attendee is permanent — there's no undo or archive endpoint in this API.
- RSVP creation only works on events created with `rsvp_enabled: true`.

## Extending this server

Not covered yet, but straightforward to add if you need them later: calendar subscribers, RSVP forms, and event/calendar landing page templates (all read-only list/search endpoints in the AddEvent API). Follow the pattern in `src/tools/timezones.ts` for a minimal read-only tool.

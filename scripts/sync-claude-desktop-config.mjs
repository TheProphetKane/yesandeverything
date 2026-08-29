// sync-claude-desktop-config.mjs
// Pushes the tracked tool-server list (config/claude_desktop_config.json) into the
// live Claude Desktop config at %APPDATA%\Claude\claude_desktop_config.json.
//
// The live file is app-owned: Claude Desktop rewrites it while running and keeps its
// own keys in it (preferences, coworkUserFilesPath, account state). Only one key in
// it is ours: mcpServers. So this merges that single key and leaves the rest alone.
// A symlink was rejected for exactly that reason: the app writing through a link
// would push its account state into this public repo.
//
// Direction is repo to live, always. The tracked copy is canonical; a server added
// only through the app's developer settings gets replaced on the next sync, so add
// servers in config/claude_desktop_config.json and rerun this.
import { readFileSync, writeFileSync, renameSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoPath = join(here, '..', 'config', 'claude_desktop_config.json');
const livePath = join(process.env.APPDATA, 'Claude', 'claude_desktop_config.json');

const repo = JSON.parse(readFileSync(repoPath, 'utf8'));
if (!repo.mcpServers) {
  console.error('sync-claude-desktop-config: tracked config has no mcpServers key, refusing to blank the live one');
  process.exit(1);
}

let live = {};
if (existsSync(livePath)) {
  live = JSON.parse(readFileSync(livePath, 'utf8'));
}

const before = JSON.stringify(live.mcpServers ?? null);
const after = JSON.stringify(repo.mcpServers);
if (before === after) {
  console.log('claude_desktop_config: already in sync (' + Object.keys(repo.mcpServers).join(', ') + ')');
  process.exit(0);
}

live.mcpServers = repo.mcpServers;
const tmp = livePath + '.sync-tmp';
writeFileSync(tmp, JSON.stringify(live, null, 2) + '\n', 'utf8');
renameSync(tmp, livePath);
console.log('claude_desktop_config: mcpServers written (' + Object.keys(repo.mcpServers).join(', ') + '); relaunch Claude Desktop to load it');

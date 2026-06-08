import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '..', 'data', 'game.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const initTables = () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      nickname TEXT NOT NULL,
      avatar TEXT,
      level INTEGER DEFAULT 1,
      total_paints INTEGER DEFAULT 0,
      wins INTEGER DEFAULT 0,
      losses INTEGER DEFAULT 0,
      mvp_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS game_records (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL,
      mode TEXT NOT NULL,
      winner_team_id TEXT,
      duration INTEGER NOT NULL,
      start_time DATETIME NOT NULL,
      replay_id TEXT,
      final_grid BLOB
    );

    CREATE TABLE IF NOT EXISTS player_game_stats (
      id TEXT PRIMARY KEY,
      game_id TEXT NOT NULL,
      player_id TEXT NOT NULL,
      team_id TEXT NOT NULL,
      paints INTEGER DEFAULT 0,
      areas_captured INTEGER DEFAULT 0,
      items_used INTEGER DEFAULT 0,
      is_mvp INTEGER DEFAULT 0,
      FOREIGN KEY (game_id) REFERENCES game_records(id),
      FOREIGN KEY (player_id) REFERENCES players(id)
    );

    CREATE TABLE IF NOT EXISTS achievements (
      id TEXT PRIMARY KEY,
      player_id TEXT NOT NULL,
      name TEXT NOT NULL,
      season TEXT NOT NULL,
      icon TEXT,
      description TEXT,
      earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (player_id) REFERENCES players(id)
    );

    CREATE TABLE IF NOT EXISTS inventories (
      id TEXT PRIMARY KEY,
      player_id TEXT NOT NULL,
      item_id TEXT NOT NULL,
      count INTEGER DEFAULT 0,
      FOREIGN KEY (player_id) REFERENCES players(id),
      UNIQUE(player_id, item_id)
    );

    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      reporter_id TEXT NOT NULL,
      target_id TEXT NOT NULL,
      game_id TEXT,
      reason TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (reporter_id) REFERENCES players(id),
      FOREIGN KEY (target_id) REFERENCES players(id)
    );

    CREATE TABLE IF NOT EXISTS blocked_players (
      id TEXT PRIMARY KEY,
      player_id TEXT NOT NULL,
      blocked_player_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(player_id, blocked_player_id)
    );

    CREATE INDEX IF NOT EXISTS idx_players_nickname ON players(nickname);
    CREATE INDEX IF NOT EXISTS idx_game_records_start_time ON game_records(start_time);
    CREATE INDEX IF NOT EXISTS idx_player_game_stats_player ON player_game_stats(player_id);
    CREATE INDEX IF NOT EXISTS idx_achievements_player ON achievements(player_id);
  `);

  const itemCount = db.prepare('SELECT COUNT(*) as count FROM inventories').get() as { count: number };
  if (itemCount.count === 0) {
    db.prepare(
      "INSERT OR IGNORE INTO players (id, nickname, avatar) VALUES ('default', 'System', '')"
    ).run();
    const insertItem = db.prepare(
      'INSERT OR IGNORE INTO inventories (id, player_id, item_id, count) VALUES (?, ?, ?, ?)'
    );
    [
      ['item_freeze', 'default', 'item_freeze', 3],
      ['item_speed', 'default', 'item_speed', 3],
      ['item_bomb', 'default', 'item_bomb', 2],
      ['item_shield', 'default', 'item_shield', 2],
      ['item_reveal', 'default', 'item_reveal', 2],
    ].forEach(([id, pid, iid, count]) => {
      insertItem.run(`${id}_${pid}`, pid, iid, count);
    });
  }
};

initTables();

export const getPlayerById = (id: string) => {
  return db.prepare('SELECT * FROM players WHERE id = ?').get(id);
};

export const createPlayer = (id: string, nickname: string, avatar: string) => {
  db.prepare(
    'INSERT OR REPLACE INTO players (id, nickname, avatar, last_login_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)'
  ).run(id, nickname, avatar);

  const defaultItems = [
    { id: 'item_freeze', count: 3 },
    { id: 'item_speed', count: 3 },
    { id: 'item_bomb', count: 2 },
    { id: 'item_shield', count: 2 },
    { id: 'item_reveal', count: 2 },
  ];

  const insertItem = db.prepare(
    'INSERT OR IGNORE INTO inventories (id, player_id, item_id, count) VALUES (?, ?, ?, ?)'
  );

  defaultItems.forEach((item) => {
    insertItem.run(`${item.id}_${id}`, id, item.id, item.count);
  });

  return getPlayerById(id);
};

export const updatePlayer = (id: string, updates: any) => {
  const fields = Object.keys(updates)
    .map((k) => `${k} = ?`)
    .join(', ');
  const values = [...Object.values(updates), id];
  db.prepare(`UPDATE players SET ${fields} WHERE id = ?`).run(...values);
  return getPlayerById(id);
};

export const getPlayerInventory = (playerId: string) => {
  return db
    .prepare('SELECT item_id, count FROM inventories WHERE player_id = ?')
    .all(playerId);
};

export const getRankings = (limit: number = 100) => {
  return db
    .prepare(
      `SELECT p.*, 
        CASE WHEN (p.wins + p.losses) > 0 
             THEN ROUND(p.wins * 100.0 / (p.wins + p.losses), 1) 
             ELSE 0 END as win_rate
       FROM players p
       ORDER BY p.wins DESC, p.total_paints DESC, p.mvp_count DESC
       LIMIT ?`
    )
    .all(limit);
};

export const getPlayerAchievements = (playerId: string) => {
  return db
    .prepare('SELECT * FROM achievements WHERE player_id = ? ORDER BY earned_at DESC')
    .all(playerId);
};

export const saveGameRecord = (record: any) => {
  db.prepare(
    'INSERT INTO game_records (id, room_id, mode, winner_team_id, duration, start_time, replay_id, final_grid) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(
    record.id,
    record.roomId,
    record.mode,
    record.winnerTeamId,
    record.duration,
    record.startTime,
    record.replayId,
    record.finalGrid
  );
};

export const savePlayerStats = (stats: any) => {
  db.prepare(
    'INSERT INTO player_game_stats (id, game_id, player_id, team_id, paints, areas_captured, items_used, is_mvp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(
    stats.id,
    stats.gameId,
    stats.playerId,
    stats.teamId,
    stats.paints,
    stats.areasCaptured,
    stats.itemsUsed,
    stats.isMvp ? 1 : 0
  );
};

export const addReport = (report: any) => {
  db.prepare(
    'INSERT INTO reports (id, reporter_id, target_id, game_id, reason, status) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(report.id, report.reporterId, report.targetId, report.gameId, report.reason, 'pending');
};

export const addBlockedPlayer = (playerId: string, blockedPlayerId: string) => {
  db.prepare(
    'INSERT OR IGNORE INTO blocked_players (id, player_id, blocked_player_id) VALUES (?, ?, ?)'
  ).run(`${playerId}_${blockedPlayerId}`, playerId, blockedPlayerId);
};

export default db;

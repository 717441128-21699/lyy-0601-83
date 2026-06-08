import { v4 as uuidv4 } from 'uuid';
import {
  GameState,
  Player,
  Cell,
  Team,
  TEAM_COLORS,
  TEAM_NAMES,
  Item,
  ITEMS,
  ReplayFrame,
  Area,
} from '../shared/types';
import {
  createEmptyGrid,
  findConnectedAreas,
  calculateScores,
} from '../src/utils/pixelUtils';

export class GameEngine {
  private games: Map<string, GameState> = new Map();
  private rooms: Map<string, any> = new Map();
  private matchingQueue: string[] = [];
  private playerRooms: Map<string, string> = new Map();

  createRoom(
    hostId: string,
    hostName: string,
    mode: '2v2' | '4v4' | 'free' = '2v2'
  ) {
    const roomId = uuidv4().substring(0, 6);
    const maxPlayers = mode === '2v2' ? 4 : mode === '4v4' ? 8 : 8;

    const room = {
      id: roomId,
      name: `${hostName}的房间`,
      mode,
      maxPlayers,
      currentPlayers: 1,
      status: 'waiting' as const,
      hostId,
      createdAt: Date.now(),
      hasPassword: false,
      players: [hostId],
    };

    this.rooms.set(roomId, room);
    this.playerRooms.set(hostId, roomId);
    return room;
  }

  joinRoom(roomId: string, playerId: string) {
    const room = this.rooms.get(roomId);
    if (!room || room.currentPlayers >= room.maxPlayers) return null;

    room.players.push(playerId);
    room.currentPlayers++;
    this.playerRooms.set(playerId, roomId);
    return room;
  }

  leaveRoom(playerId: string) {
    const roomId = this.playerRooms.get(playerId);
    if (!roomId) return;

    const room = this.rooms.get(roomId);
    if (room) {
      room.players = room.players.filter((p: string) => p !== playerId);
      room.currentPlayers--;
      if (room.currentPlayers === 0) {
        this.rooms.delete(roomId);
      }
    }
    this.playerRooms.delete(playerId);
  }

  getRooms() {
    return Array.from(this.rooms.values());
  }

  addToMatchQueue(playerId: string) {
    if (!this.matchingQueue.includes(playerId)) {
      this.matchingQueue.push(playerId);
    }
    return this.tryMatch();
  }

  removeFromMatchQueue(playerId: string) {
    this.matchingQueue = this.matchingQueue.filter((p) => p !== playerId);
  }

  private tryMatch() {
    if (this.matchingQueue.length >= 4) {
      const players = this.matchingQueue.splice(0, 4);
      const room = this.createRoom(players[0], '系统匹配', '2v2');
      players.slice(1).forEach((p) => this.joinRoom(room.id, p));
      return { roomId: room.id, players };
    }
    return null;
  }

  startGame(roomId: string, players: Player[], mode: '2v2' | '4v4' | 'free') {
    const teamCount = mode === 'free' ? Math.ceil(players.length / 2) : 2;
    const teams: Team[] = [];
    for (let i = 0; i < teamCount; i++) {
      teams.push({
        id: `team_${i}`,
        name: TEAM_NAMES[i],
        color: TEAM_COLORS[i],
        score: 0,
        percent: 0,
      });
    }

    const assignedPlayers: Player[] = players.map((p, idx) => {
      const role: 'attacker' | 'defender' | 'supporter' =
        idx % 3 === 0 ? 'attacker' : idx % 3 === 1 ? 'defender' : 'supporter';
      return {
        ...p,
        teamId: teams[idx % teamCount].id,
        role,
        stats: { paints: 0, areasCaptured: 0, itemsUsed: 0 },
        effects: [],
      };
    });

    const gameState: GameState = {
      id: uuidv4(),
      status: 'playing',
      gridSize: 32,
      grid: createEmptyGrid(32),
      teams,
      players: assignedPlayers,
      startTime: Date.now(),
      duration: 300,
      timeLeft: 300,
      capturedAreas: [],
      replayFrames: [],
      mode,
    };

    this.games.set(gameState.id, gameState);
    return gameState;
  }

  getGame(gameId: string) {
    return this.games.get(gameId);
  }

  paintCell(
    gameId: string,
    playerId: string,
    x: number,
    y: number,
    color: string
  ): { cell: Cell; areas: Area[]; scores: Team[] } | null {
    const game = this.games.get(gameId);
    if (!game || game.status !== 'playing') return null;

    const player = game.players.find((p) => p.id === playerId);
    if (!player || !player.teamId) return null;

    const now = Date.now();
    const cooldown = this.getPlayerCooldown(player);
    if (now - game.grid[y][x].lastPainted < cooldown) return null;

    const freezeEffect = player.effects.find(
      (e) => e.type === 'freeze' && now - e.startTime < e.duration * 1000
    );
    if (freezeEffect) return null;

    const cell: Cell = {
      x,
      y,
      color,
      teamId: player.teamId,
      painterId: playerId,
      lastPainted: now,
    };

    game.grid[y][x] = cell;
    player.stats.paints++;

    const areas = findConnectedAreas(game.grid, player.teamId, 25);
    const newAreas = areas.filter(
      (a) => !game.capturedAreas.some((ca) => ca.id === a.id)
    );
    game.capturedAreas = [...game.capturedAreas, ...newAreas];
    player.stats.areasCaptured += newAreas.length;

    const scores = calculateScores(game.grid, game.teams);
    game.teams = scores;

    this.addReplayFrame(game, 'paint', { x, y, color, playerId, teamId: player.teamId });
    if (newAreas.length > 0) {
      this.addReplayFrame(game, 'area', { areas: newAreas, teamId: player.teamId });
    }
    this.addReplayFrame(game, 'score', { scores });

    return { cell, areas: newAreas, scores };
  }

  useItem(
    gameId: string,
    playerId: string,
    itemId: string,
    targetId?: string
  ): any | null {
    const game = this.games.get(gameId);
    if (!game || game.status !== 'playing') return null;

    const player = game.players.find((p) => p.id === playerId);
    if (!player) return null;

    const item = ITEMS.find((i) => i.id === itemId);
    if (!item) return null;

    const now = Date.now();
    if (now - (player as any)[`item_${itemId}_lastUsed`] < item.cooldown) return null;
    (player as any)[`item_${itemId}_lastUsed`] = now;
    player.stats.itemsUsed++;

    let effectResult: any = null;

    if (item.effect.freeze && targetId) {
      const target = game.players.find((p) => p.id === targetId);
      if (target) {
        const hasShield = target.effects.some(
          (e) => e.type === 'shield' && now - e.startTime < e.duration * 1000
        );
        if (!hasShield) {
          target.effects.push({
            type: 'freeze',
            duration: item.effect.freeze,
            startTime: now,
          });
          effectResult = { targetId, type: 'freeze', duration: item.effect.freeze };
        }
      }
    }

    if (item.effect.speedBoost) {
      player.effects.push({
        type: 'speedBoost',
        duration: item.effect.speedBoost,
        startTime: now,
      });
      effectResult = { type: 'speedBoost', duration: item.effect.speedBoost };
    }

    if (item.effect.shield) {
      player.effects.push({
        type: 'shield',
        duration: item.effect.shield,
        startTime: now,
      });
      effectResult = { type: 'shield', duration: item.effect.shield };
    }

    if (item.effect.clearArea && targetId) {
      const target = game.players.find((p) => p.id === targetId);
      if (target && target.teamId) {
        let cleared = 0;
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            const tx = Math.floor(game.gridSize / 2) + dx;
            const ty = Math.floor(game.gridSize / 2) + dy;
            if (
              tx >= 0 &&
              tx < game.gridSize &&
              ty >= 0 &&
              ty < game.gridSize &&
              game.grid[ty][tx].teamId === target.teamId
            ) {
              game.grid[ty][tx] = {
                ...game.grid[ty][tx],
                color: null,
                teamId: null,
                painterId: null,
              };
              cleared++;
            }
          }
        }
        effectResult = { type: 'clearArea', targetId, cleared };

        const scores = calculateScores(game.grid, game.teams);
        game.teams = scores;
        this.addReplayFrame(game, 'score', { scores });
      }
    }

    if (item.effect.reveal) {
      effectResult = { type: 'reveal', duration: item.effect.reveal, playerId };
    }

    this.addReplayFrame(game, 'item', {
      itemId,
      playerId,
      targetId,
      effect: effectResult,
    });

    return { item, effect: effectResult };
  }

  private getPlayerCooldown(player: Player): number {
    const baseCooldown = 500;
    const hasSpeedBoost = player.effects.some(
      (e) =>
        e.type === 'speedBoost' && Date.now() - e.startTime < e.duration * 1000
    );
    return hasSpeedBoost ? baseCooldown * 0.5 : baseCooldown;
  }

  private addReplayFrame(game: GameState, type: ReplayFrame['type'], data: any) {
    game.replayFrames.push({
      timestamp: Date.now(),
      type,
      data,
    });
  }

  addChatMessage(gameId: string, message: any) {
    const game = this.games.get(gameId);
    if (!game) return;
    this.addReplayFrame(game, 'chat', message);
  }

  endGame(gameId: string) {
    const game = this.games.get(gameId);
    if (!game) return null;

    game.status = 'ended';

    const winner = game.teams.reduce((prev, curr) =>
      curr.percent > prev.percent ? curr : prev
    );

    let mvp = game.players[0];
    game.players.forEach((p) => {
      if (p.stats.paints > mvp.stats.paints) mvp = p;
    });

    return {
      gameId: game.id,
      winner,
      teams: game.teams,
      players: game.players,
      mvp,
      replayId: game.id,
      finalGrid: JSON.stringify(game.grid),
    };
  }

  getPlayerRoomId(playerId: string) {
    return this.playerRooms.get(playerId);
  }

  updateTimeLeft(gameId: string, timeLeft: number) {
    const game = this.games.get(gameId);
    if (game) {
      game.timeLeft = timeLeft;
    }
  }

  removeGame(gameId: string) {
    this.games.delete(gameId);
  }

  updatePlayer(gameId: string, playerId: string, updates: Partial<Player>) {
    const game = this.games.get(gameId);
    if (!game) return null;

    const playerIndex = game.players.findIndex((p) => p.id === playerId);
    if (playerIndex === -1) return null;

    game.players[playerIndex] = {
      ...game.players[playerIndex],
      ...updates,
    };

    return game.players[playerIndex];
  }
}

export const gameEngine = new GameEngine();

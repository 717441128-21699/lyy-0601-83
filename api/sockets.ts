import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { gameEngine } from './gameEngine';
import {
  createPlayer,
  getPlayerById,
  updatePlayer,
  saveGameRecord,
  savePlayerStats,
  addReport,
  addBlockedPlayer,
  getRankings,
  getPlayerAchievements,
} from './database';
import { ChatMessage, Player } from '../shared/types';

interface SocketData {
  playerId: string;
  nickname: string;
  gameId: string | null;
}

export function setupSockets(io: Server) {
  const playerSockets = new Map<string, Socket>();
  const socketPlayers = new Map<string, SocketData>();
  const gameTimers = new Map<string, NodeJS.Timeout>();

  io.on('connection', (socket: Socket) => {
    console.log('New connection:', socket.id);

    socket.on('auth:guest', async (data: { nickname: string; avatar: string }) => {
      try {
        const playerId = uuidv4();
        const player = createPlayer(playerId, data.nickname, data.avatar);
        socketPlayers.set(socket.id, {
          playerId,
          nickname: data.nickname,
          gameId: null,
        });
        playerSockets.set(playerId, socket);
        socket.emit('auth:success', { player });
      } catch (error) {
        socket.emit('auth:error', { message: '登录失败' });
      }
    });

    socket.on('auth:reconnect', async (data: { playerId: string }) => {
      const player = getPlayerById(data.playerId) as { nickname: string } | undefined;
      if (player) {
        socketPlayers.set(socket.id, {
          playerId: data.playerId,
          nickname: player.nickname,
          gameId: null,
        });
        playerSockets.set(data.playerId, socket);
        socket.emit('auth:success', { player });

        const roomId = gameEngine.getPlayerRoomId(data.playerId);
        if (roomId) {
          socket.emit('player:reconnected', { roomId });
        }
      } else {
        socket.emit('auth:error', { message: '玩家不存在' });
      }
    });

    socket.on('match:find', (data: { mode: 'auto' | 'friend' }) => {
      const socketData = socketPlayers.get(socket.id);
      if (!socketData) return;

      const result = gameEngine.addToMatchQueue(socketData.playerId);
      if (result) {
        const { roomId, players } = result;
        players.forEach((pid) => {
          const s = playerSockets.get(pid);
          if (s) {
            s.emit('match:found', { roomId, players });
          }
        });
      } else {
        socket.emit('match:waiting', { position: gameEngine['matchingQueue'].length });
      }
    });

    socket.on('match:cancel', () => {
      const socketData = socketPlayers.get(socket.id);
      if (socketData) {
        gameEngine.removeFromMatchQueue(socketData.playerId);
      }
    });

    socket.on('room:create', (data: { mode: '2v2' | '4v4' | 'free' }) => {
      const socketData = socketPlayers.get(socket.id);
      if (!socketData) return;

      const room = gameEngine.createRoom(
        socketData.playerId,
        socketData.nickname,
        data.mode
      );
      socket.emit('room:created', { room });
      io.emit('rooms:update', gameEngine.getRooms());
    });

    socket.on('room:join', (data: { roomId: string }) => {
      const socketData = socketPlayers.get(socket.id);
      if (!socketData) return;

      const room = gameEngine.joinRoom(data.roomId, socketData.playerId);
      if (room) {
        socket.emit('room:joined', { room });
        io.to(data.roomId).emit('room:playerJoined', {
          playerId: socketData.playerId,
          nickname: socketData.nickname,
        });
        io.emit('rooms:update', gameEngine.getRooms());
      } else {
        socket.emit('room:error', { message: '加入房间失败' });
      }
    });

    socket.on('room:leave', () => {
      const socketData = socketPlayers.get(socket.id);
      if (!socketData) return;

      const roomId = gameEngine.getPlayerRoomId(socketData.playerId);
      gameEngine.leaveRoom(socketData.playerId);
      if (roomId) {
        io.to(roomId).emit('room:playerLeft', { playerId: socketData.playerId });
      }
      io.emit('rooms:update', gameEngine.getRooms());
    });

    socket.on('rooms:get', () => {
      socket.emit('rooms:list', gameEngine.getRooms());
    });

    socket.on('game:start', (data: { roomId: string; mode: '2v2' | '4v4' | 'free' }) => {
      const socketData = socketPlayers.get(socket.id);
      if (!socketData) return;

      const room = gameEngine.getRooms().find((r) => r.id === data.roomId);
      if (!room || room.hostId !== socketData.playerId) return;

      const players: Player[] = room.players.map((pid: string) => {
        const p = getPlayerById(pid) as { id: string; nickname: string; avatar: string } | undefined;
        return {
          id: p?.id || pid,
          nickname: p?.nickname || '未知玩家',
          avatar: p?.avatar || '',
          teamId: null,
          role: 'attacker',
          isOnline: true,
          stats: { paints: 0, areasCaptured: 0, itemsUsed: 0 },
          effects: [],
        };
      });

      const gameState = gameEngine.startGame(data.roomId, players, data.mode);
      socketData.gameId = gameState.id;

      room.players.forEach((pid: string) => {
        const s = playerSockets.get(pid);
        const sd = socketPlayers.get(s?.id || '');
        if (sd) sd.gameId = gameState.id;
        if (s) {
          s.join(gameState.id);
          s.emit('game:started', { gameState });
        }
      });

      const timer = setInterval(() => {
        const game = gameEngine.getGame(gameState.id);
        if (!game) {
          clearInterval(timer);
          return;
        }

        game.timeLeft--;
        io.to(gameState.id).emit('score:update', {
          teams: game.teams,
          timeLeft: game.timeLeft,
        });

        if (game.timeLeft <= 0) {
          clearInterval(timer);
          endGame(gameState.id, room.id, room.mode);
        }
      }, 1000);

      gameTimers.set(gameState.id, timer);
    });

    const endGame = (gameId: string, roomId: string, mode: string) => {
      const result = gameEngine.endGame(gameId);
      if (!result) return;

      saveGameRecord({
        id: gameId,
        roomId,
        mode,
        winnerTeamId: result.winner.id,
        duration: 300,
        startTime: Date.now() - 300000,
        replayId: result.replayId,
        finalGrid: result.finalGrid,
      });

      result.players.forEach((p: Player) => {
        savePlayerStats({
          id: uuidv4(),
          gameId,
          playerId: p.id,
          teamId: p.teamId,
          paints: p.stats.paints,
          areasCaptured: p.stats.areasCaptured,
          itemsUsed: p.stats.itemsUsed,
          isMvp: p.id === result.mvp.id,
        });

        const player = getPlayerById(p.id) as {
          total_paints: number;
          wins: number;
          losses: number;
          mvp_count: number;
        } | undefined;
        if (player) {
          const isWinner = p.teamId === result.winner.id;
          updatePlayer(p.id, {
            total_paints: player.total_paints + p.stats.paints,
            wins: player.wins + (isWinner ? 1 : 0),
            losses: player.losses + (isWinner ? 0 : 1),
            mvp_count: player.mvp_count + (p.id === result.mvp.id ? 1 : 0),
          });
        }
      });

      io.to(gameId).emit('game:ended', result);
      gameTimers.delete(gameId);

      setTimeout(() => {
        gameEngine.removeGame(gameId);
      }, 60000);
    };

    socket.on('cell:paint', (data: { x: number; y: number; color: string }) => {
      const socketData = socketPlayers.get(socket.id);
      if (!socketData || !socketData.gameId) return;

      const result = gameEngine.paintCell(
        socketData.gameId,
        socketData.playerId,
        data.x,
        data.y,
        data.color
      );

      if (result) {
        io.to(socketData.gameId).emit('cell:update', {
          ...result.cell,
          playerId: socketData.playerId,
        });

        if (result.areas.length > 0) {
          io.to(socketData.gameId).emit('area:capture', {
            areas: result.areas,
            teamId: result.cell.teamId,
          });
        }
      }
    });

    socket.on('item:use', (data: { itemId: string; targetId?: string }) => {
      const socketData = socketPlayers.get(socket.id);
      if (!socketData || !socketData.gameId) return;

      const result = gameEngine.useItem(
        socketData.gameId,
        socketData.playerId,
        data.itemId,
        data.targetId
      );

      if (result) {
        io.to(socketData.gameId).emit('item:effect', {
          itemId: data.itemId,
          effect: result.effect,
          playerId: socketData.playerId,
          targetId: data.targetId,
        });
      }
    });

    socket.on('chat:send', (data: { message: string; type: 'text' | 'emote'; roomId: string }) => {
      const socketData = socketPlayers.get(socket.id);
      if (!socketData) return;

      const msg: ChatMessage = {
        id: uuidv4(),
        playerId: socketData.playerId,
        nickname: socketData.nickname,
        content: data.message,
        type: data.type,
        timestamp: Date.now(),
      };

      const gameId = socketData.gameId;
      if (gameId) {
        gameEngine.addChatMessage(gameId, msg);
        io.to(gameId).emit('chat:receive', msg);
      } else if (data.roomId) {
        io.to(data.roomId).emit('chat:receive', msg);
      }
    });

    socket.on('player:update', (data: Partial<Player>) => {
      const socketData = socketPlayers.get(socket.id);
      if (!socketData) return;

      if (socketData.gameId) {
        gameEngine.updatePlayer(socketData.gameId, socketData.playerId, data);
        io.to(socketData.gameId).emit('player:updated', {
          playerId: socketData.playerId,
          ...data,
        });
      }
    });

    socket.on('report:player', (data: { targetId: string; reason: string }) => {
      const socketData = socketPlayers.get(socket.id);
      if (!socketData) return;

      addReport({
        id: uuidv4(),
        reporterId: socketData.playerId,
        targetId: data.targetId,
        gameId: socketData.gameId,
        reason: data.reason,
      });
    });

    socket.on('player:block', (data: { blockedPlayerId: string }) => {
      const socketData = socketPlayers.get(socket.id);
      if (!socketData) return;
      addBlockedPlayer(socketData.playerId, data.blockedPlayerId);
    });

    socket.on('rankings:get', () => {
      const rankings = getRankings(100);
      socket.emit('rankings:list', { rankings });
    });

    socket.on('achievements:get', (data: { playerId: string }) => {
      const achievements = getPlayerAchievements(data.playerId);
      socket.emit('achievements:list', { achievements });
    });

    socket.on('disconnect', () => {
      const socketData = socketPlayers.get(socket.id);
      if (socketData) {
        playerSockets.delete(socketData.playerId);

        if (socketData.gameId) {
          io.to(socketData.gameId).emit('player:disconnect', {
            playerId: socketData.playerId,
          });
          gameEngine.updatePlayer(socketData.gameId, socketData.playerId, {
            isOnline: false,
          });
        }

        gameEngine.removeFromMatchQueue(socketData.playerId);
        gameEngine.leaveRoom(socketData.playerId);
        io.emit('rooms:update', gameEngine.getRooms());
      }
      socketPlayers.delete(socket.id);
    });
  });
}

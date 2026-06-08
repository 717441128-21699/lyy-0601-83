import express from 'express';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { saveGameRecord, savePlayerStats, addReport, addBlockedPlayer } from '../database';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'pixel_war_secret';

router.post('/record', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: '未授权' });
    }

    jwt.verify(token, JWT_SECRET);

    const { roomId, mode, winnerTeamId, duration, startTime, replayId, finalGrid, playerStats } = req.body;

    const gameId = uuidv4();
    saveGameRecord({
      id: gameId,
      roomId,
      mode,
      winnerTeamId,
      duration,
      startTime,
      replayId,
      finalGrid,
    });

    if (playerStats && Array.isArray(playerStats)) {
      playerStats.forEach((stats: any) => {
        savePlayerStats({
          id: uuidv4(),
          gameId,
          playerId: stats.playerId,
          teamId: stats.teamId,
          paints: stats.paints,
          areasCaptured: stats.areasCaptured,
          itemsUsed: stats.itemsUsed,
          isMvp: stats.isMvp,
        });
      });
    }

    res.json({ success: true, gameId });
  } catch (error) {
    console.error('Save game record error:', error);
    res.status(500).json({ error: '保存游戏记录失败' });
  }
});

router.post('/report', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: '未授权' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { playerId: string };
    const { targetId, gameId, reason } = req.body;

    if (!targetId || !reason) {
      return res.status(400).json({ error: '参数不完整' });
    }

    addReport({
      id: uuidv4(),
      reporterId: decoded.playerId,
      targetId,
      gameId,
      reason,
    });

    res.json({ success: true, message: '举报已提交' });
  } catch (error) {
    console.error('Report error:', error);
    res.status(500).json({ error: '举报失败' });
  }
});

router.post('/block', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: '未授权' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { playerId: string };
    const { blockedPlayerId } = req.body;

    if (!blockedPlayerId) {
      return res.status(400).json({ error: '参数不完整' });
    }

    addBlockedPlayer(decoded.playerId, blockedPlayerId);

    res.json({ success: true, message: '已屏蔽该玩家' });
  } catch (error) {
    console.error('Block error:', error);
    res.status(500).json({ error: '屏蔽失败' });
  }
});

export default router;

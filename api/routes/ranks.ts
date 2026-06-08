import express from 'express';
import jwt from 'jsonwebtoken';
import { getRankings, getPlayerAchievements } from '../database';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'pixel_war_secret';

router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const rankings = getRankings(limit);

    const rankedPlayers = rankings.map((player: any, index: number) => ({
      playerId: player.id,
      nickname: player.nickname,
      avatar: player.avatar,
      rank: index + 1,
      stats: {
        level: player.level,
        totalPaints: player.total_paints,
        wins: player.wins,
        losses: player.losses,
        mvpCount: player.mvp_count,
        winRate: player.win_rate,
      },
    }));

    res.json({ rankings: rankedPlayers });
  } catch (error) {
    console.error('Rankings error:', error);
    res.status(500).json({ error: '获取排行榜失败' });
  }
});

router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: '未授权' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { playerId: string };
    const rankings = getRankings(1000) as Array<{
      id: string;
      level: number;
      total_paints: number;
      wins: number;
      losses: number;
      mvp_count: number;
      win_rate: number;
    }>;

    const myRank = rankings.findIndex((p) => p.id === decoded.playerId);
    const myStats = myRank >= 0 ? rankings[myRank] : null;

    if (!myStats) {
      return res.status(404).json({ error: '玩家不存在' });
    }

    res.json({
      rank: myRank + 1,
      stats: {
        level: myStats.level,
        totalPaints: myStats.total_paints,
        wins: myStats.wins,
        losses: myStats.losses,
        mvpCount: myStats.mvp_count,
        winRate: myStats.win_rate,
      },
    });
  } catch (error) {
    console.error('My rank error:', error);
    res.status(500).json({ error: '获取个人排名失败' });
  }
});

router.get('/achievements', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: '未授权' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { playerId: string };
    const achievements = getPlayerAchievements(decoded.playerId);

    res.json({ achievements });
  } catch (error) {
    console.error('Achievements error:', error);
    res.status(500).json({ error: '获取成就失败' });
  }
});

export default router;

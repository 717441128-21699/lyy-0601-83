import express from 'express';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { createPlayer, getPlayerById } from '../database';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'pixel_war_secret';

router.post('/guest', async (req, res) => {
  try {
    const { nickname, avatar } = req.body;

    if (!nickname || nickname.length < 2 || nickname.length > 12) {
      return res.status(400).json({ error: '昵称长度必须在2-12字符之间' });
    }

    const playerId = uuidv4();
    const player = createPlayer(playerId, nickname, avatar);

    const token = jwt.sign({ playerId }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      player,
      token,
    });
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: '登录失败' });
  }
});

router.get('/profile', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: '未授权' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { playerId: string };
    const player = getPlayerById(decoded.playerId);

    if (!player) {
      return res.status(404).json({ error: '玩家不存在' });
    }

    res.json({ player });
  } catch (error) {
    res.status(401).json({ error: '无效的token' });
  }
});

export default router;

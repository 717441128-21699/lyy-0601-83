import express from 'express';
import jwt from 'jsonwebtoken';
import { getPlayerInventory, updatePlayer } from '../database';
import { ITEMS } from '../../shared/types.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'pixel_war_secret';

router.get('/', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: '未授权' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { playerId: string };
    const inventory = getPlayerInventory(decoded.playerId);

    const itemsWithDetails = inventory.map((inv: any) => {
      const itemDetails = ITEMS.find((i) => i.id === inv.item_id);
      return {
        ...itemDetails,
        count: inv.count,
      };
    }).filter((item) => item.id);

    res.json({ items: itemsWithDetails });
  } catch (error) {
    console.error('Inventory error:', error);
    res.status(500).json({ error: '获取道具失败' });
  }
});

router.post('/buy', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: '未授权' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { playerId: string };
    const { itemId } = req.body;

    const item = ITEMS.find((i) => i.id === itemId);
    if (!item) {
      return res.status(404).json({ error: '道具不存在' });
    }

    const inventory = getPlayerInventory(decoded.playerId);
    const existingItem = inventory.find((i: any) => i.item_id === itemId);

    if (existingItem) {
      const updateInv = (await import('../database.js')).default.prepare(
        'UPDATE inventories SET count = count + 1 WHERE player_id = ? AND item_id = ?'
      );
      updateInv.run(decoded.playerId, itemId);
    } else {
      const insertInv = (await import('../database.js')).default.prepare(
        'INSERT INTO inventories (id, player_id, item_id, count) VALUES (?, ?, ?, ?)'
      );
      insertInv.run(`${itemId}_${decoded.playerId}`, decoded.playerId, itemId, 1);
    }

    res.json({ success: true, message: '购买成功' });
  } catch (error) {
    console.error('Buy item error:', error);
    res.status(500).json({ error: '购买失败' });
  }
});

router.post('/use', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: '未授权' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { playerId: string };
    const { itemId } = req.body;

    const inventory = getPlayerInventory(decoded.playerId);
    const existingItem = inventory.find((i: any) => i.item_id === itemId) as { count: number } | undefined;

    if (!existingItem || existingItem.count <= 0) {
      return res.status(400).json({ error: '道具不足' });
    }

    const updateInv = (await import('../database.js')).default.prepare(
      'UPDATE inventories SET count = count - 1 WHERE player_id = ? AND item_id = ?'
    );
    updateInv.run(decoded.playerId, itemId);

    res.json({ success: true, message: '使用成功' });
  } catch (error) {
    console.error('Use item error:', error);
    res.status(500).json({ error: '使用失败' });
  }
});

export default router;

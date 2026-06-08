import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Zap, Shield, Eye, Snowflake, Bomb, Coins, Info } from 'lucide-react';
import { PixelButton } from '../components/PixelButton';
import { Layout } from '../components/Layout';
import { useGameStore } from '../store/useGameStore';
import { useSocket } from '../hooks/useSocket';
import { ITEMS } from '../../shared/types';
import { getCooldownPercent } from '../utils/pixelUtils';

export function Items() {
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const navigate = useNavigate();
  const { currentPlayer, inventory, setInventory } = useGameStore();
  const { emit } = useSocket();

  useEffect(() => {
    if (!currentPlayer) {
      navigate('/');
    }
  }, [currentPlayer, navigate]);

  const itemIcons: { [key: string]: any } = {
    item_freeze: Snowflake,
    item_speed: Zap,
    item_bomb: Bomb,
    item_shield: Shield,
    item_reveal: Eye,
  };

  const itemColors: { [key: string]: string } = {
    item_freeze: 'text-pixel-blue',
    item_speed: 'text-pixel-yellow',
    item_bomb: 'text-pixel-red',
    item_shield: 'text-pixel-green',
    item_reveal: 'text-pixel-purple',
  };

  const itemBorders: { [key: string]: string } = {
    item_freeze: 'border-pixel-blue',
    item_speed: 'border-pixel-yellow',
    item_bomb: 'border-pixel-red',
    item_shield: 'border-pixel-green',
    item_reveal: 'border-pixel-purple',
  };

  const buyItem = (itemId: string, price: number) => {
    const newInventory = inventory.map((item) =>
      item.id === itemId ? { ...item, count: item.count + 1 } : item
    );
    setInventory(newInventory);
  };

  const categories = [
    { id: 'attack', name: '攻击道具', items: ITEMS.filter((i) => i.type === 'attack') },
    { id: 'defend', name: '防御道具', items: ITEMS.filter((i) => i.type === 'defend') },
    { id: 'support', name: '辅助道具', items: ITEMS.filter((i) => i.type === 'support') },
  ];

  if (!currentPlayer) return null;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6">
        <div className="pixel-card mb-6">
          <div className="flex items-center justify-between">
            <h2 className="font-pixel text-lg neon-text-pink flex items-center gap-2">
              <ShoppingBag size={20} />
              道具商店
            </h2>
            <div className="flex items-center gap-2">
              <Coins className="text-pixel-yellow" size={20} />
              <span className="font-pixel text-pixel-yellow">
                {Math.floor(currentPlayer.stats?.paints / 10) + 100}
              </span>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {categories.map((category, catIndex) => (
            <div key={category.id} className="space-y-4">
              <h3 className="font-pixel text-sm text-pixel-blue flex items-center gap-2">
                {category.id === 'attack' ? (
                  <Zap size={16} className="text-pixel-red" />
                ) : category.id === 'defend' ? (
                  <Shield size={16} className="text-pixel-green" />
                ) : (
                  <Eye size={16} className="text-pixel-blue" />
                )}
                {category.name}
              </h3>

              <div className="space-y-3">
                {category.items.map((item, index) => {
                  const owned = inventory.find((i) => i.id === item.id);
                  const Icon = itemIcons[item.id];
                  const cooldownPercent = getCooldownPercent(owned?.lastUsed || 0, item.cooldown);
                  const isOnCooldown = cooldownPercent < 100;

                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: catIndex * 0.1 + index * 0.1 }}
                      className={`pixel-card p-4 cursor-pointer transition-all ${
                        selectedItem === item.id
                          ? `${itemBorders[item.id]} shadow-lg`
                          : 'hover:border-pixel-blue/50'
                      }`}
                      onClick={() => setSelectedItem(selectedItem === item.id ? null : item.id)}
                    >
                      <div className="flex items-start gap-4">
                        <div className="relative">
                          <div
                            className={`w-14 h-14 flex items-center justify-center border-4 ${itemBorders[item.id]} bg-pixel-bg`}
                          >
                            <Icon className={itemColors[item.id]} size={28} />
                          </div>
                          {owned && (
                            <div className="absolute -bottom-1 -right-1 bg-pixel-purple border-2 border-pixel-blue px-1">
                              <span className="font-pixel text-xs text-pixel-blue">
                                x{owned.count}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className={`font-pixel text-sm ${itemColors[item.id]}`}>
                              {item.name}
                            </h4>
                            <div className="flex items-center gap-1">
                              <Coins size={12} className="text-pixel-yellow" />
                              <span className="font-pixel text-xs text-pixel-yellow">
                                {item.price}
                              </span>
                            </div>
                          </div>

                          <p className="font-pixel-body text-xs text-gray-400 mb-2">
                            {item.description}
                          </p>

                          <div className="flex items-center justify-between">
                            <div className="font-pixel-body text-xs text-gray-500">
                              冷却: {item.cooldown / 1000}秒
                            </div>

                            {isOnCooldown && (
                              <div className="w-16 h-1 bg-pixel-bg overflow-hidden">
                                <div
                                  className="h-full bg-pixel-blue"
                                  style={{ width: `${cooldownPercent}%` }}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <AnimatePresence>
                        {selectedItem === item.id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden mt-4 pt-4 border-t-2 border-pixel-blue/30"
                          >
                            <div className="flex gap-2">
                              <PixelButton
                                variant="success"
                                className="flex-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  buyItem(item.id, item.price);
                                }}
                              >
                                购买
                              </PixelButton>
                              <PixelButton
                                variant="primary"
                                className="flex-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  emit('item:use', { itemId: item.id });
                                }}
                                disabled={!owned || owned.count <= 0 || isOnCooldown}
                              >
                                使用
                              </PixelButton>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="pixel-card mt-6">
          <h3 className="font-pixel text-sm text-pixel-yellow mb-4 flex items-center gap-2">
            <Info size={16} />
            道具说明
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
            {ITEMS.map((item) => (
              <div key={item.id} className="p-3 bg-pixel-bg border border-pixel-blue/20">
                <div className="flex items-center gap-2 mb-2">
                  {(() => {
                    const Icon = itemIcons[item.id];
                    return <Icon className={itemColors[item.id]} size={16} />;
                  })()}
                  <span className={`font-pixel text-xs ${itemColors[item.id]}`}>
                    {item.name}
                  </span>
                </div>
                <p className="font-pixel-body text-xs text-gray-500">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}

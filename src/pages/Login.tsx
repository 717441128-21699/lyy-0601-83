import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, Zap, Palette, Swords } from 'lucide-react';
import { PixelButton } from '../components/PixelButton';
import { PixelAvatar } from '../components/PixelAvatar';
import { useSocket } from '../hooks/useSocket';
import { generatePixelAvatar } from '../utils/pixelUtils';
import { useGameStore } from '../store/useGameStore';

export function Login() {
  const [nickname, setNickname] = useState('');
  const [avatar, setAvatar] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { connect, emit, on } = useSocket();
  const { setCurrentPlayer, currentPlayer } = useGameStore();

  useEffect(() => {
    const seed = Math.random().toString(36);
    setAvatar(generatePixelAvatar(seed));

    const savedId = localStorage.getItem('playerId');
    if (savedId) {
      connect();
      setTimeout(() => {
        emit('auth:reconnect', { playerId: savedId });
      }, 500);
    } else {
      connect();
    }

    const offSuccess = on('auth:success', (data: any) => {
      setCurrentPlayer(data.player);
      setIsLoading(false);
      navigate('/match');
    });

    const offError = on('auth:error', () => {
      setIsLoading(false);
      localStorage.removeItem('playerId');
    });

    return () => {
      offSuccess();
      offError();
    };
  }, [connect, emit, on, setCurrentPlayer, navigate]);

  useEffect(() => {
    if (currentPlayer) {
      navigate('/match');
    }
  }, [currentPlayer, navigate]);

  const regenerateAvatar = () => {
    const seed = Math.random().toString(36);
    setAvatar(generatePixelAvatar(seed));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (nickname.length < 2 || nickname.length > 12) return;

    setIsLoading(true);
    emit('auth:guest', { nickname, avatar });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="pixel-card">
          <div className="text-center mb-8">
            <motion.div
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="mb-4"
            >
              <h1 className="font-pixel text-2xl neon-text-pink mb-2">像素战争</h1>
              <p className="font-pixel-body text-pixel-blue text-lg">PIXEL WARFARE</p>
            </motion.div>

            <div className="flex justify-center gap-4 my-6">
              <motion.div
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
                className="text-3xl"
              >
                <Palette className="text-pixel-pink" />
              </motion.div>
              <motion.div
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
                className="text-3xl"
              >
                <Swords className="text-pixel-blue" />
              </motion.div>
              <motion.div
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.6 }}
                className="text-3xl"
              >
                <Zap className="text-pixel-yellow" />
              </motion.div>
            </div>

            <p className="font-pixel-body text-gray-400 text-sm">
              在画布上争夺领地，与队友协作击败对手！
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <PixelAvatar src={avatar} size={80} />
                <button
                  type="button"
                  onClick={regenerateAvatar}
                  className="absolute -bottom-1 -right-1 w-8 h-8 bg-pixel-purple border-2 border-pixel-blue rounded-full flex items-center justify-center hover:border-pixel-pink transition-colors"
                >
                  <Sparkles size={14} className="text-pixel-blue" />
                </button>
              </div>
              <span className="font-pixel-body text-xs text-gray-500">点击随机切换头像</span>
            </div>

            <div>
              <label className="block font-pixel-body text-pixel-blue mb-2 text-sm">
                输入昵称 (2-12字符)
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="请输入昵称..."
                maxLength={12}
                className="pixel-input text-center"
              />
              {nickname.length > 0 && nickname.length < 2 && (
                <p className="font-pixel-body text-pixel-red text-xs mt-1">昵称至少2个字符</p>
              )}
            </div>

            <PixelButton
              type="submit"
              disabled={isLoading || nickname.length < 2 || nickname.length > 12}
              className="w-full"
              variant="primary"
            >
              {isLoading ? '连接中...' : '开始游戏'}
            </PixelButton>
          </form>

          <div className="mt-8 pt-6 border-t-2 border-pixel-blue/30">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="font-pixel text-lg text-pixel-green">5</div>
                <div className="font-pixel-body text-xs text-gray-500">分钟一局</div>
              </div>
              <div>
                <div className="font-pixel text-lg text-pixel-pink">2v2</div>
                <div className="font-pixel-body text-xs text-gray-500">组队对抗</div>
              </div>
              <div>
                <div className="font-pixel text-lg text-pixel-yellow">∞</div>
                <div className="font-pixel-body text-xs text-gray-500">创意无限</div>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center font-pixel-body text-gray-600 text-xs mt-4">
          像素战争 © 2024 - 用颜色征服战场
        </p>
      </motion.div>
    </div>
  );
}

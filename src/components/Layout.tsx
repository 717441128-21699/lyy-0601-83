import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Users, Palette, Swords, MessageSquare, Trophy, Play, ShoppingBag } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { PixelAvatar } from './PixelAvatar';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentPlayer, connectionStatus } = useGameStore();

  const navItems = [
    { path: '/match', icon: Home, label: '大厅' },
    { path: '/game', icon: Palette, label: '游戏' },
    { path: '/team', icon: Users, label: '队伍' },
    { path: '/items', icon: ShoppingBag, label: '道具' },
    { path: '/chat', icon: MessageSquare, label: '聊天' },
    { path: '/replay', icon: Play, label: '回放' },
    { path: '/rank', icon: Trophy, label: '排行' },
  ];

  const isGamePage = location.pathname === '/game';

  return (
    <div className="min-h-screen bg-pixel-bg grid-bg relative overflow-hidden">
      <div className="absolute inset-0 scanline-bg pointer-events-none z-10" />
      <div className="absolute inset-0 crt-effect pointer-events-none" />

      {!isGamePage && (
        <header className="fixed top-0 left-0 right-0 z-40 bg-pixel-purple/90 backdrop-blur border-b-4 border-pixel-blue">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <Link
              to="/match"
              className="font-pixel text-lg neon-text-blue hover:neon-text-pink transition-all"
            >
              像素战争
            </Link>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    connectionStatus === 'connected'
                      ? 'bg-pixel-green animate-pulse'
                      : connectionStatus === 'connecting'
                      ? 'bg-pixel-yellow animate-pulse'
                      : 'bg-pixel-red'
                  }`}
                />
                <span className="font-pixel-body text-sm text-gray-400">
                  {connectionStatus === 'connected'
                    ? '已连接'
                    : connectionStatus === 'connecting'
                    ? '连接中...'
                    : '未连接'}
                </span>
              </div>

              {currentPlayer && (
                <div className="flex items-center gap-3">
                  <PixelAvatar src={currentPlayer.avatar} size={36} online />
                  <div className="hidden sm:block">
                    <div className="font-pixel-body text-sm text-pixel-blue">
                      {currentPlayer.nickname}
                    </div>
                    <div className="font-pixel-body text-xs text-gray-500">
                      Lv.{Math.floor(currentPlayer.stats?.paints / 100) + 1}
                    </div>
                  </div>
                  <button
                    onClick={() => navigate('/')}
                    className="font-pixel-body text-xs text-pixel-pink hover:text-pixel-red transition-colors"
                  >
                    退出
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
      )}

      {!isGamePage && (
        <nav className="fixed bottom-0 left-0 right-0 z-40 bg-pixel-purple/90 backdrop-blur border-t-4 border-pixel-blue">
          <div className="container mx-auto px-2">
            <div className="flex justify-around items-center h-16">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className="flex flex-col items-center gap-1 px-2 py-1 transition-all"
                  >
                    <motion.div
                      animate={isActive ? { y: -2 } : { y: 0 }}
                      className={`${
                        isActive ? 'text-pixel-pink' : 'text-gray-500 hover:text-pixel-blue'
                      } transition-colors`}
                    >
                      <item.icon size={20} />
                    </motion.div>
                    <span
                      className={`font-pixel-body text-xs ${
                        isActive ? 'text-pixel-pink' : 'text-gray-500'
                      }`}
                    >
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>
      )}

      <main className={`${!isGamePage ? 'pt-20 pb-20' : ''} min-h-screen`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

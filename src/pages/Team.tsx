import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, Sword, Shield, Heart, Crown, Settings, UserPlus } from 'lucide-react';
import { PixelButton } from '../components/PixelButton';
import { PixelAvatar } from '../components/PixelAvatar';
import { Layout } from '../components/Layout';
import { useGameStore } from '../store/useGameStore';
import { useSocket } from '../hooks/useSocket';

export function Team() {
  const [selectedRole, setSelectedRole] = useState<'attacker' | 'defender' | 'supporter'>('attacker');
  const navigate = useNavigate();
  const { currentPlayer, gameState } = useGameStore();
  const { emit } = useSocket();

  useEffect(() => {
    if (!currentPlayer) {
      navigate('/');
    }
  }, [currentPlayer, navigate]);

  const roles = [
    {
      id: 'attacker',
      name: '进攻型',
      icon: Sword,
      color: 'text-pixel-pink',
      borderColor: 'border-pixel-pink',
      bgColor: 'bg-pixel-pink/10',
      desc: '专注涂色扩张，冷却时间-10%',
    },
    {
      id: 'defender',
      name: '防守型',
      icon: Shield,
      color: 'text-pixel-blue',
      borderColor: 'border-pixel-blue',
      bgColor: 'bg-pixel-blue/10',
      desc: '保护己方区域，被干扰时间-50%',
    },
    {
      id: 'supporter',
      name: '支援型',
      icon: Heart,
      color: 'text-pixel-green',
      borderColor: 'border-pixel-green',
      bgColor: 'bg-pixel-green/10',
      desc: '辅助队友，道具效果+20%',
    },
  ];

  const changeRole = (role: 'attacker' | 'defender' | 'supporter') => {
    setSelectedRole(role);
    emit('player:update', { role });
  };

  if (!currentPlayer) return null;

  const myTeam = gameState?.teams.find((t) => t.id === currentPlayer.teamId);
  const teammates = gameState?.players.filter((p) => p.teamId === currentPlayer.teamId) || [];
  const opponents = gameState?.players.filter((p) => p.teamId !== currentPlayer.teamId) || [];

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="pixel-card">
            <h2 className="font-pixel text-lg neon-text-blue mb-6 flex items-center gap-2">
              <Users size={20} />
              我的队伍
            </h2>

            {myTeam && (
              <div
                className="p-4 mb-6 border-4"
                style={{ borderColor: myTeam.color, backgroundColor: myTeam.color + '10' }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10"
                    style={{ backgroundColor: myTeam.color }}
                  />
                  <div>
                    <div
                      className="font-pixel text-lg"
                      style={{ color: myTeam.color }}
                    >
                      {myTeam.name}
                    </div>
                    <div className="font-pixel-body text-sm text-gray-400">
                      占领 {myTeam.percent}% 区域
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {teammates.map((player, index) => (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`flex items-center justify-between p-4 ${
                    player.id === currentPlayer.id
                      ? 'bg-pixel-blue/20 border-2 border-pixel-blue'
                      : 'bg-pixel-bg border-2 border-pixel-blue/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <PixelAvatar src={player.avatar} size={44} online={player.isOnline} />
                      {index === 0 && (
                        <Crown
                          className="absolute -top-2 -right-2 text-pixel-yellow"
                          size={16}
                        />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-pixel-body text-white">
                          {player.nickname}
                        </span>
                        {player.id === currentPlayer.id && (
                          <span className="font-pixel text-xs text-pixel-blue">(你)</span>
                        )}
                      </div>
                      <div className="font-pixel-body text-xs text-gray-500">
                        {player.role === 'attacker'
                          ? '⚔️ 进攻型'
                          : player.role === 'defender'
                          ? '🛡️ 防守型'
                          : '💚 支援型'}
                        {' · '}
                        涂色 {player.stats?.paints || 0}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-pixel text-sm text-pixel-pink">
                      {player.stats?.paints || 0}
                    </div>
                    <div className="font-pixel-body text-xs text-gray-500">涂色数</div>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="mt-6 pt-6 border-t-2 border-pixel-blue/30">
              <h3 className="font-pixel text-sm text-pixel-pink mb-4 flex items-center gap-2">
                <Settings size={16} />
                选择分工
              </h3>
              <div className="grid grid-cols-3 gap-3">
                {roles.map((role) => (
                  <button
                    key={role.id}
                    onClick={() => changeRole(role.id as any)}
                    className={`p-4 border-4 transition-all ${
                      selectedRole === role.id
                        ? `${role.borderColor} ${role.bgColor}`
                        : 'border-pixel-blue/30 hover:border-pixel-blue/50'
                    }`}
                  >
                    <role.icon className={`mx-auto mb-2 ${role.color}`} size={24} />
                    <div className={`font-pixel text-xs ${role.color} mb-1`}>
                      {role.name}
                    </div>
                    <div className="font-pixel-body text-xs text-gray-500 leading-tight">
                      {role.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="pixel-card">
              <h3 className="font-pixel text-sm text-pixel-pink mb-4 flex items-center gap-2">
                <Sword size={16} />
                对手队伍
              </h3>
              <div className="space-y-3">
                {opponents.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between p-3 bg-pixel-bg border-2 border-pixel-red/30"
                  >
                    <div className="flex items-center gap-3">
                      <PixelAvatar src={player.avatar} size={36} online={player.isOnline} />
                      <div>
                        <div className="font-pixel-body text-white">
                          {player.nickname}
                        </div>
                        <div className="font-pixel-body text-xs text-gray-500">
                          涂色 {player.stats?.paints || 0}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          emit('report:player', {
                            targetId: player.id,
                            reason: '违规行为',
                          })
                        }
                        className="p-2 text-pixel-red hover:bg-pixel-red/10 transition-colors"
                        title="举报"
                      >
                        <Shield size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pixel-card">
              <h3 className="font-pixel text-sm text-pixel-yellow mb-4">战术标记</h3>
              <p className="font-pixel-body text-sm text-gray-400 mb-4">
                在游戏中与队友沟通，标记重要区域
              </p>
              <div className="grid grid-cols-4 gap-2">
                {['🎯', '🛡️', '⚡', '❌'].map((emoji, i) => (
                  <button
                    key={i}
                    className="p-3 bg-pixel-bg border-2 border-pixel-blue/30 hover:border-pixel-blue text-2xl transition-colors"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <div className="pixel-card">
              <h3 className="font-pixel text-sm text-pixel-green mb-4 flex items-center gap-2">
                <UserPlus size={16} />
                邀请好友
              </h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={gameState?.id ? `${window.location.origin}/invite/${gameState.id}` : ''}
                  readOnly
                  className="pixel-input text-sm flex-1 !py-2"
                />
                <PixelButton variant="success" onClick={() => navigator.clipboard.writeText(gameState?.id || '')}>
                  复制
                </PixelButton>
              </div>
            </div>

            <div className="pixel-card">
              <h3 className="font-pixel text-sm text-pixel-blue mb-4">区域加成</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-pixel-body text-gray-400">5×5 区域</span>
                  <span className="font-pixel text-sm text-pixel-green">+20% 速度</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-pixel-body text-gray-400">10×10 区域</span>
                  <span className="font-pixel text-sm text-pixel-blue">+40% 速度</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-pixel-body text-gray-400">15×15 区域</span>
                  <span className="font-pixel text-sm text-pixel-pink">+50% 速度</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

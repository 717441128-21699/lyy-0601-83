import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Trophy,
  Medal,
  Crown,
  Award,
  TrendingUp,
  Target,
  Palette,
  Users,
  Star,
  Sparkles,
  ChevronDown,
} from 'lucide-react';
import { PixelButton } from '../components/PixelButton';
import { PixelAvatar } from '../components/PixelAvatar';
import { Layout } from '../components/Layout';
import { useGameStore } from '../store/useGameStore';
import { generatePixelAvatar } from '../utils/pixelUtils';
import { RankEntry, Achievement } from '../../shared/types';

const mockRanks: RankEntry[] = [
  {
    playerId: '1',
    nickname: '像素大师',
    avatar: generatePixelAvatar('master'),
    rank: 1,
    stats: {
      level: 50,
      totalPaints: 12580,
      wins: 328,
      losses: 89,
      mvpCount: 156,
      winRate: 78.6,
    },
  },
  {
    playerId: '2',
    nickname: '涂色王者',
    avatar: generatePixelAvatar('king'),
    rank: 2,
    stats: {
      level: 47,
      totalPaints: 11200,
      wins: 298,
      losses: 102,
      mvpCount: 134,
      winRate: 74.5,
    },
  },
  {
    playerId: '3',
    nickname: '艺术大师',
    avatar: generatePixelAvatar('artist'),
    rank: 3,
    stats: {
      level: 45,
      totalPaints: 10800,
      wins: 276,
      losses: 115,
      mvpCount: 118,
      winRate: 70.6,
    },
  },
  {
    playerId: '4',
    nickname: '快枪手',
    avatar: generatePixelAvatar('fast'),
    rank: 4,
    stats: {
      level: 42,
      totalPaints: 9500,
      wins: 245,
      losses: 130,
      mvpCount: 98,
      winRate: 65.3,
    },
  },
  {
    playerId: '5',
    nickname: '画画达人',
    avatar: generatePixelAvatar('painter'),
    rank: 5,
    stats: {
      level: 40,
      totalPaints: 8900,
      wins: 220,
      losses: 140,
      mvpCount: 85,
      winRate: 61.1,
    },
  },
  {
    playerId: '6',
    nickname: '独行侠',
    avatar: generatePixelAvatar('lone'),
    rank: 6,
    stats: {
      level: 38,
      totalPaints: 8200,
      wins: 200,
      losses: 150,
      mvpCount: 72,
      winRate: 57.1,
    },
  },
  {
    playerId: '7',
    nickname: '像素新星',
    avatar: generatePixelAvatar('star'),
    rank: 7,
    stats: {
      level: 35,
      totalPaints: 7500,
      wins: 180,
      losses: 160,
      mvpCount: 60,
      winRate: 52.9,
    },
  },
  {
    playerId: '8',
    nickname: '涂色侠',
    avatar: generatePixelAvatar('hero'),
    rank: 8,
    stats: {
      level: 33,
      totalPaints: 6800,
      wins: 165,
      losses: 165,
      mvpCount: 50,
      winRate: 50.0,
    },
  },
];

const mockAchievements: Achievement[] = [
  {
    id: 'ach_1',
    name: '像素先驱',
    season: 'S1',
    icon: '🏆',
    description: 'S1赛季前100名',
    earnedAt: Date.now() - 86400000 * 30,
  },
  {
    id: 'ach_2',
    name: '千色大师',
    season: 'S1',
    icon: '🎨',
    description: '累计涂色超过10000格',
    earnedAt: Date.now() - 86400000 * 20,
  },
  {
    id: 'ach_3',
    name: '连胜王者',
    season: 'S1',
    icon: '🔥',
    description: '取得10连胜',
    earnedAt: Date.now() - 86400000 * 15,
  },
  {
    id: 'ach_4',
    name: 'MVP收割机',
    season: 'S1',
    icon: '⭐',
    description: '单赛季获得50次MVP',
    earnedAt: Date.now() - 86400000 * 10,
  },
  {
    id: 'ach_5',
    name: '区域霸主',
    season: 'S1',
    icon: '👑',
    description: '单局占领80%区域',
    earnedAt: Date.now() - 86400000 * 5,
  },
  {
    id: 'ach_6',
    name: '社交达人',
    season: 'S1',
    icon: '💬',
    description: '发送1000条消息',
    earnedAt: Date.now() - 86400000 * 3,
  },
];

const seasonBadges = [
  { season: 'S1', name: '创始赛季', icon: '🌟', color: '#ffdd00', status: 'current' },
  { season: 'S2', name: '预热赛季', icon: '🔮', color: '#9b59b6', status: 'upcoming' },
  { season: 'S3', name: '争霸赛季', icon: '⚔️', color: '#ff2d95', status: 'upcoming' },
];

export function Rank() {
  const [activeTab, setActiveTab] = useState<'personal' | 'team' | 'achievement'>('personal');
  const [expandedBadge, setExpandedBadge] = useState<string | null>('S1');
  const navigate = useNavigate();
  const { currentPlayer } = useGameStore();

  useEffect(() => {
    if (!currentPlayer) {
      navigate('/');
    }
  }, [currentPlayer, navigate]);

  const myRank = mockRanks.find((r) => r.playerId === currentPlayer?.id) || {
    ...mockRanks[5],
    playerId: currentPlayer?.id || 'me',
    nickname: currentPlayer?.nickname || '你',
    avatar: currentPlayer?.avatar || generatePixelAvatar('me'),
    rank: 999,
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) return 'text-pixel-yellow';
    if (rank === 2) return 'text-gray-300';
    if (rank === 3) return 'text-orange-400';
    return 'text-gray-500';
  };

  const getRankBg = (rank: number) => {
    if (rank === 1) return 'bg-pixel-yellow/10 border-pixel-yellow';
    if (rank === 2) return 'bg-gray-300/10 border-gray-300';
    if (rank === 3) return 'bg-orange-400/10 border-orange-400';
    return 'bg-pixel-bg border-pixel-blue/30';
  };

  const tabs = [
    { id: 'personal', name: '个人排行', icon: Trophy, color: 'text-pixel-yellow' },
    { id: 'team', name: '队伍排行', icon: Users, color: 'text-pixel-blue' },
    { id: 'achievement', name: '成就徽章', icon: Award, color: 'text-pixel-pink' },
  ];

  if (!currentPlayer) return null;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6">
        <h1 className="font-pixel text-xl neon-text-yellow mb-6 flex items-center gap-2">
          <Trophy size={24} />
          排行榜
        </h1>

        <div className="pixel-card mb-6">
          <div className="flex border-b-2 border-pixel-blue/30 mb-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-6 py-3 border-b-4 transition-all ${
                  activeTab === tab.id
                    ? `${tab.color} border-current`
                    : 'text-gray-500 border-transparent hover:text-gray-300'
                }`}
              >
                <tab.icon size={16} />
                <span className="font-pixel text-xs">{tab.name}</span>
              </button>
            ))}
          </div>

          {activeTab === 'personal' && (
            <div>
              <div className="grid md:grid-cols-3 gap-4 mb-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="pixel-card !border-pixel-yellow !bg-pixel-yellow/5"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-pixel-yellow/20 flex items-center justify-center">
                      <Crown size={24} className="text-pixel-yellow" />
                    </div>
                    <div>
                      <div className="font-pixel text-xs text-pixel-yellow">我的排名</div>
                      <div className="font-pixel text-3xl text-pixel-yellow">
                        #{myRank.rank}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div>
                      <div className="font-pixel text-lg text-white">
                        {myRank.stats.winRate}%
                      </div>
                      <div className="font-pixel-body text-[10px] text-gray-500">胜率</div>
                    </div>
                    <div>
                      <div className="font-pixel text-lg text-white">
                        {myRank.stats.mvpCount}
                      </div>
                      <div className="font-pixel-body text-[10px] text-gray-500">MVP</div>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="pixel-card !border-pixel-blue !bg-pixel-blue/5"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-pixel-blue/20 flex items-center justify-center">
                      <Palette size={24} className="text-pixel-blue" />
                    </div>
                    <div>
                      <div className="font-pixel text-xs text-pixel-blue">累计涂色</div>
                      <div className="font-pixel text-2xl text-pixel-blue">
                        {myRank.stats.totalPaints.toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="h-2 bg-pixel-purple border border-pixel-blue/30">
                    <div
                      className="h-full bg-pixel-blue"
                      style={{ width: `${(myRank.stats.totalPaints / 15000) * 100}%` }}
                    />
                  </div>
                  <div className="font-pixel-body text-[10px] text-gray-500 mt-1 text-right">
                    距离目标 {15000 - myRank.stats.totalPaints}
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="pixel-card !border-pixel-green !bg-pixel-green/5"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-pixel-green/20 flex items-center justify-center">
                      <TrendingUp size={24} className="text-pixel-green" />
                    </div>
                    <div>
                      <div className="font-pixel text-xs text-pixel-green">当前等级</div>
                      <div className="font-pixel text-2xl text-pixel-green">
                        Lv.{myRank.stats.level}
                      </div>
                    </div>
                  </div>
                  <div className="h-2 bg-pixel-purple border border-pixel-green/30">
                    <div
                      className="h-full bg-pixel-green"
                      style={{ width: `${(myRank.stats.level % 10) * 10}%` }}
                    />
                  </div>
                  <div className="font-pixel-body text-[10px] text-gray-500 mt-1 text-right">
                    距离下一级 {10 - (myRank.stats.level % 10)} 级
                  </div>
                </motion.div>
              </div>

              <div className="space-y-2">
                {mockRanks.map((player, index) => (
                  <motion.div
                    key={player.playerId}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`p-4 border-4 ${getRankBg(player.rank)} transition-all hover:scale-[1.01]`}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-10 h-10 flex items-center justify-center font-pixel text-lg ${getRankColor(
                          player.rank
                        )}`}
                      >
                        {player.rank <= 3 ? (
                          <Medal size={28} className={getRankColor(player.rank)} />
                        ) : (
                          `#${player.rank}`
                        )}
                      </div>

                      <PixelAvatar src={player.avatar} size={44} online={true} />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-pixel-body text-white truncate">
                            {player.nickname}
                          </span>
                          <span className="font-pixel text-[10px] text-pixel-blue">
                            Lv.{player.stats.level}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-1">
                          <span className="font-pixel-body text-xs text-gray-500 flex items-center gap-1">
                            <Target size={10} />
                            胜 {player.stats.wins}
                          </span>
                          <span className="font-pixel-body text-xs text-gray-500 flex items-center gap-1">
                            <Star size={10} />
                            MVP {player.stats.mvpCount}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-pixel text-lg text-pixel-pink">
                          {player.stats.winRate}%
                        </div>
                        <div className="font-pixel-body text-xs text-gray-500">胜率</div>
                      </div>

                      <div className="text-right hidden sm:block">
                        <div className="font-pixel text-sm text-pixel-blue">
                          {player.stats.totalPaints.toLocaleString()}
                        </div>
                        <div className="font-pixel-body text-xs text-gray-500">涂色</div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'team' && (
            <div>
              <div className="grid md:grid-cols-2 gap-4">
                {['霓虹粉', '电光蓝', '荧光绿', '金沙黄'].map((team, index) => (
                  <motion.div
                    key={team}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`p-6 border-4 ${
                      index === 0
                        ? 'border-pixel-pink bg-pixel-pink/10'
                        : index === 1
                        ? 'border-pixel-blue bg-pixel-blue/10'
                        : index === 2
                        ? 'border-pixel-green bg-pixel-green/10'
                        : 'border-pixel-yellow bg-pixel-yellow/10'
                    }`}
                  >
                    <div className="flex items-center gap-4 mb-4">
                      <div
                        className={`w-12 h-12 ${
                          index === 0
                            ? 'bg-pixel-pink'
                            : index === 1
                            ? 'bg-pixel-blue'
                            : index === 2
                            ? 'bg-pixel-green'
                            : 'bg-pixel-yellow'
                        }`}
                      />
                      <div>
                        <div
                          className={`font-pixel text-lg ${
                            index === 0
                              ? 'text-pixel-pink'
                              : index === 1
                              ? 'text-pixel-blue'
                              : index === 2
                              ? 'text-pixel-green'
                              : 'text-pixel-yellow'
                          }`}
                        >
                          {team}
                        </div>
                        <div className="font-pixel-body text-xs text-gray-500">
                          #{index + 1} 队伍排名
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <div className="font-pixel text-sm text-white">
                          {256 - index * 32}
                        </div>
                        <div className="font-pixel-body text-[10px] text-gray-500">胜场</div>
                      </div>
                      <div>
                        <div className="font-pixel text-sm text-white">
                          {89 + index * 12}
                        </div>
                        <div className="font-pixel-body text-[10px] text-gray-500">败场</div>
                      </div>
                      <div>
                        <div className="font-pixel text-sm text-white">
                          {(74.2 - index * 3.5).toFixed(1)}%
                        </div>
                        <div className="font-pixel-body text-[10px] text-gray-500">胜率</div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'achievement' && (
            <div>
              <div className="mb-6">
                <h3 className="font-pixel text-sm text-pixel-blue mb-4 flex items-center gap-2">
                  <Sparkles size={16} />
                  赛季徽章
                </h3>
                <div className="space-y-3">
                  {seasonBadges.map((badge, index) => (
                    <motion.div
                      key={badge.season}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="border-4 border-pixel-blue/30 bg-pixel-bg"
                    >
                      <button
                        onClick={() =>
                          setExpandedBadge(expandedBadge === badge.season ? null : badge.season)
                        }
                        className="w-full p-4 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-3xl">{badge.icon}</span>
                          <div className="text-left">
                            <div
                              className="font-pixel text-sm"
                              style={{ color: badge.color }}
                            >
                              {badge.season} - {badge.name}
                            </div>
                            <div className="font-pixel-body text-xs text-gray-500">
                              {badge.status === 'current'
                                ? '进行中'
                                : badge.status === 'upcoming'
                                ? '即将开启'
                                : '已结束'}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {badge.status === 'current' && (
                            <span className="font-pixel text-xs px-2 py-1 bg-pixel-green/20 text-pixel-green">
                              当前
                            </span>
                          )}
                          <ChevronDown
                            size={20}
                            className={`text-gray-500 transition-transform ${
                              expandedBadge === badge.season ? 'rotate-180' : ''
                            }`}
                          />
                        </div>
                      </button>
                      {expandedBadge === badge.season && (
                        <div className="p-4 pt-0 border-t border-pixel-blue/20">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                            {[
                              { label: '王者', color: '#ffdd00', min: 1 },
                              { label: '钻石', color: '#00d4ff', min: 100 },
                              { label: '黄金', color: '#ffaa00', min: 500 },
                              { label: '白银', color: '#cccccc', min: 1000 },
                            ].map((tier, i) => (
                              <div
                                key={tier.label}
                                className="p-3 text-center border-2"
                                style={{
                                  borderColor: tier.color + '50',
                                  backgroundColor: tier.color + '10',
                                }}
                              >
                                <div
                                  className="font-pixel text-sm mb-1"
                                  style={{ color: tier.color }}
                                >
                                  {tier.label}
                                </div>
                                <div className="font-pixel-body text-xs text-gray-500">
                                  前{tier.min}名
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-pixel text-sm text-pixel-pink mb-4 flex items-center gap-2">
                  <Award size={16} />
                  成就收藏 ({mockAchievements.length})
                </h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {mockAchievements.map((achievement, index) => (
                    <motion.div
                      key={achievement.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-4 bg-pixel-bg border-4 border-pixel-blue/30 hover:border-pixel-pink/50 transition-all"
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-4xl">{achievement.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-pixel text-sm text-white mb-1">
                            {achievement.name}
                          </div>
                          <div className="font-pixel-body text-xs text-gray-500 mb-2">
                            {achievement.description}
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="font-pixel text-[10px] text-pixel-pink">
                              {achievement.season}
                            </span>
                            <span className="font-pixel-body text-[10px] text-gray-600">
                              {new Date(achievement.earnedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-center">
          <PixelButton variant="primary" onClick={() => navigate('/match')}>
            开始比赛
          </PixelButton>
        </div>
      </div>
    </Layout>
  );
}

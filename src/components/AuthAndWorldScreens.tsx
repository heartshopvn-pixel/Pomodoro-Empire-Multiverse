import React, { useState } from 'react';
import {
  Crown,
  Swords,
  Shield,
  Compass,
  PlusCircle,
  LogOut,
  UserCheck,
  UserPlus,
  KeyRound,
  User,
  MapPin,
  Mountain,
  Trees,
  Waves,
  Pickaxe,
  Skull,
  Wheat,
  Coins,
  Gem,
  Users,
  ArrowRightCircle,
  Sparkles,
  Castle,
  Flame,
  Layers,
  Globe,
  Lock,
  Eye,
  Timer,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Trophy,
  Calendar,
  Bell,
  Volume2,
  FastForward,
  Gift,
  X,
  MessageSquare,
  Send,
  ScrollText,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import {
  ActiveWorldMarchOrder,
  BUILDING_BLUEPRINTS,
  HERO_EXP_POTION_BLUEPRINTS,
  KingdomSaveData,
  MANOR_ITEM_BLUEPRINTS,
  PlayerAccount,
  PomodoroRewardPayload,
  UNIT_SUMMON_CARD_BLUEPRINTS,
  UNIT_WIKI_DATABASE,
  UnitArchetypeId,
  VillagerUnit,
  WORLD_MAP_SIZE,
  WORLD_CHUNK_SIZE,
  WORLD_CHUNKS_PER_AXIS,
  WorldChatMessage,
  WorldMapTile,
  WorldTilePublicSummary,
  computeFinalStats,
  computeWorldMarchPath4Dir,
  getActiveMarchLockAtTile,
  getDeterministicWorldTileAt,
  getMarchOrderPath4Dir,
  getWorldChunkId,
  getWorldMapDynamicState,
} from '../types/game';
import { PixelArtPortrait } from './PixelArtPortrait';
import { drawWorldMapMarchingCavalry8Bit } from '../utils/pixelSprites';
import {
  ViewportChunkSubscriptionManager,
  auth,
} from '../utils/firebase';
import {
  soundFX,
  triggerPomodoroBrowserNotification,
} from '../utils/sound';

function formatNumberDot(val: number): string {
  return Math.floor(val)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function checkIsPomodoroStandaloneUrl(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  const mode = (params.get('mode') || '').toLowerCase();
  const hash = (window.location.hash || '').toLowerCase();
  return mode === 'pomodoro' || hash.includes('pomodoro');
}

export function setPomodoroStandaloneUrl(enable: boolean): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  if (enable) {
    url.searchParams.set('mode', 'pomodoro');
  } else {
    url.searchParams.delete('mode');
    if (url.hash.toLowerCase().includes('pomodoro')) {
      url.hash = '';
    }
  }
  window.history.replaceState({}, '', url.toString());
}

// ============================================================================
// MÀN HÌNH 1: ĐĂNG NHẬP & ĐĂNG KÝ TÀI KHOẢN (ONLINE GOOGLE CLOUD + TK/MK)
// ============================================================================

interface LoginRegisterScreenProps {
  savedAccounts: Record<string, PlayerAccount>;
  onLoginSuccess: (username: string, cloudUid?: string) => void;
  onAdminLogin?: () => void;
  onRegisterAccount: (username: string, password: string) => {
    ok: boolean;
    message: string;
  };
  onGoogleOnlineLogin?: () => Promise<{
    ok: boolean;
    username?: string;
    uid?: string;
    message: string;
  }>;
}

export const LoginRegisterScreen: React.FC<LoginRegisterScreenProps> = ({
  savedAccounts,
  onLoginSuccess,
  onAdminLogin,
  onRegisterAccount,
  onGoogleOnlineLogin,
}) => {
  const [authTab, setAuthTab] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isPomodoroUrlMode, setIsPomodoroUrlMode] = useState<boolean>(() =>
    checkIsPomodoroStandaloneUrl()
  );
  const [feedback, setFeedback] = useState<{
    type: 'ERROR' | 'SUCCESS';
    text: string;
  } | null>(null);

  const accountList = Object.values(savedAccounts);

  const handleGoogleSignInClick = async () => {
    if (!onGoogleOnlineLogin || isGoogleLoading) return;
    setIsGoogleLoading(true);
    setFeedback(null);
    try {
      const res = await onGoogleOnlineLogin();
      if (!res.ok) {
        setFeedback({ type: 'ERROR', text: res.message });
      } else {
        soundFX.playBuild();
        setFeedback({ type: 'SUCCESS', text: res.message });
      }
    } catch (err) {
      setFeedback({
        type: 'ERROR',
        text:
          err instanceof Error
            ? err.message
            : 'Không thể kết nối đăng nhập Google Online.',
      });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = username.trim();
    const cleanPass = password.trim();

    if (!cleanUser || !cleanPass) {
      setFeedback({
        type: 'ERROR',
        text: 'Vui lòng nhập đầy đủ Tài khoản (TK) và Mật khẩu (MK)!',
      });
      return;
    }

    // Kiểm tra đăng nhập tài khoản Quản Trị Viên (TK: admin / MK: admin) -> Vào thẳng Map Showroom 30x30
    if (cleanUser.toLowerCase() === 'admin' && cleanPass === 'admin') {
      if (onAdminLogin) {
        soundFX.playBuild();
        onAdminLogin();
        return;
      }
    }

    if (authTab === 'REGISTER') {
      if (cleanUser.length < 3) {
        setFeedback({
          type: 'ERROR',
          text: 'Tên Tài khoản (TK) phải có ít nhất 3 ký tự!',
        });
        return;
      }
      if (confirmPassword.trim() !== cleanPass) {
        setFeedback({
          type: 'ERROR',
          text: 'Mật khẩu xác nhận không khớp!',
        });
        return;
      }
      const res = onRegisterAccount(cleanUser, cleanPass);
      if (!res.ok) {
        setFeedback({ type: 'ERROR', text: res.message });
      } else {
        soundFX.playBuild();
        setFeedback({ type: 'SUCCESS', text: res.message });
        onLoginSuccess(cleanUser);
      }
    } else {
      const existing = savedAccounts[cleanUser.toLowerCase()];
      if (!existing) {
        setFeedback({
          type: 'ERROR',
          text: `Tài khoản "${cleanUser}" chưa tồn tại! Hãy chuyển sang tab Đăng Ký để tạo mới (hoặc dùng TK: admin / MK: admin để vào Showroom).`,
        });
        return;
      }
      if (existing.password !== cleanPass) {
        setFeedback({
          type: 'ERROR',
          text: 'Mật khẩu không chính xác! Vui lòng kiểm tra lại.',
        });
        return;
      }
      soundFX.playBuild();
      onLoginSuccess(existing.username, existing.uid);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0f0906] text-[#f4e8d1] flex items-center justify-center p-4 relative overflow-hidden select-none">
      {/* Background tactical grid decoration */}
      <div
        className="absolute inset-0 opacity-15 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(to right, #784b2a 1px, transparent 1px), linear-gradient(to bottom, #784b2a 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(251,191,36,0.12)_0%,rgba(15,9,6,0.92)_75%)] pointer-events-none" />

      <div className="wood-panel w-full max-w-md rounded-lg p-5 shadow-2xl border-2 border-[#b45309] relative z-10 flex flex-col gap-3.5">
        {/* Game Emblem & Title */}
        <div className="flex flex-col items-center text-center border-b border-[#784b2a] pb-3 gap-1">
          <div className="w-12 h-12 rounded-md bg-[#2c1a0e] border-2 border-[#fbbf24] flex items-center justify-center shadow-[0_0_15px_rgba(251,191,36,0.35)]">
            {isPomodoroUrlMode ? (
              <Timer className="w-7 h-7 text-[#4ade80]" />
            ) : (
              <Crown className="w-7 h-7 text-[#fde047]" />
            )}
          </div>
          <h1 className="font-medieval text-xl md:text-2xl font-bold text-[#fde047] tracking-wide">
            {isPomodoroUrlMode
              ? 'POMODORO FOCUS WEB (ĐỒNG BỘ VƯƠNG QUỐC)'
              : 'POMODORO EMPIRE ULTIMATE V.10'}
          </h1>
          <p className="text-[11px] text-[#d6c7b2]">
            {isPomodoroUrlMode
              ? 'Chế độ đường dẫn riêng (?mode=pomodoro) • Cùng 1 bộ code & đồng bộ trực tiếp Vàng, Kim Cương vào Vương Quốc'
              : 'Bản Đồ Thế Giới Online 50×50 (2.500 Ô • Chia 25 Chunks 10×10 • Viewport Loading)'}
          </p>

          {/* Thanh chuyển đổi nhanh giữa Chế độ Game Đầy Đủ và Chế độ Đường Dẫn Riêng (?mode=pomodoro) */}
          <div className="mt-1.5 w-full grid grid-cols-2 gap-1.5 bg-[#140c07] p-1 rounded-sm border border-[#784b2a]">
            <button
              type="button"
              onClick={() => {
                soundFX.playSelect();
                setPomodoroStandaloneUrl(false);
                setIsPomodoroUrlMode(false);
              }}
              className={`py-1 px-2 rounded-xs text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all ${
                !isPomodoroUrlMode
                  ? 'bg-[#b45309] text-[#fde047] border border-[#fbbf24]'
                  : 'text-[#a89984] hover:text-white'
              }`}
            >
              <Crown className="w-3 h-3" />
              <span>Vào Game Chính</span>
            </button>
            <button
              type="button"
              onClick={() => {
                soundFX.playSelect();
                setPomodoroStandaloneUrl(true);
                setIsPomodoroUrlMode(true);
              }}
              className={`py-1 px-2 rounded-xs text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all ${
                isPomodoroUrlMode
                  ? 'bg-[#15803d] text-white border border-[#4ade80]'
                  : 'text-[#a89984] hover:text-white'
              }`}
            >
              <Timer className="w-3 h-3" />
              <span>Chỉ Mở Pomodoro (?mode=pomodoro)</span>
            </button>
          </div>
        </div>

        {/* Nút Đăng Nhập Online Đồng Bộ Cloud Thời Gian Thực (Firebase Auth + Firestore) */}
        {onGoogleOnlineLogin && (
          <div className="stone-panel rounded-sm p-2.5 border-2 border-[#38bdf8] bg-[#0c1926]/90 flex flex-col gap-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-[#38bdf8] flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-[#38bdf8]" />
                <span>CHẾ ĐỘ ONLINE NHIỀU NGƯỜI CHƠI (CLOUD)</span>
              </span>
              <span className="font-mono text-[10px] text-[#86efac]">
                Firebase Live
              </span>
            </div>
            <button
              type="button"
              disabled={isGoogleLoading}
              onClick={handleGoogleSignInClick}
              className="w-full py-2 px-3 rounded-sm font-bold text-xs bg-[#0284c7] hover:bg-[#0369a1] text-white border border-[#7dd3fc] flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md"
            >
              <Globe className="w-4 h-4 text-[#fde047]" />
              <span>
                {isGoogleLoading
                  ? 'ĐANG ĐỒNG BỘ MÁY CHỦ CLOUD...'
                  : 'ĐĂNG NHẬP GOOGLE (ĐỒNG BỘ BẢN ĐỒ THẾ GIỚI ONLINE)'}
              </span>
            </button>
          </div>
        )}

        {/* Mode Switch Tabs: Đăng Nhập / Đăng Ký */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              setAuthTab('LOGIN');
              setFeedback(null);
            }}
            className={`py-2 rounded-sm font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
              authTab === 'LOGIN'
                ? 'gold-button text-[#1c1008]'
                : 'wood-button text-[#d6c7b2]'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>ĐĂNG NHẬP TK</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthTab('REGISTER');
              setFeedback(null);
            }}
            className={`py-2 rounded-sm font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
              authTab === 'REGISTER'
                ? 'gold-button text-[#1c1008]'
                : 'wood-button text-[#d6c7b2]'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>ĐĂNG KÝ TK MỚI</span>
          </button>
        </div>

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-[#fde047] flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              <span>Tài Khoản (TK):</span>
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Nhập tên tài khoản..."
              className="w-full bg-[#140c07] border-2 border-[#784b2a] focus:border-[#fbbf24] rounded-sm px-3 py-1.5 text-xs text-white font-mono outline-none"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-[#fde047] flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5" />
              <span>Mật Khẩu (MK):</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nhập mật khẩu..."
              className="w-full bg-[#140c07] border-2 border-[#784b2a] focus:border-[#fbbf24] rounded-sm px-3 py-1.5 text-xs text-white font-mono outline-none"
            />
          </div>

          {authTab === 'REGISTER' && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-[#fde047] flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5" />
                <span>Xác Nhận Mật Khẩu:</span>
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu..."
                className="w-full bg-[#140c07] border-2 border-[#784b2a] focus:border-[#fbbf24] rounded-sm px-3 py-1.5 text-xs text-white font-mono outline-none"
              />
            </div>
          )}

          {feedback && (
            <div
              className={`px-3 py-2 rounded-sm border text-xs font-medium ${
                feedback.type === 'ERROR'
                  ? 'bg-[#450a0a]/90 border-[#ef4444] text-[#fca5a5]'
                  : 'bg-[#064e3b]/90 border-[#4ade80] text-[#86efac]'
              }`}
            >
              {feedback.text}
            </div>
          )}

          <button
            type="submit"
            className="gold-button w-full py-2 rounded-sm font-bold text-xs md:text-sm text-[#1c1008] flex items-center justify-center gap-2 cursor-pointer mt-0.5"
          >
            {authTab === 'LOGIN' ? (
              <>
                <UserCheck className="w-4 h-4" />
                <span>VÀO BẢN ĐỒ THẾ GIỚI 50×50</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>ĐĂNG KÝ & VÀO GAME NGAY</span>
              </>
            )}
          </button>
        </form>

        {/* Quick Saved Accounts List for Convenient Testing */}
        {accountList.length > 0 && (
          <div className="stone-panel rounded-sm p-2 border border-[#57534e] flex flex-col gap-1.5">
            <span className="text-[11px] font-bold text-[#fde047]">
              Tài khoản đã lưu trên thiết bị (Bấm để điền nhanh):
            </span>
            <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
              {accountList.map((acc) => {
                const kingdomCount = Object.keys(acc.kingdoms || {}).length;
                return (
                  <button
                    key={acc.username}
                    type="button"
                    onClick={() => {
                      setAuthTab('LOGIN');
                      setUsername(acc.username);
                      setPassword(acc.password);
                      setFeedback(null);
                    }}
                    className="bg-[#1c120b] hover:bg-[#2c1a0e] border border-[#784b2a] hover:border-[#fbbf24] px-2.5 py-1 rounded-sm text-[11px] font-mono text-[#f4e8d1] flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    <Crown className="w-3 h-3 text-[#fde047]" />
                    <span className="font-bold">{acc.username}</span>
                    <span className="text-[#a8a29e]">
                      ({kingdomCount} Vương quốc)
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// MÀN HÌNH 2: BẢN ĐỒ THẾ GIỚI ONLINE 50x50 (2.500 Ô - CHIA 25 CHUNKS 10x10)
// Chỉ tải dữ liệu ô từ Server nằm trong màn hình hiển thị (Viewport Loading)
// ============================================================================

interface WorldMap20x20ScreenProps {
  account: PlayerAccount;
  isOnlineAuthenticated?: boolean;
  currentAuthUid?: string | null;
  onCreateKingdomAtTile: (name: string, x: number, y: number) => string | null;
  onEnterKingdom: (kingdomId: string) => void;
  onGrantPomodoroReward: (
    targetKingdomId: string,
    reward: PomodoroRewardPayload
  ) => boolean;
  onStartDungeonStage: (
    kingdomId: string,
    cardId: string,
    stageNumber: number,
    dispatchedTroops: {
      hero: number;
      melee: number;
      ranged: number;
      peasant: number;
    },
    marchSessionOptions?: {
      preDispatchedUnitIds?: string[];
      skipItemCost?: boolean;
      targetWorldCoord?: { x: number; y: number };
      targetKingdomData?: KingdomSaveData | null;
    }
  ) => void;
  onDispatchWorldMarchOrder: (
    kingdomId: string,
    targetX: number,
    targetY: number,
    enemyLevel: number,
    dispatchedTroops: {
      hero: number;
      melee: number;
      ranged: number;
      peasant: number;
    },
    selectedUnitIds?: string[],
    marchTargetMeta?: {
      targetType?: 'ENEMY_CAMP' | 'PVP_KINGDOM';
      targetKingdomId?: string;
      targetKingdomName?: string;
    }
  ) => { ok: boolean; message: string };
  onEnterArrivedMarchBattle: (kingdomId: string) => void;
  onLogout: () => void;
  chronicleLogs?: string[];
  isLogCollapsed?: boolean;
  onToggleLogCollapsed?: () => void;
  activeLogTab?: 'LOG' | 'CHAT';
  onChangeLogTab?: (tab: 'LOG' | 'CHAT') => void;
  worldChatMessages?: WorldChatMessage[];
  onSendWorldChat?: (text: string) => void;
}

const WORLD_TILE_PX = 64;
const WORLD_RULER_PX = 28;
const WORLD_PIXEL_SPAN = WORLD_MAP_SIZE * WORLD_TILE_PX + WORLD_RULER_PX;

type PomodoroDurationMinutes = 5 | 10 | 15 | 20 | 30 | 60 | 120;
const POMODORO_DURATION_OPTIONS: PomodoroDurationMinutes[] = [
  5, 10, 15, 20, 30, 60, 120,
];

type RunningUnitStyleId =
  | 'HERO_FAREL'
  | 'SOLDIER_MELEE'
  | 'SOLDIER_RANGED'
  | 'PEASANT';

const RUNNING_UNITS_META: Array<{
  id: RunningUnitStyleId;
  name: string;
  title: string;
}> = [
  {
    id: 'HERO_FAREL',
    name: 'Anh Hùng Farel',
    title: 'Thánh Kiếm Sĩ Tiên Phong',
  },
  {
    id: 'SOLDIER_MELEE',
    name: 'Cấm Vệ Quân',
    title: 'Bộ Binh Giáp Thép Hoàng Gia',
  },
  {
    id: 'SOLDIER_RANGED',
    name: 'Cung Thủ Hoàng Gia',
    title: 'Xạ Thủ Tinh Nhuệ Tầm Xa',
  },
  {
    id: 'PEASANT',
    name: 'Dân Binh Cần Mẫn',
    title: 'Hậu Cần Kiến Thiết Vương Quốc',
  },
];

interface PomodoroProgressSave {
  dayKey: string;
  weekKey: string;
  monthKey: string;
  dailyMinutes: number;
  dailySessions: number;
  weeklyMinutes: number;
  weeklySessions: number;
  weeklyHas60Plus: boolean;
  monthlyMinutes: number;
  monthlySessions: number;
  totalMinutes: number;
  totalSessions: number;
  maxSingleSession: number;
  claimedIds: string[];
}

function getCurrentDateKeys(): {
  dayKey: string;
  weekKey: string;
  monthKey: string;
} {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const dayKey = `${y}-${m}-${d}`;
  const monthKey = `${y}-${m}`;
  const firstDayOfYear = new Date(y, 0, 1);
  const pastDays = Math.floor(
    (now.getTime() - firstDayOfYear.getTime()) / 86400000
  );
  const weekNum = Math.ceil((pastDays + firstDayOfYear.getDay() + 1) / 7);
  const weekKey = `${y}-W${String(weekNum).padStart(2, '0')}`;
  return { dayKey, weekKey, monthKey };
}

function loadPomodoroProgress(username: string): PomodoroProgressSave {
  const keys = getCurrentDateKeys();
  const storageKey = `pomodoro_focus_progress_v1_${username.toLowerCase()}`;
  const fallback: PomodoroProgressSave = {
    ...keys,
    dailyMinutes: 0,
    dailySessions: 0,
    weeklyMinutes: 0,
    weeklySessions: 0,
    weeklyHas60Plus: false,
    monthlyMinutes: 0,
    monthlySessions: 0,
    totalMinutes: 0,
    totalSessions: 0,
    maxSingleSession: 0,
    claimedIds: [],
  };
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<PomodoroProgressSave>;
    const claimed = Array.isArray(parsed.claimedIds) ? parsed.claimedIds : [];
    const sameDay = parsed.dayKey === keys.dayKey;
    const sameWeek = parsed.weekKey === keys.weekKey;
    const sameMonth = parsed.monthKey === keys.monthKey;

    return {
      dayKey: keys.dayKey,
      weekKey: keys.weekKey,
      monthKey: keys.monthKey,
      dailyMinutes: sameDay ? parsed.dailyMinutes || 0 : 0,
      dailySessions: sameDay ? parsed.dailySessions || 0 : 0,
      weeklyMinutes: sameWeek ? parsed.weeklyMinutes || 0 : 0,
      weeklySessions: sameWeek ? parsed.weeklySessions || 0 : 0,
      weeklyHas60Plus: sameWeek ? Boolean(parsed.weeklyHas60Plus) : false,
      monthlyMinutes: sameMonth ? parsed.monthlyMinutes || 0 : 0,
      monthlySessions: sameMonth ? parsed.monthlySessions || 0 : 0,
      totalMinutes: parsed.totalMinutes || 0,
      totalSessions: parsed.totalSessions || 0,
      maxSingleSession: parsed.maxSingleSession || 0,
      claimedIds: claimed.filter((id) => {
        if (id.startsWith('daily_') && !sameDay) return false;
        if (id.startsWith('weekly_') && !sameWeek) return false;
        if (id.startsWith('monthly_') && !sameMonth) return false;
        return true;
      }),
    };
  } catch {
    return fallback;
  }
}

function buildSessionRewardPayload(
  minutes: PomodoroDurationMinutes
): PomodoroRewardPayload {
  // Thưởng chính của phiên Pomodoro: Chỉ có Vàng và số rất ít Kim Cương (không có item; item thưởng trong nhiệm vụ)
  const gold = minutes * 500;
  const diamonds = Math.max(1, Math.round(minutes / 5));

  return {
    gold,
    diamonds,
    summaryLabel: `Phiên Pomodoro ${minutes} phút: +${formatNumberDot(gold)} Vàng, +${formatNumberDot(diamonds)} Kim Cương`,
  };
}

export const WorldMap20x20Screen: React.FC<WorldMap20x20ScreenProps> = ({
  account,
  isOnlineAuthenticated = false,
  currentAuthUid = null,
  onCreateKingdomAtTile,
  onEnterKingdom,
  onGrantPomodoroReward,
  onStartDungeonStage,
  onDispatchWorldMarchOrder,
  onEnterArrivedMarchBattle,
  onLogout,
  chronicleLogs = [],
  isLogCollapsed = false,
  onToggleLogCollapsed,
  activeLogTab = 'LOG',
  onChangeLogTab,
  worldChatMessages = [],
  onSendWorldChat,
}) => {
  const kingdomsList = Object.values(account.kingdoms || {});
  const [showMarchOrdersDropdown, setShowMarchOrdersDropdown] =
    useState<boolean>(false);
  const [pressedPopupBtnId, setPressedPopupBtnId] = useState<string | null>(
    null
  );
  const [worldChatDraft, setWorldChatDraft] = useState<string>('');
  const triggerPopupButtonAction = React.useCallback(
    (btnId: string, action: () => void) => {
      soundFX.playSelect();
      setPressedPopupBtnId(btnId);
      window.setTimeout(() => {
        setPressedPopupBtnId(null);
        action();
      }, 140);
    },
    []
  );

  // Tọa độ ô đang được chọn trên bản đồ 50x50
  const [selectedCoord, setSelectedCoord] = useState<{ x: number; y: number }>(
    () => {
      if (kingdomsList.length > 0) {
        return { x: kingdomsList[0].worldX, y: kingdomsList[0].worldY };
      }
      return { x: 5, y: 5 };
    }
  );

  // Chế độ tạo Vương Quốc mới và đặt lên ô trống
  const [isPlacingKingdom, setIsPlacingKingdom] = useState<boolean>(
    kingdomsList.length === 0
  );
  const [newKingdomName, setNewKingdomName] = useState<string>(
    `Vương Quốc ${kingdomsList.length + 1}`
  );
  const [statusBanner, setStatusBanner] = useState<string | null>(
    kingdomsList.length === 0
      ? 'Hãy nhập tên Vương Quốc và bấm vào 1 ô Đồng Bằng Trống (X, Y) trên Bản Đồ Thế Giới 50×50 để đặt Vương Quốc đầu tiên!'
      : null
  );
  const [activeFeatureNotice, setActiveFeatureNotice] = useState<{
    title: string;
    desc: string;
  } | null>(null);

  // ============================================================================
  // CHẾ ĐỘ POMODORO (THAY THẾ CHIẾN DỊCH - CHIẾM 75% TỔNG PHẦN THƯỞNG TOÀN GAME)
  // Hỗ trợ cả mở trong Game và mở bằng đường dẫn riêng (?mode=pomodoro) trên cùng 1 bộ code
  // ============================================================================
  const [isPomodoroStandaloneMode, setIsPomodoroStandaloneMode] =
    useState<boolean>(() => checkIsPomodoroStandaloneUrl());
  const [showPomodoroModal, setShowPomodoroModal] = useState<boolean>(() =>
    checkIsPomodoroStandaloneUrl()
  );
  const [pomodoroTab, setPomodoroTab] = useState<
    'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ACHIEVEMENTS'
  >('DAILY');
  const [selectedPomodoroKingdomId, setSelectedPomodoroKingdomId] =
    useState<string>(() => kingdomsList[0]?.id || '');
  const [selectedDurationMin, setSelectedDurationMin] =
    useState<PomodoroDurationMinutes>(15);
  const [isFocusScreenActive, setIsFocusScreenActive] =
    useState<boolean>(false);
  const [isFocusPaused, setIsFocusPaused] = useState<boolean>(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(15 * 60);
  const [runningUnitStyle, setRunningUnitStyle] =
    useState<RunningUnitStyleId>('HERO_FAREL');
  const [pomodoroProgress, setPomodoroProgress] =
    useState<PomodoroProgressSave>(() =>
      loadPomodoroProgress(account.username)
    );
  const [lastPomodoroRewardNotice, setLastPomodoroRewardNotice] = useState<
    string | null
  >(null);
  const focusCanvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const slotDragRef = React.useRef<{
    active: boolean;
    startY: number;
    accumulatedY: number;
  }>({
    active: false,
    startY: 0,
    accumulatedY: 0,
  });

  const stepPomodoroDuration = React.useCallback((deltaSteps: number) => {
    if (deltaSteps === 0) return;
    setSelectedDurationMin((prev) => {
      const idx = POMODORO_DURATION_OPTIONS.indexOf(prev);
      const len = POMODORO_DURATION_OPTIONS.length;
      const nextIdx = (((idx + deltaSteps) % len) + len) % len;
      const nextVal = POMODORO_DURATION_OPTIONS[nextIdx];
      setRemainingSeconds(nextVal * 60);
      return nextVal;
    });
    soundFX.playSelect();
  }, []);

  // Tự động chọn Vương Quốc đầu tiên nếu chưa chọn hoặc vừa tạo Vương Quốc mới
  React.useEffect(() => {
    if (
      kingdomsList.length > 0 &&
      !kingdomsList.some((k) => k.id === selectedPomodoroKingdomId)
    ) {
      setSelectedPomodoroKingdomId(kingdomsList[0].id);
    }
  }, [kingdomsList, selectedPomodoroKingdomId]);

  // ============================================================================
  // MODAL SỰ KIỆN THẾ GIỚI & THẺ VƯƠNG QUỐC SỞ HỮU (1 VƯƠNG QUỐC + XỔ LÊN)
  // ============================================================================
  const [showEventsModal, setShowEventsModal] = useState<boolean>(false);
  const [eventJoinNotice, setEventJoinNotice] = useState<string | null>(null);
  const [selectedOwnedCardKingdomId, setSelectedOwnedCardKingdomId] =
    useState<string>(() => kingdomsList[0]?.id || '');
  const [showOwnedKingdomSelector, setShowOwnedKingdomSelector] =
    useState<boolean>(false);

  React.useEffect(() => {
    if (
      kingdomsList.length > 0 &&
      !kingdomsList.some((k) => k.id === selectedOwnedCardKingdomId)
    ) {
      setSelectedOwnedCardKingdomId(kingdomsList[0].id);
    }
  }, [kingdomsList, selectedOwnedCardKingdomId]);

  // ============================================================================
  // CHẾ ĐỘ PHÓ BẢN (5 THẺ TỪ TRÁI SANG PHẢI -> 6 ẢI TỪ TRÁI SANG PHẢI -> 3 BƯỚC B1/B2/B3)
  // ============================================================================
  const [showDungeonModal, setShowDungeonModal] = useState<boolean>(false);
  const [activeDungeonCardId, setActiveDungeonCardId] = useState<string | null>(
    null
  );
  const [activeDungeonStageId, setActiveDungeonStageId] = useState<
    number | null
  >(null);
  const [showDungeonKingdomDropdown, setShowDungeonKingdomDropdown] =
    useState<boolean>(false);
  const [selectedDungeonKingdomId, setSelectedDungeonKingdomId] =
    useState<string>(() => kingdomsList[0]?.id || '');
  const [dispatchedTroops, setDispatchedTroops] = useState<{
    hero: number;
    melee: number;
    ranged: number;
    peasant: number;
  }>({
    hero: 0,
    melee: 0,
    ranged: 0,
    peasant: 0,
  });
  const [selectedDispatchUnitIds, setSelectedDispatchUnitIds] = useState<
    string[]
  >([]);
  const [dispatchUnitFilter, setDispatchUnitFilter] = useState<
    'ALL' | 'HERO' | 'SOLDIER_MELEE' | 'SOLDIER_RANGED' | 'PEASANT'
  >('ALL');
  const dispatchGridRef = React.useRef<HTMLDivElement | null>(null);
  const dispatchDragStateRef = React.useRef<{
    active: boolean;
    moved: boolean;
    startClientX: number;
    startClientY: number;
    baseSelectedIds: string[];
  }>({
    active: false,
    moved: false,
    startClientX: 0,
    startClientY: 0,
    baseSelectedIds: [],
  });
  const [dispatchDragRect, setDispatchDragRect] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);

  const [enemyCampCursorPopup, setEnemyCampCursorPopup] = useState<{
    tile: WorldMapTile;
    x: number;
    y: number;
  } | null>(null);
  const [kingdomCursorPopup, setKingdomCursorPopup] = useState<{
    x: number;
    y: number;
    tileX: number;
    tileY: number;
    ownKingdom: KingdomSaveData | null;
    onlineSummary: WorldTilePublicSummary | null;
  } | null>(null);
  const [enemyCampTargetCoord, setEnemyCampTargetCoord] = useState<{
    x: number;
    y: number;
    enemyLevel: number;
  } | null>(null);
  const [pvpTargetKingdomInfo, setPvpTargetKingdomInfo] = useState<{
    x: number;
    y: number;
    kingdomLevel: number;
    kingdomId?: string;
    kingdomName: string;
    ownerUsername: string;
  } | null>(null);
  const [marchTickNow, setMarchTickNow] = useState<number>(() => Date.now());

  // Đồng hồ nhảy mỗi 500ms để cập nhật bộ đếm thời gian hành quân (3s/ô) trên Bản Đồ Thế Giới
  React.useEffect(() => {
    const timer = window.setInterval(() => {
      setMarchTickNow(Date.now());
    }, 500);
    return () => window.clearInterval(timer);
  }, []);

  // Đồng bộ Vương Quốc mặc định cho Phó Bản
  React.useEffect(() => {
    if (
      kingdomsList.length > 0 &&
      !kingdomsList.some((k) => k.id === selectedDungeonKingdomId)
    ) {
      setSelectedDungeonKingdomId(kingdomsList[0].id);
    }
  }, [kingdomsList, selectedDungeonKingdomId]);

  const getKingdomDeployableUnits = React.useCallback(
    (k: KingdomSaveData | null | undefined) => {
      if (!k) return [];
      const list = k.villagers || [];
      const orderWeight = (v: VillagerUnit) => {
        if (v.role === 'HERO') return 0;
        if (v.role === 'SOLDIER' && v.combatClass !== 'RANGED') return 1;
        if (v.role === 'SOLDIER' && v.combatClass === 'RANGED') return 2;
        return 3;
      };
      return list
        .filter((v) => !v.isRecuperating && !v.isDeployedAway && v.hp > 0)
        .slice()
        .sort((a, b) => orderWeight(a) - orderWeight(b))
        .map((v) => {
          const archId: UnitArchetypeId =
            v.role === 'HERO'
              ? 'KING'
              : v.role === 'PEASANT'
                ? 'PEASANT'
                : v.combatClass === 'RANGED'
                  ? 'SOLDIER_RANGED'
                  : 'SOLDIER_MELEE';
          const tier = k.unitTiers?.[archId] || v.tier || 1;
          const loadout = k.unitEquipmentById?.[v.id] || v.equipment;
          const level = v.role === 'HERO' ? v.level || k.heroLevel || 1 : 1;
          const computed = computeFinalStats(archId, 0, tier, loadout, level);
          const cp = v.pow && v.pow > 0 ? Math.round(v.pow) : computed.pow;
          const maxHp = Math.max(1, Math.round(v.maxHp || computed.maxHp || 100));
          const hp = Math.max(
            1,
            Math.min(maxHp, Math.round(v.hp || maxHp))
          );
          const defaultRoleLabel =
            v.role === 'HERO'
              ? `Anh Hùng ${v.unitName || 'Farel'}`
              : v.role === 'PEASANT'
                ? 'Nông Dân'
                : v.combatClass === 'RANGED'
                  ? 'Cung Thủ Hoàng Gia'
                  : 'Cấm Vệ Quân';
          const rawNick =
            v.nickname ||
            k.unitNicknames?.[v.id] ||
            (v.role === 'HERO' ? k.unitNicknames?.['HERO_FAREL'] : '') ||
            '';
          const nickname = rawNick.trim() || v.unitName || defaultRoleLabel;
          return {
            id: v.id,
            role: v.role,
            combatClass: v.combatClass,
            archId,
            roleLabel: defaultRoleLabel,
            nickname,
            hasCustomNickname: Boolean(rawNick.trim()),
            level,
            tier,
            hp,
            maxHp,
            cp,
          };
        });
    },
    []
  );

  const applyDispatchSelectionForKingdom = React.useCallback(
    (k: KingdomSaveData | null | undefined, nextIds: string[]) => {
      const units = getKingdomDeployableUnits(k);
      const idSet = new Set(nextIds);
      const validSelected = units.filter((u) => idSet.has(u.id));
      let hero = 0;
      let melee = 0;
      let ranged = 0;
      let peasant = 0;
      validSelected.forEach((u) => {
        if (u.role === 'HERO') hero++;
        else if (u.role === 'PEASANT') peasant++;
        else if (u.combatClass === 'RANGED') ranged++;
        else melee++;
      });
      setSelectedDispatchUnitIds(validSelected.map((u) => u.id));
      setDispatchedTroops({ hero, melee, ranged, peasant });
    },
    [getKingdomDeployableUnits]
  );

  const selectDefaultDispatchUnitsForKingdom = React.useCallback(
    (k: KingdomSaveData | null | undefined) => {
      const units = getKingdomDeployableUnits(k);
      const combatUnits = units.filter((u) => u.role !== 'PEASANT');
      const defaultSelected = combatUnits.length > 0 ? combatUnits : units;
      applyDispatchSelectionForKingdom(
        k,
        defaultSelected.map((u) => u.id)
      );
    },
    [getKingdomDeployableUnits, applyDispatchSelectionForKingdom]
  );

  const getKingdomAvailableTroops = React.useCallback(
    (k: KingdomSaveData | null | undefined) => {
      if (!k) {
        return { hero: 0, melee: 0, ranged: 0, peasant: 0, total: 0 };
      }
      const list = k.villagers || [];
      const hero = list.filter(
        (v) =>
          v.role === 'HERO' &&
          !v.isRecuperating &&
          !v.isDeployedAway &&
          v.hp > 0
      ).length;
      const melee = list.filter(
        (v) =>
          v.role === 'SOLDIER' &&
          v.combatClass !== 'RANGED' &&
          !v.isRecuperating &&
          !v.isDeployedAway &&
          v.hp > 0
      ).length;
      const ranged = list.filter(
        (v) =>
          v.role === 'SOLDIER' &&
          v.combatClass === 'RANGED' &&
          !v.isRecuperating &&
          !v.isDeployedAway &&
          v.hp > 0
      ).length;
      const peasant = list.filter(
        (v) =>
          v.role === 'PEASANT' &&
          !v.isRecuperating &&
          !v.isDeployedAway &&
          v.hp > 0
      ).length;
      return {
        hero,
        melee,
        ranged,
        peasant,
        total: hero + melee + ranged + peasant,
      };
    },
    []
  );

  const getKingdomTotalCP = React.useCallback(
    (k: KingdomSaveData | null | undefined): number => {
      if (!k) return 0;
      const list = k.villagers || [];
      return list.reduce((sum, v) => {
        if (v.isRecuperating || v.hp <= 0) return sum;
        if (v.pow && v.pow > 0) return sum + v.pow;
        const archId =
          v.role === 'HERO'
            ? 'KING'
            : v.role === 'PEASANT'
              ? 'PEASANT'
              : v.combatClass === 'RANGED'
                ? 'SOLDIER_RANGED'
                : 'SOLDIER_MELEE';
        const tier = k.unitTiers?.[archId] || v.tier || 1;
        const loadout = k.unitEquipmentById?.[v.id] || v.equipment;
        const lvl = v.role === 'HERO' ? v.level || k.heroLevel || 1 : 1;
        return sum + computeFinalStats(archId, 0, tier, loadout, lvl).pow;
      }, 0);
    },
    []
  );

  const savePomodoroProgressState = React.useCallback(
    (updater: (prev: PomodoroProgressSave) => PomodoroProgressSave) => {
      setPomodoroProgress((prev) => {
        const next = updater(prev);
        try {
          localStorage.setItem(
            `pomodoro_focus_progress_v1_${account.username.toLowerCase()}`,
            JSON.stringify(next)
          );
        } catch {
          // ignore storage quota
        }
        return next;
      });
    },
    [account.username]
  );

  // Xử lý hoàn thành 1 phiên tập trung Pomodoro
  const handleCompletePomodoroSession = React.useCallback(
    (completedMinutes: PomodoroDurationMinutes) => {
      setIsFocusScreenActive(false);
      setIsFocusPaused(false);

      const targetK =
        account.kingdoms[selectedPomodoroKingdomId] || kingdomsList[0];
      const rewardPayload = buildSessionRewardPayload(completedMinutes);

      if (targetK) {
        onGrantPomodoroReward(targetK.id, rewardPayload);
      }

      savePomodoroProgressState((prev) => {
        const keys = getCurrentDateKeys();
        return {
          ...prev,
          ...keys,
          dailyMinutes: prev.dailyMinutes + completedMinutes,
          dailySessions: prev.dailySessions + 1,
          weeklyMinutes: prev.weeklyMinutes + completedMinutes,
          weeklySessions: prev.weeklySessions + 1,
          weeklyHas60Plus: prev.weeklyHas60Plus || completedMinutes >= 60,
          monthlyMinutes: prev.monthlyMinutes + completedMinutes,
          monthlySessions: prev.monthlySessions + 1,
          totalMinutes: prev.totalMinutes + completedMinutes,
          totalSessions: prev.totalSessions + 1,
          maxSingleSession: Math.max(prev.maxSingleSession, completedMinutes),
        };
      });

      const msg = targetK
        ? `Hoàn thành phiên Pomodoro ${completedMinutes} phút! Đã chuyển về [${targetK.name}]: +${formatNumberDot(rewardPayload.gold || 0)} Vàng, +${formatNumberDot(rewardPayload.diamonds || 0)} Kim Cương!`
        : `Hoàn thành phiên Pomodoro ${completedMinutes} phút!`;

      setLastPomodoroRewardNotice(msg);
      setStatusBanner(msg);
      triggerPomodoroBrowserNotification(
        `Pomodoro ${completedMinutes} Phút Hoàn Tất!`,
        msg
      );
    },
    [
      account.kingdoms,
      kingdomsList,
      onGrantPomodoroReward,
      savePomodoroProgressState,
      selectedPomodoroKingdomId,
    ]
  );

  // Đồng hồ đếm ngược phiên Focus
  React.useEffect(() => {
    if (!isFocusScreenActive || isFocusPaused) return;
    const timer = window.setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          window.setTimeout(() => {
            handleCompletePomodoroSession(selectedDurationMin);
          }, 50);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [
    isFocusScreenActive,
    isFocusPaused,
    selectedDurationMin,
    handleCompletePomodoroSession,
  ]);

  // Vẽ Canvas 8-bit 1 đơn vị quân đội ngẫu nhiên đang chạy trên Màn Hình Focus
  React.useEffect(() => {
    if (!showPomodoroModal || !isFocusScreenActive) return;
    let animId = 0;
    let tick = 0;

    const renderFocusRunner = () => {
      tick += 1;
      const canvas = focusCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = false;
          const W = canvas.width;
          const H = canvas.height;

          // Nền bầu trời đêm/hoàng hôn cổ điển 8-bit ấm áp, dịu mắt khi tập trung
          ctx.fillStyle = '#120b1d';
          ctx.fillRect(0, 0, W, H);
          ctx.fillStyle = '#1b112c';
          ctx.fillRect(0, Math.floor(H * 0.35), W, Math.floor(H * 0.4));

          // Sao lấp lánh
          for (let i = 0; i < 14; i++) {
            const sx = ((i * 53 + 17) % (W - 16)) + 8;
            const sy = ((i * 29 + 11) % Math.floor(H * 0.48)) + 8;
            const twinkle = (Math.floor(tick / 20) + i) % 3 === 0;
            ctx.fillStyle = twinkle ? '#fde047' : '#94a3b8';
            ctx.fillRect(sx, sy, 2, 2);
          }

          // Dãy đồi xa trôi ngược chiều bước chạy
          const speed = isFocusPaused ? 0 : 1;
          const groundY = H - 38;
          ctx.fillStyle = '#14291d';
          for (let hx = -40; hx < W + 40; hx += 48) {
            const scrollX = hx - ((tick * speed * 0.4) % 48);
            ctx.fillRect(Math.floor(scrollX), groundY - 18, 36, 18);
            ctx.fillRect(Math.floor(scrollX) + 6, groundY - 26, 24, 8);
          }

          // Mặt đất cỏ & Đường đá hành quân cuộn liên tục
          ctx.fillStyle = '#1e3f20';
          ctx.fillRect(0, groundY, W, 38);
          ctx.fillStyle = '#5c4028';
          ctx.fillRect(0, groundY + 6, W, 18);

          const roadShift = Math.floor(tick * speed * 2.4) % 32;
          for (let rx = -32; rx < W + 32; rx += 32) {
            const px = rx - roadShift;
            ctx.fillStyle = '#785536';
            ctx.fillRect(px + 4, groundY + 9, 14, 5);
            ctx.fillStyle = '#47301d';
            ctx.fillRect(px + 20, groundY + 15, 10, 5);
            ctx.fillStyle = '#4ade80';
            ctx.fillRect(px + 8, groundY + 2, 4, 3);
            ctx.fillRect(px + 24, groundY + 27, 5, 3);
          }

          // Hiệu ứng bụi dưới chân khi đang chạy
          const cx = Math.floor(W / 2);
          const cy = groundY + 12;
          if (!isFocusPaused) {
            for (let d = 0; d < 3; d++) {
              const phase = (tick + d * 8) % 24;
              const dx = cx - 18 - phase * 1.4;
              const dy = cy - 4 - Math.floor(phase * 0.25);
              const sz = phase < 12 ? 4 : 2;
              ctx.fillStyle =
                phase < 10 ? 'rgba(214, 199, 178, 0.7)' : 'rgba(168, 162, 158, 0.35)';
              ctx.fillRect(Math.floor(dx), Math.floor(dy), sz, sz);
            }
          }

          // Nhịp bước chân chạy 8-bit (4 frame)
          const runFrame = isFocusPaused ? 0 : Math.floor(tick / 6) % 4;
          const bobY = runFrame === 1 || runFrame === 3 ? -3 : 0;
          const legLeftOffset =
            runFrame === 0 ? -5 : runFrame === 1 ? 0 : runFrame === 2 ? 5 : 0;
          const legRightOffset = -legLeftOffset;

          // Bóng đổ dưới chân
          ctx.fillStyle = 'rgba(0,0,0,0.45)';
          ctx.fillRect(cx - 14, cy - 2, 28, 6);

          // Vẽ 1 đơn vị quân đội 8-Bit (Scale 3x sắc nét)
          const S = 3;
          const p = (ox: number, oy: number, w: number, h: number, col: string) => {
            ctx.fillStyle = col;
            ctx.fillRect(
              Math.floor(cx + ox * S),
              Math.floor(cy + (oy + bobY) * S),
              Math.floor(w * S),
              Math.floor(h * S)
            );
          };

          if (runningUnitStyle === 'HERO_FAREL') {
            // Áo choàng đỏ bay phấp phới phía sau
            const capeWave = runFrame % 2 === 0 ? 0 : -1;
            p(-9, -12 + capeWave, 5, 9, '#991b1b');
            p(-11, -10 + capeWave, 4, 7, '#dc2626');
            // Chân chạy
            p(-3 + legLeftOffset * 0.5, -4, 3, 4, '#475569');
            p(1 + legRightOffset * 0.5, -4, 3, 4, '#334155');
            // Thân giáp vàng & lam hoàng gia
            p(-4, -12, 8, 8, '#1d4ed8');
            p(-3, -11, 6, 6, '#fbbf24');
            // Đầu + Tóc vàng + Vương miện
            p(-3, -18, 6, 6, '#fed7aa');
            p(-4, -19, 7, 2, '#facc15');
            p(-3, -21, 6, 2, '#fde047');
            p(1, -16, 1, 2, '#0f172a');
            // Thánh Kiếm phát sáng
            p(4, -15, 2, 3, '#fbbf24');
            p(6, -21, 2, 9, '#38bdf8');
            p(6, -22, 1, 8, '#e0f2fe');
          } else if (runningUnitStyle === 'SOLDIER_MELEE') {
            // Chân chạy giáp sắt
            p(-3 + legLeftOffset * 0.5, -4, 3, 4, '#334155');
            p(1 + legRightOffset * 0.5, -4, 3, 4, '#1e293b');
            // Thân giáp thép
            p(-4, -12, 8, 8, '#64748b');
            p(-3, -11, 6, 6, '#94a3b8');
            // Mũ sắt + Chùm lông đỏ
            p(-3, -18, 6, 6, '#cbd5e1');
            p(-2, -16, 5, 2, '#0f172a');
            p(-2, -21, 4, 3, '#ef4444');
            // Khiên viền vàng + Kiếm thép
            p(-6, -12, 3, 7, '#1e3a8a');
            p(-5, -11, 2, 5, '#fbbf24');
            p(4, -17, 2, 8, '#e2e8f0');
          } else if (runningUnitStyle === 'SOLDIER_RANGED') {
            // Áo choàng xanh lá thợ săn
            p(-7, -12, 4, 8, '#14532d');
            // Chân chạy
            p(-3 + legLeftOffset * 0.5, -4, 3, 4, '#713f12');
            p(1 + legRightOffset * 0.5, -4, 3, 4, '#422006');
            // Thân áo lục
            p(-4, -12, 8, 8, '#16a34a');
            p(-2, -11, 4, 6, '#854d0e');
            // Đầu + Mũ lông vũ
            p(-3, -18, 6, 6, '#fed7aa');
            p(-4, -19, 7, 3, '#15803d');
            p(-2, -21, 3, 2, '#fde047');
            p(1, -16, 1, 2, '#0f172a');
            // Cung gỗ uốn cong phía trước
            p(4, -16, 2, 9, '#a16207');
            p(3, -15, 1, 7, '#fef08a');
          } else {
            // PEASANT - Dân binh cần mẫn
            p(-3 + legLeftOffset * 0.5, -4, 3, 4, '#78350f');
            p(1 + legRightOffset * 0.5, -4, 3, 4, '#451a03');
            // Áo vải nâu vàng
            p(-4, -12, 8, 8, '#d97706');
            p(-3, -11, 6, 6, '#f59e0b');
            // Đầu + Nón rơm
            p(-3, -18, 6, 6, '#fed7aa');
            p(-5, -19, 10, 2, '#fde047');
            p(-3, -21, 6, 2, '#facc15');
            p(1, -16, 1, 2, '#0f172a');
            // Bó lúa vàng vác vai
            p(-6, -15, 4, 5, '#facc15');
            p(4, -16, 2, 8, '#78350f');
          }
        }
      }
      animId = window.requestAnimationFrame(renderFocusRunner);
    };

    animId = window.requestAnimationFrame(renderFocusRunner);
    return () => window.cancelAnimationFrame(animId);
  }, [showPomodoroModal, isFocusScreenActive, isFocusPaused, runningUnitStyle]);

  // Dữ liệu thực thể Vương Quốc từ Server chỉ thuộc các Chunks 10x10 đang nằm trong màn hình hiển thị (Viewport Chunk Loading)
  const [viewportOnlineTiles, setViewportOnlineTiles] = useState<
    Record<string, WorldTilePublicSummary>
  >({});
  const viewportOnlineTilesRef = React.useRef<
    Record<string, WorldTilePublicSummary>
  >({});
  viewportOnlineTilesRef.current = viewportOnlineTiles;

  const [activeChunkIds, setActiveChunkIds] = useState<string[]>([]);
  const [viewportBoundsInfo, setViewportBoundsInfo] = useState<{
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    visibleTileCount: number;
  }>({
    minX: 0,
    maxX: 15,
    minY: 0,
    maxY: 10,
    visibleTileCount: 176,
  });

  // Bản đồ tra cứu nhanh các Vương Quốc của chính bản thân người chơi theo tọa độ "x,y"
  const myKingdomByCoord = React.useMemo(() => {
    const map = new Map<string, KingdomSaveData>();
    kingdomsList.forEach((k) => {
      map.set(`${k.worldX},${k.worldY}`, k);
    });
    return map;
  }, [kingdomsList]);

  // Ô địa hình tĩnh tại tọa độ đang chọn (tính O(1) bằng hạt giống chung)
  const selectedTile: WorldMapTile = React.useMemo(
    () => getDeterministicWorldTileAt(selectedCoord.x, selectedCoord.y),
    [selectedCoord.x, selectedCoord.y]
  );

  // Kiểm tra ô đang chọn có Vương Quốc của bản thân hay Vương Quốc của người chơi khác trên Server
  const selectedOwnKingdom: KingdomSaveData | null =
    myKingdomByCoord.get(`${selectedCoord.x},${selectedCoord.y}`) || null;

  const selectedOnlineTileSummary: WorldTilePublicSummary | null =
    viewportOnlineTiles[`${selectedCoord.x},${selectedCoord.y}`] || null;

  const isSelectedForeignKingdom = Boolean(
    !selectedOwnKingdom &&
      selectedOnlineTileSummary &&
      selectedOnlineTileSummary.ownerId &&
      selectedOnlineTileSummary.ownerId !== (currentAuthUid || account.uid || '')
  );

  // Refs cho Canvas 2D Pixel 8-bit, Camera (WASD + Lăn chuột Zoom) & Hover
  const viewportRef = React.useRef<HTMLDivElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const cameraRef = React.useRef<{ x: number; y: number; zoom: number }>({
    x: Math.max(0, selectedCoord.x * WORLD_TILE_PX - 260),
    y: Math.max(0, selectedCoord.y * WORLD_TILE_PX - 180),
    zoom: 1,
  });
  const keysPressedRef = React.useRef<Set<string>>(new Set());
  const hoverCoordRef = React.useRef<{ x: number; y: number } | null>(null);
  const isDraggingMapRef = React.useRef<{
    active: boolean;
    moved: boolean;
    startX: number;
    startY: number;
    camStartX: number;
    camStartY: number;
  }>({
    active: false,
    moved: false,
    startX: 0,
    startY: 0,
    camStartX: 0,
    camStartY: 0,
  });

  // Quản lý kết nối lắng nghe Chunk từ Firebase Firestore theo Viewport
  const chunkManagerRef = React.useRef<ViewportChunkSubscriptionManager | null>(
    null
  );
  const lastChunkSignatureRef = React.useRef<string>('');
  const lastBoundsSignatureRef = React.useRef<string>('');

  React.useEffect(() => {
    const manager = new ViewportChunkSubscriptionManager((tilesMap, chunks) => {
      setViewportOnlineTiles(tilesMap);
      setActiveChunkIds(chunks);
    });
    chunkManagerRef.current = manager;
    return () => {
      manager.disposeAll();
      chunkManagerRef.current = null;
    };
  }, []);

  const [zoomPercent, setZoomPercent] = useState<number>(100);

  const clampCamera = React.useCallback(
    (nextX: number, nextY: number, zoom: number) => {
      const vp = viewportRef.current;
      const vw = vp ? vp.clientWidth : 900;
      const vh = vp ? vp.clientHeight : 650;
      const viewWorldW = vw / zoom;
      const viewWorldH = vh / zoom;
      const margin = 96;
      const minX = -margin;
      const minY = -margin;
      const maxX = Math.max(minX, WORLD_PIXEL_SPAN - viewWorldW + margin);
      const maxY = Math.max(minY, WORLD_PIXEL_SPAN - viewWorldH + margin);
      return {
        x: Math.max(minX, Math.min(maxX, nextX)),
        y: Math.max(minY, Math.min(maxY, nextY)),
      };
    },
    []
  );

  const centerCameraOnTile = React.useCallback(
    (tx: number, ty: number) => {
      const vp = viewportRef.current;
      const vw = vp ? vp.clientWidth : 900;
      const vh = vp ? vp.clientHeight : 650;
      const zoom = cameraRef.current.zoom;
      const targetWorldX =
        WORLD_RULER_PX + tx * WORLD_TILE_PX + WORLD_TILE_PX / 2;
      const targetWorldY =
        WORLD_RULER_PX + ty * WORLD_TILE_PX + WORLD_TILE_PX / 2;
      const next = clampCamera(
        targetWorldX - vw / (2 * zoom),
        targetWorldY - vh / (2 * zoom),
        zoom
      );
      cameraRef.current.x = next.x;
      cameraRef.current.y = next.y;
    },
    [clampCamera]
  );

  const handlePlaceNewKingdom = React.useCallback(
    (targetX: number, targetY: number) => {
      const tile = getDeterministicWorldTileAt(targetX, targetY);
      const occupiedByMe = myKingdomByCoord.get(`${targetX},${targetY}`);
      const occupiedOnline =
        viewportOnlineTilesRef.current[`${targetX},${targetY}`];

      if (occupiedByMe || occupiedOnline) {
        const occupiedName =
          occupiedByMe?.name ||
          occupiedOnline?.kingdomName ||
          'Vương Quốc khác';
        setStatusBanner(
          `Ô (${targetX}, ${targetY}) đã có "${occupiedName}" đóng đô! Hãy chọn ô Đồng Bằng Trống khác.`
        );
        soundFX.playError();
        return;
      }

      if (tile.terrain !== 'PLAINS') {
        setStatusBanner(
          `Không thể đặt Vương Quốc lên địa hình "${tile.labelVi}" tại (${targetX}, ${targetY})! Chỉ có thể đặt lên ô Đồng Bằng Trống.`
        );
        soundFX.playError();
        return;
      }

      const cleanName =
        newKingdomName.trim() || `Vương Quốc (${targetX}, ${targetY})`;
      const createdId = onCreateKingdomAtTile(cleanName, targetX, targetY);
      if (createdId) {
        soundFX.playBuild();
        setIsPlacingKingdom(false);
        setSelectedCoord({ x: targetX, y: targetY });
        setNewKingdomName(`Vương Quốc ${kingdomsList.length + 2}`);
        setStatusBanner(
          `Đã kiến lập "${cleanName}" tại tọa độ (${targetX}, ${targetY}) [Chunk ${getWorldChunkId(targetX, targetY)}]! Bấm "Truy Cập Vương Quốc" để bước vào xây dựng.`
        );
      }
    },
    [myKingdomByCoord, newKingdomName, onCreateKingdomAtTile, kingdomsList.length]
  );

  // Lắng nghe phím W, A, S, D (và phím mũi tên) để di chuyển bản đồ
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      const key = e.key.toLowerCase();
      if (
        key === 'w' ||
        key === 'a' ||
        key === 's' ||
        key === 'd' ||
        key === 'arrowup' ||
        key === 'arrowleft' ||
        key === 'arrowdown' ||
        key === 'arrowright'
      ) {
        keysPressedRef.current.add(key);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysPressedRef.current.delete(key);
    };

    const handleWindowBlur = () => {
      keysPressedRef.current.clear();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleWindowBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, []);

  // Lăn chuột để Zoom In / Zoom Out mượt mà ngay tại vị trí con trỏ
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const cam = cameraRef.current;
      const worldBeforeX = cam.x + mouseX / cam.zoom;
      const worldBeforeY = cam.y + mouseY / cam.zoom;

      const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
      const nextZoom = Math.max(0.45, Math.min(2.25, cam.zoom * zoomFactor));

      const nextCamX = worldBeforeX - mouseX / nextZoom;
      const nextCamY = worldBeforeY - mouseY / nextZoom;
      const clamped = clampCamera(nextCamX, nextCamY, nextZoom);

      cameraRef.current = {
        x: clamped.x,
        y: clamped.y,
        zoom: nextZoom,
      };
      setZoomPercent(Math.round(nextZoom * 100));
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, [clampCamera]);

  // Vòng lặp Render 2D Pixel 8-Bit + Viewport Chunk Loader cho Bản Đồ Thế Giới 50x50
  React.useEffect(() => {
    if (isPomodoroStandaloneMode) return;
    let animId = 0;
    let tick = 0;

    const drawPixelRect = (
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      w: number,
      h: number,
      color: string
    ) => {
      ctx.fillStyle = color;
      ctx.fillRect(Math.floor(x), Math.floor(y), Math.floor(w), Math.floor(h));
    };

    const draw8BitWorldTile = (
      ctx: CanvasRenderingContext2D,
      tile: WorldMapTile,
      ownKingdom: KingdomSaveData | null,
      onlineSummary: WorldTilePublicSummary | null,
      px: number,
      py: number,
      frameTick: number
    ) => {
      const gx = tile.x;
      const gy = tile.y;
      const seed = (gx * 37 + gy * 73) % 97;
      const isEven = (gx + gy) % 2 === 0;
      const hasAnyKingdom = Boolean(ownKingdom || onlineSummary);
      const isMyOwnKingdom = Boolean(
        ownKingdom ||
          (onlineSummary &&
            onlineSummary.ownerId &&
            onlineSummary.ownerId === (currentAuthUid || account.uid || ''))
      );

      // 1. Nền địa hình cơ bản kiểu 8-bit Overworld
      if (tile.terrain === 'RIVER') {
        drawPixelRect(ctx, px, py, WORLD_TILE_PX, WORLD_TILE_PX, '#244c24');

        const hasUp =
          gy > 0 && getDeterministicWorldTileAt(gx, gy - 1).terrain === 'RIVER';
        const hasDown =
          gy < WORLD_MAP_SIZE - 1 &&
          getDeterministicWorldTileAt(gx, gy + 1).terrain === 'RIVER';
        const hasLeft =
          gx > 0 && getDeterministicWorldTileAt(gx - 1, gy).terrain === 'RIVER';
        const hasRight =
          gx < WORLD_MAP_SIZE - 1 &&
          getDeterministicWorldTileAt(gx + 1, gy).terrain === 'RIVER';

        // Bờ cát pixel và lòng sông
        drawPixelRect(ctx, px + 6, py + 6, 52, 52, '#a17c43');
        drawPixelRect(ctx, px + 10, py + 10, 44, 44, '#0b5e96');
        drawPixelRect(ctx, px + 14, py + 14, 36, 36, '#1278b8');

        if (hasUp) {
          drawPixelRect(ctx, px + 6, py, 52, 10, '#a17c43');
          drawPixelRect(ctx, px + 10, py, 44, 14, '#0b5e96');
          drawPixelRect(ctx, px + 14, py, 36, 16, '#1278b8');
        }
        if (hasDown) {
          drawPixelRect(ctx, px + 6, py + 54, 52, 10, '#a17c43');
          drawPixelRect(ctx, px + 10, py + 50, 44, 14, '#0b5e96');
          drawPixelRect(ctx, px + 14, py + 48, 36, 16, '#1278b8');
        }
        if (hasLeft) {
          drawPixelRect(ctx, px, py + 6, 10, 52, '#a17c43');
          drawPixelRect(ctx, px, py + 10, 14, 44, '#0b5e96');
          drawPixelRect(ctx, px, py + 14, 16, 36, '#1278b8');
        }
        if (hasRight) {
          drawPixelRect(ctx, px + 54, py + 6, 10, 52, '#a17c43');
          drawPixelRect(ctx, px + 50, py + 10, 14, 44, '#0b5e96');
          drawPixelRect(ctx, px + 48, py + 14, 16, 36, '#1278b8');
        }

        // Gợn sóng 8-bit chuyển động
        const waveShift = Math.floor((frameTick + gx * 7 + gy * 5) / 18) % 2;
        drawPixelRect(
          ctx,
          px + 18 + waveShift * 4,
          py + 22,
          10,
          2,
          '#7dd3fc'
        );
        drawPixelRect(
          ctx,
          px + 34 - waveShift * 4,
          py + 36,
          12,
          2,
          '#bae6fd'
        );
        drawPixelRect(
          ctx,
          px + 22 + waveShift * 2,
          py + 46,
          8,
          2,
          '#7dd3fc'
        );
      } else {
        const baseGrass = isEven ? '#285226' : '#234922';
        const subGrass = isEven ? '#2f5e2c' : '#295427';
        drawPixelRect(ctx, px, py, WORLD_TILE_PX, WORLD_TILE_PX, baseGrass);

        drawPixelRect(ctx, px + 4, py + 4, 12, 8, subGrass);
        drawPixelRect(ctx, px + 38, py + 12, 16, 8, subGrass);
        drawPixelRect(ctx, px + 14, py + 44, 18, 10, subGrass);
        drawPixelRect(ctx, px + 42, py + 36, 12, 12, subGrass);

        drawPixelRect(
          ctx,
          px + 10 + (seed % 9),
          py + 16 + (seed % 7),
          2,
          4,
          '#4ade80'
        );
        drawPixelRect(
          ctx,
          px + 12 + (seed % 9),
          py + 18 + (seed % 7),
          2,
          2,
          '#86efac'
        );
        drawPixelRect(
          ctx,
          px + 44 - (seed % 8),
          py + 48 - (seed % 6),
          2,
          4,
          '#4ade80'
        );
        if (seed % 3 === 0 && tile.terrain === 'PLAINS' && !hasAnyKingdom) {
          drawPixelRect(ctx, px + 28, py + 26, 2, 2, '#fde047');
          drawPixelRect(ctx, px + 30, py + 28, 2, 2, '#4ade80');
        }
      }

      // 2. Vẽ vật thể 8-bit theo loại ô trên Bản Đồ Thế Giới
      if (hasAnyKingdom) {
        const kLevel =
          ownKingdom?.kingdomLevel || onlineSummary?.kingdomLevel || 1;
        // LÃNH THỔ VƯƠNG QUỐC: Thành trì Hoàng Gia 8-bit uy nghi
        // Phân biệt màu viền: Vàng kim = Vương Quốc của bản thân | Xanh lam ngọc = Vương Quốc của người chơi khác trên Server
        drawPixelRect(
          ctx,
          px + 6,
          py + 14,
          52,
          44,
          isMyOwnKingdom ? '#5c3415' : '#0f2942'
        );
        drawPixelRect(
          ctx,
          px + 8,
          py + 16,
          48,
          40,
          isMyOwnKingdom ? '#78441c' : '#163b5c'
        );
        ctx.strokeStyle = isMyOwnKingdom ? '#fbbf24' : '#38bdf8';
        ctx.lineWidth = 2;
        ctx.strokeRect(px + 5, py + 5, 54, 54);

        // Tường thành đá xám & lỗ châu mai 8-bit
        drawPixelRect(ctx, px + 12, py + 26, 40, 24, '#57534e');
        drawPixelRect(ctx, px + 14, py + 28, 36, 20, '#a8a29e');
        drawPixelRect(ctx, px + 14, py + 30, 36, 4, '#78716c');

        // Tháp canh trái & phải
        drawPixelRect(ctx, px + 10, py + 18, 12, 32, '#78716c');
        drawPixelRect(ctx, px + 12, py + 20, 8, 28, '#d6d3d1');
        drawPixelRect(ctx, px + 42, py + 18, 12, 32, '#78716c');
        drawPixelRect(ctx, px + 44, py + 20, 8, 28, '#d6d3d1');

        // Mái chóp nhọn 8-bit của 2 tháp canh
        const roofDark = isMyOwnKingdom ? '#b45309' : '#0369a1';
        const roofMid = isMyOwnKingdom ? '#d97706' : '#0284c7';
        const roofTop = isMyOwnKingdom ? '#fbbf24' : '#38bdf8';

        drawPixelRect(ctx, px + 8, py + 16, 16, 4, roofDark);
        drawPixelRect(ctx, px + 10, py + 12, 12, 4, roofMid);
        drawPixelRect(ctx, px + 13, py + 9, 6, 3, roofTop);

        drawPixelRect(ctx, px + 40, py + 16, 16, 4, roofDark);
        drawPixelRect(ctx, px + 42, py + 12, 12, 4, roofMid);
        drawPixelRect(ctx, px + 45, py + 9, 6, 3, roofTop);

        // Điện chính giữa & mái hoàng gia
        drawPixelRect(ctx, px + 22, py + 14, 20, 22, '#e7e5e4');
        drawPixelRect(ctx, px + 20, py + 12, 24, 4, roofDark);
        drawPixelRect(ctx, px + 23, py + 8, 18, 4, roofMid);
        drawPixelRect(ctx, px + 27, py + 5, 10, 3, roofTop);

        // Cờ hiệu bay phấp phới trên đỉnh thành
        const flagWave = Math.floor(frameTick / 12) % 2;
        drawPixelRect(ctx, px + 31, py + 1, 2, 5, '#fef08a');
        drawPixelRect(
          ctx,
          px + 33,
          py + 1 + flagWave,
          7,
          4,
          isMyOwnKingdom ? '#ef4444' : '#0284c7'
        );
        drawPixelRect(ctx, px + 35, py + 2 + flagWave, 3, 2, '#fde047');

        // Cổng thành vòm gỗ & ánh đuốc
        drawPixelRect(ctx, px + 26, py + 36, 12, 14, '#291509');
        drawPixelRect(ctx, px + 28, py + 38, 8, 12, '#45220d');
        drawPixelRect(ctx, px + 28, py + 42, 8, 2, '#92400e');
        drawPixelRect(ctx, px + 23, py + 38, 2, 3, '#fde047');
        drawPixelRect(ctx, px + 39, py + 38, 2, 3, '#fde047');

        // Nhãn cấp độ Lv.XX dưới chân thành
        drawPixelRect(ctx, px + 8, py + 49, 48, 11, 'rgba(15, 9, 6, 0.88)');
        ctx.fillStyle = isMyOwnKingdom ? '#fde047' : '#7dd3fc';
        ctx.font = 'bold 9px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(
          `Lv.${String(kLevel).padStart(2, '0')}`,
          px + 32,
          py + 58
        );
      } else if (tile.terrain === 'MOUNTAIN') {
        drawPixelRect(ctx, px + 6, py + 46, 52, 8, '#172e16');
        drawPixelRect(ctx, px + 8, py + 38, 34, 12, '#3f3b37');
        drawPixelRect(ctx, px + 11, py + 28, 28, 12, '#57534e');
        drawPixelRect(ctx, px + 15, py + 18, 20, 12, '#78716c');
        drawPixelRect(ctx, px + 19, py + 11, 12, 9, '#a8a29e');
        drawPixelRect(ctx, px + 19, py + 11, 12, 5, '#f8fafc');
        drawPixelRect(ctx, px + 17, py + 16, 8, 4, '#e2e8f0');
        drawPixelRect(ctx, px + 25, py + 16, 6, 3, '#bae6fd');

        drawPixelRect(ctx, px + 30, py + 40, 26, 12, '#292524');
        drawPixelRect(ctx, px + 33, py + 31, 20, 11, '#44403c');
        drawPixelRect(ctx, px + 36, py + 22, 14, 10, '#65605b');
        drawPixelRect(ctx, px + 38, py + 20, 10, 5, '#f1f5f9');
        drawPixelRect(ctx, px + 36, py + 25, 6, 3, '#cbd5e1');
      } else if (tile.terrain === 'FOREST') {
        drawPixelRect(ctx, px + 8, py + 44, 48, 10, '#163318');

        const drawPixelPine = (tx: number, ty: number, scale: number) => {
          drawPixelRect(
            ctx,
            tx + 6 * scale,
            ty + 18 * scale,
            4 * scale,
            7 * scale,
            '#5c3818'
          );
          drawPixelRect(
            ctx,
            tx,
            ty + 13 * scale,
            16 * scale,
            6 * scale,
            '#14532d'
          );
          drawPixelRect(
            ctx,
            tx + 2 * scale,
            ty + 8 * scale,
            12 * scale,
            6 * scale,
            '#15803d'
          );
          drawPixelRect(
            ctx,
            tx + 4 * scale,
            ty + 3 * scale,
            8 * scale,
            6 * scale,
            '#22c55e'
          );
          drawPixelRect(ctx, tx + 6 * scale, ty, 4 * scale, 4 * scale, '#86efac');
        };

        drawPixelPine(px + 8, py + 14, 1);
        drawPixelPine(px + 34, py + 16, 1);
        drawPixelPine(px + 20, py + 22, 1.15);
      } else if (tile.terrain === 'ENEMY_CAMP') {
        drawPixelRect(ctx, px + 8, py + 14, 48, 42, '#381e14');
        drawPixelRect(ctx, px + 10, py + 16, 44, 38, '#4c2619');

        for (let i = 0; i < 5; i++) {
          drawPixelRect(ctx, px + 10 + i * 10, py + 12, 3, 8, '#78350f');
          drawPixelRect(ctx, px + 10 + i * 10, py + 10, 3, 2, '#d6c7b2');
        }

        drawPixelRect(ctx, px + 14, py + 28, 24, 16, '#7f1d1d');
        drawPixelRect(ctx, px + 17, py + 22, 18, 8, '#b91c1c');
        drawPixelRect(ctx, px + 21, py + 17, 10, 6, '#ef4444');
        drawPixelRect(ctx, px + 23, py + 32, 6, 12, '#1c1008');

        const flameFlicker = Math.floor(frameTick / 8) % 2;
        drawPixelRect(ctx, px + 42, py + 40, 10, 3, '#78350f');
        drawPixelRect(
          ctx,
          px + 44,
          py + 34 - flameFlicker * 2,
          6,
          6,
          '#ea580c'
        );
        drawPixelRect(ctx, px + 45, py + 32 - flameFlicker, 4, 5, '#fde047');

        drawPixelRect(ctx, px + 8, py + 49, 48, 11, 'rgba(69, 10, 10, 0.92)');
        ctx.fillStyle = '#fca5a5';
        ctx.font = 'bold 9px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`ĐỊCH Lv.${tile.enemyLevel || 1}`, px + 32, py + 58);
      } else if (tile.terrain === 'MINE') {
        drawPixelRect(ctx, px + 10, py + 16, 44, 34, '#44403c');
        drawPixelRect(ctx, px + 14, py + 12, 36, 26, '#57534e');

        drawPixelRect(ctx, px + 20, py + 22, 24, 22, '#92400e');
        drawPixelRect(ctx, px + 24, py + 26, 16, 18, '#0f0906');
        drawPixelRect(ctx, px + 18, py + 20, 28, 4, '#b45309');

        drawPixelRect(ctx, px + 26, py + 44, 2, 6, '#a8a29e');
        drawPixelRect(ctx, px + 36, py + 44, 2, 6, '#a8a29e');
        drawPixelRect(ctx, px + 24, py + 46, 16, 2, '#78350f');

        const oreColor =
          tile.mineType === 'GOLD'
            ? '#fde047'
            : tile.mineType === 'STONE'
              ? '#e7e5e4'
              : tile.mineType === 'WOOD'
                ? '#f59e0b'
                : '#a3e635';
        const mineShort =
          tile.mineType === 'GOLD'
            ? 'MỎ VÀNG'
            : tile.mineType === 'STONE'
              ? 'MỎ ĐÁ'
              : tile.mineType === 'WOOD'
                ? 'LÂM TRƯỜNG'
                : 'ĐỒNG LÚA';

        drawPixelRect(ctx, px + 13, py + 32, 6, 6, oreColor);
        drawPixelRect(ctx, px + 45, py + 30, 6, 6, oreColor);
        drawPixelRect(ctx, px + 42, py + 36, 5, 5, oreColor);

        drawPixelRect(ctx, px + 6, py + 49, 52, 11, 'rgba(28, 16, 8, 0.9)');
        ctx.fillStyle = oreColor;
        ctx.font = 'bold 8px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(mineShort, px + 32, py + 58);
      }

      // 3. Khung lưới 8-bit mảnh & tọa độ góc trên bên trái
      ctx.strokeStyle = 'rgba(15, 23, 15, 0.45)';
      ctx.lineWidth = 1;
      ctx.strokeRect(px + 0.5, py + 0.5, WORLD_TILE_PX - 1, WORLD_TILE_PX - 1);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.38)';
      ctx.font = '8px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`${gx},${gy}`, px + 3, py + 9);

      // Gợi ý ô Đồng Bằng Trống khi đang bật chế độ Đặt Vương Quốc
      if (isPlacingKingdom && !hasAnyKingdom && tile.terrain === 'PLAINS') {
        const pulseAlpha = 0.35 + 0.25 * Math.sin(frameTick * 0.1);
        ctx.strokeStyle = `rgba(74, 222, 128, ${pulseAlpha})`;
        ctx.lineWidth = 2;
        ctx.strokeRect(px + 3, py + 3, WORLD_TILE_PX - 6, WORLD_TILE_PX - 6);
      }
    };

    const renderLoop = () => {
      tick += 1;

      // Xử lý di chuyển camera bằng phím W, A, S, D
      const keys = keysPressedRef.current;
      if (keys.size > 0) {
        const cam = cameraRef.current;
        const moveStep = 8.5 / cam.zoom;
        let dx = 0;
        let dy = 0;
        if (keys.has('w') || keys.has('arrowup')) dy -= moveStep;
        if (keys.has('s') || keys.has('arrowdown')) dy += moveStep;
        if (keys.has('a') || keys.has('arrowleft')) dx -= moveStep;
        if (keys.has('d') || keys.has('arrowright')) dx += moveStep;

        if (dx !== 0 || dy !== 0) {
          const clamped = clampCamera(cam.x + dx, cam.y + dy, cam.zoom);
          cameraRef.current.x = clamped.x;
          cameraRef.current.y = clamped.y;
        }
      }

      const canvas = canvasRef.current;
      const vp = viewportRef.current;
      if (canvas && vp) {
        if (
          canvas.width !== vp.clientWidth ||
          canvas.height !== vp.clientHeight
        ) {
          canvas.width = Math.max(300, vp.clientWidth);
          canvas.height = Math.max(240, vp.clientHeight);
        }

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = false;

          // Nền vực thẳm bao quanh bản đồ thế giới
          ctx.fillStyle = '#0c130c';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          const cam = cameraRef.current;
          ctx.save();
          ctx.scale(cam.zoom, cam.zoom);
          ctx.translate(-Math.floor(cam.x), -Math.floor(cam.y));

          // Khung viền gỗ/đá bao quanh bản đồ 50x50
          ctx.fillStyle = '#1c110a';
          ctx.fillRect(0, 0, WORLD_PIXEL_SPAN + 4, WORLD_PIXEL_SPAN + 4);
          ctx.strokeStyle = '#b45309';
          ctx.lineWidth = 3;
          ctx.strokeRect(0, 0, WORLD_PIXEL_SPAN + 4, WORLD_PIXEL_SPAN + 4);

          // ====================================================================
          // TÍNH TOÁN KHUNG NHÌN VIEWPORT (CHỈ LOAD & VẼ Ô TRONG MÀN HÌNH)
          // ====================================================================
          const viewWorldLeft = cam.x - WORLD_RULER_PX - WORLD_TILE_PX;
          const viewWorldTop = cam.y - WORLD_RULER_PX - WORLD_TILE_PX;
          const viewWorldRight =
            cam.x + canvas.width / cam.zoom - WORLD_RULER_PX + WORLD_TILE_PX;
          const viewWorldBottom =
            cam.y + canvas.height / cam.zoom - WORLD_RULER_PX + WORLD_TILE_PX;

          const minGx = Math.max(0, Math.floor(viewWorldLeft / WORLD_TILE_PX));
          const maxGx = Math.min(
            WORLD_MAP_SIZE - 1,
            Math.ceil(viewWorldRight / WORLD_TILE_PX)
          );
          const minGy = Math.max(0, Math.floor(viewWorldTop / WORLD_TILE_PX));
          const maxGy = Math.min(
            WORLD_MAP_SIZE - 1,
            Math.ceil(viewWorldBottom / WORLD_TILE_PX)
          );

          // Tính các Chunks 10x10 đang nằm trong màn hình hiển thị
          const minChunkX = Math.max(
            0,
            Math.floor(minGx / WORLD_CHUNK_SIZE)
          );
          const maxChunkX = Math.min(
            WORLD_CHUNKS_PER_AXIS - 1,
            Math.floor(maxGx / WORLD_CHUNK_SIZE)
          );
          const minChunkY = Math.max(
            0,
            Math.floor(minGy / WORLD_CHUNK_SIZE)
          );
          const maxChunkY = Math.min(
            WORLD_CHUNKS_PER_AXIS - 1,
            Math.floor(maxGy / WORLD_CHUNK_SIZE)
          );

          const visibleChunks: string[] = [];
          for (let cy = minChunkY; cy <= maxChunkY; cy++) {
            for (let cx = minChunkX; cx <= maxChunkX; cx++) {
              visibleChunks.push(`chunk_${cx}_${cy}`);
            }
          }

          const chunkSig = `${auth.currentUser?.uid || 'anon'}:${visibleChunks.join(',')}`;
          if (chunkSig !== lastChunkSignatureRef.current) {
            lastChunkSignatureRef.current = chunkSig;
            chunkManagerRef.current?.updateVisibleChunks(visibleChunks);
          }

          const boundsSig = `${minGx},${maxGx},${minGy},${maxGy}`;
          if (boundsSig !== lastBoundsSignatureRef.current && tick % 6 === 0) {
            lastBoundsSignatureRef.current = boundsSig;
            const visibleCount =
              Math.max(0, maxGx - minGx + 1) * Math.max(0, maxGy - minGy + 1);
            setViewportBoundsInfo({
              minX: minGx,
              maxX: maxGx,
              minY: minGy,
              maxY: maxGy,
              visibleTileCount: visibleCount,
            });
          }

          // Chỉ lặp và vẽ các ô nằm trong khung màn hình hiển thị (minGx..maxGx, minGy..maxGy)
          // Ngoài màn hình tuyệt đối không gọi lệnh tải hay vẽ ô
          const visibleNamedKingdoms: Array<{
            x: number;
            y: number;
            name: string;
            ownerUsername?: string;
            isOwn: boolean;
          }> = [];

          for (let gy = minGy; gy <= maxGy; gy++) {
            for (let gx = minGx; gx <= maxGx; gx++) {
              const tile = getDeterministicWorldTileAt(gx, gy);
              const ownKingdom = myKingdomByCoord.get(`${gx},${gy}`) || null;
              const onlineSummary =
                viewportOnlineTilesRef.current[`${gx},${gy}`] || null;

              const px = WORLD_RULER_PX + gx * WORLD_TILE_PX;
              const py = WORLD_RULER_PX + gy * WORLD_TILE_PX;
              draw8BitWorldTile(
                ctx,
                tile,
                ownKingdom,
                onlineSummary,
                px,
                py,
                tick
              );

              if (ownKingdom) {
                visibleNamedKingdoms.push({
                  x: gx,
                  y: gy,
                  name: ownKingdom.name,
                  ownerUsername: account.username,
                  isOwn: true,
                });
              } else if (onlineSummary) {
                const isOwnOnline =
                  onlineSummary.ownerId ===
                  (currentAuthUid || account.uid || '');
                visibleNamedKingdoms.push({
                  x: gx,
                  y: gy,
                  name: onlineSummary.kingdomName,
                  ownerUsername: onlineSummary.ownerUsername,
                  isOwn: isOwnOnline,
                });
              }
            }
          }

          // Vẽ đường ranh giới các Chunks 10x10 đang nằm trong màn hình
          ctx.save();
          ctx.strokeStyle = 'rgba(251, 191, 36, 0.26)';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([6, 4]);
          for (let cy = minChunkY; cy <= maxChunkY; cy++) {
            for (let cx = minChunkX; cx <= maxChunkX; cx++) {
              const cpx =
                WORLD_RULER_PX + cx * WORLD_CHUNK_SIZE * WORLD_TILE_PX;
              const cpy =
                WORLD_RULER_PX + cy * WORLD_CHUNK_SIZE * WORLD_TILE_PX;
              const spanPx = WORLD_CHUNK_SIZE * WORLD_TILE_PX;
              ctx.strokeRect(cpx, cpy, spanPx, spanPx);
            }
          }
          ctx.restore();

          // Vẽ hiệu ứng Hover 8-bit
          const hovered = hoverCoordRef.current;
          if (hovered) {
            const hx = WORLD_RULER_PX + hovered.x * WORLD_TILE_PX;
            const hy = WORLD_RULER_PX + hovered.y * WORLD_TILE_PX;
            ctx.strokeStyle = isPlacingKingdom
              ? '#4ade80'
              : 'rgba(253, 224, 71, 0.75)';
            ctx.lineWidth = 2;
            ctx.strokeRect(
              hx + 2,
              hy + 2,
              WORLD_TILE_PX - 4,
              WORLD_TILE_PX - 4
            );
          }

          // Vẽ khung chọn 4 góc 8-Bit cho ô đang chọn (selectedCoord)
          const sx = WORLD_RULER_PX + selectedCoord.x * WORLD_TILE_PX;
          const sy = WORLD_RULER_PX + selectedCoord.y * WORLD_TILE_PX;
          const bracketLen = 14;
          ctx.strokeStyle = '#fde047';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(sx + 2, sy + bracketLen);
          ctx.lineTo(sx + 2, sy + 2);
          ctx.lineTo(sx + bracketLen, sy + 2);
          ctx.moveTo(sx + WORLD_TILE_PX - bracketLen, sy + 2);
          ctx.lineTo(sx + WORLD_TILE_PX - 2, sy + 2);
          ctx.lineTo(sx + WORLD_TILE_PX - 2, sy + bracketLen);
          ctx.moveTo(sx + 2, sy + WORLD_TILE_PX - bracketLen);
          ctx.lineTo(sx + 2, sy + WORLD_TILE_PX - 2);
          ctx.lineTo(sx + bracketLen, sy + WORLD_TILE_PX - 2);
          ctx.moveTo(sx + WORLD_TILE_PX - bracketLen, sy + WORLD_TILE_PX - 2);
          ctx.lineTo(sx + WORLD_TILE_PX - 2, sy + WORLD_TILE_PX - 2);
          ctx.lineTo(sx + WORLD_TILE_PX - 2, sy + WORLD_TILE_PX - bracketLen);
          ctx.stroke();

          // Vẽ bảng tên nổi phía trên các Vương Quốc nằm trong khung nhìn Camera
          visibleNamedKingdoms.forEach((k) => {
            const kx = WORLD_RULER_PX + k.x * WORLD_TILE_PX + 32;
            const ky = WORLD_RULER_PX + k.y * WORLD_TILE_PX - 6;
            const labelText = k.isOwn
              ? k.name
              : `${k.name} [${k.ownerUsername || 'Online'}]`;
            ctx.font = 'bold 10px "Plus Jakarta Sans", sans-serif';
            const textW = Math.min(156, ctx.measureText(labelText).width + 12);
            drawPixelRect(
              ctx,
              kx - textW / 2,
              ky - 13,
              textW,
              14,
              k.isOwn ? 'rgba(28, 16, 8, 0.92)' : 'rgba(12, 25, 38, 0.92)'
            );
            ctx.strokeStyle = k.isOwn ? '#fbbf24' : '#38bdf8';
            ctx.lineWidth = 1;
            ctx.strokeRect(kx - textW / 2, ky - 13, textW, 14);
            ctx.fillStyle = k.isOwn ? '#fde047' : '#7dd3fc';
            ctx.textAlign = 'center';
            ctx.fillText(labelText, kx, ky - 3);
          });

          // ====================================================================
          // VẼ ĐOÀN QUÂN ĐANG HÀNH QUÂN (1 GIÂY / Ô - ĐI 4 HƯỚNG NÉ VẬT CẢN - ICON KỴ BINH CẦM CỜ)
          // ====================================================================
          const dynamicLocks = getWorldMapDynamicState().activeMarchLocksByCoord;
          const allMarchOrdersMap = new Map<string, ActiveWorldMarchOrder>();
          Object.values(dynamicLocks).forEach((ord) => {
            if (ord) {
              allMarchOrdersMap.set(`${ord.targetX},${ord.targetY}`, ord);
            }
          });
          kingdomsList.forEach((k) => {
            if (k.activeMarchOrder) {
              allMarchOrdersMap.set(
                `${k.activeMarchOrder.targetX},${k.activeMarchOrder.targetY}`,
                k.activeMarchOrder
              );
            }
          });

          // Tập hợp tọa độ các Vương Quốc đang chiếm ô để đường hành quân né tránh
          const occupiedKingdomCoordsSet = new Set<string>();
          myKingdomByCoord.forEach((_, coordKey) => {
            occupiedKingdomCoordsSet.add(coordKey);
          });
          Object.keys(viewportOnlineTilesRef.current).forEach((coordKey) => {
            occupiedKingdomCoordsSet.add(coordKey);
          });

          const nowMs = Date.now();
          allMarchOrdersMap.forEach((ord) => {
            const pathPoints = getMarchOrderPath4Dir(
              ord,
              occupiedKingdomCoordsSet
            );
            const totalDur = Math.max(1000, ord.arrivalTimeMs - ord.startTimeMs);
            const progress = Math.min(
              1,
              Math.max(0, (nowMs - ord.startTimeMs) / totalDur)
            );
            const remSec = Math.max(
              0,
              Math.ceil((ord.arrivalTimeMs - nowMs) / 1000)
            );
            const isArrived = remSec <= 0;

            // Vẽ đường hành quân nối từng ô vuông theo 4 hướng (Ngang/Dọc, không đi chéo, né vật cản)
            if (pathPoints.length >= 2) {
              ctx.save();
              ctx.lineCap = 'square';
              ctx.lineJoin = 'miter';

              // Viền đen nền dưới đường đi
              ctx.strokeStyle = 'rgba(12, 7, 4, 0.85)';
              ctx.lineWidth = 5;
              ctx.beginPath();
              pathPoints.forEach((pt, idx) => {
                const px = WORLD_RULER_PX + pt.x * WORLD_TILE_PX + 32;
                const py = WORLD_RULER_PX + pt.y * WORLD_TILE_PX + 32;
                if (idx === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
              });
              ctx.stroke();

              // Đường nét đứt phát sáng 4 hướng
              ctx.strokeStyle = isArrived ? '#4ade80' : '#facc15';
              ctx.lineWidth = 2.5;
              ctx.setLineDash([6, 4]);
              ctx.lineDashOffset = isArrived ? 0 : -(tick * 0.45);
              ctx.beginPath();
              pathPoints.forEach((pt, idx) => {
                const px = WORLD_RULER_PX + pt.x * WORLD_TILE_PX + 32;
                const py = WORLD_RULER_PX + pt.y * WORLD_TILE_PX + 32;
                if (idx === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
              });
              ctx.stroke();
              ctx.setLineDash([]);

              // Các chốt vuông nhỏ tại tâm mỗi ô vuông trên hành trình 4 hướng
              for (let i = 1; i < pathPoints.length - 1; i++) {
                const wp = pathPoints[i];
                const wpx = WORLD_RULER_PX + wp.x * WORLD_TILE_PX + 32;
                const wpy = WORLD_RULER_PX + wp.y * WORLD_TILE_PX + 32;
                drawPixelRect(ctx, wpx - 2.5, wpy - 2.5, 5, 5, '#1c1008');
                drawPixelRect(
                  ctx,
                  wpx - 1.5,
                  wpy - 1.5,
                  3,
                  3,
                  isArrived ? '#86efac' : '#fde047'
                );
              }
              ctx.restore();
            }

            // Nội suy vị trí Kỵ Binh Cầm Cờ chạy dọc theo từng đoạn ô vuông 4 hướng (1s / 1 ô)
            const segCount = Math.max(1, pathPoints.length - 1);
            const exactSeg = progress * segCount;
            const segIdx = Math.min(
              Math.max(0, pathPoints.length - 2),
              Math.floor(exactSeg)
            );
            const segFrac = Math.max(0, Math.min(1, exactSeg - segIdx));
            const p0 = pathPoints[segIdx] || { x: ord.fromX, y: ord.fromY };
            const p1 = pathPoints[segIdx + 1] || {
              x: ord.targetX,
              y: ord.targetY,
            };
            const curPx =
              WORLD_RULER_PX +
              (p0.x + (p1.x - p0.x) * segFrac) * WORLD_TILE_PX +
              32;
            const curPy =
              WORLD_RULER_PX +
              (p0.y + (p1.y - p0.y) * segFrac) * WORLD_TILE_PX +
              32;
            const cavalryFacing: 'LEFT' | 'RIGHT' =
              p1.x < p0.x
                ? 'LEFT'
                : p1.x > p0.x
                  ? 'RIGHT'
                  : ord.targetX < ord.fromX
                    ? 'LEFT'
                    : 'RIGHT';

            // Khung khóa mục tiêu trên ô đích (ngăn người chơi khác tấn công trùng)
            const tx = WORLD_RULER_PX + ord.targetX * WORLD_TILE_PX;
            const ty = WORLD_RULER_PX + ord.targetY * WORLD_TILE_PX;
            ctx.strokeStyle = isArrived ? '#22c55e' : '#ef4444';
            ctx.lineWidth = 2;
            ctx.strokeRect(tx + 3, ty + 3, WORLD_TILE_PX - 6, WORLD_TILE_PX - 6);

            // Vẽ Kỵ Binh Cầm Cờ Pixel-Art đang phi nước đại trên đường đi
            drawWorldMapMarchingCavalry8Bit(
              ctx,
              curPx,
              curPy,
              tick,
              isArrived,
              cavalryFacing
            );

            // Nhãn thời gian hành quân / trạng thái tới đích phía trên ngọn cờ kỵ binh
            const marchLabel = isArrived
              ? `${ord.kingdomName}: ĐẾN ĐÍCH!`
              : `${ord.kingdomName}: ${remSec}s`;
            ctx.font = 'bold 9px "JetBrains Mono", monospace';
            const mw = Math.min(180, ctx.measureText(marchLabel).width + 10);
            drawPixelRect(
              ctx,
              curPx - mw / 2,
              curPy - 34,
              mw,
              13,
              isArrived ? 'rgba(20, 83, 45, 0.95)' : 'rgba(28, 16, 8, 0.95)'
            );
            ctx.strokeStyle = isArrived ? '#4ade80' : '#fbbf24';
            ctx.lineWidth = 1;
            ctx.strokeRect(curPx - mw / 2, curPy - 34, mw, 13);
            ctx.fillStyle = isArrived ? '#86efac' : '#fde047';
            ctx.textAlign = 'center';
            ctx.fillText(marchLabel, curPx, curPy - 24);
          });

          // Thanh thước tọa độ X (chỉ vẽ các cột trong khung nhìn minGx..maxGx) và Y (minGy..maxGy)
          drawPixelRect(ctx, 0, 0, WORLD_RULER_PX, WORLD_RULER_PX, '#2c1a0e');
          ctx.fillStyle = '#fde047';
          ctx.font = 'bold 9px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          ctx.fillText('O', 14, 18);

          for (let gx = minGx; gx <= maxGx; gx++) {
            const rx = WORLD_RULER_PX + gx * WORLD_TILE_PX;
            const isSelX = selectedCoord.x === gx;
            drawPixelRect(
              ctx,
              rx,
              0,
              WORLD_TILE_PX,
              WORLD_RULER_PX,
              isSelX ? '#451a03' : '#1c1008'
            );
            ctx.strokeStyle = isSelX ? '#fbbf24' : '#57534e';
            ctx.lineWidth = 1;
            ctx.strokeRect(rx, 0, WORLD_TILE_PX, WORLD_RULER_PX);
            ctx.fillStyle = isSelX ? '#fde047' : '#d6c7b2';
            ctx.font = 'bold 10px "JetBrains Mono", monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`X:${gx}`, rx + 32, 18);
          }

          for (let gy = minGy; gy <= maxGy; gy++) {
            const ry = WORLD_RULER_PX + gy * WORLD_TILE_PX;
            const isSelY = selectedCoord.y === gy;
            drawPixelRect(
              ctx,
              0,
              ry,
              WORLD_RULER_PX,
              WORLD_TILE_PX,
              isSelY ? '#451a03' : '#1c1008'
            );
            ctx.strokeStyle = isSelY ? '#fbbf24' : '#57534e';
            ctx.lineWidth = 1;
            ctx.strokeRect(0, ry, WORLD_RULER_PX, WORLD_TILE_PX);
            ctx.fillStyle = isSelY ? '#fde047' : '#d6c7b2';
            ctx.font = 'bold 9px "JetBrains Mono", monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`Y:${gy}`, 14, ry + 35);
          }

          ctx.restore();
        }
      }

      animId = window.requestAnimationFrame(renderLoop);
    };

    animId = window.requestAnimationFrame(renderLoop);
    return () => {
      window.cancelAnimationFrame(animId);
    };
  }, [
    myKingdomByCoord,
    account.username,
    account.uid,
    currentAuthUid,
    selectedCoord,
    isPlacingKingdom,
    clampCamera,
    isPomodoroStandaloneMode,
  ]);

  // Chuyển đổi vị trí chuột trên Canvas sang tọa độ ô (x, y)
  const getTileCoordFromMouseEvent = (
    e: React.MouseEvent<HTMLCanvasElement>
  ): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const cam = cameraRef.current;
    const worldX = cam.x + (e.clientX - rect.left) / cam.zoom;
    const worldY = cam.y + (e.clientY - rect.top) / cam.zoom;
    const gx = Math.floor((worldX - WORLD_RULER_PX) / WORLD_TILE_PX);
    const gy = Math.floor((worldY - WORLD_RULER_PX) / WORLD_TILE_PX);
    if (gx < 0 || gx >= WORLD_MAP_SIZE || gy < 0 || gy >= WORLD_MAP_SIZE) {
      return null;
    }
    return { x: gx, y: gy };
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#120b07] text-[#f4e8d1] flex flex-col select-none">
      {/* TOP HEADER BAR: Tên Bản Đồ Thế Giới 50x50, Trạng Thái Online, Tài Khoản, Số Vương Quốc, Nút Đăng Xuất */}
      <header className="wood-panel px-4 py-2 border-b-2 border-[#784b2a] flex items-center justify-between gap-3 shrink-0 z-20">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-[#1c1008] border border-[#fbbf24] px-2.5 py-1 rounded-sm">
            <Compass className="w-4 h-4 text-[#fde047]" />
            <span className="font-medieval font-bold text-sm md:text-base text-[#fde047]">
              BẢN ĐỒ THẾ GIỚI 50×50
            </span>
          </div>

          <div className="flex items-center gap-2 cobble-stat-box px-2.5 py-1 rounded-sm text-xs font-mono">
            <Globe
              className={`w-3.5 h-3.5 ${
                isOnlineAuthenticated ? 'text-[#4ade80]' : 'text-[#fde047]'
              }`}
            />
            <span
              className={`font-bold ${
                isOnlineAuthenticated ? 'text-[#4ade80]' : 'text-[#fde047]'
              }`}
            >
              {isOnlineAuthenticated
                ? 'ONLINE CLOUD SYNC'
                : 'SEED ĐỒNG BỘ 50×50'}
            </span>
            <span className="text-[#78716c]">|</span>
            <User className="w-3.5 h-3.5 text-[#38bdf8]" />
            <span className="text-[#d6c7b2]">Tài khoản:</span>
            <span className="font-bold text-white">{account.username}</span>
            <span className="text-[#78716c]">|</span>
            <Castle className="w-3.5 h-3.5 text-[#fde047]" />
            <span className="text-[#fde047] font-bold">
              {kingdomsList.length} Vương Quốc sở hữu
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="wood-button px-3 py-1 rounded-sm text-xs font-bold text-[#fca5a5] flex items-center gap-1.5 cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Đăng Xuất</span>
        </button>
      </header>

      {/* MAIN CONTENT: Left = 2D Pixel 8-Bit World Map Canvas, Right = Pinned Right Sidebar Column */}
      <div className="flex-1 w-full min-h-0 flex flex-row overflow-hidden relative">
        {/* LEFT / CENTER: 2D PIXEL 8-BIT WORLD MAP VIEWPORT */}
        <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden bg-[#0c0704] relative p-2 md:p-3">
          {/* Status / Placement Guide Bar */}
          {statusBanner && (
            <div className="mb-2 px-3 py-1.5 rounded-sm bg-[#2c1a0e] border border-[#fbbf24] text-xs text-[#fef08a] flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#fde047] shrink-0" />
                <span>{statusBanner}</span>
              </div>
              <button
                type="button"
                onClick={() => setStatusBanner(null)}
                className="text-[10px] font-mono text-[#d6c7b2] hover:text-white cursor-pointer"
              >
                [Ẩn]
              </button>
            </div>
          )}

          {/* 2D Pixel 8-bit Interactive Canvas Container */}
          <div
            ref={viewportRef}
            className="flex-1 min-w-0 min-h-0 relative overflow-hidden border-2 border-[#784b2a] rounded-md bg-[#0c130c] shadow-inner"
          >
            <canvas
              ref={canvasRef}
              onMouseDown={(e) => {
                if (e.button !== 0) return;
                isDraggingMapRef.current = {
                  active: true,
                  moved: false,
                  startX: e.clientX,
                  startY: e.clientY,
                  camStartX: cameraRef.current.x,
                  camStartY: cameraRef.current.y,
                };
              }}
              onMouseMove={(e) => {
                const drag = isDraggingMapRef.current;
                if (drag.active) {
                  const dx = e.clientX - drag.startX;
                  const dy = e.clientY - drag.startY;
                  if (Math.hypot(dx, dy) > 5) {
                    drag.moved = true;
                  }
                  if (drag.moved) {
                    setEnemyCampCursorPopup(null);
                    setKingdomCursorPopup(null);
                    const cam = cameraRef.current;
                    const clamped = clampCamera(
                      drag.camStartX - dx / cam.zoom,
                      drag.camStartY - dy / cam.zoom,
                      cam.zoom
                    );
                    cameraRef.current.x = clamped.x;
                    cameraRef.current.y = clamped.y;
                    return;
                  }
                }
                hoverCoordRef.current = getTileCoordFromMouseEvent(e);
              }}
              onMouseUp={(e) => {
                const drag = isDraggingMapRef.current;
                const wasMoved = drag.moved;
                drag.active = false;
                drag.moved = false;
                if (!wasMoved) {
                  const coord = getTileCoordFromMouseEvent(e);
                  if (coord) {
                    setSelectedCoord(coord);
                    if (isPlacingKingdom) {
                      setEnemyCampCursorPopup(null);
                      setKingdomCursorPopup(null);
                      handlePlaceNewKingdom(coord.x, coord.y);
                    } else {
                      const clickedTile = getDeterministicWorldTileAt(
                        coord.x,
                        coord.y
                      );
                      const clickedOwnKingdom =
                        myKingdomByCoord.get(`${coord.x},${coord.y}`) || null;
                      const clickedOnlineKingdom =
                        viewportOnlineTilesRef.current[
                          `${coord.x},${coord.y}`
                        ] || null;
                      const hasKingdomOnTile =
                        Boolean(clickedOwnKingdom) ||
                        Boolean(clickedOnlineKingdom);
                      const vpRect =
                        viewportRef.current?.getBoundingClientRect();
                      const localX = vpRect
                        ? e.clientX - vpRect.left
                        : e.clientX;
                      const localY = vpRect
                        ? e.clientY - vpRect.top
                        : e.clientY;

                      if (hasKingdomOnTile) {
                        soundFX.playSelect();
                        setEnemyCampCursorPopup(null);
                        setKingdomCursorPopup({
                          x: localX,
                          y: localY,
                          tileX: coord.x,
                          tileY: coord.y,
                          ownKingdom: clickedOwnKingdom,
                          onlineSummary: clickedOnlineKingdom,
                        });
                      } else if (clickedTile.terrain === 'ENEMY_CAMP') {
                        soundFX.playSelect();
                        setKingdomCursorPopup(null);
                        setEnemyCampCursorPopup({
                          tile: clickedTile,
                          x: localX,
                          y: localY,
                        });
                      } else {
                        setEnemyCampCursorPopup(null);
                        setKingdomCursorPopup(null);
                      }
                    }
                  }
                }
              }}
              onMouseLeave={() => {
                isDraggingMapRef.current.active = false;
                hoverCoordRef.current = null;
              }}
              className="absolute inset-0 w-full h-full block cursor-grab active:cursor-grabbing"
              style={{ imageRendering: 'pixelated' }}
            />

            {/* ====================================================================
                BẢNG TÙY CHỌN ĐỒNG BỘ (THU NHỎ 30% + HIỆU ỨNG BẤM NÚT TRƯỚC KHI CHẠY)
                Dùng chung cho cả Vương Quốc và Trại Quân Địch trên Bản Đồ Thế Giới
               ==================================================================== */}
            {(enemyCampCursorPopup || kingdomCursorPopup) &&
              (() => {
                const isCamp = Boolean(enemyCampCursorPopup);
                const popX = isCamp
                  ? enemyCampCursorPopup!.x
                  : kingdomCursorPopup!.x;
                const popY = isCamp
                  ? enemyCampCursorPopup!.y
                  : kingdomCursorPopup!.y;
                const tileX = isCamp
                  ? enemyCampCursorPopup!.tile.x
                  : kingdomCursorPopup!.tileX;
                const tileY = isCamp
                  ? enemyCampCursorPopup!.tile.y
                  : kingdomCursorPopup!.tileY;
                const ownKingdom = isCamp
                  ? null
                  : kingdomCursorPopup!.ownKingdom;
                const onlineSummary = isCamp
                  ? null
                  : kingdomCursorPopup!.onlineSummary;

                const targetName = isCamp
                  ? `Trại Địch (${tileX},${tileY})`
                  : ownKingdom?.name ||
                    onlineSummary?.kingdomName ||
                    `Vương Quốc (${tileX},${tileY})`;
                const targetLevel = isCamp
                  ? Math.max(1, enemyCampCursorPopup!.tile.enemyLevel || 1)
                  : Math.max(
                      1,
                      ownKingdom?.kingdomLevel ||
                        onlineSummary?.kingdomLevel ||
                        1
                    );
                const targetOwner =
                  onlineSummary?.ownerUsername ||
                  account.username ||
                  'Lãnh Chúa';
                const targetKingdomId =
                  ownKingdom?.id || onlineSummary?.kingdomId;

                const ownMarchToThisTarget = kingdomsList.find(
                  (k) =>
                    k.activeMarchOrder &&
                    k.activeMarchOrder.targetX === tileX &&
                    k.activeMarchOrder.targetY === tileY
                );
                const tileLock =
                  ownMarchToThisTarget?.activeMarchOrder ||
                  getActiveMarchLockAtTile(tileX, tileY);
                const remSec = tileLock
                  ? Math.max(
                      0,
                      Math.ceil((tileLock.arrivalTimeMs - marchTickNow) / 1000)
                    )
                  : 0;
                const isOwnArrived =
                  Boolean(ownMarchToThisTarget) && remSec <= 0;

                const renderPopupButton = (
                  btnKey: string,
                  label: string,
                  colorVariant: 'GREEN' | 'RED' | 'BLUE' | 'PURPLE',
                  onExecute: () => void,
                  pulse?: boolean
                ) => {
                  const isPressed = pressedPopupBtnId === btnKey;
                  const palette =
                    colorVariant === 'GREEN'
                      ? 'bg-gradient-to-b from-[#22c55e] to-[#15803d] hover:from-[#4ade80] hover:to-[#16a34a] border-[#052e16] border-b-[#022c22]'
                      : colorVariant === 'RED'
                        ? 'bg-gradient-to-b from-[#ef4444] to-[#b91c1c] hover:from-[#f87171] hover:to-[#dc2626] border-[#450a0a] border-b-[#2a0404]'
                        : colorVariant === 'BLUE'
                          ? 'bg-gradient-to-b from-[#3b82f6] to-[#1d4ed8] hover:from-[#60a5fa] hover:to-[#2563eb] border-[#172554] border-b-[#0f172a]'
                          : 'bg-gradient-to-b from-[#a855f7] to-[#6b21a8] hover:from-[#c084fc] hover:to-[#7e22ce] border-[#3b0764] border-b-[#1e0536]';

                  return (
                    <button
                      key={btnKey}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerPopupButtonAction(btnKey, onExecute);
                      }}
                      className={`w-full px-2 py-1 rounded-xs border text-[10px] font-bold text-white flex items-center justify-center gap-1 cursor-pointer select-none transition-all duration-100 ${palette} ${
                        isPressed
                          ? 'translate-y-[1.5px] scale-[0.95] brightness-90 border-b shadow-inner'
                          : 'border-b-2 shadow-[0_2px_4px_rgba(0,0,0,0.65)] active:translate-y-[1.5px] active:scale-[0.95]'
                      } ${pulse ? 'animate-pulse' : ''}`}
                      style={{
                        textShadow:
                          '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000',
                      }}
                    >
                      <span className="truncate">{label}</span>
                    </button>
                  );
                };

                return (
                  <div
                    style={{
                      left: `${Math.min(
                        Math.max(8, popX + 8),
                        (viewportRef.current?.clientWidth || 800) - 148
                      )}px`,
                      top: `${Math.min(
                        Math.max(8, popY - 10),
                        (viewportRef.current?.clientHeight || 500) -
                          (isCamp ? 85 : 158)
                      )}px`,
                    }}
                    className="absolute z-30 pointer-events-auto w-[134px] bg-[#140c07]/96 border-2 border-[#fbbf24] rounded-sm p-1.5 shadow-[0_8px_20px_rgba(0,0,0,0.9)] flex flex-col gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Header đồng bộ */}
                    <div className="px-1 pb-0.5 border-b border-[#784b2a] flex items-center justify-between gap-1">
                      <span
                        className="font-bold text-[10px] text-[#fde047] truncate"
                        title={targetName}
                      >
                        {targetName}
                      </span>
                      <span className="font-mono text-[8px] px-1 py-0.2 rounded bg-black/70 text-white border border-white/15 shrink-0">
                        Lv.{targetLevel}
                      </span>
                    </div>

                    {/* 1. Truy cập (chỉ hiện với Vương Quốc sở hữu) */}
                    {!isCamp &&
                      ownKingdom &&
                      renderPopupButton(
                        `enter_${tileX}_${tileY}`,
                        'Truy cập',
                        'GREEN',
                        () => {
                          setKingdomCursorPopup(null);
                          onEnterKingdom(ownKingdom.id);
                        }
                      )}

                    {/* 2. Tấn công / Vào chiến đấu (Hiện cho cả Vương Quốc và Trại Địch) */}
                    {isOwnArrived && ownMarchToThisTarget ? (
                      renderPopupButton(
                        `battle_${tileX}_${tileY}`,
                        'Vào chiến đấu',
                        'GREEN',
                        () => {
                          soundFX.playPomodoroComplete();
                          setEnemyCampCursorPopup(null);
                          setKingdomCursorPopup(null);
                          onEnterArrivedMarchBattle(ownMarchToThisTarget.id);
                        },
                        true
                      )
                    ) : tileLock ? (
                      <div
                        className="w-full px-2 py-1 rounded-xs bg-[#7f1d1d] border border-black shadow-sm text-[9px] font-bold text-[#fef08a] text-center leading-tight"
                        style={{
                          textShadow:
                            '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000',
                        }}
                      >
                        {ownMarchToThisTarget
                          ? `Hành quân (${remSec}s)`
                          : `Đang bị đánh (${remSec}s)`}
                      </div>
                    ) : (
                      renderPopupButton(
                        `atk_${tileX}_${tileY}`,
                        'Tấn công',
                        'RED',
                        () => {
                          const availableKingdom =
                            kingdomsList.find((k) => !k.activeMarchOrder) ||
                            account.kingdoms[selectedDungeonKingdomId] ||
                            kingdomsList[0] ||
                            null;
                          if (availableKingdom) {
                            setSelectedDungeonKingdomId(availableKingdom.id);
                            selectDefaultDispatchUnitsForKingdom(
                              availableKingdom
                            );
                          }
                          if (isCamp) {
                            setEnemyCampTargetCoord({
                              x: tileX,
                              y: tileY,
                              enemyLevel: targetLevel,
                            });
                            setPvpTargetKingdomInfo(null);
                            setEnemyCampCursorPopup(null);
                            setShowDungeonKingdomDropdown(false);
                            setActiveDungeonCardId('world_enemy_camp');
                            setActiveDungeonStageId(targetLevel);
                            setShowDungeonModal(true);
                          } else {
                            setPvpTargetKingdomInfo({
                              x: tileX,
                              y: tileY,
                              kingdomLevel: targetLevel,
                              kingdomId: targetKingdomId,
                              kingdomName: targetName,
                              ownerUsername: targetOwner,
                            });
                            setEnemyCampTargetCoord({
                              x: tileX,
                              y: tileY,
                              enemyLevel: targetLevel,
                            });
                            setKingdomCursorPopup(null);
                            setShowDungeonKingdomDropdown(false);
                            setActiveDungeonCardId('world_pvp_kingdom');
                            setActiveDungeonStageId(targetLevel);
                            setShowDungeonModal(true);
                          }
                        }
                      )
                    )}

                    {/* 3 & 4. Viện trợ tài nguyên & Viện trợ quân đội (Chỉ hiện khi bấm vào Vương Quốc) */}
                    {!isCamp &&
                      renderPopupButton(
                        `aid_res_${tileX}_${tileY}`,
                        'Viện trợ tài nguyên',
                        'BLUE',
                        () => {
                          setKingdomCursorPopup(null);
                          setStatusBanner(
                            `Đã chọn Viện Trợ Tài Nguyên tới Vương Quốc [${targetName}] tại (${tileX}, ${tileY}).`
                          );
                        }
                      )}

                    {!isCamp &&
                      renderPopupButton(
                        `aid_troop_${tileX}_${tileY}`,
                        'Viện trợ quân đội',
                        'PURPLE',
                        () => {
                          setKingdomCursorPopup(null);
                          setStatusBanner(
                            `Đã chọn Viện Trợ Quân Đội tới Vương Quốc [${targetName}] tại (${tileX}, ${tileY}).`
                          );
                        }
                      )}
                  </div>
                );
              })()}

            {/* Góc trên bên trái: Thanh trạng thái Viewport Chunk Loading (Chỉ tải ô trong màn hình) */}
            <div className="absolute top-2.5 left-2.5 pointer-events-none flex flex-wrap items-center gap-2 bg-[#140c07]/92 border border-[#b45309] px-2.5 py-1 rounded-sm text-[10px] font-mono text-[#f4e8d1] shadow-md">
              <Eye className="w-3.5 h-3.5 text-[#4ade80] shrink-0" />
              <span className="text-[#4ade80] font-bold">VIEWPORT AOI:</span>
              <span>
                Ô hiển thị X({viewportBoundsInfo.minX}..{viewportBoundsInfo.maxX}), Y(
                {viewportBoundsInfo.minY}..{viewportBoundsInfo.maxY}) [
                {viewportBoundsInfo.visibleTileCount}/2.500 ô]
              </span>
              <span className="text-[#78716c]">|</span>
              <span className="text-[#fde047] font-bold">
                Chunks 10×10 đang tải:{' '}
                {activeChunkIds.length > 0 ? activeChunkIds.length : 1}/25
              </span>
              <span className="text-[#a8a29e]">
                (Ngoài màn hình: Không tải)
              </span>
            </div>

            {/* ====================================================================
                GÓC DƯỚI BÊN TRÁI: NHẬT KÝ THÔNG BÁO & CHAT THẾ GIỚI (DÙNG CHUNG VỚI VƯƠNG QUỐC)
               ==================================================================== */}
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute bottom-2.5 left-2.5 z-30 pointer-events-auto w-72 sm:w-80 wood-panel rounded-sm px-2.5 py-1.5 border border-[#784b2a] shadow-2xl flex flex-col gap-1.5"
            >
              <div className="flex items-center justify-between gap-1.5 border-b border-[#784b2a]/70 pb-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[11px] font-bold text-[#fde047] truncate">
                    {activeLogTab === 'CHAT'
                      ? 'Chat thế giới'
                      : 'Nhật ký thông báo'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      soundFX.playSelect();
                      onChangeLogTab?.(
                        activeLogTab === 'LOG' ? 'CHAT' : 'LOG'
                      );
                    }}
                    className="px-1.5 py-0.5 rounded-xs bg-[#2c1a0e] hover:bg-[#3f2514] border border-[#fbbf24]/80 text-[10px] font-bold text-[#7dd3fc] flex items-center gap-1 cursor-pointer shrink-0 transition-colors"
                    title="Chuyển qua lại giữa Nhật ký thông báo và Chat thế giới"
                  >
                    {activeLogTab === 'LOG' ? (
                      <>
                        <MessageSquare className="w-3 h-3 text-[#38bdf8]" />
                        <span>Chat thế giới</span>
                      </>
                    ) : (
                      <>
                        <ScrollText className="w-3 h-3 text-[#fde047]" />
                        <span>Nhật ký</span>
                      </>
                    )}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    soundFX.playSelect();
                    onToggleLogCollapsed?.();
                  }}
                  className="text-[#d6c7b2] hover:text-white cursor-pointer p-0.5 rounded hover:bg-black/30 shrink-0"
                  title={isLogCollapsed ? 'Mở rộng' : 'Thu gọn'}
                >
                  {isLogCollapsed ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              {!isLogCollapsed &&
                (activeLogTab === 'LOG' ? (
                  <div className="max-h-24 overflow-y-auto space-y-1 pr-1 text-[11px] text-[#f5e6d3]">
                    {chronicleLogs.length === 0 ? (
                      <div className="text-[#a8a29e] italic text-[10px]">
                        Chưa có thông báo mới.
                      </div>
                    ) : (
                      chronicleLogs.slice(0, 12).map((log, i) => (
                        <div
                          key={i}
                          className={`leading-tight ${
                            i === 0
                              ? 'text-[#fde047] font-semibold'
                              : 'text-[#d6c7b2] opacity-85'
                          }`}
                        >
                          {log}
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    <div className="max-h-24 overflow-y-auto space-y-1 pr-1 text-[11px]">
                      {worldChatMessages.length === 0 ? (
                        <div className="text-[#a8a29e] italic text-[10px]">
                          Chưa có tin nhắn thế giới. Hãy gửi lời chào đầu tiên!
                        </div>
                      ) : (
                        worldChatMessages.slice(-25).map((msg) => {
                          const isMe =
                            msg.senderUsername.toLowerCase() ===
                            account.username.toLowerCase();
                          return (
                            <div
                              key={msg.id}
                              className="leading-snug break-words text-[11px]"
                            >
                              <span className="font-mono text-[9px] text-[#a8a29e] mr-1">
                                [{msg.timestampLabel}]
                              </span>
                              <span
                                className={`font-bold mr-1 ${
                                  isMe ? 'text-[#4ade80]' : 'text-[#fde047]'
                                }`}
                              >
                                {msg.senderUsername}:
                              </span>
                              <span className="text-[#f5e6d3]">{msg.text}</span>
                            </div>
                          );
                        })
                      )}
                    </div>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const trimmed = worldChatDraft.trim();
                        if (!trimmed) return;
                        soundFX.playSelect();
                        onSendWorldChat?.(trimmed);
                        setWorldChatDraft('');
                      }}
                      className="flex items-center gap-1 pt-0.5"
                    >
                      <input
                        type="text"
                        value={worldChatDraft}
                        onChange={(e) => setWorldChatDraft(e.target.value)}
                        placeholder={`Chat dưới tên ${account.username}...`}
                        maxLength={220}
                        className="flex-1 min-w-0 bg-[#140c07] border border-[#784b2a] focus:border-[#fbbf24] rounded-xs px-2 py-1 text-[11px] text-white outline-none"
                      />
                      <button
                        type="submit"
                        className="gold-button px-2 py-1 rounded-xs text-[10px] font-bold text-[#1c1008] flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        <Send className="w-3 h-3" />
                        <span>Gửi</span>
                      </button>
                    </form>
                  </div>
                ))}
            </div>

            {/* ====================================================================
                GÓC DƯỚI BÊN PHẢI: NÚT "LỆNH CHIẾN ĐẤU" (SỔ LIST LÊN PHÍA TRÊN)
               ==================================================================== */}
            {(() => {
              const activeOwnedOrders = kingdomsList
                .filter((k) => Boolean(k.activeMarchOrder))
                .map((k) => ({
                  kingdom: k,
                  order: k.activeMarchOrder!,
                }));
              const arrivedCount = activeOwnedOrders.filter(
                ({ order }) =>
                  Math.ceil((order.arrivalTimeMs - marchTickNow) / 1000) <= 0
              ).length;

              return (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute bottom-2.5 right-2.5 z-30 pointer-events-auto flex flex-col items-end"
                >
                  {/* Danh sách Lệnh Chiến Đấu sổ lên phía trên nút */}
                  {showMarchOrdersDropdown && (
                    <div className="mb-2 w-72 sm:w-80 bg-[#140c07]/96 border-2 border-[#fbbf24] rounded-sm p-2.5 shadow-[0_10px_28px_rgba(0,0,0,0.95)] flex flex-col gap-2 max-h-64 overflow-y-auto">
                      <div className="flex items-center justify-between border-b border-[#784b2a] pb-1">
                        <span className="font-bold text-xs text-[#fde047] flex items-center gap-1.5">
                          <Swords className="w-3.5 h-3.5 text-[#f87171]" />
                          <span>
                            Lệnh Chiến Đấu Đang Hoạt Động (
                            {activeOwnedOrders.length})
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowMarchOrdersDropdown(false)}
                          className="text-[10px] font-mono text-[#fca5a5] hover:text-white cursor-pointer"
                        >
                          [Đóng]
                        </button>
                      </div>

                      {activeOwnedOrders.length === 0 ? (
                        <div className="text-[11px] text-[#a8a29e] italic py-3 text-center">
                          Hiện không có lệnh chiến đấu nào đang hoạt động từ các Vương Quốc bạn sở hữu.
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1.5">
                          {activeOwnedOrders.map(({ kingdom, order }) => {
                            const remSec = Math.max(
                              0,
                              Math.ceil(
                                (order.arrivalTimeMs - marchTickNow) / 1000
                              )
                            );
                            const isArrived = remSec <= 0;
                            return (
                              <div
                                key={order.orderId}
                                onClick={() => {
                                  centerCameraOnTile(
                                    order.targetX,
                                    order.targetY
                                  );
                                  setSelectedCoord({
                                    x: order.targetX,
                                    y: order.targetY,
                                  });
                                }}
                                className={`p-2 rounded-xs border flex flex-col gap-1.5 cursor-pointer transition-colors ${
                                  isArrived
                                    ? 'bg-[#14331b]/95 border-[#4ade80]'
                                    : 'bg-[#231409]/95 border-[#fbbf24]/80 hover:border-[#fde047]'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-1 text-[11px]">
                                  <span className="font-bold text-[#fde047] truncate">
                                    [{kingdom.name}] → ({order.targetX},{' '}
                                    {order.targetY})
                                  </span>
                                  <span
                                    className={`font-mono text-[10px] font-bold px-1.5 py-0.2 rounded shrink-0 ${
                                      isArrived
                                        ? 'bg-[#16a34a] text-white'
                                        : 'bg-black/60 text-[#fef08a] border border-white/15'
                                    }`}
                                  >
                                    {isArrived
                                      ? 'ĐÃ TỚI ĐÍCH'
                                      : `${remSec}s (${order.distanceTiles} ô)`}
                                  </span>
                                </div>

                                <div className="flex items-center justify-between gap-2 text-[10px] text-[#d6c7b2]">
                                  <span className="truncate">
                                    Mục tiêu:{' '}
                                    <strong className="text-[#fca5a5]">
                                      {order.targetType === 'PVP_KINGDOM'
                                        ? `Vương Quốc [${order.targetKingdomName || `Lv.${order.enemyLevel}`}]`
                                        : `Trại Địch Lv.${order.enemyLevel}`}
                                    </strong>
                                  </span>
                                  {isArrived && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        soundFX.playPomodoroComplete();
                                        onEnterArrivedMarchBattle(kingdom.id);
                                      }}
                                      className="gold-button px-2 py-0.5 rounded-xs font-bold text-[10px] text-[#1c1008] shrink-0 cursor-pointer animate-pulse"
                                    >
                                      Vào chiến đấu
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Nút bật/tắt Lệnh Chiến Đấu */}
                  <button
                    type="button"
                    onClick={() => {
                      soundFX.playSelect();
                      setShowMarchOrdersDropdown((prev) => !prev);
                    }}
                    className={`px-3 py-1.5 rounded-sm font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xl border-2 transition-all ${
                      arrivedCount > 0
                        ? 'bg-[#16a34a] hover:bg-[#22c55e] border-[#fde047] text-white animate-pulse'
                        : activeOwnedOrders.length > 0
                          ? 'gold-button border-[#fbbf24] text-[#1c1008]'
                          : 'wood-button border-[#fbbf24] text-[#fde047]'
                    }`}
                  >
                    <Swords className="w-3.5 h-3.5 shrink-0" />
                    <span>Lệnh chiến đấu</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-black/75 text-[#fde047] font-mono text-[10px] font-bold">
                      {activeOwnedOrders.length}
                    </span>
                    {showMarchOrdersDropdown ? (
                      <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                    ) : (
                      <ChevronUp className="w-3.5 h-3.5 shrink-0" />
                    )}
                  </button>
                </div>
              );
            })()}
            {/* Bảng nổi Kiến Lập Vương Quốc Mới trên góc phải bản đồ (không làm thay đổi kích thước cố định của các thẻ cột phải) */}
            {isPlacingKingdom && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute top-12 right-2.5 z-30 pointer-events-auto w-72 sm:w-80 stone-panel rounded-sm p-3 border-2 border-[#4ade80] shadow-2xl flex flex-col gap-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-[#4ade80] flex items-center gap-1.5">
                    <Castle className="w-4 h-4" />
                    <span>Kiến Lập Vương Quốc Mới</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsPlacingKingdom(false)}
                    className="text-[10px] font-mono text-[#fca5a5] hover:text-white cursor-pointer"
                  >
                    [Đóng]
                  </button>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] text-[#d6c7b2]">
                    Tên Vương Quốc mới:
                  </label>
                  <input
                    type="text"
                    value={newKingdomName}
                    onChange={(e) => setNewKingdomName(e.target.value)}
                    placeholder="Nhập tên Vương Quốc..."
                    className="w-full bg-[#140c07] border border-[#784b2a] focus:border-[#fbbf24] rounded-sm px-2.5 py-1.5 text-xs text-white font-semibold outline-none"
                  />
                </div>

                <div className="text-[11px] text-[#d6c7b2] bg-black/45 p-2 rounded-sm border border-[#57534e]">
                  <div>
                    Ô đang chọn:{' '}
                    <strong className="text-[#fde047] font-mono">
                      ({selectedCoord.x}, {selectedCoord.y})
                    </strong>{' '}
                    —{' '}
                    <span className="text-white">
                      {selectedOwnKingdom
                        ? `Đã có ${selectedOwnKingdom.name} (Của bạn)`
                        : selectedOnlineTileSummary
                          ? `Đã có ${selectedOnlineTileSummary.kingdomName} (${selectedOnlineTileSummary.ownerUsername})`
                          : selectedTile.labelVi}
                    </span>
                  </div>
                  <div className="text-[10px] text-[#86efac] mt-0.5">
                    * Click vào ô Đồng Bằng Trống bất kỳ trên bản đồ hoặc bấm nút Đặt bên dưới.
                  </div>
                </div>

                <button
                  type="button"
                  disabled={
                    Boolean(selectedOwnKingdom) ||
                    Boolean(selectedOnlineTileSummary) ||
                    selectedTile.terrain !== 'PLAINS'
                  }
                  onClick={() =>
                    handlePlaceNewKingdom(selectedCoord.x, selectedCoord.y)
                  }
                  className={`w-full py-2 rounded-sm font-bold text-xs flex items-center justify-center gap-1.5 ${
                    !selectedOwnKingdom &&
                    !selectedOnlineTileSummary &&
                    selectedTile.terrain === 'PLAINS'
                      ? 'gold-button text-[#1c1008] cursor-pointer'
                      : 'bg-[#44403c] text-[#a8a29e] cursor-not-allowed opacity-60'
                  }`}
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>
                    Đặt Vương Quốc Tại ({selectedCoord.x}, {selectedCoord.y})
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT SIDEBAR COLUMN: Khóa cứng cố định dính sát cạnh phải của màn hình */}
        <aside className="w-[356px] min-w-[356px] max-w-[356px] h-full wood-panel border-l-2 border-[#784b2a] p-3 flex flex-col justify-between gap-2.5 overflow-y-auto shrink-0 ml-auto z-20">
          {/* 1. TRÊN CÙNG: TẬP HỢP CÁC NÚT CHẾ ĐỘ CHƠI GỒM 3 HÀNG */}
          <div className="w-full shrink-0 flex flex-col gap-2">
            {/* Hàng 1: Pomodoro | Boss Thế Giới */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  soundFX.playSelect();
                  setIsPlacingKingdom(false);
                  setActiveFeatureNotice(null);
                  if (
                    selectedOwnKingdom &&
                    selectedOwnKingdom.id !== selectedPomodoroKingdomId
                  ) {
                    setSelectedPomodoroKingdomId(selectedOwnKingdom.id);
                  }
                  setShowPomodoroModal(true);
                }}
                className="gold-button h-10 px-3 rounded-sm font-bold text-xs text-[#1c1008] flex items-center justify-center gap-1.5 cursor-pointer relative shadow-md"
              >
                <Timer className="w-4 h-4 text-[#7c2d12] shrink-0" />
                <span>Pomodoro</span>
                <span className="text-[9px] font-mono bg-[#1c1008] text-[#fde047] px-1 py-0.2 rounded-xs">
                  75%
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundFX.playSelect();
                  setIsPlacingKingdom(false);
                  setStatusBanner(
                    'Chế độ [Boss Thế Giới]: Săn Boss Khổng Lồ Liên Server theo khung giờ cố định (Nhánh phụ 25% phần thưởng).'
                  );
                }}
                className="wood-button h-10 px-3 rounded-sm font-bold text-xs text-[#fca5a5] hover:text-[#fde047] flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Skull className="w-4 h-4 text-[#f87171] shrink-0" />
                <span>Boss Thế Giới</span>
              </button>
            </div>

            {/* Hàng 2: Phó Bản | Hầm Ngục */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  soundFX.playSelect();
                  setIsPlacingKingdom(false);
                  setActiveFeatureNotice(null);
                  if (
                    selectedOwnKingdom &&
                    selectedOwnKingdom.id !== selectedDungeonKingdomId
                  ) {
                    setSelectedDungeonKingdomId(selectedOwnKingdom.id);
                  }
                  setActiveDungeonCardId(null);
                  setActiveDungeonStageId(null);
                  setShowDungeonKingdomDropdown(false);
                  setShowDungeonModal(true);
                }}
                className="wood-button h-10 px-3 rounded-sm font-bold text-xs text-[#f4e8d1] flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Layers className="w-4 h-4 text-[#38bdf8] shrink-0" />
                <span>Phó Bản</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundFX.playSelect();
                  setIsPlacingKingdom(false);
                  setStatusBanner(
                    'Chế độ [Hầm Ngục Hắc Ám]: Thám hiểm tầng sâu Hầm Ngục (Nhánh phụ 25% so với trọng tâm Pomodoro 75%).'
                  );
                }}
                className="wood-button h-10 px-3 rounded-sm font-bold text-xs text-[#f4e8d1] flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Flame className="w-4 h-4 text-[#c084fc] shrink-0" />
                <span>Hầm Ngục</span>
              </button>
            </div>

            {/* Hàng 3: 1 nút dài "Sự kiện" */}
            <button
              type="button"
              onClick={() => {
                soundFX.playSelect();
                setIsPlacingKingdom(false);
                setEventJoinNotice(null);
                setShowEventsModal(true);
              }}
              className="w-full h-10 rounded-sm font-bold text-xs bg-gradient-to-b from-[#7c2d12] to-[#451a03] hover:from-[#9a3412] hover:to-[#5c2206] border-2 border-[#fbbf24] text-[#fde047] flex items-center justify-center gap-2 cursor-pointer shadow-lg transition-all"
            >
              <Sparkles className="w-4 h-4 text-[#fde047] shrink-0" />
              <span className="uppercase tracking-wider">Sự kiện</span>
            </button>
          </div>

          {/* 2. GIỮA: THẺ VƯƠNG QUỐC SỞ HỮU (KHÓA CỐ ĐỊNH CHIỀU DÀI RỘNG, CHỈ HIỂN THỊ 1 VƯƠNG QUỐC, BẤM ĐỂ XỔ LÊN LIST) */}
          {(() => {
            const displayedOwnedKingdom =
              account.kingdoms[selectedOwnedCardKingdomId] ||
              selectedOwnKingdom ||
              kingdomsList[0] ||
              null;

            return (
              <div className="w-full h-[122px] min-h-[122px] max-h-[122px] shrink-0 cobble-stat-box rounded-sm p-2.5 flex flex-col justify-between relative">
                {/* Header: Vương Quốc Sở Hữu + Nút Tạo Vương Quốc thay vào vị trí "Data độc lập" */}
                <div className="flex items-center justify-between border-b border-[#57534e] pb-1.5 shrink-0">
                  <span className="font-bold text-xs text-[#fde047] flex items-center gap-1.5 truncate">
                    <Shield className="w-3.5 h-3.5 shrink-0" />
                    <span>Vương Quốc Sở Hữu ({kingdomsList.length})</span>
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      soundFX.playSelect();
                      setIsPlacingKingdom((prev) => !prev);
                      setStatusBanner(
                        'Chế độ Tạo Vương Quốc: Nhập tên Vương Quốc và click vào ô Đồng Bằng Trống (X, Y) trên Bản Đồ Thế Giới!'
                      );
                    }}
                    className={`px-2 py-0.5 rounded-xs font-bold text-[10px] flex items-center gap-1 cursor-pointer shrink-0 transition-all ${
                      isPlacingKingdom
                        ? 'gold-button text-[#1c1008]'
                        : 'wood-button text-[#fde047] border border-[#fbbf24]/80'
                    }`}
                  >
                    <PlusCircle className="w-3 h-3 shrink-0" />
                    <span>Tạo Vương Quốc</span>
                  </button>
                </div>

                {/* Danh sách xổ lên phía trên khi bấm vào thẻ Vương Quốc Sở Hữu */}
                {showOwnedKingdomSelector && kingdomsList.length > 0 && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute left-0 right-0 bottom-full mb-1.5 z-40 bg-[#140c06] border-2 border-[#fbbf24] rounded-sm p-2 flex flex-col gap-1.5 max-h-48 overflow-y-auto shadow-[0_-10px_28px_rgba(0,0,0,0.95)]"
                  >
                    <div className="flex items-center justify-between border-b border-[#784b2a] pb-1 text-[10px] font-bold text-[#fde047]">
                      <span>Chọn Vương Quốc Sở Hữu ({kingdomsList.length})</span>
                      <button
                        type="button"
                        onClick={() => setShowOwnedKingdomSelector(false)}
                        className="font-mono text-[#fca5a5] hover:text-white cursor-pointer"
                      >
                        [Đóng]
                      </button>
                    </div>
                    {kingdomsList.map((k) => {
                      const isActiveK = displayedOwnedKingdom?.id === k.id;
                      return (
                        <button
                          key={k.id}
                          type="button"
                          onClick={() => {
                            soundFX.playSelect();
                            setSelectedOwnedCardKingdomId(k.id);
                            setSelectedCoord({ x: k.worldX, y: k.worldY });
                            centerCameraOnTile(k.worldX, k.worldY);
                            setShowOwnedKingdomSelector(false);
                          }}
                          className={`w-full px-2.5 py-1.5 rounded-xs border flex items-center justify-between gap-2 text-left cursor-pointer transition-colors ${
                            isActiveK
                              ? 'bg-[#2c1a0e] border-[#fbbf24]'
                              : 'bg-black/65 border-[#57534e] hover:border-[#fde047]'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Castle className="w-3.5 h-3.5 text-[#fde047] shrink-0" />
                            <span className="font-bold text-xs text-[#fde047] truncate">
                              {k.name}
                            </span>
                            <span className="font-mono text-[10px] text-white bg-black/50 px-1 rounded border border-white/15 shrink-0">
                              ({k.worldX}, {k.worldY})
                            </span>
                          </div>
                          <span className="font-mono text-[10px] text-[#86efac] shrink-0">
                            Lv.{String(k.kingdomLevel).padStart(2, '0')}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Nội dung cố định chỉ hiển thị đúng 1 Vương Quốc */}
                {!displayedOwnedKingdom ? (
                  <div className="h-[64px] flex items-center justify-center text-[11px] text-[#a8a29e] italic text-center px-2 bg-black/30 rounded-xs border border-[#44403c]">
                    Chưa có Vương Quốc. Hãy bấm &quot;Tạo Vương Quốc&quot; phía trên!
                  </div>
                ) : (
                  <div
                    onClick={() => {
                      soundFX.playSelect();
                      setSelectedCoord({
                        x: displayedOwnedKingdom.worldX,
                        y: displayedOwnedKingdom.worldY,
                      });
                      centerCameraOnTile(
                        displayedOwnedKingdom.worldX,
                        displayedOwnedKingdom.worldY
                      );
                      if (kingdomsList.length > 0) {
                        setShowOwnedKingdomSelector((prev) => !prev);
                      }
                    }}
                    title="Bấm vào thẻ để xổ lên danh sách chọn Vương Quốc khác"
                    className="h-[64px] px-2.5 py-1.5 rounded-sm bg-[#2c1a0e] hover:bg-[#382112] border border-[#fbbf24] flex items-center justify-between gap-2 cursor-pointer transition-all"
                  >
                    <div className="flex flex-col justify-center min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Castle className="w-3.5 h-3.5 text-[#fde047] shrink-0" />
                        <span className="font-bold text-xs text-[#fde047] truncate">
                          {displayedOwnedKingdom.name}
                        </span>
                        <span className="font-mono text-[10px] px-1 rounded bg-black/50 text-white border border-white/15 shrink-0">
                          ({displayedOwnedKingdom.worldX},{' '}
                          {displayedOwnedKingdom.worldY})
                        </span>
                        {showOwnedKingdomSelector ? (
                          <ChevronDown className="w-3.5 h-3.5 text-[#fde047] shrink-0 ml-auto" />
                        ) : (
                          <ChevronUp className="w-3.5 h-3.5 text-[#fde047] shrink-0 ml-auto" />
                        )}
                      </div>
                      <span className="font-mono text-[10px] text-[#d6c7b2] truncate mt-0.5">
                        Lv.
                        {String(displayedOwnedKingdom.kingdomLevel).padStart(
                          2,
                          '0'
                        )}{' '}
                        · Dân số:{' '}
                        {displayedOwnedKingdom.resources.population +
                          displayedOwnedKingdom.resources.soldiers}{' '}
                        · Vàng:{' '}
                        {formatNumberDot(displayedOwnedKingdom.resources.gold)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        soundFX.playBuild();
                        onEnterKingdom(displayedOwnedKingdom.id);
                      }}
                      className="gold-button px-2.5 py-1.5 rounded-xs font-bold text-[11px] text-[#1c1008] shrink-0 cursor-pointer"
                    >
                      Truy Cập
                    </button>
                  </div>
                )}
              </div>
            );
          })()}

          {/* 3. DƯỚI CÙNG: THẺ THÔNG TIN TỌA ĐỘ (CỐ ĐỊNH HÌNH VUÔNG KHÓA CHIỀU DÀI RỘNG) */}
          <div className="w-full h-[332px] min-h-[332px] max-h-[332px] shrink-0 cobble-stat-box rounded-sm p-3 flex flex-col gap-2 overflow-hidden mt-auto">
            <div className="flex items-center justify-between border-b border-[#57534e] pb-1.5 shrink-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <MapPin className="w-4 h-4 text-[#fde047] shrink-0" />
                <span className="font-bold text-xs text-[#fde047] truncate">
                  Ô Tọa Độ ({selectedCoord.x}, {selectedCoord.y})
                </span>
              </div>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-black/45 border border-[#78716c] text-white shrink-0">
                {selectedOwnKingdom || selectedOnlineTileSummary
                  ? 'Lãnh Thổ Vương Quốc'
                  : selectedTile.labelVi}
              </span>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2 pr-0.5">
              {selectedOwnKingdom ? (
                /* TRƯỜNG HỢP 1: Vương Quốc thuộc quyền sở hữu của người chơi (Đã bỏ nút Truy cập vì thẻ trên đã có) */
                <div className="flex flex-col gap-2.5">
                  <div className="bg-[#2c1a0e] border-2 border-[#fbbf24] rounded-sm p-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <Castle className="w-6 h-6 text-[#fde047] shrink-0" />
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-[#fde047] truncate">
                          {selectedOwnKingdom.name}
                        </div>
                        <div className="text-[11px] font-mono text-[#d6c7b2]">
                          Chủ sở hữu:{' '}
                          <strong className="text-[#4ade80]">
                            {account.username} (Bạn)
                          </strong>{' '}
                          · Cấp{' '}
                          <strong className="text-white">
                            Lv.
                            {String(selectedOwnKingdom.kingdomLevel).padStart(
                              2,
                              '0'
                            )}
                          </strong>{' '}
                          · Ngày {selectedOwnKingdom.day}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 font-mono text-[11px] bg-black/35 p-2.5 rounded-sm border border-[#57534e]">
                    <div className="flex items-center gap-1.5 text-[#a3e635]">
                      <Wheat className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        Lương:{' '}
                        {formatNumberDot(selectedOwnKingdom.resources.food)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[#f59e0b]">
                      <Trees className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        Gỗ: {formatNumberDot(selectedOwnKingdom.resources.wood)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[#d6d3d1]">
                      <Mountain className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        Đá:{' '}
                        {formatNumberDot(selectedOwnKingdom.resources.stone)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[#fde047]">
                      <Coins className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        Vàng:{' '}
                        {formatNumberDot(selectedOwnKingdom.resources.gold)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[#38bdf8]">
                      <Gem className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        K.Cương:{' '}
                        {formatNumberDot(selectedOwnKingdom.resources.diamonds)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[#93c5fd]">
                      <Users className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        Dân số:{' '}
                        {selectedOwnKingdom.resources.population +
                          selectedOwnKingdom.resources.soldiers}
                      </span>
                    </div>
                  </div>

                  <div className="text-[11px] text-[#d6c7b2] bg-black/25 p-2 rounded-sm border border-[#44403c] flex items-center justify-between">
                    <span>
                      Công trình đã xây:{' '}
                      <strong className="text-white">
                        {selectedOwnKingdom.buildings.length}
                      </strong>
                    </span>
                    <span>
                      Trang bị trong kho:{' '}
                      <strong className="text-[#c084fc]">
                        {selectedOwnKingdom.equipmentInventory.length}
                      </strong>
                    </span>
                  </div>
                </div>
              ) : isSelectedForeignKingdom && selectedOnlineTileSummary ? (
                /* TRƯỜNG HỢP 2: Vương Quốc của người chơi khác */
                <div className="flex flex-col gap-2.5">
                  <div className="bg-[#0c1926] border-2 border-[#38bdf8] rounded-sm p-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <Castle className="w-6 h-6 text-[#38bdf8] shrink-0" />
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-[#7dd3fc] truncate">
                          {selectedOnlineTileSummary.kingdomName}
                        </div>
                        <div className="text-[11px] font-mono text-[#d6c7b2]">
                          Chủ sở hữu:{' '}
                          <strong className="text-[#fde047]">
                            {selectedOnlineTileSummary.ownerUsername}
                          </strong>{' '}
                          · Cấp{' '}
                          <strong className="text-white">
                            Lv.
                            {String(
                              selectedOnlineTileSummary.kingdomLevel
                            ).padStart(2, '0')}
                          </strong>{' '}
                          · Ngày {selectedOnlineTileSummary.day}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 font-mono text-[11px] bg-black/35 p-2.5 rounded-sm border border-[#57534e]">
                    <div className="flex items-center gap-1.5 text-[#93c5fd]">
                      <Users className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        Tổng quân dân: {selectedOnlineTileSummary.population}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[#fde047]">
                      <Coins className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        Vàng: {formatNumberDot(selectedOnlineTileSummary.gold)}
                      </span>
                    </div>
                  </div>

                  <div className="w-full py-2 px-2.5 rounded-sm bg-[#450a0a]/80 border border-[#ef4444] text-[#fca5a5] font-bold text-[11px] flex items-center justify-center gap-1.5 text-center">
                    <Lock className="w-3.5 h-3.5 shrink-0 text-[#f87171]" />
                    <span>VƯƠNG QUỐC CỦA NGƯỜI CHƠI KHÁC</span>
                  </div>
                </div>
              ) : selectedTile.terrain === 'ENEMY_CAMP' ? (
                /* TRƯỜNG HỢP 3: TRẠI ĐỊCH (Mô tả sơ về trại địch + Số lượng địch cụ thể & Số tháp canh) */
                (() => {
                  const campLvl = Math.max(1, selectedTile.enemyLevel || 1);
                  const campTroopCounts = [4, 6, 8, 10, 12, 14, 16, 18, 20, 22];
                  const totalEnemies =
                    campTroopCounts[campLvl - 1] || 4 + (campLvl - 1) * 2;
                  const watchtowerCount =
                    campLvl <= 3 ? 1 : campLvl <= 6 ? 2 : campLvl <= 9 ? 3 : 4;
                  const meleeCount = Math.ceil(totalEnemies * 0.45);
                  const rangedCount = Math.floor(totalEnemies * 0.35);
                  const mageCount = Math.max(
                    0,
                    totalEnemies - meleeCount - rangedCount
                  );

                  return (
                    <div className="flex flex-col gap-2 text-xs">
                      <div className="bg-[#381313] border border-[#ef4444] rounded-sm p-2.5 flex items-center gap-2">
                        <Skull className="w-5 h-5 text-[#f87171] shrink-0" />
                        <div>
                          <div className="font-bold text-xs text-[#fca5a5]">
                            Trại Quân Địch Cấp {campLvl}
                          </div>
                          <div className="text-[10px] font-mono text-[#fde047]">
                            Tọa độ ({selectedCoord.x}, {selectedCoord.y}) ·{' '}
                            {getWorldChunkId(selectedCoord.x, selectedCoord.y)}
                          </div>
                        </div>
                      </div>

                      {/* Mô tả sơ về trại địch */}
                      <p className="text-[#d6c7b2] text-[11px] leading-relaxed bg-black/30 p-2 rounded-sm border border-[#57534e]">
                        Tiền đồn quân sự của Binh Đoàn Hắc Ám đóng giữ tại vùng đất này. Tiêu diệt toàn bộ quân đồn trú cùng hệ thống tháp canh phòng thủ để thu chiến lợi phẩm.
                      </p>

                      {/* Thông tin số lượng địch cụ thể và số tháp canh */}
                      <div className="bg-black/45 p-2.5 rounded-sm border border-[#784b2a] flex flex-col gap-1.5 font-mono text-[11px]">
                        <div className="flex items-center justify-between border-b border-[#57534e]/80 pb-1">
                          <span className="text-[#fca5a5] font-bold flex items-center gap-1">
                            <Swords className="w-3.5 h-3.5 text-[#f87171]" />
                            <span>Tổng số lượng địch:</span>
                          </span>
                          <span className="text-[#fde047] font-bold">
                            {totalEnemies} quân (Lv.{campLvl})
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-1 text-[10px] text-[#e7e5e4] py-0.5">
                          <div className="bg-[#1c1008] px-1.5 py-1 rounded border border-[#57534e] text-center">
                            <div className="text-[#fca5a5] font-bold">
                              Bộ Binh
                            </div>
                            <div className="text-white font-bold">
                              {meleeCount} tên
                            </div>
                          </div>
                          <div className="bg-[#1c1008] px-1.5 py-1 rounded border border-[#57534e] text-center">
                            <div className="text-[#86efac] font-bold">
                              Cung Thủ
                            </div>
                            <div className="text-white font-bold">
                              {rangedCount} tên
                            </div>
                          </div>
                          <div className="bg-[#1c1008] px-1.5 py-1 rounded border border-[#57534e] text-center">
                            <div className="text-[#c084fc] font-bold">
                              Pháp Sư
                            </div>
                            <div className="text-white font-bold">
                              {mageCount} tên
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between border-t border-[#57534e]/80 pt-1">
                          <span className="text-[#93c5fd] font-bold flex items-center gap-1">
                            <Shield className="w-3.5 h-3.5 text-[#38bdf8]" />
                            <span>Số tháp canh:</span>
                          </span>
                          <span className="text-[#7dd3fc] font-bold">
                            {watchtowerCount} Tháp Canh (+1 Đồn Trú)
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()
              ) : (
                /* TRƯỜNG HỢP 4: Ô tự nhiên khác (Đồng bằng, Mỏ, Rừng, Núi, Sông) */
                <div className="flex flex-col gap-2 text-xs">
                  <div className="bg-black/35 p-2.5 rounded-sm border border-[#57534e] flex items-center justify-between font-mono text-[11px]">
                    <span className="text-[#d6c7b2]">Loại địa hình:</span>
                    <span className="text-[#fde047] font-bold">
                      {selectedTile.labelVi}
                    </span>
                  </div>
                  <p className="text-[#d6c7b2] text-[11px] leading-relaxed bg-black/25 p-2.5 rounded-sm border border-[#44403c]">
                    {selectedTile.terrain === 'PLAINS'
                      ? 'Vùng đồng bằng bằng phẳng, màu mỡ và hoàn toàn trống trải trên Bản Đồ Thế Giới 50×50. Bạn có thể bấm nút "Tạo Vương Quốc" ở thẻ trên để đặt Vương Quốc tại tọa độ này.'
                      : selectedTile.terrain === 'MINE'
                        ? `Khu mỏ tài nguyên tự nhiên giàu trữ lượng (${selectedTile.labelVi}) trên Bản Đồ Thế Giới.`
                        : `Địa hình tự nhiên (${selectedTile.labelVi}) đồng bộ chung trên toàn Bản Đồ Thế Giới 50×50.`}
                  </p>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* ============================================================================
          MODAL DANH SÁCH SỰ KIỆN THẾ GIỚI ("SỰ KIỆN" - 4 BANNER TO DÀI)
         ============================================================================ */}
      {showEventsModal &&
        (() => {
          const WORLD_EVENTS_LIST = [
            {
              id: 'tower_defense_collapsing_world',
              name: 'Thủ thành - Thế giới sụp đổ',
              subtitle: 'Tử Chiến Bảo Vệ Thành Trì Trước Làn Sóng Hư Không',
              desc: 'Cố thủ tường thành Hoàng Gia trước những đợt tấn công dồn dập không ngừng nghỉ từ khe nứt thế giới.',
              bannerGradient:
                'from-[#450a0a] via-[#7f1d1d] to-[#1c1008] border-[#ef4444]',
              accentColor: 'text-[#fca5a5]',
              icon: <Shield className="w-8 h-8 text-[#f87171]" />,
            },
            {
              id: 'expedition_endless_world',
              name: 'Viễn chinh - Thế giới vô tận',
              subtitle: 'Hành Quân Xuyên Lục Địa Vượt Vạn Dặm Bí Ẩn',
              desc: 'Dẫn dắt đại quân viễn chinh tiến sâu vào những vùng đất vô tận chưa từng có dấu chân người.',
              bannerGradient:
                'from-[#0f291e] via-[#14532d] to-[#1c1008] border-[#4ade80]',
              accentColor: 'text-[#86efac]',
              icon: <Compass className="w-8 h-8 text-[#4ade80]" />,
            },
            {
              id: 'alliance_eternal_world',
              name: 'Liên minh: Thế giới vĩnh hằng',
              subtitle: 'Quần Hùng Hội Tụ · Đại Chiến Liên Minh Lãnh Thổ',
              desc: 'Sát cánh cùng các Vương Quốc đồng minh công phá pháo đài cổ đại và tranh đoạt thánh địa vĩnh hằng.',
              bannerGradient:
                'from-[#1e1b4b] via-[#312e81] to-[#1c1008] border-[#818cf8]',
              accentColor: 'text-[#c7d2fe]',
              icon: <Crown className="w-8 h-8 text-[#fde047]" />,
            },
            {
              id: 'pvp_realtime',
              name: 'PvP Realtime',
              subtitle: 'Đấu Trường Trực Tuyến Thời Gian Thực 1vs1',
              desc: 'Điều khiển quân đội đối đầu trực tiếp thời gian thực cùng người chơi khác trên chiến trường.',
              bannerGradient:
                'from-[#3b0764] via-[#581c87] to-[#1c1008] border-[#c084fc]',
              accentColor: 'text-[#e9d5ff]',
              icon: <Swords className="w-8 h-8 text-[#c084fc]" />,
            },
          ];

          return (
            <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-3 md:p-5 select-none">
              <div className="w-[1040px] max-w-[96vw] h-[660px] max-h-[92vh] shrink-0 wood-panel border-2 border-[#fbbf24] rounded-md flex flex-col overflow-hidden shadow-2xl">
                {/* Header bảng Sự Kiện */}
                <div className="px-4 py-3 bg-[#140c07] border-b-2 border-[#784b2a] flex items-center justify-between gap-3 shrink-0">
                  <div className="flex items-center gap-2.5">
                    <Sparkles className="w-5 h-5 text-[#fde047]" />
                    <span className="font-medieval font-bold text-base md:text-lg text-[#fde047] uppercase tracking-wider">
                      Bảng Sự Kiện Thế Giới
                    </span>
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-black/60 border border-[#fbbf24]/50 text-[#86efac]">
                      {WORLD_EVENTS_LIST.length} Sự Kiện
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      soundFX.playSelect();
                      setShowEventsModal(false);
                    }}
                    className="wood-button px-3 py-1 rounded-sm text-xs font-bold text-[#fca5a5] flex items-center gap-1 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                    <span>Đóng</span>
                  </button>
                </div>

                {/* Thông báo khi bấm Tham gia sự kiện (Tạm thời chưa thiết kế 4 sự kiện này) */}
                {eventJoinNotice && (
                  <div className="mx-4 mt-3 px-3 py-2 rounded-sm bg-[#2c1a0e] border border-[#fbbf24] text-xs text-[#fde047] font-bold flex items-center justify-between gap-2 shrink-0">
                    <span>{eventJoinNotice}</span>
                    <button
                      type="button"
                      onClick={() => setEventJoinNotice(null)}
                      className="text-[10px] font-mono text-[#fca5a5] cursor-pointer shrink-0"
                    >
                      [Đóng]
                    </button>
                  </div>
                )}

                {/* Danh sách các Sự Kiện dưới dạng Banner to dài */}
                <div className="p-4 flex-1 min-h-0 overflow-y-auto flex flex-col gap-3.5">
                  {WORLD_EVENTS_LIST.map((ev) => (
                    <div
                      key={ev.id}
                      className={`w-full min-h-[124px] shrink-0 rounded-sm border-2 bg-gradient-to-r ${ev.bannerGradient} relative overflow-hidden p-4 flex items-center justify-between gap-4 shadow-xl`}
                    >
                      {/* Góc phải phía trên banner: Tên Event, nền đen chữ vàng */}
                      <div className="absolute top-0 right-0 z-20 bg-black text-[#fde047] font-bold text-xs md:text-sm px-3.5 py-1 border-b-2 border-l-2 border-[#fbbf24] shadow-md">
                        {ev.name}
                      </div>

                      {/* Nội dung bên trái Banner */}
                      <div className="flex items-center gap-3.5 min-w-0 flex-1 pr-4">
                        <div className="w-14 h-14 rounded-sm bg-black/55 border-2 border-[#fbbf24]/80 flex items-center justify-center shrink-0 shadow-inner">
                          {ev.icon}
                        </div>
                        <div className="flex flex-col gap-1 min-w-0">
                          <div
                            className={`font-bold text-xs md:text-sm ${ev.accentColor} truncate`}
                          >
                            {ev.subtitle}
                          </div>
                          <p className="text-xs text-[#f5e6d3] leading-relaxed line-clamp-2">
                            {ev.desc}
                          </p>
                        </div>
                      </div>

                      {/* Nút Tham Gia bên phải */}
                      <div className="shrink-0 pt-5">
                        <button
                          type="button"
                          onClick={() => {
                            soundFX.playSelect();
                            setEventJoinNotice(
                              `Sự kiện "${ev.name}" đang được chuẩn bị thiết kế và sẽ sớm ra mắt!`
                            );
                          }}
                          className="gold-button px-5 py-2.5 rounded-sm font-bold text-xs md:text-sm text-[#1c1008] flex items-center gap-1.5 cursor-pointer shadow-lg"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Tham gia</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}

      {/* ============================================================================
          MODAL CHẾ ĐỘ POMODORO (75% TRỌNG TÂM PHẦN THƯỞNG TOÀN GAME) & MÀN HÌNH FOCUS
          Dùng chung 1 bộ code duy nhất cho cả trong Game và chế độ đường dẫn riêng (?mode=pomodoro)
         ============================================================================ */}
      {(showPomodoroModal || isPomodoroStandaloneMode) &&
        (() => {
          const activePomodoroKingdom =
            account.kingdoms[selectedPomodoroKingdomId] ||
            kingdomsList[0] ||
            null;
          const previewSessionReward =
            buildSessionRewardPayload(selectedDurationMin);
          const runningUnitMeta =
            RUNNING_UNITS_META.find((u) => u.id === runningUnitStyle) ||
            RUNNING_UNITS_META[0];

          const formatTimerClock = (totalSec: number): string => {
            const hrs = Math.floor(totalSec / 3600);
            const mins = Math.floor((totalSec % 3600) / 60);
            const secs = totalSec % 60;
            if (hrs > 0) {
              return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(
                2,
                '0'
              )}:${String(secs).padStart(2, '0')}`;
            }
            return `${String(mins).padStart(2, '0')}:${String(secs).padStart(
              2,
              '0'
            )}`;
          };

          // Danh sách Nhiệm Vụ Ngày / Tuần / Tháng & Thành Tích
          const questsAndAchievements: Array<{
            id: string;
            category: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ACHIEVEMENTS';
            title: string;
            desc: string;
            current: number;
            target: number;
            unitLabel: string;
            reward: PomodoroRewardPayload;
          }> = [
            // NHIỆM VỤ NGÀY
            {
              id: 'daily_1_session',
              category: 'DAILY',
              title: 'Khởi Động Ngày Mới',
              desc: 'Hoàn thành 1 phiên tập trung Pomodoro bất kỳ trong ngày.',
              current: pomodoroProgress.dailySessions,
              target: 1,
              unitLabel: 'phiên',
              reward: {
                gold: 3000,
                diamonds: 80,
                food: 800,
                wood: 800,
                stone: 800,
                kingdomExp: 60,
                kingdomItems: [
                  { blueprint: HERO_EXP_POTION_BLUEPRINTS[1], quantity: 1 },
                ],
                manorItems: [
                  { blueprint: MANOR_ITEM_BLUEPRINTS[0], quantity: 2 },
                ],
                summaryLabel:
                  'Nhiệm Vụ Ngày (Khởi Động Ngày Mới): +3.000 Vàng, +80 Kim Cương, Bình EXP Nhỏ, Hàng Rào Điền Viên x2',
              },
            },
            {
              id: 'daily_25_min',
              category: 'DAILY',
              title: 'Tập Trung Cao Độ (25 Phút/Ngày)',
              desc: 'Tích lũy 25 phút tập trung làm việc ngoài đời trong ngày hôm nay.',
              current: pomodoroProgress.dailyMinutes,
              target: 25,
              unitLabel: 'phút',
              reward: {
                gold: 8500,
                diamonds: 200,
                food: 2000,
                wood: 2000,
                stone: 2000,
                kingdomExp: 150,
                kingdomItems: [
                  {
                    blueprint: UNIT_SUMMON_CARD_BLUEPRINTS.SOLDIER_MELEE,
                    quantity: 1,
                  },
                  {
                    blueprint: UNIT_SUMMON_CARD_BLUEPRINTS.SOLDIER_RANGED,
                    quantity: 1,
                  },
                ],
                manorItems: [
                  { blueprint: MANOR_ITEM_BLUEPRINTS[1], quantity: 2 },
                ],
                summaryLabel:
                  'Nhiệm Vụ Ngày (25 Phút): +8.500 Vàng, +200 Kim Cương, Thẻ Cấm Vệ Quân, Thẻ Cung Thủ, Luống Hoa Trang Viên x2',
              },
            },
            {
              id: 'daily_60_min',
              category: 'DAILY',
              title: 'Chiến Thần Năng Suất (60 Phút/Ngày)',
              desc: 'Tích lũy 60 phút tập trung Pomodoro trong ngày để nhận công trình & trang trí hiếm.',
              current: pomodoroProgress.dailyMinutes,
              target: 60,
              unitLabel: 'phút',
              reward: {
                gold: 20000,
                diamonds: 500,
                food: 5000,
                wood: 5000,
                stone: 5000,
                kingdomExp: 350,
                kingdomItems: [
                  { blueprint: HERO_EXP_POTION_BLUEPRINTS[3], quantity: 1 },
                  {
                    blueprint: {
                      id: 'item-town-hall',
                      itemDomain: 'KINGDOM',
                      rarity: 'WHITE',
                      actionType: 'BUILD_BLUEPRINT',
                      buildingType: 'TOWN_HALL',
                      portraitKind: 'TOWN_HALL',
                      ...BUILDING_BLUEPRINTS.TOWN_HALL,
                    },
                    quantity: 2,
                  },
                ],
                manorItems: [
                  { blueprint: MANOR_ITEM_BLUEPRINTS[2], quantity: 1 },
                ],
                summaryLabel:
                  'Nhiệm Vụ Ngày (60 Phút): +20.000 Vàng, +500 Kim Cương, Đài Phun Nước Đá Cổ, Nhà Dân x2, Bình EXP Lớn',
              },
            },

            // NHIỆM VỤ TUẦN
            {
              id: 'weekly_5_sessions',
              category: 'WEEKLY',
              title: 'Nhịp Độ Bền Bỉ (5 Phiên/Tuần)',
              desc: 'Hoàn thành 5 phiên tập trung Pomodoro trong tuần này.',
              current: pomodoroProgress.weeklySessions,
              target: 5,
              unitLabel: 'phiên',
              reward: {
                gold: 30000,
                diamonds: 800,
                food: 8000,
                wood: 8000,
                stone: 8000,
                kingdomExp: 500,
                kingdomItems: [
                  {
                    blueprint: UNIT_SUMMON_CARD_BLUEPRINTS.SOLDIER_MELEE,
                    quantity: 3,
                  },
                  {
                    blueprint: UNIT_SUMMON_CARD_BLUEPRINTS.SOLDIER_RANGED,
                    quantity: 3,
                  },
                ],
                manorItems: [
                  { blueprint: MANOR_ITEM_BLUEPRINTS[3], quantity: 1 },
                ],
                summaryLabel:
                  'Nhiệm Vụ Tuần (5 Phiên): +30.000 Vàng, +800 Kim Cương, Bãi Chăn Hươu Sao Linh Thú, 6 Thẻ Chiêu Mộ Quân',
              },
            },
            {
              id: 'weekly_180_min',
              category: 'WEEKLY',
              title: 'Kỷ Luật Thép (180 Phút/Tuần)',
              desc: 'Tích lũy 180 phút tập trung trong tuần để mở rộng Vương Quốc & Trang Viên.',
              current: pomodoroProgress.weeklyMinutes,
              target: 180,
              unitLabel: 'phút',
              reward: {
                gold: 55000,
                diamonds: 1500,
                food: 15000,
                wood: 15000,
                stone: 15000,
                kingdomExp: 900,
                kingdomItems: [
                  { blueprint: HERO_EXP_POTION_BLUEPRINTS[4], quantity: 2 },
                  {
                    blueprint: {
                      id: 'item-farm',
                      itemDomain: 'KINGDOM',
                      rarity: 'GREEN',
                      actionType: 'BUILD_BLUEPRINT',
                      buildingType: 'FARM',
                      portraitKind: 'FARM',
                      ...BUILDING_BLUEPRINTS.FARM,
                    },
                    quantity: 4,
                  },
                ],
                manorItems: [
                  { blueprint: MANOR_ITEM_BLUEPRINTS[3], quantity: 2 },
                  { blueprint: MANOR_ITEM_BLUEPRINTS[2], quantity: 2 },
                ],
                summaryLabel:
                  'Nhiệm Vụ Tuần (180 Phút): +55.000 Vàng, +1.500 Kim Cương, Ruộng Lúa x4, Hươu Sao x2, Bình EXP Đại x2',
              },
            },
            {
              id: 'weekly_deep_work',
              category: 'WEEKLY',
              title: 'Đại Chiến Dịch Sâu (Phiên 60+ Phút)',
              desc: 'Hoàn thành ít nhất 1 phiên Pomodoro 60 phút hoặc 120 phút trong tuần.',
              current: pomodoroProgress.weeklyHas60Plus ? 1 : 0,
              target: 1,
              unitLabel: 'lần',
              reward: {
                gold: 40000,
                diamonds: 1000,
                kingdomExp: 600,
                kingdomItems: [
                  { blueprint: HERO_EXP_POTION_BLUEPRINTS[4], quantity: 1 },
                ],
                manorItems: [
                  { blueprint: MANOR_ITEM_BLUEPRINTS[4], quantity: 1 },
                ],
                summaryLabel:
                  'Nhiệm Vụ Tuần (Phiên 60+ Phút): +40.000 Vàng, +1.000 Kim Cương, Tượng Kỳ Lân Hoàng Kim, Bình EXP Đại',
              },
            },

            // NHIỆM VỤ THÁNG
            {
              id: 'monthly_15_sessions',
              category: 'MONTHLY',
              title: 'Chinh Phạt Tháng (15 Phiên/Tháng)',
              desc: 'Hoàn thành 15 phiên tập trung Pomodoro trong tháng để nhận đại lễ vật Vương Quốc.',
              current: pomodoroProgress.monthlySessions,
              target: 15,
              unitLabel: 'phiên',
              reward: {
                gold: 95000,
                diamonds: 3000,
                food: 25000,
                wood: 25000,
                stone: 25000,
                kingdomExp: 1800,
                kingdomItems: [
                  {
                    blueprint: {
                      id: 'item-barracks',
                      itemDomain: 'KINGDOM',
                      rarity: 'BLUE',
                      actionType: 'BUILD_BLUEPRINT',
                      buildingType: 'BARRACKS',
                      portraitKind: 'BARRACKS',
                      ...BUILDING_BLUEPRINTS.BARRACKS,
                    },
                    quantity: 1,
                  },
                  {
                    blueprint: {
                      id: 'item-manor',
                      itemDomain: 'KINGDOM',
                      rarity: 'PURPLE',
                      actionType: 'BUILD_BLUEPRINT',
                      buildingType: 'MANOR',
                      portraitKind: 'MANOR',
                      ...BUILDING_BLUEPRINTS.MANOR,
                    },
                    quantity: 1,
                  },
                  { blueprint: HERO_EXP_POTION_BLUEPRINTS[4], quantity: 3 },
                ],
                manorItems: [
                  { blueprint: MANOR_ITEM_BLUEPRINTS[4], quantity: 1 },
                  { blueprint: MANOR_ITEM_BLUEPRINTS[3], quantity: 2 },
                ],
                summaryLabel:
                  'Nhiệm Vụ Tháng (15 Phiên): +95.000 Vàng, +3.000 Kim Cương, Công Trình Trại Lính & Trang Viên, Tượng Kỳ Lân',
              },
            },
            {
              id: 'monthly_600_min',
              category: 'MONTHLY',
              title: 'Đế Chế Thịnh Vượng (600 Phút/Tháng)',
              desc: 'Tích lũy 600 phút (10 giờ) tập trung trong tháng để sưu tầm trọn bộ bảo vật Hoàng Gia.',
              current: pomodoroProgress.monthlyMinutes,
              target: 600,
              unitLabel: 'phút',
              reward: {
                gold: 200000,
                diamonds: 6000,
                food: 50000,
                wood: 50000,
                stone: 50000,
                kingdomExp: 3500,
                kingdomItems: [
                  {
                    blueprint: UNIT_SUMMON_CARD_BLUEPRINTS.HERO_FAREL,
                    quantity: 1,
                  },
                  {
                    blueprint: UNIT_SUMMON_CARD_BLUEPRINTS.SOLDIER_MELEE,
                    quantity: 5,
                  },
                  {
                    blueprint: UNIT_SUMMON_CARD_BLUEPRINTS.SOLDIER_RANGED,
                    quantity: 5,
                  },
                  { blueprint: HERO_EXP_POTION_BLUEPRINTS[4], quantity: 5 },
                ],
                manorItems: [
                  { blueprint: MANOR_ITEM_BLUEPRINTS[4], quantity: 2 },
                  { blueprint: MANOR_ITEM_BLUEPRINTS[3], quantity: 2 },
                  { blueprint: MANOR_ITEM_BLUEPRINTS[2], quantity: 2 },
                ],
                summaryLabel:
                  'Nhiệm Vụ Tháng (600 Phút): +200.000 Vàng, +6.000 Kim Cương, Thẻ Anh Hùng Farel, 10 Thẻ Quân Đội, Bảo vật Trang Viên',
              },
            },

            // THÀNH TÍCH VĨNH VIỄN
            {
              id: 'ach_first_focus',
              category: 'ACHIEVEMENTS',
              title: 'Bước Chân Tập Trung Đầu Tiên',
              desc: 'Hoàn thành phiên tập trung Pomodoro đầu tiên trong sự nghiệp.',
              current: pomodoroProgress.totalSessions,
              target: 1,
              unitLabel: 'phiên',
              reward: {
                gold: 6000,
                diamonds: 250,
                kingdomExp: 120,
                kingdomItems: [
                  { blueprint: HERO_EXP_POTION_BLUEPRINTS[2], quantity: 1 },
                ],
                manorItems: [
                  { blueprint: MANOR_ITEM_BLUEPRINTS[0], quantity: 2 },
                  { blueprint: MANOR_ITEM_BLUEPRINTS[1], quantity: 2 },
                ],
                summaryLabel:
                  'Thành Tích (Bước Chân Đầu Tiên): +6.000 Vàng, +250 Kim Cương, Bộ Trang Trí Điền Viên & Bình EXP Vừa',
              },
            },
            {
              id: 'ach_120_total_min',
              category: 'ACHIEVEMENTS',
              title: 'Chiến Binh Kỷ Luật (Tổng 120 Phút)',
              desc: 'Đạt tổng cộng 120 phút tập trung làm việc qua chế độ Pomodoro.',
              current: pomodoroProgress.totalMinutes,
              target: 120,
              unitLabel: 'phút',
              reward: {
                gold: 35000,
                diamonds: 1000,
                kingdomExp: 600,
                kingdomItems: [
                  {
                    blueprint: UNIT_SUMMON_CARD_BLUEPRINTS.SOLDIER_MELEE,
                    quantity: 3,
                  },
                  {
                    blueprint: UNIT_SUMMON_CARD_BLUEPRINTS.SOLDIER_RANGED,
                    quantity: 3,
                  },
                ],
                manorItems: [
                  { blueprint: MANOR_ITEM_BLUEPRINTS[2], quantity: 2 },
                ],
                summaryLabel:
                  'Thành Tích (Tổng 120 Phút): +35.000 Vàng, +1.000 Kim Cương, Đài Phun Nước Đá Cổ x2, 6 Thẻ Quân Đội',
              },
            },
            {
              id: 'ach_single_120',
              category: 'ACHIEVEMENTS',
              title: 'Đại Thống Soái Tập Trung (Phiên 120 Phút)',
              desc: 'Hoàn thành thành công 1 phiên đại tập trung kéo dài 120 phút.',
              current: pomodoroProgress.maxSingleSession >= 120 ? 120 : pomodoroProgress.maxSingleSession,
              target: 120,
              unitLabel: 'phút/phiên',
              reward: {
                gold: 65000,
                diamonds: 1800,
                kingdomExp: 1200,
                kingdomItems: [
                  { blueprint: HERO_EXP_POTION_BLUEPRINTS[4], quantity: 3 },
                ],
                manorItems: [
                  { blueprint: MANOR_ITEM_BLUEPRINTS[4], quantity: 1 },
                  { blueprint: MANOR_ITEM_BLUEPRINTS[3], quantity: 1 },
                ],
                summaryLabel:
                  'Thành Tích (Phiên 120 Phút): +65.000 Vàng, +1.800 Kim Cương, Tượng Kỳ Lân Hoàng Kim, Hươu Sao, Bình EXP Đại x3',
              },
            },
            {
              id: 'ach_1000_total_min',
              category: 'ACHIEVEMENTS',
              title: 'Huyền Thoại Đế Chế Pomodoro (1.000 Phút)',
              desc: 'Đạt cột mốc 1.000 phút tập trung để khẳng định vị thế bá chủ lục địa Pomodoro.',
              current: pomodoroProgress.totalMinutes,
              target: 1000,
              unitLabel: 'phút',
              reward: {
                gold: 300000,
                diamonds: 10000,
                food: 80000,
                wood: 80000,
                stone: 80000,
                kingdomExp: 5000,
                kingdomItems: [
                  {
                    blueprint: UNIT_SUMMON_CARD_BLUEPRINTS.HERO_FAREL,
                    quantity: 1,
                  },
                  { blueprint: HERO_EXP_POTION_BLUEPRINTS[4], quantity: 5 },
                ],
                manorItems: [
                  { blueprint: MANOR_ITEM_BLUEPRINTS[4], quantity: 3 },
                  { blueprint: MANOR_ITEM_BLUEPRINTS[3], quantity: 3 },
                ],
                summaryLabel:
                  'Thành Tích Huyền Thoại (1.000 Phút): +300.000 Vàng, +10.000 Kim Cương, Tượng Kỳ Lân x3, Bình EXP Đại x5',
              },
            },
          ];

          const handleClaimQuestOrAchievement = (
            qItem: (typeof questsAndAchievements)[number]
          ) => {
            if (!activePomodoroKingdom) {
              soundFX.playError();
              setLastPomodoroRewardNotice(
                'Bạn cần tạo ít nhất 1 Vương Quốc trên Bản Đồ Thế Giới để nhận thưởng!'
              );
              return;
            }
            if (
              qItem.current < qItem.target ||
              pomodoroProgress.claimedIds.includes(qItem.id)
            ) {
              return;
            }
            onGrantPomodoroReward(activePomodoroKingdom.id, qItem.reward);
            savePomodoroProgressState((prev) => ({
              ...prev,
              claimedIds: [...prev.claimedIds, qItem.id],
            }));
            soundFX.playPomodoroComplete();
            const claimMsg = `Đã nhận thưởng [${qItem.title}] về Vương Quốc [${activePomodoroKingdom.name}]!`;
            setLastPomodoroRewardNotice(claimMsg);
            setStatusBanner(claimMsg);
          };

          const claimableCount = questsAndAchievements.filter(
            (q) =>
              q.current >= q.target &&
              !pomodoroProgress.claimedIds.includes(q.id)
          ).length;

          const currDurIdx = Math.max(
            0,
            POMODORO_DURATION_OPTIONS.indexOf(selectedDurationMin)
          );
          const prevDurMin =
            POMODORO_DURATION_OPTIONS[
              (currDurIdx - 1 + POMODORO_DURATION_OPTIONS.length) %
                POMODORO_DURATION_OPTIONS.length
            ];
          const nextDurMin =
            POMODORO_DURATION_OPTIONS[
              (currDurIdx + 1) % POMODORO_DURATION_OPTIONS.length
            ];

          return (
            <div className="fixed inset-0 z-50 bg-black/82 flex items-center justify-center p-3 md:p-5 select-none">
              {isFocusScreenActive ? (
                /* ==============================================================
                   MÀN HÌNH FOCUS TỐI GIẢN: ĐỒNG HỒ ĐẾM NGƯỢC + 1 QUÂN ĐỘI CHẠY
                   ============================================================== */
                <div className="w-full max-w-xl wood-panel border-2 border-[#fbbf24] rounded-md p-5 flex flex-col items-center gap-4 shadow-2xl relative">
                  <div className="w-full flex items-center justify-between border-b border-[#784b2a] pb-2">
                    <div className="flex items-center gap-2">
                      <Timer className="w-4 h-4 text-[#fde047]" />
                      <span className="font-medieval font-bold text-sm md:text-base text-[#fde047]">
                        FOCUS POMODORO ({selectedDurationMin} PHÚT)
                      </span>
                    </div>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#1c1008] border border-[#fbbf24] text-[#4ade80]">
                      {activePomodoroKingdom
                        ? activePomodoroKingdom.name
                        : 'Chưa chọn'}
                    </span>
                  </div>

                  {/* Đồng hồ đếm ngược cỡ lớn */}
                  <div className="font-mono font-extrabold text-5xl md:text-6xl tracking-widest text-[#fde047] drop-shadow-[0_3px_0_rgba(0,0,0,0.9)] tabular-nums py-1">
                    {formatTimerClock(remainingSeconds)}
                  </div>

                  {/* Khung hình 1 đơn vị quân đội ngẫu nhiên đang chạy (2D Pixel 8-bit) */}
                  <div className="w-full max-w-md border-2 border-[#784b2a] rounded-sm overflow-hidden bg-[#120b1d] shadow-inner relative">
                    <canvas
                      ref={focusCanvasRef}
                      width={360}
                      height={140}
                      className="w-full h-[140px] block"
                      style={{ imageRendering: 'pixelated' }}
                    />
                    <div className="absolute top-2 left-2.5 bg-black/65 border border-[#fbbf24]/50 px-2 py-0.5 rounded-xs text-[10px] font-mono text-[#fde047]">
                      {runningUnitMeta.name}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        soundFX.playSelect();
                        const currIdx = RUNNING_UNITS_META.findIndex(
                          (u) => u.id === runningUnitStyle
                        );
                        const nextUnit =
                          RUNNING_UNITS_META[
                            (currIdx + 1) % RUNNING_UNITS_META.length
                          ];
                        setRunningUnitStyle(nextUnit.id);
                      }}
                      className="absolute top-2 right-2.5 bg-[#2c1a0e]/90 hover:bg-[#451a03] border border-[#fbbf24] px-2 py-0.5 rounded-xs text-[10px] font-mono text-[#fde047] cursor-pointer"
                    >
                      Đổi quân
                    </button>
                  </div>

                  {/* Phần thưởng đang chờ khi hoàn thành phiên */}
                  <div className="w-full cobble-stat-box rounded-sm py-2 px-3 text-center text-xs border border-[#784b2a] flex items-center justify-center gap-3 font-mono">
                    <span className="text-[#d6c7b2]">Thưởng hoàn thành:</span>
                    <span className="text-[#fde047] font-bold">
                      +{formatNumberDot(previewSessionReward.gold || 0)} Vàng
                    </span>
                    <span className="text-[#38bdf8] font-bold">
                      +{formatNumberDot(previewSessionReward.diamonds || 0)} Kim Cương
                    </span>
                  </div>

                  {/* Nút điều khiển trên màn hình Focus */}
                  <div className="flex flex-wrap items-center justify-center gap-2.5 w-full">
                    <button
                      type="button"
                      onClick={() => {
                        soundFX.playSelect();
                        setIsFocusPaused((p) => !p);
                      }}
                      className="wood-button px-4 py-2 rounded-sm font-bold text-xs text-[#fde047] flex items-center gap-1.5 cursor-pointer"
                    >
                      {isFocusPaused ? (
                        <>
                          <Play className="w-4 h-4 text-[#4ade80]" />
                          <span>Tiếp Tục</span>
                        </>
                      ) : (
                        <>
                          <Pause className="w-4 h-4 text-[#fde047]" />
                          <span>Tạm Dừng</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleCompletePomodoroSession(selectedDurationMin)
                      }
                      className="gold-button px-4 py-2 rounded-sm font-bold text-xs text-[#1c1008] flex items-center gap-1.5 cursor-pointer shadow-md"
                    >
                      <FastForward className="w-4 h-4" />
                      <span>Hoàn Thành Ngay</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        soundFX.playError();
                        setIsFocusScreenActive(false);
                        setIsFocusPaused(false);
                      }}
                      className="wood-button px-4 py-2 rounded-sm font-bold text-xs text-[#fca5a5] flex items-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Hủy</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* ==============================================================
                   GIAO DIỆN POMODORO TỐI GIẢN 4 HÀNG:
                   - Hàng 1: Chọn Vương Quốc tham gia
                   - Hàng 2: 2 Nút [Cuộn dọc Slot chọn phút] + [Bắt Đầu]
                   - Hàng 3: Mô tả phần thưởng (Chỉ Vàng + ít Kim Cương, Item ở Nhiệm Vụ)
                   - Hàng 4: Nhiệm vụ dời xuống cuối cùng
                   ============================================================== */
                <div className="w-full max-w-2xl max-h-[90vh] wood-panel border-2 border-[#fbbf24] rounded-md flex flex-col overflow-hidden shadow-2xl p-4 gap-3">
                  {/* HÀNG 1: Chọn Vương Quốc tham gia + Số dư Vàng/Kim Cương + Chuyển chế độ URL riêng (?mode=pomodoro) / Đóng */}
                  <div className="flex flex-col gap-2 bg-[#1c1008] border border-[#784b2a] rounded-sm px-3 py-2 shrink-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                        <Castle className="w-4 h-4 text-[#fde047] shrink-0" />
                        <span className="text-xs font-bold text-[#fde047] shrink-0">
                          Vương Quốc:
                        </span>
                        {kingdomsList.length === 0 ? (
                          <button
                            type="button"
                            onClick={() => {
                              setPomodoroStandaloneUrl(false);
                              setIsPomodoroStandaloneMode(false);
                              setShowPomodoroModal(false);
                              setIsPlacingKingdom(true);
                            }}
                            className="gold-button px-2.5 py-1 rounded-xs font-bold text-xs text-[#1c1008] cursor-pointer"
                          >
                            + Tạo Vương Quốc Trên Bản Đồ
                          </button>
                        ) : (
                          <select
                            value={
                              activePomodoroKingdom
                                ? activePomodoroKingdom.id
                                : ''
                            }
                            onChange={(e) =>
                              setSelectedPomodoroKingdomId(e.target.value)
                            }
                            className="flex-1 min-w-0 bg-[#140c07] border border-[#fbbf24] rounded-xs px-2.5 py-1 text-xs font-bold text-[#fde047] outline-none cursor-pointer truncate"
                          >
                            {kingdomsList.map((k) => (
                              <option key={k.id} value={k.id}>
                                {k.name} ({k.worldX}, {k.worldY}) — Lv.
                                {String(k.kingdomLevel).padStart(2, '0')}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isPomodoroStandaloneMode ? (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                soundFX.playSelect();
                                setPomodoroStandaloneUrl(false);
                                setIsPomodoroStandaloneMode(false);
                                setShowPomodoroModal(false);
                              }}
                              className="wood-button px-2.5 py-1 rounded-xs text-[11px] font-bold text-[#fde047] flex items-center gap-1 cursor-pointer"
                              title="Chuyển sang giao diện Bản Đồ Thế Giới 50x50 đầy đủ"
                            >
                              <Globe className="w-3.5 h-3.5 text-[#38bdf8]" />
                              <span>Mở Bản Đồ Game</span>
                            </button>
                            <button
                              type="button"
                              onClick={onLogout}
                              className="wood-button px-2.5 py-1 rounded-xs text-[11px] font-bold text-[#fca5a5] flex items-center gap-1 cursor-pointer"
                              title="Đăng xuất tài khoản"
                            >
                              <LogOut className="w-3.5 h-3.5" />
                              <span>Đăng Xuất</span>
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                soundFX.playSelect();
                                setPomodoroStandaloneUrl(true);
                                setIsPomodoroStandaloneMode(true);
                                setLastPomodoroRewardNotice(
                                  'Đã bật chế độ đường dẫn riêng (?mode=pomodoro)! Bạn có thể đánh dấu (Bookmark) URL hiện tại để mở nhanh Pomodoro.'
                                );
                              }}
                              className="wood-button px-2.5 py-1 rounded-xs text-[11px] font-bold text-[#86efac] flex items-center gap-1 cursor-pointer"
                              title="Chuyển sang đường dẫn riêng ?mode=pomodoro (tắt nền Bản Đồ để nhẹ máy)"
                            >
                              <Timer className="w-3.5 h-3.5 text-[#4ade80]" />
                              <span>Chế Độ Web Riêng (?mode=pomodoro)</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowPomodoroModal(false)}
                              className="wood-button px-2.5 py-1 rounded-xs text-xs font-bold text-[#fca5a5] flex items-center gap-1 cursor-pointer shrink-0"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Đóng</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Thanh hiển thị trực quan số dư Vàng, Kim Cương của Vương Quốc đang chọn & Trạng thái đồng bộ Cloud */}
                    <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-[#784b2a]/60 text-[11px] font-mono flex-wrap">
                      <div className="flex items-center gap-3">
                        <span className="text-[#d6c7b2]">
                          TK: <strong className="text-[#fde047]">{account.username}</strong>
                        </span>
                        {activePomodoroKingdom && (
                          <>
                            <span className="flex items-center gap-1 text-[#fde047] font-bold">
                              <Coins className="w-3.5 h-3.5 text-[#fbbf24]" />
                              <span>
                                {formatNumberDot(activePomodoroKingdom.resources.gold)} Vàng
                              </span>
                            </span>
                            <span className="flex items-center gap-1 text-[#38bdf8] font-bold">
                              <Gem className="w-3.5 h-3.5 text-[#38bdf8]" />
                              <span>
                                {formatNumberDot(activePomodoroKingdom.resources.diamonds)} KC
                              </span>
                            </span>
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`px-1.5 py-0.5 rounded-xs border text-[10px] font-bold ${
                            currentAuthUid
                              ? 'bg-[#0c2d48] border-[#38bdf8] text-[#7dd3fc]'
                              : 'bg-[#2c1a0e] border-[#784b2a] text-[#d6c7b2]'
                          }`}
                        >
                          {currentAuthUid ? '☁ Cloud Online Sync' : '💾 Local Save'}
                        </span>
                        {isPomodoroStandaloneMode && (
                          <span className="px-1.5 py-0.5 rounded-xs bg-[#14331b] border border-[#4ade80] text-[#86efac] text-[10px] font-bold">
                            URL: ?mode=pomodoro
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {lastPomodoroRewardNotice && (
                    <div className="px-3 py-1.5 bg-[#14331b] border border-[#4ade80] rounded-xs text-xs text-[#bbf7d0] flex items-center justify-between gap-2 shrink-0">
                      <span className="truncate">{lastPomodoroRewardNotice}</span>
                      <button
                        type="button"
                        onClick={() => setLastPomodoroRewardNotice(null)}
                        className="text-[10px] font-mono text-[#86efac] cursor-pointer shrink-0"
                      >
                        [Ẩn]
                      </button>
                    </div>
                  )}

                  {/* HÀNG 2: Gồm 2 nút — Trái: Nút chọn thời gian cuộn dọc (Slot Machine) | Phải: Nút Bắt Đầu */}
                  <div className="grid grid-cols-2 gap-3 shrink-0">
                    {/* Nút 1 (Trái): Cuộn dọc kiểu máy Slot (Đẩy chuột lên/xuống hoặc lăn chuột để chọn số phút) */}
                    <div
                      onWheel={(e) => {
                        e.preventDefault();
                        stepPomodoroDuration(e.deltaY > 0 ? 1 : -1);
                      }}
                      onMouseDown={(e) => {
                        slotDragRef.current = {
                          active: true,
                          startY: e.clientY,
                          accumulatedY: 0,
                        };
                      }}
                      onMouseMove={(e) => {
                        if (!slotDragRef.current.active) return;
                        const dy = e.clientY - slotDragRef.current.startY;
                        const stepThreshold = 20;
                        if (Math.abs(dy) >= stepThreshold) {
                          // Đẩy chuột lên (dy < 0) -> tiến tới mốc phút tiếp theo; kéo xuống (dy > 0) -> lùi về mốc trước
                          const steps =
                            dy < 0
                              ? Math.floor(Math.abs(dy) / stepThreshold)
                              : -Math.floor(Math.abs(dy) / stepThreshold);
                          stepPomodoroDuration(steps);
                          slotDragRef.current.startY = e.clientY;
                        }
                      }}
                      onMouseUp={() => {
                        slotDragRef.current.active = false;
                      }}
                      onMouseLeave={() => {
                        slotDragRef.current.active = false;
                      }}
                      onTouchStart={(e) => {
                        if (e.touches.length > 0) {
                          slotDragRef.current = {
                            active: true,
                            startY: e.touches[0].clientY,
                            accumulatedY: 0,
                          };
                        }
                      }}
                      onTouchMove={(e) => {
                        if (
                          !slotDragRef.current.active ||
                          e.touches.length === 0
                        )
                          return;
                        const dy =
                          e.touches[0].clientY - slotDragRef.current.startY;
                        const stepThreshold = 20;
                        if (Math.abs(dy) >= stepThreshold) {
                          const steps =
                            dy < 0
                              ? Math.floor(Math.abs(dy) / stepThreshold)
                              : -Math.floor(Math.abs(dy) / stepThreshold);
                          stepPomodoroDuration(steps);
                          slotDragRef.current.startY = e.touches[0].clientY;
                        }
                      }}
                      onTouchEnd={() => {
                        slotDragRef.current.active = false;
                      }}
                      className="h-24 bg-[#120a06] border-2 border-[#fbbf24] rounded-sm relative overflow-hidden flex flex-col items-center justify-between py-1 cursor-ns-resize shadow-[inset_0_4px_10px_rgba(0,0,0,0.85)]"
                      title="Giữ chuột đẩy lên / xuống hoặc lăn chuột để cuộn chọn số phút"
                    >
                      {/* Mốc phía trên (Mờ) */}
                      <button
                        type="button"
                        onClick={() => stepPomodoroDuration(-1)}
                        className="w-full text-center font-mono text-[11px] text-[#a8a29e]/55 hover:text-[#d6c7b2] leading-none cursor-pointer"
                      >
                        ▲ {prevDurMin} PHÚT
                      </button>

                      {/* Mốc chính giữa đang chọn (Rực sáng kiểu rãnh máy Slot) */}
                      <div className="w-full bg-gradient-to-r from-[#2c1a0e] via-[#451a03] to-[#2c1a0e] border-y border-[#fbbf24]/80 py-1.5 flex items-center justify-center gap-2 shadow-sm pointer-events-none">
                        <Timer className="w-4 h-4 text-[#fde047]" />
                        <span className="font-mono font-extrabold text-xl md:text-2xl text-[#fde047] tracking-wider tabular-nums">
                          {selectedDurationMin} PHÚT
                        </span>
                      </div>

                      {/* Mốc phía dưới (Mờ) */}
                      <button
                        type="button"
                        onClick={() => stepPomodoroDuration(1)}
                        className="w-full text-center font-mono text-[11px] text-[#a8a29e]/55 hover:text-[#d6c7b2] leading-none cursor-pointer"
                      >
                        ▼ {nextDurMin} PHÚT
                      </button>
                    </div>

                    {/* Nút 2 (Phải): Nút BẮT ĐẦU */}
                    <button
                      type="button"
                      disabled={!activePomodoroKingdom}
                      onClick={() => {
                        if (!activePomodoroKingdom) return;
                        soundFX.playBuild();
                        const randomUnit =
                          RUNNING_UNITS_META[
                            Math.floor(
                              Math.random() * RUNNING_UNITS_META.length
                            )
                          ];
                        setRunningUnitStyle(randomUnit.id);
                        setRemainingSeconds(selectedDurationMin * 60);
                        setIsFocusPaused(false);
                        setIsFocusScreenActive(true);
                      }}
                      className={`h-24 rounded-sm font-medieval font-extrabold text-lg md:text-xl flex items-center justify-center gap-2.5 tracking-wide transition-all ${
                        activePomodoroKingdom
                          ? 'gold-button text-[#1c1008] cursor-pointer shadow-lg'
                          : 'bg-[#44403c] text-[#a8a29e] cursor-not-allowed opacity-60'
                      }`}
                    >
                      <Play className="w-6 h-6 fill-current" />
                      <span>BẮT ĐẦU</span>
                    </button>
                  </div>

                  {/* HÀNG 3: Hiển thị thưởng Vàng, Kim Cương gọn trên 1 dòng (Bỏ mô tả) */}
                  <div className="stone-panel rounded-sm px-3.5 py-2 border border-[#784b2a] flex items-center justify-center gap-3 text-xs font-mono shrink-0">
                    <span className="font-sans font-bold text-[#d6c7b2]">
                      Thưởng:
                    </span>
                    <span className="inline-flex items-center gap-1 font-bold text-[#fde047] bg-black/40 px-2.5 py-0.5 rounded border border-[#fbbf24]/40">
                      <Coins className="w-3.5 h-3.5" />
                      <span>
                        +{formatNumberDot(previewSessionReward.gold || 0)} Vàng
                      </span>
                    </span>
                    <span className="inline-flex items-center gap-1 font-bold text-[#38bdf8] bg-black/40 px-2.5 py-0.5 rounded border border-[#38bdf8]/40">
                      <Gem className="w-3.5 h-3.5" />
                      <span>
                        +{formatNumberDot(previewSessionReward.diamonds || 0)}{' '}
                        Kim Cương
                      </span>
                    </span>
                  </div>

                  {/* HÀNG 4 (CUỐI CÙNG): Nhiệm Vụ cố định khung chứa đúng 3 dòng, nhiều hơn thì cuộn dọc */}
                  <div className="bg-[#160d07] border border-[#784b2a] rounded-sm p-3 flex flex-col gap-2.5 shrink-0">
                    {/* Thanh tiêu đề Nhiệm Vụ & Bộ lọc Ngày / Tuần / Tháng / Thành Tích */}
                    <div className="flex items-center justify-between gap-2 flex-wrap border-b border-[#57534e] pb-2 shrink-0">
                      <div className="flex items-center gap-1.5">
                        {(
                          [
                            { id: 'DAILY', label: 'Ngày' },
                            { id: 'WEEKLY', label: 'Tuần' },
                            { id: 'MONTHLY', label: 'Tháng' },
                            { id: 'ACHIEVEMENTS', label: 'Thành Tích' },
                          ] as const
                        ).map((tab) => {
                          const isActive = pomodoroTab === tab.id;
                          const tabClaimable = questsAndAchievements.filter(
                            (q) =>
                              q.category === tab.id &&
                              q.current >= q.target &&
                              !pomodoroProgress.claimedIds.includes(q.id)
                          ).length;
                          return (
                            <button
                              key={tab.id}
                              type="button"
                              onClick={() => {
                                soundFX.playSelect();
                                setPomodoroTab(tab.id);
                              }}
                              className={`px-2.5 py-1 rounded-xs font-bold text-xs flex items-center gap-1 cursor-pointer transition-all ${
                                isActive
                                  ? 'gold-button text-[#1c1008]'
                                  : 'wood-button text-[#f4e8d1]'
                              }`}
                            >
                              <span>{tab.label}</span>
                              {tabClaimable > 0 && (
                                <span className="px-1 rounded-full bg-[#ef4444] text-white text-[10px] font-mono">
                                  {tabClaimable}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      <div className="text-[11px] font-mono text-[#d6c7b2]">
                        Hôm nay:{' '}
                        <strong className="text-[#4ade80]">
                          {pomodoroProgress.dailyMinutes}p
                        </strong>{' '}
                        · Tổng:{' '}
                        <strong className="text-[#fde047]">
                          {formatNumberDot(pomodoroProgress.totalMinutes)}p
                        </strong>
                      </div>
                    </div>

                    {/* Danh sách Nhiệm Vụ cố định chiều cao chứa đúng 3 dòng (3 * 52px + 2 * 8px = 172px), nhiều hơn sẽ hiện thanh cuộn */}
                    <div className="h-[172px] shrink-0 overflow-y-auto flex flex-col gap-2 pr-1">
                      {questsAndAchievements
                        .filter((q) => q.category === pomodoroTab)
                        .map((q) => {
                          const isClaimed =
                            pomodoroProgress.claimedIds.includes(q.id);
                          const isCompleted = q.current >= q.target;
                          const itemRewardsList = [
                            ...(q.reward.kingdomItems || []).map(
                              (k) => `${k.blueprint.name} x${k.quantity}`
                            ),
                            ...(q.reward.manorItems || []).map(
                              (m) => `${m.blueprint.name} x${m.quantity}`
                            ),
                          ];

                          return (
                            <div
                              key={q.id}
                              className={`h-[52px] shrink-0 px-2.5 rounded-xs border flex items-center justify-between gap-3 ${
                                isClaimed
                                  ? 'bg-black/30 border-[#44403c] opacity-65'
                                  : isCompleted
                                    ? 'bg-[#2c1a0e] border-[#fbbf24]'
                                    : 'bg-[#1c1008]/90 border-[#57534e]'
                              }`}
                            >
                              <div className="flex flex-col justify-center gap-0.5 min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-xs text-[#fde047] truncate">
                                    {q.title}
                                  </span>
                                  <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-black/60 text-white border border-white/15 shrink-0">
                                    {q.current}/{q.target} {q.unitLabel}
                                  </span>
                                </div>
                                <div className="text-[11px] font-mono text-[#86efac] truncate">
                                  +{formatNumberDot(q.reward.gold || 0)} Vàng · +
                                  {formatNumberDot(q.reward.diamonds || 0)} KC
                                  {itemRewardsList.length > 0
                                    ? ` · Item: ${itemRewardsList.join(', ')}`
                                    : ''}
                                </div>
                              </div>

                              <div className="shrink-0">
                                {isClaimed ? (
                                  <span className="px-2.5 py-1 rounded-xs bg-[#14331b] border border-[#4ade80] text-[#86efac] font-bold text-[11px] inline-flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>Đã Nhận</span>
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    disabled={
                                      !isCompleted || !activePomodoroKingdom
                                    }
                                    onClick={() =>
                                      handleClaimQuestOrAchievement(q)
                                    }
                                    className={`px-3 py-1.5 rounded-xs font-bold text-xs flex items-center gap-1 ${
                                      isCompleted && activePomodoroKingdom
                                        ? 'gold-button text-[#1c1008] cursor-pointer shadow-sm'
                                        : 'bg-[#44403c] text-[#a8a29e] cursor-not-allowed opacity-60'
                                    }`}
                                  >
                                    <Gift className="w-3.5 h-3.5" />
                                    <span>Nhận</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

      {/* ============================================================================
          MODAL CHẾ ĐỘ PHÓ BẢN:
          - Dãy 5 Thẻ Phó Bản từ trái sang phải (Unlock thẻ 1: "Đồng Bằng Châu Thổ")
          - Mở thẻ "Đồng Bằng Châu Thổ": Hiển thị 6 Ải từ trái sang phải (Unlock Ải 1)
          - Bấm vào "Ải 1 - Đồng Bằng Châu Thổ": Thực hiện 3 Bước (B1 -> B2 -> B3)
         ============================================================================ */}
      {showDungeonModal &&
        (() => {
          const DUNGEON_CARDS = [
            {
              id: 'delta_plains',
              order: 1,
              name: 'Đồng Bằng Châu Thổ',
              subtitle: 'Vùng Đất Khởi Nguyên',
              levelRange: 'Lv.01 – Lv.10',
              unlocked: true,
              stagesCount: 6,
              desc: 'Vùng đồng bằng phù sa màu mỡ nơi các toán trinh sát Hắc Ám đang lập đồn trại đầu tiên.',
            },
            {
              id: 'primeval_forest',
              order: 2,
              name: 'Rừng Rậm Nguyên Sinh',
              subtitle: 'Cổ Lâm Bí Ẩn',
              levelRange: 'Lv.10 – Lv.20',
              unlocked: false,
              stagesCount: 6,
              desc: 'Sẽ cập nhật thêm về sau — Mở khóa sau khi hoàn thành Đồng Bằng Châu Thổ.',
            },
            {
              id: 'ash_canyon',
              order: 3,
              name: 'Hẻm Núi Đá Xám',
              subtitle: 'Pháo Đài Đá Cổ',
              levelRange: 'Lv.20 – Lv.30',
              unlocked: false,
              stagesCount: 6,
              desc: 'Sẽ cập nhật thêm về sau — Đang khóa.',
            },
            {
              id: 'misty_swamp',
              order: 4,
              name: 'Đầm Lầy Sương Mù',
              subtitle: 'Độc Khí U Minh',
              levelRange: 'Lv.30 – Lv.40',
              unlocked: false,
              stagesCount: 6,
              desc: 'Sẽ cập nhật thêm về sau — Đang khóa.',
            },
            {
              id: 'ancient_volcano',
              order: 5,
              name: 'Đỉnh Núi Lửa Cổ',
              subtitle: 'Lãnh Địa Hỏa Long',
              levelRange: 'Lv.40 – Lv.50',
              unlocked: false,
              stagesCount: 6,
              desc: 'Sẽ cập nhật thêm về sau — Đang khóa.',
            },
          ];

          const activeDungeonKingdom =
            account.kingdoms[selectedDungeonKingdomId] ||
            kingdomsList[0] ||
            null;
          const maxUnlockedDeltaStage = Math.max(
            1,
            activeDungeonKingdom?.unlockedDungeonStages?.delta_plains || 1,
            ...kingdomsList.map(
              (k) => k.unlockedDungeonStages?.delta_plains || 1
            )
          );

          const DELTA_PLAINS_STAGES = [
            {
              stageNumber: 1,
              title: 'Ải 1 - Đồng Bằng Châu Thổ',
              subLabel: 'Tiền Đồn Bờ Sông',
              completed: maxUnlockedDeltaStage > 1,
              unlocked: maxUnlockedDeltaStage === 1,
              enemySummary: '3 Quân Địch Ngẫu Nhiên (Lv.1 · Đứng Canh)',
              rewardSummary: '+250 Vàng · +15 Kim Cương · Rơi Đồ Tạm Thời',
            },
            {
              stageNumber: 2,
              title: 'Ải 2 - Đồng Bằng Châu Thổ',
              subLabel: 'Cánh Đồng Hoang',
              completed: maxUnlockedDeltaStage > 2,
              unlocked: maxUnlockedDeltaStage === 2,
              enemySummary: '5 Quân Địch Ngẫu Nhiên (Lv.2 · Đứng Canh)',
              rewardSummary:
                maxUnlockedDeltaStage >= 2
                  ? '+350 Vàng · +20 Kim Cương · Rơi Đồ Tạm Thời'
                  : 'Mở khóa sau khi vượt Ải 1',
            },
            {
              stageNumber: 3,
              title: 'Ải 3 - Đồng Bằng Châu Thổ',
              subLabel: 'Thảo Nguyên Gió Nhẹ',
              completed: maxUnlockedDeltaStage > 3,
              unlocked: maxUnlockedDeltaStage === 3,
              enemySummary: '7 Quân Địch Ngẫu Nhiên (Lv.3 · Đứng Canh)',
              rewardSummary:
                maxUnlockedDeltaStage >= 3
                  ? '+480 Vàng · +25 Kim Cương · Rơi Đồ Tạm Thời'
                  : 'Mở khóa sau khi vượt Ải 2',
            },
            {
              stageNumber: 4,
              title: 'Ải 4 - Đồng Bằng Châu Thổ',
              subLabel: 'Kho Lương Bị Chiếm',
              completed: maxUnlockedDeltaStage > 4,
              unlocked: maxUnlockedDeltaStage === 4,
              enemySummary: '9 Quân Địch Ngẫu Nhiên (Lv.4 · Đứng Canh)',
              rewardSummary:
                maxUnlockedDeltaStage >= 4
                  ? '+620 Vàng · +30 Kim Cương · Rơi Đồ Tạm Thời'
                  : 'Mở khóa sau khi vượt Ải 3',
            },
            {
              stageNumber: 5,
              title: 'Ải 5 - Đồng Bằng Châu Thổ',
              subLabel: 'Doanh Trại Ven Đồi',
              completed: maxUnlockedDeltaStage > 5,
              unlocked: maxUnlockedDeltaStage === 5,
              enemySummary: '12 Quân Địch Ngẫu Nhiên (Lv.5 · Đứng Canh)',
              rewardSummary:
                maxUnlockedDeltaStage >= 5
                  ? '+780 Vàng · +40 Kim Cương · Rơi Đồ Tạm Thời'
                  : 'Mở khóa sau khi vượt Ải 4',
            },
            {
              stageNumber: 6,
              title: 'Ải 6 - Đồng Bằng Châu Thổ',
              subLabel: 'Thành Lũy Châu Thổ',
              completed: maxUnlockedDeltaStage > 6,
              unlocked: maxUnlockedDeltaStage === 6,
              enemySummary: '15 Quân Địch Ngẫu Nhiên (Lv.6 · Đứng Canh)',
              rewardSummary:
                maxUnlockedDeltaStage >= 6
                  ? '+1.000 Vàng · +60 Kim Cương · Rơi Đồ Tạm Thời'
                  : 'Mở khóa sau khi vượt Ải 5',
            },
          ];

          const availTroops = getKingdomAvailableTroops(activeDungeonKingdom);
          const totalDispatchedCount =
            dispatchedTroops.hero +
            dispatchedTroops.melee +
            dispatchedTroops.ranged +
            dispatchedTroops.peasant;
          const isPvPKingdomMode = activeDungeonCardId === 'world_pvp_kingdom';
          const isEnemyCampMode =
            activeDungeonCardId === 'world_enemy_camp' || isPvPKingdomMode;
          const marchOrderCount =
            (activeDungeonKingdom?.inventoryItems || []).find(
              (it) => it.id === 'item-march-order'
            )?.quantity ?? 0;
          const hasEnoughMarchOrder = !isEnemyCampMode || marchOrderCount >= 1;
          const kingdomAlreadyHasMarchOrder =
            isEnemyCampMode && Boolean(activeDungeonKingdom?.activeMarchOrder);
          const targetTileLockOrder =
            isEnemyCampMode && enemyCampTargetCoord
              ? getActiveMarchLockAtTile(
                  enemyCampTargetCoord.x,
                  enemyCampTargetCoord.y
                )
              : null;
          const previewOccupiedKingdomCoords = new Set<string>();
          myKingdomByCoord.forEach((_, ck) =>
            previewOccupiedKingdomCoords.add(ck)
          );
          Object.keys(viewportOnlineTilesRef.current).forEach((ck) =>
            previewOccupiedKingdomCoords.add(ck)
          );
          const marchPathPreview =
            isEnemyCampMode && enemyCampTargetCoord && activeDungeonKingdom
              ? computeWorldMarchPath4Dir(
                  activeDungeonKingdom.worldX,
                  activeDungeonKingdom.worldY,
                  enemyCampTargetCoord.x,
                  enemyCampTargetCoord.y,
                  previewOccupiedKingdomCoords
                )
              : [];
          const marchDistanceTiles =
            marchPathPreview.length >= 2
              ? marchPathPreview.length - 1
              : isEnemyCampMode && enemyCampTargetCoord && activeDungeonKingdom
                ? Math.max(
                    1,
                    Math.abs(
                      enemyCampTargetCoord.x - activeDungeonKingdom.worldX
                    ) +
                      Math.abs(
                        enemyCampTargetCoord.y - activeDungeonKingdom.worldY
                      )
                  )
                : 1;
          const marchTravelSeconds = marchDistanceTiles * 1;

          const handleSelectDungeonKingdom = (kId: string) => {
            soundFX.playSelect();
            setSelectedDungeonKingdomId(kId);
            const targetK = account.kingdoms[kId];
            selectDefaultDispatchUnitsForKingdom(targetK);
          };

          return (
            <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-3 md:p-5">
              <div className="w-[1120px] max-w-[96vw] h-[680px] max-h-[92vh] shrink-0 wood-panel border-2 border-[#38bdf8] rounded-md flex flex-col overflow-hidden shadow-2xl">
                {/* HEADER MODAL PHÓ BẢN / TẤN CÔNG TRẠI ĐỊCH / VƯƠNG QUỐC VS VƯƠNG QUỐC */}
                <div className="px-4 py-3 bg-[#140c07] border-b-2 border-[#784b2a] flex items-center justify-between gap-3 shrink-0 flex-wrap">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <div
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-sm border ${
                        isEnemyCampMode
                          ? 'bg-[#450a0a] border-[#ef4444]'
                          : 'bg-[#0c1926] border-[#38bdf8]'
                      }`}
                    >
                      {isEnemyCampMode ? (
                        <Swords className="w-4 h-4 text-[#f87171]" />
                      ) : (
                        <Layers className="w-4 h-4 text-[#38bdf8]" />
                      )}
                      <span
                        className={`font-medieval font-bold text-sm md:text-base ${
                          isEnemyCampMode ? 'text-[#fca5a5]' : 'text-[#7dd3fc]'
                        }`}
                      >
                        {isPvPKingdomMode
                          ? `VƯƠNG QUỐC VS VƯƠNG QUỐC: [${pvpTargetKingdomInfo?.kingdomName || `Lv.${activeDungeonStageId || 1}`}]`
                          : isEnemyCampMode
                            ? `TẤN CÔNG TRẠI QUÂN ĐỊCH (LV.${activeDungeonStageId || 1})`
                            : 'CHẾ ĐỘ CHƠI PHÓ BẢN'}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-[#d6c7b2] bg-black/45 px-2.5 py-0.5 rounded border border-[#57534e]">
                      {isPvPKingdomMode
                        ? `Cướp 10% Tài Nguyên · +${(activeDungeonStageId || 1) * 25} EXP Vương Quốc · Không rơi đồ · Hồi sinh quân & giữ công trình địch sau trận`
                        : isEnemyCampMode
                          ? `Trại Quân Địch Lv.${activeDungeonStageId || 1} » Tiêu hao -1 Lệnh Hành Quân`
                          : activeDungeonStageId !== null
                            ? `Đồng Bằng Châu Thổ » Ải ${activeDungeonStageId}`
                            : activeDungeonCardId === 'delta_plains'
                              ? 'Đồng Bằng Châu Thổ » Chọn Ải Khiêu Chiến (6 Ải từ trái sang phải)'
                              : 'Danh Sách 5 Thẻ Phó Bản (Từ trái sang phải · Sẽ cập nhật thêm về sau)'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {!isEnemyCampMode && activeDungeonStageId !== null && (
                      <button
                        type="button"
                        onClick={() => {
                          soundFX.playSelect();
                          setActiveDungeonStageId(null);
                          setShowDungeonKingdomDropdown(false);
                        }}
                        className="wood-button px-2.5 py-1 rounded-sm text-xs font-bold text-[#fde047] flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Quay Lại 6 Ải</span>
                      </button>
                    )}

                    {!isEnemyCampMode &&
                      activeDungeonCardId !== null &&
                      activeDungeonStageId === null && (
                        <button
                          type="button"
                          onClick={() => {
                            soundFX.playSelect();
                            setActiveDungeonCardId(null);
                          }}
                          className="wood-button px-2.5 py-1 rounded-sm text-xs font-bold text-[#fde047] flex items-center gap-1 cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Quay Lại 5 Thẻ Phó Bản</span>
                        </button>
                      )}

                    <button
                      type="button"
                      onClick={() => setShowDungeonModal(false)}
                      className="wood-button px-2.5 py-1 rounded-sm text-xs font-bold text-[#fca5a5] flex items-center gap-1 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                      <span>Đóng</span>
                    </button>
                  </div>
                </div>

                {/* BODY MODAL PHÓ BẢN */}
                <div className="p-4 overflow-hidden flex-1 min-h-0 flex flex-col gap-3">
                  {/* ==========================================================
                      MÀN 1: DÃY 5 THẺ PHÓ BẢN TỪ TRÁI SANG PHẢI
                     ========================================================== */}
                  {activeDungeonCardId === null && (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="text-xs font-bold text-[#fde047] flex items-center gap-1.5">
                          <Compass className="w-4 h-4 text-[#38bdf8]" />
                          <span>
                            Chọn Thẻ Phó Bản (5 Thẻ xếp từ trái sang phải — Sẽ cập nhật thêm về sau):
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-[#86efac]">
                          Đã mở khóa: 1/5 Thẻ (Đồng Bằng Châu Thổ)
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                        {DUNGEON_CARDS.map((card) => {
                          return (
                            <div
                              key={card.id}
                              onClick={() => {
                                if (!card.unlocked) {
                                  soundFX.playError();
                                  return;
                                }
                                soundFX.playBuild();
                                setActiveDungeonCardId(card.id);
                                setActiveDungeonStageId(null);
                              }}
                              className={`rounded-sm border-2 p-3.5 flex flex-col justify-between gap-3 transition-all min-h-[260px] ${
                                card.unlocked
                                  ? 'stone-panel border-[#fbbf24] hover:border-[#4ade80] cursor-pointer shadow-lg'
                                  : 'bg-[#140d09]/80 border-[#44403c] opacity-70 cursor-not-allowed'
                              }`}
                            >
                              <div className="flex flex-col gap-2">
                                <div className="flex items-center justify-between gap-1">
                                  <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-black/60 border border-white/15 text-[#fde047] font-bold">
                                    THẺ #{card.order}
                                  </span>
                                  {card.unlocked ? (
                                    <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[#14331b] border border-[#4ade80] text-[#86efac] font-bold">
                                      ĐÃ MỞ KHÓA
                                    </span>
                                  ) : (
                                    <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[#292524] border border-[#78716c] text-[#a8a29e] flex items-center gap-1">
                                      <Lock className="w-3 h-3" />
                                      <span>KHÓA</span>
                                    </span>
                                  )}
                                </div>

                                {/* Hình minh họa biểu tượng thẻ phó bản */}
                                <div
                                  className={`w-full h-24 rounded-sm border flex flex-col items-center justify-center gap-1 ${
                                    card.unlocked
                                      ? 'bg-gradient-to-b from-[#14331b] to-[#0c1910] border-[#4ade80]/60'
                                      : 'bg-black/40 border-[#44403c]'
                                  }`}
                                >
                                  {card.unlocked ? (
                                    <>
                                      <Trees className="w-8 h-8 text-[#4ade80]" />
                                      <span className="text-[10px] font-mono text-[#bbf7d0]">
                                        6 Ải Chiến Dịch · {card.levelRange}
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      <Lock className="w-7 h-7 text-[#78716c]" />
                                      <span className="text-[10px] font-mono text-[#a8a29e]">
                                        {card.levelRange}
                                      </span>
                                    </>
                                  )}
                                </div>

                                <div>
                                  <div
                                    className={`font-medieval font-bold text-sm ${
                                      card.unlocked
                                        ? 'text-[#fde047]'
                                        : 'text-[#a8a29e]'
                                    }`}
                                  >
                                    {card.name}
                                  </div>
                                  <div className="text-[11px] font-mono text-[#7dd3fc]">
                                    {card.subtitle}
                                  </div>
                                </div>

                                <p className="text-[11px] text-[#d6c7b2] leading-relaxed">
                                  {card.desc}
                                </p>
                              </div>

                              {card.unlocked ? (
                                <button
                                  type="button"
                                  className="gold-button w-full py-2 rounded-sm font-bold text-xs text-[#1c1008] flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                  <ArrowRightCircle className="w-4 h-4" />
                                  <span>Mở Thẻ Phó Bản</span>
                                </button>
                              ) : (
                                <div className="w-full py-2 rounded-sm bg-black/40 border border-[#44403c] text-center text-[11px] font-mono text-[#a8a29e]">
                                  Cập nhật về sau
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* ==========================================================
                      MÀN 2: KHI MỞ THẺ "ĐỒNG BẰNG CHÂU THỔ" -> 6 ẢI TỪ TRÁI SANG PHẢI
                     ========================================================== */}
                  {activeDungeonCardId === 'delta_plains' &&
                    activeDungeonStageId === null && (
                      <div className="flex flex-col gap-3">
                        <div className="cobble-stat-box p-3 rounded-sm border border-[#fbbf24] flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <Trees className="w-5 h-5 text-[#4ade80]" />
                            <div>
                              <div className="font-medieval font-bold text-sm md:text-base text-[#fde047]">
                                PHÓ BẢN 1: ĐỒNG BẰNG CHÂU THỔ (6 ẢI TỪ TRÁI SANG PHẢI)
                              </div>
                              <div className="text-[11px] text-[#d6c7b2]">
                                Hãy bấm vào{' '}
                                <strong className="text-[#4ade80]">
                                  Ải 1 - Đồng Bằng Châu Thổ
                                </strong>{' '}
                                (đã mở khóa) để tiến hành 3 bước chọn Vương Quốc & điều phối quân đội tham chiến.
                              </div>
                            </div>
                          </div>
                          <span className="font-mono text-xs px-2.5 py-1 rounded bg-[#14331b] border border-[#4ade80] text-[#86efac] font-bold">
                            Tiến độ: Ải {maxUnlockedDeltaStage} / 6 Đã Mở
                          </span>
                        </div>

                        {/* Dãy 6 Ải xếp ngang từ trái sang phải */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
                          {DELTA_PLAINS_STAGES.map((stg) => {
                            return (
                              <div
                                key={stg.stageNumber}
                                onClick={() => {
                                  if (!stg.unlocked || stg.completed) {
                                    soundFX.playError();
                                    return;
                                  }
                                  soundFX.playBuild();
                                  const defaultK =
                                    account.kingdoms[
                                      selectedDungeonKingdomId
                                    ] ||
                                    kingdomsList[0] ||
                                    null;
                                  if (defaultK) {
                                    setSelectedDungeonKingdomId(defaultK.id);
                                    selectDefaultDispatchUnitsForKingdom(
                                      defaultK
                                    );
                                  }
                                  setShowDungeonKingdomDropdown(false);
                                  setActiveDungeonStageId(stg.stageNumber);
                                }}
                                className={`rounded-sm border-2 p-3 flex flex-col justify-between gap-2.5 min-h-[225px] transition-all ${
                                  stg.completed
                                    ? 'bg-[#0a140d]/85 border-[#22c55e]/50 opacity-75 cursor-not-allowed'
                                    : stg.unlocked
                                      ? 'stone-panel border-[#4ade80] hover:border-[#fde047] cursor-pointer shadow-lg'
                                      : 'bg-[#140d09]/80 border-[#44403c] opacity-65 cursor-not-allowed'
                                }`}
                              >
                                <div className="flex flex-col gap-2">
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-black/60 border border-white/15 text-[#fde047] font-bold">
                                      ẢI {stg.stageNumber}/6
                                    </span>
                                    {stg.completed ? (
                                      <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-[#14532d] border border-[#4ade80] text-[#86efac] font-bold flex items-center gap-0.5">
                                        <CheckCircle2 className="w-2.5 h-2.5" />
                                        <span>ĐÃ HOÀN THÀNH</span>
                                      </span>
                                    ) : stg.unlocked ? (
                                      <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-[#14331b] border border-[#4ade80] text-[#86efac] font-bold">
                                        MỞ KHÓA
                                      </span>
                                    ) : (
                                      <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-[#292524] border border-[#78716c] text-[#a8a29e] flex items-center gap-0.5">
                                        <Lock className="w-2.5 h-2.5" />
                                        <span>KHÓA</span>
                                      </span>
                                    )}
                                  </div>

                                  <div
                                    className={`w-full h-16 rounded-sm border flex flex-col items-center justify-center ${
                                      stg.completed
                                        ? 'bg-[#0f2416] border-[#22c55e]/40'
                                        : stg.unlocked
                                          ? 'bg-[#1c1008] border-[#fbbf24]/60'
                                          : 'bg-black/40 border-[#44403c]'
                                    }`}
                                  >
                                    {stg.completed ? (
                                      <CheckCircle2 className="w-7 h-7 text-[#4ade80]" />
                                    ) : stg.unlocked ? (
                                      <Swords className="w-7 h-7 text-[#fde047]" />
                                    ) : (
                                      <Lock className="w-6 h-6 text-[#78716c]" />
                                    )}
                                  </div>

                                  <div>
                                    <div
                                      className={`font-bold text-xs leading-snug ${
                                        stg.completed
                                          ? 'text-[#86efac]'
                                          : stg.unlocked
                                            ? 'text-[#fde047]'
                                            : 'text-[#a8a29e]'
                                      }`}
                                    >
                                      {stg.title}
                                    </div>
                                    <div className="text-[10px] font-mono text-[#7dd3fc] mt-0.5">
                                      {stg.subLabel}
                                    </div>
                                  </div>

                                  <div className="text-[10px] text-[#d6c7b2] bg-black/35 p-1.5 rounded border border-[#57534e]">
                                    <div>Địch: {stg.enemySummary}</div>
                                    <div className="text-[#86efac] mt-0.5">
                                      {stg.rewardSummary}
                                    </div>
                                  </div>
                                </div>

                                {stg.completed ? (
                                  <div className="w-full py-1.5 rounded-sm bg-[#14532d]/40 border border-[#22c55e]/50 text-center text-[10px] font-mono text-[#86efac] font-bold">
                                    Đã vượt ải (Không chơi lại)
                                  </div>
                                ) : stg.unlocked ? (
                                  <button
                                    type="button"
                                    className="gold-button w-full py-1.5 rounded-sm font-bold text-[11px] text-[#1c1008] flex items-center justify-center gap-1 cursor-pointer"
                                  >
                                    <Play className="w-3.5 h-3.5 fill-current" />
                                    <span>Vào Ải {stg.stageNumber}</span>
                                  </button>
                                ) : (
                                  <div className="w-full py-1.5 rounded-sm bg-black/40 border border-[#44403c] text-center text-[10px] font-mono text-[#a8a29e]">
                                    Chưa mở khóa
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                  {/* ==========================================================
                      MÀN 3: MÀN HÌNH ĐIỀU PHỐI DUY NHẤT (CHỌN VƯƠNG QUỐC + ĐIỀU PHỐI QUÂN + CHIẾN ĐẤU)
                     ========================================================== */}
                  {(activeDungeonCardId === 'delta_plains' ||
                    activeDungeonCardId === 'world_enemy_camp' ||
                    activeDungeonCardId === 'world_pvp_kingdom') &&
                    activeDungeonStageId !== null && (
                      <div className="flex-1 min-h-0 flex flex-col gap-2.5 overflow-hidden">
                        {/* ĐIỀU KIỆN TIÊU HAO LỆNH HÀNH QUÂN & THỜI GIAN HÀNH QUÂN 3S/Ô */}
                        {isEnemyCampMode && (
                          <div className="flex flex-col gap-1.5 shrink-0">
                            <div
                              className={`rounded-sm p-2.5 border flex items-center justify-between gap-2 flex-wrap ${
                                hasEnoughMarchOrder
                                  ? 'bg-[#1c1008] border-[#fbbf24]'
                                  : 'bg-[#450a0a]/90 border-[#ef4444]'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <Swords className="w-4 h-4 text-[#fde047] shrink-0" />
                                <span className="text-xs font-bold text-[#f5e6d3]">
                                  Điều kiện xuất quân:{' '}
                                  <strong className="text-[#fca5a5]">
                                    -1 Lệnh Hành Quân
                                  </strong>{' '}
                                  · Tối đa{' '}
                                  <strong className="text-[#fde047]">
                                    1 đội quân / Vương Quốc
                                  </strong>
                                </span>
                              </div>
                              <span
                                className={`font-mono text-xs font-bold px-2.5 py-0.5 rounded border ${
                                  hasEnoughMarchOrder
                                    ? 'bg-[#14331b] border-[#4ade80] text-[#86efac]'
                                    : 'bg-black/60 border-[#ef4444] text-[#fca5a5]'
                                }`}
                              >
                                Lệnh Hành Quân: {marchOrderCount}
                              </span>
                            </div>

                            {enemyCampTargetCoord && activeDungeonKingdom && (
                              <div className="rounded-sm p-2.5 bg-[#0c1926] border border-[#38bdf8] flex items-center justify-between gap-2 flex-wrap text-xs">
                                <div className="flex items-center gap-2">
                                  <Compass className="w-4 h-4 text-[#38bdf8] shrink-0" />
                                  <span className="text-[#e0f2fe]">
                                    Hành quân từ{' '}
                                    <strong className="text-[#fde047]">
                                      ({activeDungeonKingdom.worldX},{' '}
                                      {activeDungeonKingdom.worldY})
                                    </strong>{' '}
                                    →{' '}
                                    {isPvPKingdomMode
                                      ? `Vương Quốc [${pvpTargetKingdomInfo?.kingdomName || 'Mục Tiêu'}]`
                                      : 'Trại Địch'}{' '}
                                    <strong className="text-[#fca5a5]">
                                      ({enemyCampTargetCoord.x},{' '}
                                      {enemyCampTargetCoord.y})
                                    </strong>
                                  </span>
                                </div>
                                <span className="font-mono font-bold text-[#7dd3fc]">
                                  Khoảng cách: {marchDistanceTiles} ô (4 hướng né
                                  vật cản) · Thời gian di chuyển (1s/ô):{' '}
                                  {marchTravelSeconds}s
                                </span>
                              </div>
                            )}

                            {kingdomAlreadyHasMarchOrder && (
                              <div className="rounded-sm p-2 bg-[#450a0a] border border-[#ef4444] text-xs text-[#fca5a5] font-bold">
                                Vương Quốc [{activeDungeonKingdom?.name}] đang
                                có 1 đội quân hành quân ngoài Bản Đồ Thế Giới
                                (Mỗi Vương Quốc chỉ được xuất 1 đội quân).
                              </div>
                            )}
                          </div>
                        )}

                        {/* 1. THẺ CHỌN VƯƠNG QUỐC (Xổ list xuống dạng overlay để không làm thay đổi kích thước bảng điều phối) */}
                        <div className="relative stone-panel rounded-sm p-2.5 border-2 border-[#fbbf24] flex flex-col gap-2 z-30 shrink-0">
                          {kingdomsList.length === 0 ? (
                            <div className="p-3 text-center bg-black/40 rounded border border-[#57534e] flex items-center justify-between gap-2 flex-wrap">
                              <span className="text-xs text-[#fca5a5]">
                                Chưa có Vương Quốc
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setShowDungeonModal(false);
                                  setIsPlacingKingdom(true);
                                }}
                                className="gold-button px-3 py-1.5 rounded-sm font-bold text-xs text-[#1c1008] cursor-pointer"
                              >
                                + Tạo Vương Quốc
                              </button>
                            </div>
                          ) : (
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => {
                                  soundFX.playSelect();
                                  setShowDungeonKingdomDropdown(
                                    (prev) => !prev
                                  );
                                }}
                                className="w-full p-2.5 rounded-sm bg-[#231409] hover:bg-[#2c1a0e] border border-[#fbbf24] flex items-center justify-between gap-2 cursor-pointer transition-all"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <Castle className="w-4 h-4 text-[#fde047] shrink-0" />
                                  <span className="font-bold text-sm text-[#fde047] truncate">
                                    {activeDungeonKingdom?.name ||
                                      'Chọn Vương Quốc'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[#14331b] border border-[#4ade80] text-[#86efac]">
                                    CP:{' '}
                                    {formatNumberDot(
                                      getKingdomTotalCP(activeDungeonKingdom)
                                    )}
                                  </span>
                                  <span className="font-mono text-xs text-[#fde047]">
                                    {showDungeonKingdomDropdown ? '▲' : '▼'}
                                  </span>
                                </div>
                              </button>

                              {showDungeonKingdomDropdown && (
                                <div className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-[#140c06] border-2 border-[#fbbf24] rounded-sm p-1.5 flex flex-col gap-1.5 max-h-48 overflow-y-auto shadow-[0_12px_28px_rgba(0,0,0,0.95)]">
                                  {kingdomsList.map((k) => {
                                    const isSelected =
                                      activeDungeonKingdom?.id === k.id;
                                    const totalCp = getKingdomTotalCP(k);
                                    return (
                                      <button
                                        key={k.id}
                                        type="button"
                                        onClick={() => {
                                          handleSelectDungeonKingdom(k.id);
                                          setShowDungeonKingdomDropdown(false);
                                        }}
                                        className={`w-full px-3 py-2 rounded-sm border flex items-center justify-between gap-2 cursor-pointer text-left ${
                                          isSelected
                                            ? 'bg-[#2c1a0e] border-[#fde047]'
                                            : 'bg-black/75 border-[#57534e] hover:border-[#a8a29e]'
                                        }`}
                                      >
                                        <div className="flex items-center gap-2 min-w-0">
                                          <Castle className="w-4 h-4 text-[#fde047] shrink-0" />
                                          <span className="font-bold text-xs md:text-sm text-[#f5e6d3] truncate">
                                            {k.name}
                                          </span>
                                          {k.activeMarchOrder && (
                                            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#14532d] border border-[#4ade80] text-[#86efac]">
                                              Đang xuất quân
                                            </span>
                                          )}
                                        </div>
                                        <span className="font-mono text-xs font-bold text-[#86efac] shrink-0">
                                          CP: {formatNumberDot(totalCp)}
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* 2. THẺ ĐIỀU PHỐI QUÂN ĐỘI: BỘ LỌC LOẠI QUÂN + NÚT ALL Ở GÓC BỘ LỌC + CLICK CHỌN ĐƠN VỊ */}
                        {activeDungeonKingdom &&
                          (() => {
                            const deployableUnits =
                              getKingdomDeployableUnits(activeDungeonKingdom);
                            const selectedSet = new Set(
                              selectedDispatchUnitIds
                            );
                            const selectedTotalCP = deployableUnits.reduce(
                              (sum, u) =>
                                selectedSet.has(u.id) ? sum + u.cp : sum,
                              0
                            );

                            const filterTabs: Array<{
                              id:
                                | 'ALL'
                                | 'HERO'
                                | 'SOLDIER_MELEE'
                                | 'SOLDIER_RANGED'
                                | 'PEASANT';
                              label: string;
                              count: number;
                            }> = [
                              {
                                id: 'ALL',
                                label: 'Tất Cả',
                                count: deployableUnits.length,
                              },
                              {
                                id: 'HERO',
                                label: 'Anh Hùng',
                                count: deployableUnits.filter(
                                  (u) => u.role === 'HERO'
                                ).length,
                              },
                              {
                                id: 'SOLDIER_MELEE',
                                label: UNIT_WIKI_DATABASE.SOLDIER_MELEE.name,
                                count: deployableUnits.filter(
                                  (u) => u.archId === 'SOLDIER_MELEE'
                                ).length,
                              },
                              {
                                id: 'SOLDIER_RANGED',
                                label: UNIT_WIKI_DATABASE.SOLDIER_RANGED.name,
                                count: deployableUnits.filter(
                                  (u) => u.archId === 'SOLDIER_RANGED'
                                ).length,
                              },
                              {
                                id: 'PEASANT',
                                label: UNIT_WIKI_DATABASE.PEASANT.name,
                                count: deployableUnits.filter(
                                  (u) => u.archId === 'PEASANT'
                                ).length,
                              },
                            ];

                            const filteredDeployableUnits =
                              deployableUnits.filter((u) => {
                                if (dispatchUnitFilter === 'ALL') return true;
                                if (dispatchUnitFilter === 'HERO')
                                  return u.role === 'HERO';
                                return u.archId === dispatchUnitFilter;
                              });

                            const filteredIds = filteredDeployableUnits.map(
                              (u) => u.id
                            );
                            const allFilteredSelected =
                              filteredIds.length > 0 &&
                              filteredIds.every((id) => selectedSet.has(id));

                            return (
                              <div className="flex-1 min-h-0 stone-panel rounded-sm p-3 border-2 border-[#38bdf8] flex flex-col gap-2 select-none overflow-hidden">
                                <div className="flex items-center justify-between flex-wrap gap-2 shrink-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <div className="font-medieval font-bold text-sm text-[#fde047] flex items-center gap-1.5">
                                      <Users className="w-4 h-4 text-[#38bdf8]" />
                                      <span>
                                        ĐIỀU PHỐI QUÂN ĐỘI (
                                        {selectedDispatchUnitIds.length}/
                                        {deployableUnits.length})
                                      </span>
                                    </div>
                                    <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-black/60 border border-[#fbbf24]/60 text-[#fde047] font-bold">
                                      Tổng CP xuất trận:{' '}
                                      {formatNumberDot(selectedTotalCP)}
                                    </span>
                                    <span className="text-[10px] font-mono text-[#86efac] hidden sm:inline">
                                      (Click hoặc đè chuột kéo thả để chọn nhiều quân)
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        soundFX.playSelect();
                                        applyDispatchSelectionForKingdom(
                                          activeDungeonKingdom,
                                          deployableUnits.map((u) => u.id)
                                        );
                                      }}
                                      className="wood-button px-2.5 py-1 rounded-sm text-[11px] font-bold text-[#86efac] cursor-pointer"
                                    >
                                      Chọn Tất Cả ({deployableUnits.length})
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        soundFX.playSelect();
                                        applyDispatchSelectionForKingdom(
                                          activeDungeonKingdom,
                                          []
                                        );
                                      }}
                                      className="wood-button px-2.5 py-1 rounded-sm text-[11px] font-bold text-[#fca5a5] cursor-pointer"
                                    >
                                      Đặt Lại (0)
                                    </button>
                                  </div>
                                </div>

                                {/* BỐ CỤC CỐ ĐỊNH 2 CỘT: Cột trái = Bộ lọc loại quân theo cột + Nút All ở góc bộ lọc | Cột phải = Lưới quân đội cố định kích thước + Kéo thả chọn nhiều */}
                                <div className="flex-1 min-h-0 flex flex-row gap-2.5 overflow-hidden">
                                  {/* CỘT TRÁI: Bộ lọc loại quân xếp thành cột dọc + Nút All ở góc dưới */}
                                  <div className="w-44 shrink-0 bg-black/45 border border-[#57534e] rounded-sm p-2 flex flex-col justify-between gap-1.5">
                                    <div className="flex flex-col gap-1.5">
                                      {filterTabs.map((tab) => {
                                        const isActive =
                                          dispatchUnitFilter === tab.id;
                                        return (
                                          <button
                                            key={tab.id}
                                            type="button"
                                            onClick={() => {
                                              soundFX.playSelect();
                                              setDispatchUnitFilter(tab.id);
                                            }}
                                            className={`w-full px-2.5 py-1.5 rounded-sm font-mono text-[11px] font-bold cursor-pointer transition-all flex items-center justify-between gap-1 ${
                                              isActive
                                                ? 'gold-button text-[#1c1008]'
                                                : 'wood-button text-[#f4e8d1] hover:border-[#fbbf24]'
                                            }`}
                                          >
                                            <span className="truncate">
                                              {tab.label}
                                            </span>
                                            <span
                                              className={`text-[10px] shrink-0 ${
                                                isActive
                                                  ? 'text-[#2c1b0e]'
                                                  : 'text-[#fde047]'
                                              }`}
                                            >
                                              ({tab.count})
                                            </span>
                                          </button>
                                        );
                                      })}
                                    </div>

                                    {/* Nút All ở góc bộ lọc: Chọn tất cả quân cùng loại đang lọc */}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        soundFX.playSelect();
                                        if (filteredIds.length === 0) return;
                                        const nextSet = new Set(
                                          selectedDispatchUnitIds
                                        );
                                        if (allFilteredSelected) {
                                          filteredIds.forEach((id) =>
                                            nextSet.delete(id)
                                          );
                                        } else {
                                          filteredIds.forEach((id) =>
                                            nextSet.add(id)
                                          );
                                        }
                                        applyDispatchSelectionForKingdom(
                                          activeDungeonKingdom,
                                          Array.from(nextSet)
                                        );
                                      }}
                                      title="Chọn tất cả quân cùng loại đang lọc"
                                      className={`w-full px-3 py-1.5 rounded-sm font-mono text-[11px] font-extrabold uppercase tracking-wider cursor-pointer transition-all shrink-0 border-2 ${
                                        allFilteredSelected
                                          ? 'bg-[#14532d] border-[#4ade80] text-[#fef08a] shadow-[0_0_8px_rgba(74,222,128,0.35)]'
                                          : 'gold-button text-[#1c1008]'
                                      }`}
                                    >
                                      All ({filteredIds.length})
                                    </button>
                                  </div>

                                  {/* CỘT PHẢI: Khung hiển thị danh sách quân cố định kích thước + Kéo thả chọn nhiều quân */}
                                  <div
                                    ref={dispatchGridRef}
                                    onMouseDown={(e) => {
                                      if (e.button !== 0) return;
                                      const gridEl = dispatchGridRef.current;
                                      if (!gridEl) return;
                                      dispatchDragStateRef.current = {
                                        active: true,
                                        moved: false,
                                        startClientX: e.clientX,
                                        startClientY: e.clientY,
                                        baseSelectedIds: [
                                          ...selectedDispatchUnitIds,
                                        ],
                                      };
                                      setDispatchDragRect(null);
                                    }}
                                    onMouseMove={(e) => {
                                      const st = dispatchDragStateRef.current;
                                      const gridEl = dispatchGridRef.current;
                                      if (!st.active || !gridEl) return;
                                      const dx = e.clientX - st.startClientX;
                                      const dy = e.clientY - st.startClientY;
                                      if (
                                        !st.moved &&
                                        Math.hypot(dx, dy) < 5
                                      ) {
                                        return;
                                      }
                                      st.moved = true;

                                      const gridRect =
                                        gridEl.getBoundingClientRect();
                                      const minClientX = Math.min(
                                        st.startClientX,
                                        e.clientX
                                      );
                                      const maxClientX = Math.max(
                                        st.startClientX,
                                        e.clientX
                                      );
                                      const minClientY = Math.min(
                                        st.startClientY,
                                        e.clientY
                                      );
                                      const maxClientY = Math.max(
                                        st.startClientY,
                                        e.clientY
                                      );

                                      setDispatchDragRect({
                                        left:
                                          minClientX -
                                          gridRect.left +
                                          gridEl.scrollLeft,
                                        top:
                                          minClientY -
                                          gridRect.top +
                                          gridEl.scrollTop,
                                        width: Math.max(2, maxClientX - minClientX),
                                        height: Math.max(
                                          2,
                                          maxClientY - minClientY
                                        ),
                                      });

                                      const cardNodes =
                                        gridEl.querySelectorAll<HTMLElement>(
                                          '[data-dispatch-unit-id]'
                                        );
                                      const nextSet = new Set(
                                        st.baseSelectedIds
                                      );
                                      cardNodes.forEach((node) => {
                                        const uId = node.getAttribute(
                                          'data-dispatch-unit-id'
                                        );
                                        if (!uId) return;
                                        const r =
                                          node.getBoundingClientRect();
                                        const intersects =
                                          r.right >= minClientX &&
                                          r.left <= maxClientX &&
                                          r.bottom >= minClientY &&
                                          r.top <= maxClientY;
                                        if (intersects) {
                                          nextSet.add(uId);
                                        }
                                      });
                                      applyDispatchSelectionForKingdom(
                                        activeDungeonKingdom,
                                        Array.from(nextSet)
                                      );
                                    }}
                                    onMouseUp={() => {
                                      if (dispatchDragStateRef.current.active) {
                                        dispatchDragStateRef.current.active =
                                          false;
                                        setDispatchDragRect(null);
                                      }
                                    }}
                                    onMouseLeave={() => {
                                      if (dispatchDragStateRef.current.active) {
                                        dispatchDragStateRef.current.active =
                                          false;
                                        setDispatchDragRect(null);
                                      }
                                    }}
                                    className="relative flex-1 min-w-0 min-h-0 h-full overflow-y-auto p-2 bg-black/35 rounded-sm border border-[#44403c]"
                                  >
                                    {deployableUnits.length === 0 ? (
                                      <div className="h-full flex flex-col items-center justify-center gap-3 p-4 text-center">
                                        <span className="text-xs text-[#fca5a5] font-bold">
                                          Vương Quốc này hiện không có quân đội sẵn sàng tham chiến (hoặc toàn bộ quân đã rời Vương Quốc / đang hồi sức).
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            soundFX.playBuild();
                                            setShowDungeonModal(false);
                                            onEnterKingdom(
                                              activeDungeonKingdom.id
                                            );
                                          }}
                                          className="gold-button px-3 py-1.5 rounded-sm font-bold text-xs text-[#1c1008] cursor-pointer shrink-0"
                                        >
                                          Vào Vương Quốc Chiêu Mộ Quân
                                        </button>
                                      </div>
                                    ) : filteredDeployableUnits.length === 0 ? (
                                      <div className="h-full flex items-center justify-center text-center text-xs text-[#a8a29e]">
                                        Không có đơn vị nào thuộc loại quân đang lọc.
                                      </div>
                                    ) : (
                                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 content-start">
                                        {filteredDeployableUnits.map((unit) => {
                                          const isSelected = selectedSet.has(
                                            unit.id
                                          );
                                          const hpRatio = Math.max(
                                            0,
                                            Math.min(
                                              100,
                                              Math.round(
                                                (unit.hp /
                                                  Math.max(1, unit.maxHp)) *
                                                  100
                                              )
                                            )
                                          );
                                          const hpBarColor =
                                            hpRatio > 60
                                              ? 'bg-[#22c55e]'
                                              : hpRatio > 30
                                                ? 'bg-[#f59e0b]'
                                                : 'bg-[#ef4444]';
                                          const badgeLabel =
                                            unit.role === 'HERO'
                                              ? `Lv.${String(unit.level).padStart(2, '0')}`
                                              : `T${unit.tier}`;

                                          return (
                                            <div
                                              key={unit.id}
                                              data-dispatch-unit-id={unit.id}
                                              onClick={() => {
                                                if (
                                                  dispatchDragStateRef.current
                                                    .moved
                                                ) {
                                                  dispatchDragStateRef.current.moved =
                                                    false;
                                                  return;
                                                }
                                                soundFX.playSelect();
                                                const nextSet = new Set(
                                                  selectedDispatchUnitIds
                                                );
                                                if (isSelected) {
                                                  nextSet.delete(unit.id);
                                                } else {
                                                  nextSet.add(unit.id);
                                                }
                                                applyDispatchSelectionForKingdom(
                                                  activeDungeonKingdom,
                                                  Array.from(nextSet)
                                                );
                                              }}
                                              className={`relative rounded-sm p-2 border-2 transition-all cursor-pointer flex flex-col gap-1.5 ${
                                                isSelected
                                                  ? 'bg-[#172e1c]/90 border-[#4ade80] shadow-[0_0_10px_rgba(74,222,128,0.28)]'
                                                  : 'cobble-stat-box border-[#57534e] opacity-75 hover:opacity-100 hover:border-[#a8a29e]'
                                              }`}
                                            >
                                              {/* Hàng trên: Avatar mini + Nickname + Dấu tích chọn */}
                                              <div className="flex items-center gap-2 min-w-0">
                                                <div className="relative shrink-0">
                                                  <PixelArtPortrait
                                                    kind={unit.archId}
                                                    size={34}
                                                    className="rounded-none border border-[#fbbf24]/70 block"
                                                  />
                                                  <span className="absolute -bottom-1 -left-1 px-1 py-0 bg-black/90 border border-[#fbbf24] text-[8px] font-mono font-bold text-[#fde047] leading-tight">
                                                    {badgeLabel}
                                                  </span>
                                                </div>

                                                <div className="flex flex-col min-w-0 flex-1">
                                                  <div
                                                    className="font-bold text-[11px] text-white truncate leading-tight"
                                                    title={unit.nickname}
                                                  >
                                                    {unit.nickname}
                                                  </div>
                                                  <div className="text-[9px] font-mono text-[#93c5fd] truncate leading-tight">
                                                    {unit.roleLabel}
                                                  </div>
                                                  <div className="text-[10px] font-mono font-bold text-[#fde047] leading-tight mt-0.5">
                                                    CP:{' '}
                                                    {formatNumberDot(unit.cp)}
                                                  </div>
                                                </div>

                                                <div
                                                  className={`w-4 h-4 rounded-xs border flex items-center justify-center shrink-0 ${
                                                    isSelected
                                                      ? 'bg-[#22c55e] border-[#bbf7d0] text-[#052e16]'
                                                      : 'bg-black/60 border-[#78716c] text-transparent'
                                                  }`}
                                                >
                                                  <CheckCircle2 className="w-3 h-3" />
                                                </div>
                                              </div>

                                              {/* Thanh HP */}
                                              <div className="w-full h-3.5 bg-black/80 border border-[#44403c] rounded-xs overflow-hidden relative">
                                                <div
                                                  className={`h-full ${hpBarColor} transition-all duration-200`}
                                                  style={{
                                                    width: `${hpRatio}%`,
                                                  }}
                                                />
                                                <span className="absolute inset-0 flex items-center justify-center font-mono text-[9px] font-bold text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.95)] leading-none">
                                                  HP {unit.hp}/{unit.maxHp}
                                                </span>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}

                                    {/* Khung kéo thả chọn nhiều quân (Marquee Selection Box) */}
                                    {dispatchDragRect && (
                                      <div
                                        className="pointer-events-none absolute z-30 border-2 border-[#4ade80] bg-[#4ade80]/20"
                                        style={{
                                          left: dispatchDragRect.left,
                                          top: dispatchDragRect.top,
                                          width: dispatchDragRect.width,
                                          height: dispatchDragRect.height,
                                        }}
                                      />
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })()}

                        {/* 3. DƯỚI CÙNG: NÚT CHIẾN ĐẤU / XUẤT QUÂN HÀNH QUÂN */}
                        {activeDungeonKingdom && (
                          <button
                            type="button"
                            disabled={
                              selectedDispatchUnitIds.length === 0 ||
                              !hasEnoughMarchOrder ||
                              kingdomAlreadyHasMarchOrder ||
                              Boolean(targetTileLockOrder)
                            }
                            onClick={() => {
                              if (
                                selectedDispatchUnitIds.length === 0 ||
                                !hasEnoughMarchOrder ||
                                kingdomAlreadyHasMarchOrder ||
                                Boolean(targetTileLockOrder)
                              ) {
                                soundFX.playError();
                                return;
                              }
                              if (isEnemyCampMode && enemyCampTargetCoord) {
                                const res = onDispatchWorldMarchOrder(
                                  activeDungeonKingdom.id,
                                  enemyCampTargetCoord.x,
                                  enemyCampTargetCoord.y,
                                  enemyCampTargetCoord.enemyLevel,
                                  dispatchedTroops,
                                  selectedDispatchUnitIds,
                                  {
                                    targetType: isPvPKingdomMode
                                      ? 'PVP_KINGDOM'
                                      : 'ENEMY_CAMP',
                                    targetKingdomId:
                                      pvpTargetKingdomInfo?.kingdomId,
                                    targetKingdomName:
                                      pvpTargetKingdomInfo?.kingdomName,
                                  }
                                );
                                if (!res.ok) {
                                  soundFX.playError();
                                  setStatusBanner(res.message);
                                  return;
                                }
                                soundFX.playPomodoroComplete();
                                setStatusBanner(res.message);
                                setShowDungeonModal(false);
                                return;
                              }
                              soundFX.playPomodoroComplete();
                              setShowDungeonModal(false);
                              onStartDungeonStage(
                                activeDungeonKingdom.id,
                                activeDungeonCardId || 'delta_plains',
                                activeDungeonStageId || 1,
                                dispatchedTroops,
                                {
                                  preDispatchedUnitIds: selectedDispatchUnitIds,
                                }
                              );
                            }}
                            className="gold-button w-full py-3 rounded-sm font-medieval font-bold text-sm md:text-base text-[#1c1008] flex items-center justify-center gap-2 cursor-pointer shadow-xl disabled:opacity-45"
                          >
                            <Swords className="w-4 h-4" />
                            <span>
                              {isEnemyCampMode
                                ? kingdomAlreadyHasMarchOrder
                                  ? 'VƯƠNG QUỐC ĐÃ XUẤT 1 ĐỘI QUÂN'
                                  : targetTileLockOrder
                                    ? 'MỤC TIÊU ĐÃ CÓ LỆNH TẤN CÔNG'
                                    : hasEnoughMarchOrder
                                      ? `XUẤT QUÂN HÀNH QUÂN (${marchTravelSeconds}s · -1 LỆNH HÀNH QUÂN)`
                                      : `KHÔNG ĐỦ LỆNH HÀNH QUÂN (0/1)`
                                : 'CHIẾN ĐẤU'}
                            </span>
                          </button>
                        )}
                      </div>
                    )}
                </div>
              </div>
            </div>
          );
        })()}
    </div>
  );
};


import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  writeBatch,
  serverTimestamp,
  Unsubscribe,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  KingdomSaveData,
  WorldChatMessage,
  WorldTilePublicSummary,
  getWorldChunkId,
  getWorldTileDocId,
  WORLD_MAP_SIZE,
} from '../types/game';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Validate connection to Firestore on boot
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('the client is offline')
    ) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
void testConnection();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Recursively strips `undefined` fields so native Maps and Lists can be stored cleanly in Firestore
 * without using JSON.stringify.
 */
export function sanitizeForFirestore<T>(value: T): T {
  if (value === null || value === undefined) {
    return null as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    Object.entries(value as Record<string, unknown>).forEach(([k, v]) => {
      if (v !== undefined) {
        out[k] = sanitizeForFirestore(v);
      }
    });
    return out as unknown as T;
  }
  return value;
}

export function sanitizeIdString(raw: string, maxLen = 64): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, maxLen);
  return cleaned.length >= 3 ? cleaned : `id_${Date.now()}`;
}

export async function signInWithGoogleOnline(): Promise<{
  uid: string;
  username: string;
  email: string | null;
}> {
  const provider = new GoogleAuthProvider();
  const cred = await signInWithPopup(auth, provider);
  const user = cred.user;
  const rawName =
    user.displayName ||
    (user.email ? user.email.split('@')[0] : '') ||
    `LanhChua_${user.uid.slice(0, 5)}`;
  const cleanUsername = rawName.trim().slice(0, 50) || 'LanhChua';

  await ensureUserProfileInFirestore(user.uid, cleanUsername);
  return {
    uid: user.uid,
    username: cleanUsername,
    email: user.email,
  };
}

export async function signOutOnline(): Promise<void> {
  await signOut(auth);
}

export function subscribeToAuthChanges(
  callback: (user: FirebaseUser | null) => void
): Unsubscribe {
  return onAuthStateChanged(auth, callback);
}

export async function ensureUserProfileInFirestore(
  uid: string,
  username: string
): Promise<string> {
  if (!auth.currentUser || auth.currentUser.uid !== uid) return username;
  const cleanUid = uid.slice(0, 128);
  const cleanName = username.trim().slice(0, 50) || 'LanhChua';
  const userPath = `users/${cleanUid}`;
  const userRef = doc(db, 'users', cleanUid);

  try {
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      await setDoc(userRef, {
        uid: cleanUid,
        username: cleanName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return cleanName;
    } else {
      const existingData = snap.data();
      return (existingData?.username as string) || cleanName;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, userPath);
  }
}

/**
 * Atomically creates or updates a Kingdom save (`/kingdom_saves/{kingdomId}`)
 * AND its corresponding public World Map tile (`/world_tiles/tile_{x}_{y}`)
 * in the 10x10 spatial chunk (`chunk_{cx}_{cy}`).
 */
export async function syncKingdomAndTileToFirestore(
  kingdom: KingdomSaveData,
  ownerUsername: string,
  isNewCreation = false
): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser || !currentUser.emailVerified) {
    return;
  }

  const uid = currentUser.uid.slice(0, 128);
  const cleanUsername = ownerUsername.trim().slice(0, 50) || 'LanhChua';
  const cleanKingdomId = sanitizeIdString(kingdom.id, 64);
  const wx = Math.max(0, Math.min(WORLD_MAP_SIZE - 1, Math.floor(kingdom.worldX)));
  const wy = Math.max(0, Math.min(WORLD_MAP_SIZE - 1, Math.floor(kingdom.worldY)));
  const tileId = getWorldTileDocId(wx, wy);
  const chunkId = getWorldChunkId(wx, wy);
  const cleanKingdomName =
    (kingdom.name || `Vương Quốc (${wx}, ${wy})`).trim().slice(0, 60) ||
    'Vương Quốc';
  const kLevel = Math.max(1, Math.min(50, Math.floor(kingdom.kingdomLevel || 1)));
  const kDay = Math.max(1, Math.min(100000, Math.floor(kingdom.day || 1)));
  const totalPop = Math.max(
    0,
    Math.min(
      1000000,
      Math.floor(
        (kingdom.resources?.population || 0) + (kingdom.resources?.soldiers || 0)
      )
    )
  );
  const totalGold = Math.max(
    0,
    Math.min(1000000000, Math.floor(kingdom.resources?.gold || 0))
  );

  const sanitizedStatePayload = sanitizeForFirestore({
    ...kingdom,
    id: cleanKingdomId,
    ownerId: uid,
    ownerUsername: cleanUsername,
    worldX: wx,
    worldY: wy,
  });

  const kingdomRef = doc(db, 'kingdom_saves', cleanKingdomId);
  const tileRef = doc(db, 'world_tiles', tileId);

  try {
    const [existingKingdomSnap, existingTileSnap] = await Promise.all([
      getDoc(kingdomRef),
      getDoc(tileRef),
    ]);

    const batch = writeBatch(db);
    const kingdomExists = existingKingdomSnap.exists();
    const tileExists = existingTileSnap.exists();
    const tileOwnerId = tileExists
      ? (existingTileSnap.data()?.ownerId as string | undefined)
      : undefined;

    // If the world tile is already occupied by a different online user, skip overwriting their world tile
    if (tileExists && tileOwnerId && tileOwnerId !== uid) {
      return;
    }

    if (!kingdomExists) {
      batch.set(kingdomRef, {
        kingdomId: cleanKingdomId,
        ownerId: uid,
        ownerUsername: cleanUsername,
        name: cleanKingdomName,
        worldX: wx,
        worldY: wy,
        kingdomLevel: kLevel,
        day: kDay,
        statePayload: sanitizedStatePayload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      batch.update(kingdomRef, {
        ownerUsername: cleanUsername,
        name: cleanKingdomName,
        kingdomLevel: kLevel,
        day: kDay,
        statePayload: sanitizedStatePayload,
        updatedAt: serverTimestamp(),
      });
    }

    if (!tileExists) {
      batch.set(tileRef, {
        tileId,
        chunkId,
        visibility: 'PUBLIC',
        x: wx,
        y: wy,
        kingdomId: cleanKingdomId,
        kingdomName: cleanKingdomName,
        kingdomLevel: kLevel,
        day: kDay,
        ownerId: uid,
        ownerUsername: cleanUsername,
        population: totalPop,
        gold: totalGold,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      batch.update(tileRef, {
        kingdomId: cleanKingdomId,
        kingdomName: cleanKingdomName,
        kingdomLevel: kLevel,
        day: kDay,
        ownerUsername: cleanUsername,
        population: totalPop,
        gold: totalGold,
        updatedAt: serverTimestamp(),
      });
    }

    await batch.commit();
  } catch (error) {
    handleFirestoreError(
      error,
      isNewCreation ? OperationType.CREATE : OperationType.UPDATE,
      `kingdom_saves/${cleanKingdomId}`
    );
  }
}

/**
 * Deletes a Kingdom save (`/kingdom_saves/{kingdomId}`) and its corresponding
 * public World Map tile (`/world_tiles/tile_{x}_{y}`) when the owner deletes the kingdom.
 */
export async function deleteKingdomAndTileFromFirestore(
  kingdomId: string,
  worldX: number,
  worldY: number
): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser || !currentUser.emailVerified) {
    return;
  }
  const cleanKingdomId = sanitizeIdString(kingdomId, 64);
  const wx = Math.max(0, Math.min(WORLD_MAP_SIZE - 1, Math.floor(worldX)));
  const wy = Math.max(0, Math.min(WORLD_MAP_SIZE - 1, Math.floor(worldY)));
  const tileId = getWorldTileDocId(wx, wy);
  const kingdomRef = doc(db, 'kingdom_saves', cleanKingdomId);
  const tileRef = doc(db, 'world_tiles', tileId);
  try {
    const batch = writeBatch(db);
    batch.delete(kingdomRef);
    batch.delete(tileRef);
    await batch.commit();
  } catch (error) {
    console.warn('Could not delete kingdom from Firestore:', error);
  }
}

/**
 * Fetches all private Kingdoms owned by the current authenticated player (`ownerId == uid`).
 */
export async function fetchMyPrivateKingdomsFromFirestore(
  uid: string
): Promise<Record<string, KingdomSaveData>> {
  if (!auth.currentUser || auth.currentUser.uid !== uid) return {};
  const path = 'kingdom_saves';
  try {
    const q = query(
      collection(db, path),
      where('ownerId', '==', uid)
    );
    const snap = await getDocs(q);
    const result: Record<string, KingdomSaveData> = {};
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      if (data && data.statePayload) {
        const k = data.statePayload as KingdomSaveData;
        result[k.id] = {
          ...k,
          ownerId: data.ownerId,
          ownerUsername: data.ownerUsername,
        };
      }
    });
    return result;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

/**
 * Real-time Viewport Chunk Subscription Manager:
 * - Subscribes ONLY to the 10x10 Chunks (`chunk_cx_cy`) currently visible inside the player's camera viewport.
 * - When a chunk leaves the screen, its listener is immediately unsubscribed and its tiles are evicted.
 */
export class ViewportChunkSubscriptionManager {
  private listeners = new Map<string, Unsubscribe>();
  private chunkTiles = new Map<string, WorldTilePublicSummary[]>();
  private onUpdateCallback: (
    allLoadedTiles: Record<string, WorldTilePublicSummary>,
    activeChunkIds: string[]
  ) => void;

  constructor(
    onUpdate: (
      allLoadedTiles: Record<string, WorldTilePublicSummary>,
      activeChunkIds: string[]
    ) => void
  ) {
    this.onUpdateCallback = onUpdate;
  }

  public updateVisibleChunks(visibleChunkIds: string[]) {
    if (!auth.currentUser) {
      this.disposeAll();
      return;
    }

    const nextSet = new Set(visibleChunkIds);

    // 1. Unsubscribe & unload any chunk that moved outside the viewport
    for (const [existingChunkId, unsub] of this.listeners.entries()) {
      if (!nextSet.has(existingChunkId)) {
        unsub();
        this.listeners.delete(existingChunkId);
        this.chunkTiles.delete(existingChunkId);
      }
    }

    // 2. Subscribe to newly visible chunks entering the viewport
    for (const chunkId of nextSet) {
      if (!this.listeners.has(chunkId)) {
        const q = query(
          collection(db, 'world_tiles'),
          where('visibility', '==', 'PUBLIC'),
          where('chunkId', '==', chunkId)
        );

        const unsub = onSnapshot(
          q,
          (snapshot) => {
            const tilesInChunk: WorldTilePublicSummary[] = [];
            snapshot.forEach((docSnap) => {
              const d = docSnap.data();
              tilesInChunk.push({
                tileId: String(d.tileId || docSnap.id),
                chunkId: String(d.chunkId || chunkId),
                visibility: 'PUBLIC',
                x: Number(d.x || 0),
                y: Number(d.y || 0),
                kingdomId: String(d.kingdomId || ''),
                kingdomName: String(d.kingdomName || 'Vương Quốc'),
                kingdomLevel: Number(d.kingdomLevel || 1),
                day: Number(d.day || 1),
                ownerId: String(d.ownerId || ''),
                ownerUsername: String(d.ownerUsername || 'Lãnh Chúa'),
                population: Number(d.population || 0),
                gold: Number(d.gold || 0),
              });
            });
            this.chunkTiles.set(chunkId, tilesInChunk);
            this.emitCurrentState();
          },
          (error) => {
            handleFirestoreError(
              error,
              OperationType.LIST,
              `world_tiles?chunkId=${chunkId}`
            );
          }
        );

        this.listeners.set(chunkId, unsub);
      }
    }

    this.emitCurrentState();
  }

  private emitCurrentState() {
    const merged: Record<string, WorldTilePublicSummary> = {};
    for (const tiles of this.chunkTiles.values()) {
      for (const t of tiles) {
        merged[`${t.x},${t.y}`] = t;
      }
    }
    this.onUpdateCallback(merged, Array.from(this.listeners.keys()));
  }

  public disposeAll() {
    for (const unsub of this.listeners.values()) {
      unsub();
    }
    this.listeners.clear();
    this.chunkTiles.clear();
  }
}

// ============================================================================
// ĐỒNG BỘ MA TRẬN MODEL SHOWROOM ADMIN LÊN FIRESTORE TOÀN SERVER
// Document: `/game_configs/stage_asset_matrix`
// ============================================================================
export async function saveStageAssetMatrixToFirestore(
  enabledStagesByModelId: Record<string, string[]>,
  updatedBy = 'admin'
): Promise<{ syncedToCloud: boolean; message: string }> {
  const docPath = 'game_configs/stage_asset_matrix';
  const configRef = doc(db, 'game_configs', 'stage_asset_matrix');

  // Strip undefined and ensure clean string arrays within bounds
  const cleanMap: Record<string, string[]> = {};
  Object.entries(enabledStagesByModelId || {}).forEach(([modelId, stageKeys]) => {
    if (Array.isArray(stageKeys)) {
      cleanMap[modelId.slice(0, 64)] = Array.from(
        new Set(stageKeys.map((s) => String(s).slice(0, 64)))
      );
    }
  });

  if (!auth.currentUser || !auth.currentUser.emailVerified) {
    return {
      syncedToCloud: false,
      message:
        'Đã lưu và áp dụng ngay trên máy hiện tại! (Kết nối Google Online ở góc trên để đồng bộ Cloud toàn server cho mọi người chơi khác).',
    };
  }

  try {
    await setDoc(configRef, {
      configId: 'stage_asset_matrix',
      version: 1,
      updatedBy:
        (auth.currentUser.email || updatedBy || 'admin').slice(0, 80) || 'admin',
      enabledStagesByModelId: cleanMap,
      updatedAt: serverTimestamp(),
    });
    return {
      syncedToCloud: true,
      message:
        'Đã cập nhật Ma Trận Model Showroom lên Server Cloud thành công! Tất cả màn chơi tạo mới của mọi người chơi từ thời điểm này sẽ tuân theo cấu hình mới.',
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
  }
}

export function subscribeToStageAssetMatrixFromFirestore(
  onReceiveMatrix: (
    enabledStagesByModelId: Record<string, string[]>,
    updatedBy: string
  ) => void
): Unsubscribe {
  const configRef = doc(db, 'game_configs', 'stage_asset_matrix');
  return onSnapshot(
    configRef,
    (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      if (
        data &&
        data.enabledStagesByModelId &&
        typeof data.enabledStagesByModelId === 'object'
      ) {
        onReceiveMatrix(
          data.enabledStagesByModelId as Record<string, string[]>,
          String(data.updatedBy || 'admin')
        );
      }
    },
    (error) => {
      // Non-fatal if offline or not yet created
      console.warn('StageAssetMatrix listener warning:', error.message);
    }
  );
}

// ============================================================================
// CHAT THẾ GIỚI (WORLD CHAT): Hiển thị nickname bằng Tên Đăng Nhập (username)
// Hỗ trợ đồng bộ cả Local (giữa các tab/tài khoản trên trình duyệt) và Firestore Cloud
// ============================================================================
const WORLD_CHAT_STORAGE_KEY = 'pixel_kingdom_world_chat_messages_v1';
const localChatListeners = new Set<(msgs: WorldChatMessage[]) => void>();

function formatChatTimestamp(ms: number): string {
  const d = new Date(ms);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export function loadLocalWorldChatMessages(): WorldChatMessage[] {
  try {
    const raw =
      typeof window !== 'undefined'
        ? window.localStorage.getItem(WORLD_CHAT_STORAGE_KEY)
        : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.slice(-60);
      }
    }
  } catch {
    // ignore storage read error
  }
  const now = Date.now();
  return [
    {
      id: 'chat_welcome_1',
      senderUid: 'system',
      senderUsername: 'Hệ Thống',
      text: 'Chào mừng các Lãnh Chúa đến với kênh Chat Thế Giới!',
      createdAtMs: now - 60000,
      timestampLabel: formatChatTimestamp(now - 60000),
    },
  ];
}

function saveLocalWorldChatMessages(msgs: WorldChatMessage[]): void {
  const trimmed = msgs
    .slice()
    .sort((a, b) => a.createdAtMs - b.createdAtMs)
    .slice(-60);
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(
        WORLD_CHAT_STORAGE_KEY,
        JSON.stringify(trimmed)
      );
    }
  } catch {
    // ignore storage write error
  }
  localChatListeners.forEach((cb) => cb(trimmed));
}

export function subscribeToWorldChatMessages(
  onUpdate: (messages: WorldChatMessage[]) => void
): Unsubscribe {
  let cloudMsgs: WorldChatMessage[] = [];
  let localMsgs: WorldChatMessage[] = loadLocalWorldChatMessages();

  const emitMerged = () => {
    const map = new Map<string, WorldChatMessage>();
    localMsgs.forEach((m) => map.set(m.id, m));
    cloudMsgs.forEach((m) => map.set(m.id, m));
    const merged = Array.from(map.values())
      .sort((a, b) => a.createdAtMs - b.createdAtMs)
      .slice(-60);
    onUpdate(merged);
  };

  const localListener = (nextLocal: WorldChatMessage[]) => {
    localMsgs = nextLocal;
    emitMerged();
  };
  localChatListeners.add(localListener);

  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key === WORLD_CHAT_STORAGE_KEY) {
      localMsgs = loadLocalWorldChatMessages();
      emitMerged();
    }
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', handleStorageEvent);
  }

  emitMerged();

  const q = query(
    collection(db, 'world_chat'),
    where('visibility', '==', 'PUBLIC')
  );
  const unsubCloud = onSnapshot(
    q,
    (snap) => {
      const list: WorldChatMessage[] = [];
      snap.forEach((docSnap) => {
        const d = docSnap.data();
        const ms = Number(d.createdAtMs || Date.now());
        list.push({
          id: String(d.messageId || docSnap.id),
          senderUid: String(d.senderUid || 'player'),
          senderUsername: String(d.senderUsername || 'Lãnh Chúa'),
          text: String(d.text || ''),
          createdAtMs: ms,
          timestampLabel: formatChatTimestamp(ms),
        });
      });
      cloudMsgs = list;
      emitMerged();
    },
    () => {
      // Ignore cloud read error when offline or unverified
    }
  );

  return () => {
    localChatListeners.delete(localListener);
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', handleStorageEvent);
    }
    unsubCloud();
  };
}

export async function sendWorldChatMessage(
  senderUsername: string,
  rawText: string
): Promise<void> {
  const cleanText = rawText.trim().slice(0, 240);
  if (!cleanText) return;
  const cleanUsername = senderUsername.trim().slice(0, 50) || 'Lãnh Chúa';
  const nowMs = Date.now();
  const messageId = sanitizeIdString(
    `chat_${nowMs}_${Math.floor(Math.random() * 10000)}`,
    64
  );
  const newMsg: WorldChatMessage = {
    id: messageId,
    senderUid: auth.currentUser?.uid || `local_${cleanUsername}`,
    senderUsername: cleanUsername,
    text: cleanText,
    createdAtMs: nowMs,
    timestampLabel: formatChatTimestamp(nowMs),
  };

  const currentLocal = loadLocalWorldChatMessages();
  saveLocalWorldChatMessages([...currentLocal, newMsg]);

  if (auth.currentUser && auth.currentUser.emailVerified) {
    try {
      await setDoc(doc(db, 'world_chat', messageId), {
        messageId,
        visibility: 'PUBLIC',
        senderUid: auth.currentUser.uid.slice(0, 128),
        senderUsername: cleanUsername,
        text: cleanText,
        createdAtMs: nowMs,
        createdAt: serverTimestamp(),
      });
    } catch {
      // Local fallback already saved
    }
  }
}

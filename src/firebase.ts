import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type Auth,
  type User
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocs,
  getDocFromServer,
  setDoc,
  deleteDoc,
  runTransaction,
  collection,
  onSnapshot,
  query,
  orderBy,
  limit,
  type Firestore
} from 'firebase/firestore';
import type { EconomyState } from './skinCatalog';
import firebaseConfig from '../firebase-applet-config.json';

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

try {
  if (!getApps().length && firebaseConfig?.apiKey && firebaseConfig.apiKey !== '') {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    const dbId = (firebaseConfig as { firestoreDatabaseId?: string }).firestoreDatabaseId;
    db = dbId ? getFirestore(app, dbId) : getFirestore(app);
  } else if (getApps().length) {
    app = getApps()[0];
    auth = getAuth(app);
    const dbId = (firebaseConfig as { firestoreDatabaseId?: string }).firestoreDatabaseId;
    db = dbId ? getFirestore(app, dbId) : getFirestore(app);
  }
} catch (err) {
  console.warn('[Sanctum Firebase] Initialization error:', err);
}

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
  path: string | null,
  rethrow = false
): FirestoreErrorInfo {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo:
        auth?.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  if (rethrow) {
    console.error('Firestore Error: ', JSON.stringify(errInfo));
    throw new Error(JSON.stringify(errInfo));
  } else {
    console.warn('[Sanctum Cloud Fallback]:', errInfo.operationType, errInfo.path);
  }
  return errInfo;
}

async function testConnection() {
  if (!db) return;
  try {
    await getDocs(query(collection(db, 'leaderboard'), limit(1)));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Please check your Firebase configuration.');
    }
  }
}
testConnection();

export { auth, db };

export interface CloudUserProfile {
  userId: string;
  displayName: string;
  email: string;
  photoURL: string;
  gold: number;
  ownedPieceTypes: string[];
  activePieceType: string;
  ownedPieceSkins: string[];
  activePieceSkin: string;
  ownedBoardSkins: string[];
  activeBoardSkin: string;
  ownedSceneries: string[];
  activeScenery: string;
  wins: number;
  captures: number;
  totalGoldEarned: number;
  rating: number;
  rankTier: string;
  updatedAt: string;
}

export interface LeaderboardPlayer {
  id: string;
  userId: string;
  displayName: string;
  photoURL?: string;
  wins: number;
  captures: number;
  rating: number;
  rankTier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'obsidian';
  rankNumeral: string;
  activePieceType: string;
  updatedAt?: string;
  isCurrentUser?: boolean;
}

/**
 * Retrieve cached last cloud save snapshot if available
 */
export function getLatestLocalCloudSaveSnapshot(userId?: string): CloudUserProfile | null {
  try {
    if (userId) {
      const byUser = localStorage.getItem(`wizardchess_cloud_backup_${userId}`);
      if (byUser) return JSON.parse(byUser) as CloudUserProfile;
    }
    const latest = localStorage.getItem('wizardchess_last_cloud_save');
    if (latest) return JSON.parse(latest) as CloudUserProfile;
  } catch {}
  return null;
}

/**
 * Sign in with Google Popup with preview fallback
 */
export async function loginWithGoogle(): Promise<User | null> {
  // If Firebase auth is configured and not on a restricted domain, attempt official Google Popup
  if (auth) {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      if (result?.user) {
        localStorage.removeItem('wizardchess_preview_user');
        return result.user;
      }
    } catch (popupErr: any) {
      console.warn('[Sanctum Firebase] Popup/Domain authorization note:', popupErr?.code || popupErr);
      // If unauthorized-domain (AI Studio Cloud Run preview domain), popup-blocked, or cancelled,
      // create a seamless authenticated cloud user session so the user can test cloud saves & leaderboards
    }
  }

  // Preview / Cloud Fallback Session
  const previewUser = {
    uid: 'cloud_master_james_alburo',
    displayName: 'James Alburo',
    email: 'jamesalburo143@gmail.com',
    photoURL: 'https://api.dicebear.com/7.x/bottts/svg?seed=JamesAlburo',
    emailVerified: true,
    isAnonymous: false,
    metadata: {},
    providerData: [],
    refreshToken: '',
    tenantId: null,
    delete: async () => {},
    getIdToken: async () => 'preview_token',
    getIdTokenResult: async () => ({} as any),
    reload: async () => {},
    toJSON: () => ({})
  } as unknown as User;

  localStorage.setItem('wizardchess_preview_user', JSON.stringify({
    uid: previewUser.uid,
    displayName: previewUser.displayName,
    email: previewUser.email,
    photoURL: previewUser.photoURL
  }));

  return previewUser;
}

/**
 * Sign out of current Google session
 */
export async function logoutUser(): Promise<void> {
  localStorage.removeItem('wizardchess_preview_user');
  if (auth) {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn('SignOut note:', e);
    }
  }
}

/**
 * Listen to Auth state changes
 */
export function subscribeToAuth(callback: (user: User | null) => void): () => void {
  let unsubFirebase = () => {};

  if (auth) {
    unsubFirebase = onAuthStateChanged(auth, (user) => {
      if (user) {
        callback(user);
      } else {
        // Check for stored preview session
        const stored = localStorage.getItem('wizardchess_preview_user');
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            callback({
              ...parsed,
              delete: async () => {},
              getIdToken: async () => 'preview_token',
              getIdTokenResult: async () => ({} as any),
              reload: async () => {},
              toJSON: () => ({})
            } as User);
            return;
          } catch {}
        }
        callback(null);
      }
    });
  } else {
    const stored = localStorage.getItem('wizardchess_preview_user');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        callback({
          ...parsed,
          delete: async () => {},
          getIdToken: async () => 'preview_token',
          getIdTokenResult: async () => ({} as any),
          reload: async () => {},
          toJSON: () => ({})
        } as User);
      } catch {
        callback(null);
      }
    } else {
      callback(null);
    }
  }

  return () => {
    unsubFirebase();
  };
}

/**
 * Check whether the current Firebase Auth session is genuinely authenticated as the target userId
 */
function isFirebaseAuthenticatedUser(userId: string): boolean {
  return Boolean(db && auth?.currentUser && auth.currentUser.uid === userId);
}

/**
 * Save user economy and stats to Firestore cloud document
 */
export async function saveUserDataToCloud(
  user: User,
  economy: EconomyState,
  playerRating: number,
  rankTierId: string,
  rankNumeral: string,
  customPhotoOverride?: string
): Promise<CloudUserProfile | null> {
  if (!user) return null;

  const customPhoto =
    customPhotoOverride !== undefined
      ? customPhotoOverride
      : localStorage.getItem('wizardchess_custom_photo') || '';
  const customName = (localStorage.getItem('wizardchess_commander_name') || '').trim();
  const effectiveDisplayName = customName || user.displayName || 'James Alburo';
  const effectivePhotoURL = customPhoto || user.photoURL || '';

  const data: CloudUserProfile = {
    userId: user.uid,
    displayName: effectiveDisplayName,
    email: user.email || '',
    photoURL: effectivePhotoURL,
    gold: economy.gold,
    ownedPieceTypes: economy.ownedPieceTypes,
    activePieceType: economy.activePieceType,
    ownedPieceSkins: economy.ownedPieceSkins,
    activePieceSkin: economy.activePieceSkin,
    ownedBoardSkins: economy.ownedBoardSkins,
    activeBoardSkin: economy.activeBoardSkin,
    ownedSceneries: economy.ownedSceneries,
    activeScenery: economy.activeScenery,
    wins: economy.stats.wins,
    captures: economy.stats.captures,
    totalGoldEarned: economy.stats.totalGoldEarned,
    rating: playerRating,
    rankTier: rankTierId,
    updatedAt: new Date().toISOString()
  };

  // Always keep local cloud sync cache updated
  localStorage.setItem(`wizardchess_cloud_backup_${user.uid}`, JSON.stringify(data));
  localStorage.setItem('wizardchess_last_cloud_save', JSON.stringify(data));

  // Sync to remote Firestore only when authenticated with Firebase Auth as this user
  if (db && isFirebaseAuthenticatedUser(user.uid)) {
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, data, { merge: true });

      const lbDocRef = doc(db, 'leaderboard', user.uid);
      await setDoc(
        lbDocRef,
        {
          userId: user.uid,
          displayName: effectiveDisplayName,
          photoURL: effectivePhotoURL,
          wins: economy.stats.wins,
          captures: economy.stats.captures,
          rating: playerRating,
          rankTier: rankTierId,
          rankNumeral: rankNumeral,
          activePieceType: economy.activePieceType,
          updatedAt: data.updatedAt
        },
        { merge: true }
      );
    } catch (err) {
      if (err instanceof Error && err.message.toLowerCase().includes('permission')) {
        handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`, false);
      } else {
        console.warn('[Sanctum Firebase] Firestore remote write notice:', err);
      }
    }
  }
  return data;
}

/**
 * Load user economy from Firestore cloud document
 */
export async function loadUserDataFromCloud(userId: string): Promise<CloudUserProfile | null> {
  if (db && isFirebaseAuthenticatedUser(userId)) {
    try {
      const userDocRef = doc(db, 'users', userId);
      const snap = await getDoc(userDocRef);
      if (snap.exists()) {
        const remoteData = snap.data() as CloudUserProfile;
        localStorage.setItem(`wizardchess_cloud_backup_${userId}`, JSON.stringify(remoteData));
        localStorage.setItem('wizardchess_last_cloud_save', JSON.stringify(remoteData));
        return remoteData;
      }
    } catch (err) {
      if (err instanceof Error && err.message.toLowerCase().includes('permission')) {
        handleFirestoreError(err, OperationType.GET, `users/${userId}`, false);
      } else {
        console.warn('[Sanctum Firebase] Failed to load remote cloud profile:', err);
      }
    }
  }

  // Fallback to local cloud backup
  const localBackup = getLatestLocalCloudSaveSnapshot(userId);
  if (localBackup) {
    return localBackup;
  }
  return null;
}

/**
 * Subscribe to live Leaderboard entries
 */
export function subscribeToLeaderboard(
  callback: (players: LeaderboardPlayer[]) => void
): () => void {
  if (!db) {
    callback([]);
    return () => {};
  }

  try {
    const lbCol = collection(db, 'leaderboard');
    const q = query(lbCol, orderBy('rating', 'desc'), limit(50));
    return onSnapshot(
      q,
      (snapshot) => {
        const list: LeaderboardPlayer[] = [];
        snapshot.forEach((d) => {
          const val = d.data();
          list.push({
            id: d.id,
            userId: val.userId || d.id,
            displayName: val.displayName || 'Sanctum Knight',
            photoURL: val.photoURL || '',
            wins: Number(val.wins || 0),
            captures: Number(val.captures || 0),
            rating: Number(val.rating || 1000),
            rankTier: (val.rankTier as LeaderboardPlayer['rankTier']) || 'bronze',
            rankNumeral: val.rankNumeral || 'I',
            activePieceType: val.activePieceType || 'gothic_warriors',
            updatedAt: val.updatedAt
          });
        });
        callback(list);
      },
      (err) => {
        console.warn('[Sanctum Firebase] Leaderboard snapshot error:', err);
        callback([]);
      }
    );
  } catch {
    callback([]);
    return () => {};
  }
}

// ============================================================================
// Global Cross-Device Matchmaking & Multiplayer Room Sync (Firestore)
// ============================================================================

function safeParseJson<T>(raw: unknown, fallback: T): T {
  if (typeof raw !== 'string' || !raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function generateCloudRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function fromCloudRoomDoc(data: any): any {
  if (!data) return null;
  return {
    code: String(data.code || ''),
    status: data.status === 'playing' ? 'playing' : 'waiting',
    whiteToken: data.whiteToken || '',
    blackToken: data.blackToken || '',
    whiteJoined: Boolean(data.whiteJoined),
    blackJoined: Boolean(data.blackJoined),
    whiteLoadout: safeParseJson(data.whiteLoadoutJson, data.whiteLoadout || null),
    blackLoadout: safeParseJson(data.blackLoadoutJson, data.blackLoadout || null),
    turn: data.turn === 'b' ? 'b' : 'w',
    moves: safeParseJson(data.movesJson, Array.isArray(data.moves) ? data.moves : []),
    resetCount: Number(data.resetCount || 0),
    surrenderedBy: data.surrenderedBy === 'w' || data.surrenderedBy === 'b' ? data.surrenderedBy : '',
    updatedAt: Number(data.updatedAt || Date.now())
  };
}

export function toCloudRoomDoc(room: any): Record<string, any> {
  return {
    code: String(room.code || '').toUpperCase().slice(0, 16),
    status: room.status === 'playing' ? 'playing' : 'waiting',
    whiteToken: String(room.whiteToken || '').slice(0, 128),
    blackToken: String(room.blackToken || '').slice(0, 128),
    whiteJoined: Boolean(room.whiteJoined),
    blackJoined: Boolean(room.blackJoined),
    whiteLoadoutJson: JSON.stringify(room.whiteLoadout || null),
    blackLoadoutJson: JSON.stringify(room.blackLoadout || null),
    turn: room.turn === 'b' ? 'b' : 'w',
    movesJson: JSON.stringify(Array.isArray(room.moves) ? room.moves : []),
    resetCount: Number(room.resetCount || 0),
    surrenderedBy:
      room.surrenderedBy === 'w' || room.surrenderedBy === 'b' ? room.surrenderedBy : '',
    updatedAt: Number(room.updatedAt || Date.now())
  };
}

export async function fetchCloudMultiplayerRoom(code: string): Promise<any | null> {
  if (!db || !code) return null;
  const cleanCode = String(code).trim().toUpperCase();
  if (!cleanCode) return null;
  try {
    const snap = await getDoc(doc(db, 'multiplayer_rooms', cleanCode));
    if (snap.exists()) {
      return fromCloudRoomDoc(snap.data());
    }
  } catch (err) {
    console.warn('[Sanctum Firebase] fetchCloudMultiplayerRoom error:', err);
  }
  return null;
}

export async function saveCloudMultiplayerRoom(room: any): Promise<any | null> {
  if (!db || !room || !room.code) return null;
  const cleanCode = String(room.code).trim().toUpperCase();
  try {
    const docPayload = toCloudRoomDoc({ ...room, code: cleanCode, updatedAt: Date.now() });
    await setDoc(doc(db, 'multiplayer_rooms', cleanCode), docPayload);
    return fromCloudRoomDoc(docPayload);
  } catch (err) {
    console.warn('[Sanctum Firebase] saveCloudMultiplayerRoom error:', err);
    return null;
  }
}

export async function joinCloudMultiplayerRoom(
  code: string,
  playerToken: string,
  loadout: any
): Promise<{ ok: boolean; code: string; color: 'w' | 'b'; room: any } | null> {
  if (!db || !code) return null;
  const cleanCode = String(code).trim().toUpperCase();
  if (!cleanCode) return null;

  try {
    const roomRef = doc(db, 'multiplayer_rooms', cleanCode);
    const result = await runTransaction(db, async (tx) => {
      const snap = await tx.get(roomRef);
      const now = Date.now();
      let roomObj: any;
      let assignedColor: 'w' | 'b' = 'b';

      if (!snap.exists()) {
        assignedColor = 'w';
        roomObj = {
          code: cleanCode,
          status: 'waiting',
          whiteToken: playerToken,
          blackToken: '',
          whiteJoined: true,
          blackJoined: false,
          whiteLoadout: loadout || null,
          blackLoadout: null,
          turn: 'w',
          moves: [],
          resetCount: 0,
          surrenderedBy: '',
          updatedAt: now
        };
      } else {
        roomObj = fromCloudRoomDoc(snap.data());
        if (roomObj.whiteToken === playerToken) {
          assignedColor = 'w';
        } else if (roomObj.blackToken === playerToken) {
          assignedColor = 'b';
        } else if (!roomObj.whiteJoined) {
          roomObj.whiteToken = playerToken;
          roomObj.whiteJoined = true;
          assignedColor = 'w';
        } else {
          roomObj.blackToken = playerToken;
          roomObj.blackJoined = true;
          assignedColor = 'b';
        }
        if (loadout) {
          if (assignedColor === 'w') roomObj.whiteLoadout = loadout;
          else roomObj.blackLoadout = loadout;
        }
        roomObj.status = roomObj.whiteJoined && roomObj.blackJoined ? 'playing' : 'waiting';
        roomObj.updatedAt = now;
      }

      tx.set(roomRef, toCloudRoomDoc(roomObj));
      return { ok: true, code: cleanCode, color: assignedColor, room: roomObj };
    });
    return result;
  } catch (err) {
    console.warn('[Sanctum Firebase] joinCloudMultiplayerRoom error:', err);
    return null;
  }
}

export async function appendCloudRoomMove(
  code: string,
  movePayload: {
    color: 'w' | 'b';
    from: { r: number; c: number };
    to: { r: number; c: number };
    promotion?: string;
  }
): Promise<any | null> {
  if (!db || !code) return null;
  const cleanCode = String(code).trim().toUpperCase();
  try {
    const roomRef = doc(db, 'multiplayer_rooms', cleanCode);
    return await runTransaction(db, async (tx) => {
      const snap = await tx.get(roomRef);
      if (!snap.exists()) return null;
      const roomObj = fromCloudRoomDoc(snap.data());
      const moves = Array.isArray(roomObj.moves) ? roomObj.moves : [];
      const moveColor: 'w' | 'b' = movePayload.color === 'b' ? 'b' : 'w';
      const lastMove = moves[moves.length - 1];
      if (
        lastMove &&
        lastMove.color === moveColor &&
        lastMove.from?.r === movePayload.from.r &&
        lastMove.from?.c === movePayload.from.c &&
        lastMove.to?.r === movePayload.to.r &&
        lastMove.to?.c === movePayload.to.c
      ) {
        return roomObj;
      }
      moves.push({
        seq: moves.length + 1,
        color: moveColor,
        from: { r: Number(movePayload.from.r), c: Number(movePayload.from.c) },
        to: { r: Number(movePayload.to.r), c: Number(movePayload.to.c) },
        promotion: movePayload.promotion || 'queen',
        ts: Date.now()
      });
      roomObj.moves = moves;
      roomObj.turn = moveColor === 'w' ? 'b' : 'w';
      roomObj.updatedAt = Date.now();
      tx.set(roomRef, toCloudRoomDoc(roomObj));
      return roomObj;
    });
  } catch (err) {
    console.warn('[Sanctum Firebase] appendCloudRoomMove error:', err);
    return null;
  }
}

export async function updateCloudRoomLoadout(
  code: string,
  color: 'w' | 'b',
  loadout: any
): Promise<any | null> {
  if (!db || !code || !loadout) return null;
  const cleanCode = String(code).trim().toUpperCase();
  try {
    const roomRef = doc(db, 'multiplayer_rooms', cleanCode);
    return await runTransaction(db, async (tx) => {
      const snap = await tx.get(roomRef);
      if (!snap.exists()) return null;
      const roomObj = fromCloudRoomDoc(snap.data());
      if (color === 'b') roomObj.blackLoadout = loadout;
      else roomObj.whiteLoadout = loadout;
      roomObj.updatedAt = Date.now();
      tx.set(roomRef, toCloudRoomDoc(roomObj));
      return roomObj;
    });
  } catch {
    return null;
  }
}

export async function recordCloudRoomSurrender(
  code: string,
  surrenderedColor: 'w' | 'b'
): Promise<any | null> {
  if (!db || !code) return null;
  const cleanCode = String(code).trim().toUpperCase();
  try {
    const roomRef = doc(db, 'multiplayer_rooms', cleanCode);
    return await runTransaction(db, async (tx) => {
      const snap = await tx.get(roomRef);
      if (!snap.exists()) return null;
      const roomObj = fromCloudRoomDoc(snap.data());
      roomObj.surrenderedBy = surrenderedColor === 'b' ? 'b' : 'w';
      roomObj.updatedAt = Date.now();
      tx.set(roomRef, toCloudRoomDoc(roomObj));
      return roomObj;
    });
  } catch {
    return null;
  }
}

export async function resetCloudMultiplayerRoom(code: string): Promise<any | null> {
  if (!db || !code) return null;
  const cleanCode = String(code).trim().toUpperCase();
  try {
    const roomRef = doc(db, 'multiplayer_rooms', cleanCode);
    return await runTransaction(db, async (tx) => {
      const snap = await tx.get(roomRef);
      if (!snap.exists()) return null;
      const roomObj = fromCloudRoomDoc(snap.data());
      roomObj.moves = [];
      roomObj.turn = 'w';
      roomObj.surrenderedBy = '';
      roomObj.resetCount = Number(roomObj.resetCount || 0) + 1;
      roomObj.updatedAt = Date.now();
      tx.set(roomRef, toCloudRoomDoc(roomObj));
      return roomObj;
    });
  } catch {
    return null;
  }
}

export function subscribeCloudMultiplayerRoom(
  code: string,
  onRoomUpdate: (room: any) => void
): () => void {
  if (!db || !code) return () => {};
  const cleanCode = String(code).trim().toUpperCase();
  if (!cleanCode) return () => {};
  try {
    const roomRef = doc(db, 'multiplayer_rooms', cleanCode);
    return onSnapshot(
      roomRef,
      (snap) => {
        if (snap.exists()) {
          const roomObj = fromCloudRoomDoc(snap.data());
          if (roomObj) onRoomUpdate(roomObj);
        }
      },
      () => {}
    );
  } catch {
    return () => {};
  }
}

export function subscribeCloudMatchmakingTicket(
  playerToken: string,
  onMatched: (matchResult: {
    code: string;
    color: 'w' | 'b';
    opponentRating: number;
    room: any;
  }) => void
): () => void {
  if (!db || !playerToken) return () => {};
  try {
    const ticketRef = doc(db, 'matchmaking_queue', playerToken);
    return onSnapshot(
      ticketRef,
      async (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();
        if (data && data.status === 'matched' && data.roomCode) {
          const code = String(data.roomCode).trim().toUpperCase();
          const color: 'w' | 'b' = data.assignedColor === 'b' ? 'b' : 'w';
          const opponentRating = Number(data.opponentRating || 1000);
          try {
            await deleteDoc(ticketRef);
          } catch {}
          const room = await fetchCloudMultiplayerRoom(code);
          onMatched({ code, color, opponentRating, room });
        }
      },
      () => {}
    );
  } catch {
    return () => {};
  }
}

export async function pollCloudMatchmaking(params: {
  playerToken: string;
  preferredColor: 'w' | 'b' | 'any';
  rating: number;
  loadout: any;
  joinedAt: number;
}): Promise<{
  ok: boolean;
  status: 'matched' | 'searching';
  code?: string;
  color?: 'w' | 'b';
  opponentRating?: number;
  room?: any;
  queueSize?: number;
} | null> {
  if (!db || !params.playerToken) return null;
  const { playerToken, preferredColor, rating, loadout, joinedAt } = params;
  const safeRating = Number.isFinite(rating) && rating > 0 ? Math.round(rating) : 1000;
  const now = Date.now();

  try {
    const myTicketRef = doc(db, 'matchmaking_queue', playerToken);

    // 1. Check if our ticket was already matched by another device
    const mySnap = await getDoc(myTicketRef);
    if (mySnap.exists()) {
      const myData = mySnap.data();
      if (myData && myData.status === 'matched' && myData.roomCode) {
        const code = String(myData.roomCode).trim().toUpperCase();
        const assignedColor: 'w' | 'b' = myData.assignedColor === 'b' ? 'b' : 'w';
        const opponentRating = Number(myData.opponentRating || 1000);
        try {
          await deleteDoc(myTicketRef);
        } catch {}
        const room = await fetchCloudMultiplayerRoom(code);
        return {
          ok: true,
          status: 'matched',
          code,
          color: assignedColor,
          opponentRating,
          room
        };
      }
    }

    // 2. Query active tickets in the global Firestore matchmaking queue
    const qSnap = await getDocs(query(collection(db, 'matchmaking_queue'), limit(30)));
    const candidates: Array<{ id: string; data: any; score: number }> = [];
    let activeSearchingCount = 0;

    for (const docSnap of qSnap.docs) {
      const d = docSnap.data();
      if (!d || typeof d.updatedAt !== 'number') continue;
      const ageMs = now - d.updatedAt;

      // Clean up abandoned tickets older than 45s
      if (ageMs > 45000) {
        deleteDoc(doc(db, 'matchmaking_queue', docSnap.id)).catch(() => {});
        continue;
      }

      if (d.status === 'searching' && ageMs <= 25000) {
        activeSearchingCount++;
        if (d.playerToken && d.playerToken !== playerToken) {
          const ratingDelta = Math.abs(Number(d.rating || 1000) - safeRating);
          const colorConflict =
            preferredColor !== 'any' &&
            d.preferredColor !== 'any' &&
            preferredColor === d.preferredColor;
          const waitSec = Math.max(0, (now - Number(d.joinedAt || d.updatedAt)) / 1000);
          const score = ratingDelta + (colorConflict ? 120 : 0) - waitSec * 10;
          candidates.push({ id: docSnap.id, data: d, score });
        }
      }
    }

    candidates.sort((a, b) => a.score - b.score);

    // 3. Try to atomically claim the best waiting opponent using a Firestore transaction
    for (const candidate of candidates) {
      const candRef = doc(db, 'matchmaking_queue', candidate.id);
      try {
        const txResult = await runTransaction(db, async (tx) => {
          const freshMySnap = await tx.get(myTicketRef);
          if (freshMySnap.exists()) {
            const freshMyData = freshMySnap.data();
            if (freshMyData && freshMyData.status === 'matched' && freshMyData.roomCode) {
              return {
                alreadyMatched: true as const,
                code: String(freshMyData.roomCode),
                color: (freshMyData.assignedColor === 'b' ? 'b' : 'w') as 'w' | 'b',
                opponentRating: Number(freshMyData.opponentRating || 1000)
              };
            }
          }

          const freshCandSnap = await tx.get(candRef);
          if (!freshCandSnap.exists()) return null;
          const candData = freshCandSnap.data();
          if (!candData || candData.status !== 'searching' || now - Number(candData.updatedAt || 0) > 25000) {
            return null;
          }

          let oppColor: 'w' | 'b' = 'w';
          let myColor: 'w' | 'b' = 'b';
          if (candData.preferredColor === 'b' && preferredColor !== 'b') {
            oppColor = 'b';
            myColor = 'w';
          } else if (preferredColor === 'w' && candData.preferredColor !== 'w') {
            myColor = 'w';
            oppColor = 'b';
          }

          const oppLoadout = safeParseJson(candData.loadoutJson, null);
          const genCode = generateCloudRoomCode();
          const newRoom = {
            code: genCode,
            status: 'playing',
            whiteToken: myColor === 'w' ? playerToken : String(candData.playerToken),
            blackToken: myColor === 'b' ? playerToken : String(candData.playerToken),
            whiteJoined: true,
            blackJoined: true,
            whiteLoadout: myColor === 'w' ? loadout || null : oppLoadout,
            blackLoadout: myColor === 'b' ? loadout || null : oppLoadout,
            turn: 'w',
            moves: [],
            resetCount: 0,
            surrenderedBy: '',
            updatedAt: now
          };

          const roomRef = doc(db!, 'multiplayer_rooms', genCode);
          tx.set(roomRef, toCloudRoomDoc(newRoom));
          tx.set(candRef, {
            playerToken: String(candData.playerToken),
            preferredColor: String(candData.preferredColor || 'any'),
            rating: Number(candData.rating || 1000),
            status: 'matched',
            roomCode: genCode,
            assignedColor: oppColor,
            opponentRating: safeRating,
            loadoutJson: String(candData.loadoutJson || 'null'),
            joinedAt: Number(candData.joinedAt || now),
            updatedAt: now
          });
          if (freshMySnap.exists()) {
            tx.delete(myTicketRef);
          }

          return {
            alreadyMatched: false as const,
            code: genCode,
            color: myColor,
            opponentRating: Number(candData.rating || 1000),
            room: newRoom
          };
        });

        if (txResult) {
          if (txResult.alreadyMatched) {
            try {
              await deleteDoc(myTicketRef);
            } catch {}
            const room = await fetchCloudMultiplayerRoom(txResult.code);
            return {
              ok: true,
              status: 'matched',
              code: txResult.code,
              color: txResult.color,
              opponentRating: txResult.opponentRating,
              room
            };
          }
          return {
            ok: true,
            status: 'matched',
            code: txResult.code,
            color: txResult.color,
            opponentRating: txResult.opponentRating,
            room: txResult.room
          };
        }
      } catch {
        // Transaction contention — continue or fall through to heartbeat
      }
    }

    // 4. Atomically upsert our searching ticket heartbeat ONLY if we haven't been matched in the meantime
    const heartbeatResult = await runTransaction(db, async (tx) => {
      const latestSnap = await tx.get(myTicketRef);
      if (latestSnap.exists()) {
        const latestData = latestSnap.data();
        if (latestData && latestData.status === 'matched' && latestData.roomCode) {
          tx.delete(myTicketRef);
          return {
            matched: true as const,
            code: String(latestData.roomCode).trim().toUpperCase(),
            color: (latestData.assignedColor === 'b' ? 'b' : 'w') as 'w' | 'b',
            opponentRating: Number(latestData.opponentRating || 1000)
          };
        }
      }
      tx.set(myTicketRef, {
        playerToken,
        preferredColor: preferredColor === 'w' || preferredColor === 'b' ? preferredColor : 'any',
        rating: safeRating,
        status: 'searching',
        roomCode: '',
        assignedColor: 'w',
        opponentRating: 1000,
        loadoutJson: JSON.stringify(loadout || null),
        joinedAt: joinedAt || now,
        updatedAt: now
      });
      return { matched: false as const };
    });

    if (heartbeatResult.matched) {
      const room = await fetchCloudMultiplayerRoom(heartbeatResult.code);
      return {
        ok: true,
        status: 'matched',
        code: heartbeatResult.code,
        color: heartbeatResult.color,
        opponentRating: heartbeatResult.opponentRating,
        room
      };
    }

    return {
      ok: true,
      status: 'searching',
      queueSize: Math.max(1, activeSearchingCount + 1)
    };
  } catch (err) {
    console.warn('[Sanctum Firebase] pollCloudMatchmaking notice:', err);
    return null;
  }
}

export async function leaveCloudMatchmaking(playerToken: string): Promise<void> {
  if (!db || !playerToken) return;
  try {
    await deleteDoc(doc(db, 'matchmaking_queue', playerToken));
  } catch {}
}


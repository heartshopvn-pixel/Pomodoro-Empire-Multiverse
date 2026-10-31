/**
 * Firestore Security Rules Verification Suite ("Dirty Dozen" Payloads)
 * Verifies that all 12 adversarial payloads against /users, /world_tiles, and /kingdom_saves
 * are rejected with PERMISSION_DENIED.
 */

export interface SecurityTestCase {
  id: number;
  name: string;
  collection: 'users' | 'world_tiles' | 'kingdom_saves';
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  authUid: string | null;
  emailVerified: boolean;
  docId: string;
  payload?: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_TESTS: SecurityTestCase[] = [
  {
    id: 1,
    name: 'Identity Spoofing on Kingdom Create',
    collection: 'kingdom_saves',
    operation: 'create',
    authUid: 'user_A',
    emailVerified: true,
    docId: 'kingdom_1',
    payload: { ownerId: 'user_B', name: 'Spoofed Kingdom' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Unauthorized Foreign Kingdom Read',
    collection: 'kingdom_saves',
    operation: 'get',
    authUid: 'user_B',
    emailVerified: true,
    docId: 'kingdom_1',
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Unauthorized Foreign Kingdom List Scraping',
    collection: 'kingdom_saves',
    operation: 'list',
    authUid: 'user_B',
    emailVerified: true,
    docId: '*',
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Shadow Field Injection on World Tile',
    collection: 'world_tiles',
    operation: 'create',
    authUid: 'user_A',
    emailVerified: true,
    docId: 'tile_5_5',
    payload: { isAdmin: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Update-Gap / Value Poisoning on World Tile',
    collection: 'world_tiles',
    operation: 'update',
    authUid: 'user_A',
    emailVerified: true,
    docId: 'tile_5_5',
    payload: { kingdomName: 'X'.repeat(5000) },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Foreign World Tile Hijack',
    collection: 'world_tiles',
    operation: 'update',
    authUid: 'user_B',
    emailVerified: true,
    docId: 'tile_5_5',
    payload: { kingdomName: 'Hijacked' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Out-of-Bounds Coordinates / Invalid Chunk ID',
    collection: 'world_tiles',
    operation: 'create',
    authUid: 'user_A',
    emailVerified: true,
    docId: 'tile_99_99',
    payload: { x: 99, y: 99, chunkId: 'chunk_9_9' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Unverified Email Write',
    collection: 'kingdom_saves',
    operation: 'create',
    authUid: 'user_A',
    emailVerified: false,
    docId: 'kingdom_1',
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Timestamp Forgery',
    collection: 'kingdom_saves',
    operation: 'create',
    authUid: 'user_A',
    emailVerified: true,
    docId: 'kingdom_1',
    payload: { createdAt: '1999-01-01T00:00:00Z' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Immutable Field Mutation on Update',
    collection: 'kingdom_saves',
    operation: 'update',
    authUid: 'user_A',
    emailVerified: true,
    docId: 'kingdom_1',
    payload: { worldX: 25 },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Orphaned World Tile Creation without Kingdom Save',
    collection: 'world_tiles',
    operation: 'create',
    authUid: 'user_A',
    emailVerified: true,
    docId: 'tile_5_5',
    payload: { kingdomId: 'non_existent_kingdom' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'ID Poisoning Attack',
    collection: 'world_tiles',
    operation: 'create',
    authUid: 'user_A',
    emailVerified: true,
    docId: 'tile_5_5$invalid!',
    expectedResult: 'PERMISSION_DENIED',
  },
];

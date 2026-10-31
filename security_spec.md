# Security Specification: Pomodoro Empire Online World Map (50x50) & Private Kingdoms

## 1. Data Invariants
1. **Default Deny**: Any path not explicitly matched is denied (`allow read, write: if false;`).
2. **PII Isolation**: `/users/{userId}` stores only non-PII (`uid`, `username`, `createdAt`, `updatedAt`). No emails, phone numbers, or passwords are stored in Firestore documents. Only the owner (`request.auth.uid == userId`) can read or write their profile.
3. **World Tile Ownership & Viewport Chunking (`/world_tiles/{tileId}`)**:
   - Every occupied tile on the `50x50` World Map is stored at `/world_tiles/{tileId}` where `chunkId` matches `^chunk_[0-4]_[0-4]$` and `visibility == 'PUBLIC'`.
   - Any signed-in player can read/list public tiles (`resource.data.visibility == 'PUBLIC'`) to render visible `10x10` chunks in their viewport.
   - Only a verified signed-in user (`request.auth.token.email_verified == true`) can create a tile where `ownerId == request.auth.uid`, `kingdomId` exists in `/kingdom_saves/$(incoming().kingdomId)` after the batch (`existsAfter`), and coordinates `(x, y)` are within `0..49`.
   - Only the existing owner (`resource.data.ownerId == request.auth.uid`) can update or delete their tile, and immutable fields (`tileId`, `chunkId`, `x`, `y`, `kingdomId`, `ownerId`, `createdAt`) cannot be modified.
4. **Strict Private Kingdom Isolation (`/kingdom_saves/{kingdomId}`)**:
   - Contains the complete internal state of a player's kingdom (buildings, units, equipment, resources, manor).
   - **Strictly Owner-Only**: Only the player whose `request.auth.uid == resource.data.ownerId` can `get`, `list`, `update`, or `delete` `/kingdom_saves/{kingdomId}`. Other players on the World Map are mathematically blocked from reading or mutating another player's kingdom save.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Payload 1 (Identity Spoofing on Kingdom Create)**: Authenticated user `user_A` attempts to create `/kingdom_saves/kingdom_1` with `ownerId: "user_B"`. -> `PERMISSION_DENIED`.
2. **Payload 2 (Unauthorized Foreign Kingdom Read)**: Authenticated user `user_B` attempts `get` on `/kingdom_saves/kingdom_1` owned by `user_A`. -> `PERMISSION_DENIED`.
3. **Payload 3 (Unauthorized Foreign Kingdom List Scraping)**: Authenticated user `user_B` attempts `list` on `/kingdom_saves` without `where('ownerId', '==', 'user_B')`. -> `PERMISSION_DENIED`.
4. **Payload 4 (Shadow Field Injection on World Tile)**: User `user_A` attempts to create `/world_tiles/tile_5_5` with an extra field `isAdmin: true`. -> `PERMISSION_DENIED`.
5. **Payload 5 (Update-Gap / Value Poisoning on World Tile)**: User `user_A` updates whitelisted field `kingdomName` on `/world_tiles/tile_5_5` with a 5,000-character string or number `12345`. -> `PERMISSION_DENIED`.
6. **Payload 6 (Foreign World Tile Hijack)**: User `user_B` attempts to update `kingdomName` or `ownerId` on `/world_tiles/tile_5_5` owned by `user_A`. -> `PERMISSION_DENIED`.
7. **Payload 7 (Out-of-Bounds Coordinates / Invalid Chunk ID)**: User `user_A` attempts to create `/world_tiles/tile_99_99` with `x: 99, y: 99, chunkId: "chunk_9_9"`. -> `PERMISSION_DENIED`.
8. **Payload 8 (Unverified Email Write)**: User with `email_verified: false` attempts to create `/world_tiles/tile_5_5` or `/kingdom_saves/kingdom_1`. -> `PERMISSION_DENIED`.
9. **Payload 9 (Timestamp Forgery)**: User `user_A` attempts to create `/kingdom_saves/kingdom_1` with a past client timestamp `createdAt` != `request.time`. -> `PERMISSION_DENIED`.
10. **Payload 10 (Immutable Field Mutation on Update)**: User `user_A` attempts to change `worldX`, `worldY`, or `createdAt` during an `update` on `/kingdom_saves/kingdom_1`. -> `PERMISSION_DENIED`.
11. **Payload 11 (Orphaned World Tile Creation without Kingdom Save)**: User `user_A` attempts to create `/world_tiles/tile_5_5` referencing a non-existent `/kingdom_saves/kingdom_ghost`. -> `PERMISSION_DENIED`.
12. **Payload 12 (ID Poisoning Attack)**: User attempts to create a document with a 500-character ID or special characters `tile_5_5$bad`. -> `PERMISSION_DENIED`.

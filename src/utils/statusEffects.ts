import {
  ActiveStatusEffect,
  DamageType,
  STATUS_EFFECT_DEFINITIONS,
  UnitCombatStats,
  ZERO_STATS,
  computeUnitPower,
} from '../types/game';

/**
 * Adds or refreshes a buff/debuff on a unit's statusEffects array.
 * If the effect is a DEBUFF (including crowd control and negative status effects),
 * its duration is reduced by `targetDbrPercent` (DBR% — Debuff Resistance).
 */
export function applyStatusEffect(
  effects: ActiveStatusEffect[],
  effectId: string,
  now: number,
  payload: Partial<ActiveStatusEffect> = {},
  targetDbrPercent = 0
): ActiveStatusEffect[] {
  const def = STATUS_EFFECT_DEFINITIONS[effectId];
  if (!def) return effects;

  const rawDurationMs = payload.durationMs ?? def.defaultDurationMs;
  const dbrMult =
    def.category === 'DEBUFF'
      ? Math.max(0, 1 - (targetDbrPercent || 0) / 100)
      : 1;
  const durationMs = Math.round(rawDurationMs * dbrMult);
  if (durationMs <= 0) return effects;

  const isStackable = Boolean(def.stackable);
  const existingIdx = isStackable
    ? -1
    : effects.findIndex((e) => e.effectId === effectId);

  const nextEffect: ActiveStatusEffect = {
    uid:
      existingIdx >= 0
        ? effects[existingIdx].uid
        : `se-${effectId}-${now}-${Math.random()}`,
    effectId: def.id,
    name: def.name,
    category: def.category,
    iconType: def.iconType,
    createdAt: now,
    expiresAt: now + durationMs,
    durationMs,
    tickIntervalMs: payload.tickIntervalMs ?? def.tickIntervalMs,
    lastTickAt:
      existingIdx >= 0 && effects[existingIdx].lastTickAt
        ? effects[existingIdx].lastTickAt
        : now,
    ...payload,
  };
  nextEffect.durationMs = durationMs;
  nextEffect.expiresAt = now + durationMs;

  if (existingIdx >= 0) {
    const copy = [...effects];
    copy[existingIdx] = nextEffect;
    return copy;
  }
  // If stackable, cap at 15 concurrent stacks of the same effectId to keep performance clean
  if (isStackable) {
    const sameEffectCount = effects.filter((e) => e.effectId === effectId).length;
    if (sameEffectCount >= 15) {
      const oldestIdx = effects.findIndex((e) => e.effectId === effectId);
      if (oldestIdx >= 0) {
        const copy = [...effects];
        copy.splice(oldestIdx, 1);
        return [...copy, nextEffect];
      }
    }
  }
  return [...effects, nextEffect];
}

/**
 * Returns true if the unit is currently stunned/paralyzed by PARALYZE_DEBUFF.
 */
export function isUnitParalyzed(
  effects?: ActiveStatusEffect[],
  now?: number
): boolean {
  if (!effects || effects.length === 0) return false;
  for (const ef of effects) {
    if (now !== undefined && now >= ef.expiresAt) continue;
    if (ef.effectId === 'PARALYZE_DEBUFF') return true;
  }
  return false;
}

/**
 * Returns total active shield HP across all shield buffs on a unit.
 */
export function getUnitTotalShield(effects?: ActiveStatusEffect[]): number {
  if (!effects || effects.length === 0) return 0;
  let total = 0;
  for (const ef of effects) {
    if (ef.shieldAmount && ef.shieldAmount > 0) {
      total += ef.shieldAmount;
    }
  }
  return Math.round(total);
}

/**
 * Computes real-time stat deltas (+x / -x) across all 23 combat stats from active statusEffects.
 */
export function getUnitRealtimeStatMods(
  baseStats: UnitCombatStats,
  effects?: ActiveStatusEffect[],
  now?: number
): UnitCombatStats {
  const mods: UnitCombatStats = { ...ZERO_STATS, ats: 0, skd: 0 };
  if (!effects || effects.length === 0) return mods;

  const statKeys: Array<keyof UnitCombatStats> = [
    'maxHp',
    'reg',
    'atk',
    'mag',
    'def',
    'mar',
    'ats',
    'crt',
    'eva',
    'crd',
    'spd',
    'ran',
    'dmgPercent',
    'resPercent',
    'penPercent',
    'penFlat',
    'lifesteal',
    'dmgBlock',
    'dbr',
    'eff',
    'skd',
    'cld',
  ];

  for (const ef of effects) {
    if (now !== undefined && now >= ef.expiresAt) continue;
    if (ef.shieldAmount !== undefined && ef.shieldAmount <= 0) continue;

    let effMod: Partial<UnitCombatStats> & { speed?: number } | undefined =
      ef.statMod;

    // Default stat modifiers for built-in status effects when statMod is not explicitly supplied
    if (!effMod) {
      if (ef.effectId === 'PARALYZE_DEBUFF') {
        // Debuff tê liệt: ngoài bị choáng ra, MAR của kẻ địch còn bị giảm 20%
        effMod = {
          mar: -Math.max(1, Math.round((baseStats.mar || 0) * 0.2)),
        };
      } else if (ef.effectId === 'ARMOR_BREAK') {
        // Debuff phá giáp: Giảm 35% DEF
        effMod = {
          def: -Math.max(1, Math.round((baseStats.def || 0) * 0.35)),
        };
      } else if (ef.effectId === 'WEAKEN_DEBUFF') {
        effMod = {
          atk: -Math.max(1, Math.round((baseStats.atk || 0) * 0.2)),
          mag:
            (baseStats.mag || 0) > 0
              ? -Math.max(1, Math.round((baseStats.mag || 0) * 0.2))
              : 0,
        };
      } else if (ef.effectId === 'SLOW_DEBUFF') {
        // Debuff chậm: Giảm SPD tùy theo kỹ năng (mặc định 30%), có cộng dồn
        const slowPct = ef.slowPercent ?? 30;
        effMod = {
          spd: -Math.max(
            3,
            Math.round(((baseStats.spd || 70) * slowPct) / 100)
          ),
        };
      } else if (ef.effectId === 'STAT_BUFF') {
        effMod = {
          atk: Math.max(2, Math.round((baseStats.atk || 0) * 0.2)),
          def: Math.max(2, Math.round((baseStats.def || 0) * 0.2)),
          mar: Math.max(2, Math.round((baseStats.mar || 0) * 0.2)),
        };
      } else if (ef.effectId === 'BLESSED_SHIELD') {
        effMod = {
          def: Math.max(2, Math.round((baseStats.def || 0) * 0.15)),
          mar: Math.max(2, Math.round((baseStats.mar || 0) * 0.15)),
        };
      }
    }

    if (effMod) {
      for (const k of statKeys) {
        const delta = effMod[k];
        if (typeof delta === 'number' && !Number.isNaN(delta) && delta !== 0) {
          mods[k] = Number((mods[k] + delta).toFixed(2));
        }
      }
      if (
        typeof effMod.speed === 'number' &&
        !Number.isNaN(effMod.speed) &&
        effMod.speed !== 0 &&
        !effMod.spd
      ) {
        mods.spd = Math.round(mods.spd + effMod.speed);
      }
    }
  }

  // Round integer stats and keep 1 decimal for ats
  for (const k of statKeys) {
    if (k === 'ats') {
      mods.ats = Number(mods.ats.toFixed(1));
    } else {
      mods[k] = Math.round(mods[k]);
    }
  }

  // Compute resulting CP (pow) delta if any stat changed
  const hasAnyMod = statKeys.some((k) => mods[k] !== 0);
  if (hasAnyMod) {
    const basePow = baseStats.pow || computeUnitPower(baseStats);
    const effectiveStats: UnitCombatStats = {
      ...baseStats,
      maxHp: Math.max(1, baseStats.maxHp + mods.maxHp),
      reg: Math.max(0, baseStats.reg + mods.reg),
      atk: Math.max(1, baseStats.atk + mods.atk),
      mag: Math.max(0, (baseStats.mag || 0) + mods.mag),
      def: baseStats.def + mods.def,
      mar: baseStats.mar + mods.mar,
      ats: Math.max(0.2, Number((baseStats.ats + mods.ats).toFixed(2))),
      crt: Math.max(0, baseStats.crt + mods.crt),
      eva: Math.max(0, baseStats.eva + mods.eva),
      crd: Math.max(100, baseStats.crd + mods.crd),
      spd: Math.max(10, baseStats.spd + mods.spd),
      ran: Math.max(0, (baseStats.ran || 0) + mods.ran),
      dmgPercent: (baseStats.dmgPercent || 0) + mods.dmgPercent,
      resPercent: (baseStats.resPercent || 0) + mods.resPercent,
      penPercent: Math.max(0, (baseStats.penPercent || 0) + mods.penPercent),
      penFlat: Math.max(0, (baseStats.penFlat || 0) + mods.penFlat),
      lifesteal: Math.max(0, (baseStats.lifesteal || 0) + mods.lifesteal),
      dmgBlock: Math.max(0, (baseStats.dmgBlock || 0) + mods.dmgBlock),
      dbr: Math.max(0, (baseStats.dbr || 0) + mods.dbr),
      eff: Math.max(0, (baseStats.eff || 0) + mods.eff),
      skd: Math.max(0, (baseStats.skd ?? 100) + mods.skd),
      cld: Math.max(0, (baseStats.cld || 0) + mods.cld),
      pow: 0,
    };
    const effPow = computeUnitPower(effectiveStats);
    mods.pow = Math.round(effPow - basePow);
  }

  return mods;
}

/**
 * Returns effective combat stats (baseStats + active statusEffect statMods).
 */
export function getUnitEffectiveCombatStats(
  baseStats: UnitCombatStats,
  effects?: ActiveStatusEffect[],
  now?: number
): UnitCombatStats {
  if (!effects || effects.length === 0) return baseStats;
  const mods = getUnitRealtimeStatMods(baseStats, effects, now);
  return {
    ...baseStats,
    maxHp: Math.max(1, baseStats.maxHp + mods.maxHp),
    reg: Math.max(0, baseStats.reg + mods.reg),
    atk: Math.max(1, baseStats.atk + mods.atk),
    mag: Math.max(0, (baseStats.mag || 0) + mods.mag),
    def: baseStats.def + mods.def,
    mar: baseStats.mar + mods.mar,
    ats: Math.max(0.2, Number((baseStats.ats + mods.ats).toFixed(2))),
    crt: Math.max(0, baseStats.crt + mods.crt),
    eva: Math.max(0, baseStats.eva + mods.eva),
    crd: Math.max(100, baseStats.crd + mods.crd),
    spd: Math.max(10, baseStats.spd + mods.spd),
    ran: Math.max(0, (baseStats.ran || 0) + mods.ran),
    dmgPercent: (baseStats.dmgPercent || 0) + mods.dmgPercent,
    resPercent: (baseStats.resPercent || 0) + mods.resPercent,
    penPercent: Math.max(0, (baseStats.penPercent || 0) + mods.penPercent),
    penFlat: Math.max(0, (baseStats.penFlat || 0) + mods.penFlat),
    lifesteal: Math.max(0, (baseStats.lifesteal || 0) + mods.lifesteal),
    dmgBlock: Math.max(0, (baseStats.dmgBlock || 0) + mods.dmgBlock),
    dbr: Math.max(0, (baseStats.dbr || 0) + mods.dbr),
    eff: Math.max(0, (baseStats.eff || 0) + mods.eff),
    skd: Math.max(0, (baseStats.skd ?? 100) + mods.skd),
    cld: Math.max(0, (baseStats.cld || 0) + mods.cld),
    pow: Math.max(0, (baseStats.pow || 0) + mods.pow),
  };
}

/**
 * Absorbs incoming damage using active shield buffs first, then reduces HP.
 * Automatically removes any shield buff whose shieldAmount drops to 0.
 */
export function absorbDamageWithShields(
  currentHp: number,
  effects: ActiveStatusEffect[],
  damage: number
): { nextHp: number; nextEffects: ActiveStatusEffect[]; absorbed: number } {
  let remainingDmg = Math.max(0, damage);
  let absorbed = 0;

  const nextEffects: ActiveStatusEffect[] = [];

  for (const ef of effects) {
    if (ef.shieldAmount && ef.shieldAmount > 0 && remainingDmg > 0) {
      const take = Math.min(ef.shieldAmount, remainingDmg);
      const leftShield = ef.shieldAmount - take;
      remainingDmg -= take;
      absorbed += take;

      if (leftShield > 0.5) {
        nextEffects.push({
          ...ef,
          shieldAmount: leftShield,
        });
      }
      // If leftShield <= 0.5, the shield is broken and buff is removed
    } else {
      nextEffects.push(ef);
    }
  }

  const nextHp = Math.max(0, Math.round(currentHp - remainingDmg));
  return { nextHp, nextEffects, absorbed };
}

export interface DotTickEvent {
  effectId: string;
  rawDamage: number;
  damageType: DamageType;
}

/**
 * Updates all buffs/debuffs on a unit for the current frame, expiring finished ones
 * and emitting DOT tick events (e.g., every 1000ms for Poison DOT).
 */
export function updateUnitStatusEffects(
  effects: ActiveStatusEffect[],
  now: number
): { nextEffects: ActiveStatusEffect[]; dotEvents: DotTickEvent[] } {
  if (!effects || effects.length === 0) {
    return { nextEffects: [], dotEvents: [] };
  }

  const nextEffects: ActiveStatusEffect[] = [];
  const dotEvents: DotTickEvent[] = [];

  for (const ef of effects) {
    if (now >= ef.expiresAt) {
      continue;
    }
    if (ef.shieldAmount !== undefined && ef.shieldAmount <= 0) {
      continue;
    }

    if (
      ef.tickIntervalMs &&
      ef.dotDamagePerSec &&
      ef.dotDamagePerSec > 0
    ) {
      const lastTick = ef.lastTickAt ?? ef.createdAt;
      if (now - lastTick >= ef.tickIntervalMs) {
        dotEvents.push({
          effectId: ef.effectId,
          rawDamage: ef.dotDamagePerSec,
          damageType: ef.dotDamageType ?? 'MAGIC',
        });
        nextEffects.push({
          ...ef,
          lastTickAt: lastTick + ef.tickIntervalMs,
        });
        continue;
      }
    }

    nextEffects.push(ef);
  }

  return { nextEffects, dotEvents };
}

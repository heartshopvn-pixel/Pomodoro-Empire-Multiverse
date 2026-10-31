import React from 'react';
import {
  BuildingType,
  CustomItemIconKind,
  EquipmentItem,
  EquipmentRarity,
  EquipmentSlot,
  EquipmentVisualKind,
  getSkillBracketColorHex,
  resolveEquipmentItemStructure,
  SkillColorTheme,
  SkillIconGlyph,
  UnitArchetypeId,
  UnitSkillInfo,
} from '../types/game';

interface PortraitProps {
  kind: UnitArchetypeId | BuildingType | CustomItemIconKind | string;
  size?: number;
  className?: string;
}

export const PixelArtPortrait: React.FC<PortraitProps> = ({
  kind,
  size = 56,
  className = '',
}) => {
  if (typeof kind === 'string' && kind.startsWith('EQUIP|')) {
    const parts = kind.split('|');
    const vKind = (parts[1] || 'HELMET') as EquipmentVisualKind;
    const rar = (parts[2] || 'WHITE') as EquipmentRarity;
    const slotFromVisual: EquipmentSlot =
      vKind === 'ARMOR_DEF' || vKind === 'ARMOR_MAR'
        ? 'ARMOR'
        : vKind === 'WEAPON_ATK' || vKind === 'WEAPON_MAG'
          ? 'WEAPON'
          : (vKind as EquipmentSlot);
    return (
      <EquipmentSlotIcon
        slot={slotFromVisual}
        visualKind={vKind}
        rarity={rar}
        size={size}
        className={className}
      />
    );
  }

  if (kind === 'KING') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        shapeRendering="crispEdges"
        className={`bg-[#1e1b18] border-2 border-[#fbbf24] shrink-0 ${className}`}
        aria-label="Chân dung Anh Hùng Farel"
      >
        {/* Royal Tapestry Background */}
        <rect width="24" height="24" fill="#1c120c" />
        <rect x="1" y="1" width="22" height="22" fill="#2e1d14" />
        <rect x="2" y="2" width="20" height="20" fill="#3b2518" />

        {/* Dark Silhouette Outline */}
        <rect x="6" y="2" width="12" height="14" fill="#141013" />
        <rect x="3" y="15" width="18" height="8" fill="#141013" />

        {/* Golden Crown with Gems & Shading */}
        <rect x="7" y="3" width="2" height="2" fill="#fef08a" />
        <rect x="11" y="2" width="2" height="3" fill="#fef08a" />
        <rect x="15" y="3" width="2" height="2" fill="#fef08a" />
        <rect x="7" y="5" width="10" height="3" fill="#fbbf24" />
        <rect x="7" y="7" width="10" height="1" fill="#d97706" />
        <rect x="8" y="5" width="2" height="2" fill="#ef4444" />
        <rect x="14" y="5" width="2" height="2" fill="#3b82f6" />
        <rect x="11" y="5" width="2" height="2" fill="#22c55e" />

        {/* Face & Expressive Eyes */}
        <rect x="7" y="8" width="10" height="6" fill="#fed7aa" />
        <rect x="7" y="8" width="2" height="6" fill="#fdba74" />
        <rect x="8" y="9" width="2" height="2" fill="#0f172a" />
        <rect x="14" y="9" width="2" height="2" fill="#0f172a" />
        <rect x="8" y="9" width="1" height="1" fill="#ffffff" />
        <rect x="14" y="9" width="1" height="1" fill="#ffffff" />

        {/* Royal Beard & Mustache */}
        <rect x="7" y="12" width="10" height="3" fill="#78350f" />
        <rect x="9" y="12" width="6" height="1" fill="#92400e" />
        <rect x="8" y="15" width="8" height="2" fill="#5c280b" />

        {/* Crimson Velvet Cloak & Silver-Gold Plate Armor */}
        <rect x="4" y="16" width="16" height="7" fill="#991b1b" />
        <rect x="6" y="16" width="12" height="7" fill="#dc2626" />
        <rect x="8" y="17" width="8" height="6" fill="#cbd5e1" />
        <rect x="9" y="17" width="6" height="5" fill="#f8fafc" />
        <rect x="10" y="18" width="4" height="4" fill="#f59e0b" />
        <rect x="11" y="19" width="2" height="2" fill="#fef08a" />
      </svg>
    );
  }

  if (kind === 'SOLDIER_MELEE') {
    return (
      <div
        style={{ width: size, height: size }}
        className={`bg-[#172030] border-2 border-[#60a5fa] shrink-0 flex items-center justify-center overflow-hidden ${className}`}
        aria-label="Chân dung Cấm Vệ Quân"
      >
        <img
          src="/assets/aistudio/image_28538eb4.png"
          alt="Cấm Vệ Quân"
          className="w-[88%] h-[88%] object-contain [image-rendering:pixelated]"
        />
      </div>
    );
  }

  if (kind === 'SOLDIER_RANGED') {
    return (
      <div
        style={{ width: size, height: size }}
        className={`bg-[#14261c] border-2 border-[#4ade80] shrink-0 flex items-center justify-center overflow-hidden ${className}`}
        aria-label="Chân dung Cung Thủ Hoàng Gia"
      >
        <img
          src="/assets/aistudio/image_28538eb4.png"
          alt="Cung Thủ Hoàng Gia"
          className="w-[88%] h-[88%] object-contain [image-rendering:pixelated]"
        />
      </div>
    );
  }

  if (kind === 'PEASANT') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        shapeRendering="crispEdges"
        className={`bg-[#261c14] border-2 border-[#eab308] shrink-0 ${className}`}
        aria-label="Chân dung Nông Dân"
      >
        <rect width="24" height="24" fill="#1f1610" />
        <rect x="2" y="2" width="20" height="20" fill="#2e2118" />
        {/* Straw Hat */}
        <rect x="4" y="6" width="16" height="3" fill="#eab308" />
        <rect x="7" y="3" width="10" height="3" fill="#facc15" />
        <rect x="7" y="6" width="10" height="1" fill="#b45309" />
        {/* Face */}
        <rect x="8" y="9" width="8" height="5" fill="#fed7aa" />
        <rect x="9" y="10" width="2" height="2" fill="#0f172a" />
        <rect x="13" y="10" width="2" height="2" fill="#0f172a" />
        {/* Tunic */}
        <rect x="6" y="14" width="12" height="8" fill="#78350f" />
        <rect x="8" y="15" width="8" height="7" fill="#a16207" />
      </svg>
    );
  }

  if (kind === 'ENEMY_MELEE') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        shapeRendering="crispEdges"
        className={`bg-[#2a1215] border-2 border-[#ef4444] shrink-0 ${className}`}
        aria-label="Chân dung Chiến Binh Hắc Ám"
      >
        <rect width="24" height="24" fill="#1f0d10" />
        <rect x="2" y="2" width="20" height="20" fill="#331419" />
        {/* Horned Dark Helm */}
        <rect x="5" y="2" width="2" height="4" fill="#e5e7eb" />
        <rect x="17" y="2" width="2" height="4" fill="#e5e7eb" />
        <rect x="7" y="4" width="10" height="10" fill="#1f2937" />
        <rect x="8" y="5" width="8" height="3" fill="#374151" />
        {/* Glowing Crimson Eyes */}
        <rect x="8" y="9" width="3" height="2" fill="#ef4444" />
        <rect x="13" y="9" width="3" height="2" fill="#ef4444" />
        <rect x="9" y="9" width="1" height="1" fill="#fef08a" />
        <rect x="14" y="9" width="1" height="1" fill="#fef08a" />
        {/* Dark Crimson Plate */}
        <rect x="4" y="14" width="16" height="8" fill="#7f1d1d" />
        <rect x="6" y="15" width="12" height="7" fill="#991b1b" />
        <rect x="10" y="16" width="4" height="5" fill="#1f2937" />
      </svg>
    );
  }

  if (kind === 'ENEMY_RANGED') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        shapeRendering="crispEdges"
        className={`bg-[#22132e] border-2 border-[#c084fc] shrink-0 ${className}`}
        aria-label="Chân dung Cung Thủ Bóng Đêm"
      >
        <rect width="24" height="24" fill="#190d24" />
        <rect x="2" y="2" width="20" height="20" fill="#2b173d" />
        {/* Shadow Cowl */}
        <rect x="6" y="3" width="11" height="11" fill="#3b0764" />
        <rect x="7" y="4" width="9" height="4" fill="#581c87" />
        <rect x="8" y="8" width="7" height="5" fill="#090d16" />
        {/* Glowing Violet Eyes */}
        <rect x="9" y="9" width="2" height="2" fill="#c084fc" />
        <rect x="13" y="9" width="2" height="2" fill="#c084fc" />
        {/* Cloak & Dark Bow */}
        <rect x="5" y="14" width="12" height="8" fill="#4c1d95" />
        <rect x="7" y="15" width="8" height="7" fill="#6b21a8" />
        <rect x="18" y="5" width="2" height="14" fill="#a855f7" />
        <rect x="17" y="6" width="1" height="12" fill="#e9d5ff" />
      </svg>
    );
  }

  if (kind === 'ENEMY_MAGE') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        shapeRendering="crispEdges"
        className={`bg-[#1a1033] border-2 border-[#e879f9] shrink-0 ${className}`}
        aria-label="Chân dung Pháp Sư Bóng Đêm"
      >
        <rect width="24" height="24" fill="#130924" />
        <rect x="2" y="2" width="20" height="20" fill="#1e1136" />
        {/* Pointed Dark Arcane Hat & Hood */}
        <rect x="9" y="1" width="4" height="2" fill="#4c1d95" />
        <rect x="7" y="3" width="8" height="3" fill="#5b21b6" />
        <rect x="4" y="6" width="14" height="2" fill="#6d28d9" />
        <rect x="6" y="6" width="10" height="1" fill="#e879f9" />
        {/* Shadowed Face & Glowing Cyan-Magenta Eyes */}
        <rect x="7" y="8" width="8" height="6" fill="#090d16" />
        <rect x="8" y="10" width="2" height="2" fill="#f472b6" />
        <rect x="12" y="10" width="2" height="2" fill="#38bdf8" />
        {/* Arcane Robe & Runes */}
        <rect x="5" y="14" width="12" height="8" fill="#3b0764" />
        <rect x="7" y="15" width="8" height="7" fill="#581c87" />
        <rect x="10" y="15" width="2" height="7" fill="#e879f9" />
        {/* Staff & Floating Energy Orb */}
        <rect x="18" y="8" width="2" height="14" fill="#78350f" />
        <rect x="16" y="4" width="6" height="5" fill="#c026d3" />
        <rect x="17" y="5" width="4" height="3" fill="#f0abfc" />
        <rect x="18" y="6" width="2" height="1" fill="#ffffff" />
      </svg>
    );
  }

  if (kind === 'ENEMY_CAMP_BUILDING') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        shapeRendering="crispEdges"
        className={`bg-[#260b0e] border-2 border-[#ef4444] shrink-0 ${className}`}
        aria-label="Chân dung Trại Quân Địch"
      >
        <rect width="24" height="24" fill="#170608" />
        <rect x="2" y="2" width="20" height="20" fill="#2c0b0e" />
        {/* Spiked Palisade Logs */}
        <rect x="3" y="10" width="2" height="11" fill="#451a03" />
        <rect x="3" y="9" width="2" height="1" fill="#e5e7eb" />
        <rect x="19" y="10" width="2" height="11" fill="#451a03" />
        <rect x="19" y="9" width="2" height="1" fill="#e5e7eb" />
        {/* Dark Crimson War Tent Roof */}
        <rect x="11" y="2" width="2" height="3" fill="#fbbf24" />
        <rect x="9" y="5" width="6" height="2" fill="#dc2626" />
        <rect x="7" y="7" width="10" height="3" fill="#b91c1c" />
        <rect x="5" y="10" width="14" height="4" fill="#991b1b" />
        <rect x="6" y="7" width="1" height="3" fill="#fca5a5" />
        {/* Bone Horns & Skull Emblem */}
        <rect x="6" y="5" width="2" height="2" fill="#e5e7eb" />
        <rect x="16" y="5" width="2" height="2" fill="#e5e7eb" />
        <rect x="10" y="9" width="4" height="3" fill="#f3f4f6" />
        <rect x="10" y="10" width="1" height="1" fill="#ef4444" />
        <rect x="13" y="10" width="1" height="1" fill="#ef4444" />
        {/* Dark Entrance & Brazier Fire */}
        <rect x="5" y="14" width="14" height="7" fill="#450a0a" />
        <rect x="9" y="14" width="6" height="7" fill="#090508" />
        <rect x="11" y="17" width="2" height="3" fill="#f97316" />
        <rect x="11" y="18" width="2" height="1" fill="#fde047" />
      </svg>
    );
  }

  if (kind === 'ENEMY_WATCHTOWER') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        shapeRendering="crispEdges"
        className={`bg-[#1f122b] border-2 border-[#f87171] shrink-0 ${className}`}
        aria-label="Chân dung Tháp Canh Hắc Ám"
      >
        <rect width="24" height="24" fill="#14091c" />
        <rect x="2" y="2" width="20" height="20" fill="#231130" />
        {/* Pointed Dark Crimson Watchtower Roof */}
        <rect x="11" y="2" width="2" height="2" fill="#ef4444" />
        <rect x="8" y="4" width="8" height="2" fill="#b91c1c" />
        <rect x="6" y="6" width="12" height="2" fill="#991b1b" />
        {/* Archer Deck & Glowing Crossbow/Bow Slit */}
        <rect x="7" y="8" width="10" height="4" fill="#1f2937" />
        <rect x="9" y="9" width="6" height="2" fill="#090508" />
        <rect x="11" y="9" width="2" height="2" fill="#f43f5e" />
        {/* Timber & Dark Stone Tower Pillars */}
        <rect x="6" y="12" width="12" height="2" fill="#451a03" />
        <rect x="7" y="14" width="3" height="7" fill="#57534e" />
        <rect x="14" y="14" width="3" height="7" fill="#57534e" />
        <rect x="10" y="14" width="4" height="7" fill="#27272a" />
        <rect x="10" y="16" width="4" height="1" fill="#78350f" />
        <rect x="10" y="19" width="4" height="1" fill="#78350f" />
      </svg>
    );
  }

  if (kind === 'TOWN_HALL') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        shapeRendering="crispEdges"
        className={`bg-[#261f1a] border border-[#78716c] shrink-0 ${className}`}
        aria-label="Chân dung Nhà Dân"
      >
        <rect width="24" height="24" fill="#172517" />
        {/* Brick Chimney & Smoke */}
        <rect x="17" y="2" width="3" height="6" fill="#991b1b" />
        <rect x="17" y="2" width="3" height="1" fill="#78716c" />
        <rect x="18" y="0" width="2" height="1" fill="#e5e7eb" />
        {/* Dark Cottage Silhouette */}
        <rect x="2" y="8" width="20" height="14" fill="#141013" />
        <rect x="4" y="5" width="16" height="4" fill="#141013" />
        <rect x="7" y="3" width="10" height="3" fill="#141013" />
        {/* Warm Terracotta Shingled Gable Roof */}
        <rect x="2" y="8" width="20" height="2" fill="#9a3412" />
        <rect x="4" y="6" width="16" height="2" fill="#c2410c" />
        <rect x="6" y="4" width="12" height="2" fill="#ea580c" />
        <rect x="8" y="3" width="8" height="1" fill="#fde047" />
        {/* Half-Timbered Cream Plaster Wall & Stone Base */}
        <rect x="4" y="10" width="16" height="9" fill="#fef3c7" />
        <rect x="4" y="19" width="16" height="2" fill="#78716c" />
        {/* Oak Timber Framing Beams */}
        <rect x="4" y="10" width="2" height="9" fill="#451a03" />
        <rect x="18" y="10" width="2" height="9" fill="#451a03" />
        <rect x="11" y="10" width="1" height="9" fill="#451a03" />
        <rect x="4" y="14" width="16" height="1" fill="#451a03" />
        {/* Cozy Wooden Door */}
        <rect x="6" y="14" width="4" height="7" fill="#78350f" />
        <rect x="7" y="15" width="2" height="6" fill="#92400e" />
        <rect x="9" y="17" width="1" height="1" fill="#fbbf24" />
        {/* Lit Window & Flower Box */}
        <rect x="13" y="11" width="4" height="3" fill="#fef08a" />
        <rect x="13" y="14" width="4" height="1" fill="#22c55e" />
        <rect x="14" y="14" width="1" height="1" fill="#f43f5e" />
      </svg>
    );
  }

  if (kind === 'BARRACKS') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        shapeRendering="crispEdges"
        className={`bg-[#261f1a] border border-[#78716c] shrink-0 ${className}`}
      >
        <rect width="24" height="24" fill="#172517" />
        <rect x="2" y="4" width="20" height="18" fill="#141013" />
        {/* Watchtower */}
        <rect x="14" y="5" width="7" height="16" fill="#57534e" />
        <rect x="14" y="5" width="3" height="16" fill="#78716c" />
        <rect x="13" y="3" width="9" height="2" fill="#92400e" />
        {/* Cobalt Garrison Roof */}
        <rect x="3" y="7" width="12" height="4" fill="#1e3a8a" />
        <rect x="4" y="6" width="10" height="2" fill="#2563eb" />
        <rect x="5" y="5" width="8" height="1" fill="#60a5fa" />
        {/* Garrison Wall & Gate */}
        <rect x="3" y="11" width="11" height="10" fill="#78716c" />
        <rect x="6" y="14" width="5" height="7" fill="#1c1917" />
        {/* Golden Shield Emblem */}
        <rect x="16" y="10" width="3" height="4" fill="#fbbf24" />
      </svg>
    );
  }

  if (kind === 'WAREHOUSE') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        shapeRendering="crispEdges"
        className={`bg-[#261f1a] border border-[#fbbf24] shrink-0 ${className}`}
      >
        <rect width="24" height="24" fill="#172517" />
        {/* Dark Outline */}
        <rect x="2" y="5" width="20" height="17" fill="#141013" />
        {/* Timber & Stone Warehouse Roof */}
        <rect x="2" y="5" width="20" height="3" fill="#92400e" />
        <rect x="4" y="4" width="16" height="2" fill="#d97706" />
        <rect x="6" y="3" width="12" height="1" fill="#fbbf24" />
        {/* Stone & Timber Wall */}
        <rect x="3" y="8" width="18" height="13" fill="#78716c" />
        <rect x="4" y="9" width="16" height="11" fill="#a8a29e" />
        {/* Wide Storage Barn Doors & Crates */}
        <rect x="6" y="12" width="12" height="9" fill="#451a03" />
        <rect x="7" y="13" width="10" height="8" fill="#78350f" />
        {/* Golden Grain Sacks & Crates */}
        <rect x="8" y="16" width="3" height="4" fill="#eab308" />
        <rect x="12" y="15" width="4" height="5" fill="#f59e0b" />
        <rect x="13" y="16" width="2" height="2" fill="#fef08a" />
      </svg>
    );
  }

  if (kind === 'HERO_ALTAR') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        shapeRendering="crispEdges"
        className={`bg-[#1e162b] border border-[#fbbf24] shrink-0 ${className}`}
        aria-label="Chân dung Điện Anh Hùng"
      >
        <rect width="24" height="24" fill="#130d1e" />
        {/* Marble Sanctuary Steps */}
        <rect x="2" y="18" width="20" height="4" fill="#cbd5e1" />
        <rect x="3" y="19" width="18" height="2" fill="#f8fafc" />
        {/* Golden Pillars */}
        <rect x="4" y="7" width="3" height="11" fill="#f59e0b" />
        <rect x="4" y="7" width="1" height="11" fill="#fef08a" />
        <rect x="17" y="7" width="3" height="11" fill="#f59e0b" />
        <rect x="17" y="7" width="1" height="11" fill="#fef08a" />
        {/* Royal Purple & Gold Pediment Roof */}
        <rect x="2" y="5" width="20" height="2" fill="#581c87" />
        <rect x="5" y="3" width="14" height="2" fill="#7e22ce" />
        <rect x="8" y="2" width="8" height="1" fill="#a855f7" />
        <rect x="3" y="7" width="18" height="1" fill="#fbbf24" />
        {/* Sacred Altar & Glowing Hero Sword */}
        <rect x="8" y="15" width="8" height="3" fill="#fbbf24" />
        <rect x="11" y="7" width="2" height="7" fill="#38bdf8" />
        <rect x="9" y="10" width="6" height="1" fill="#fef08a" />
      </svg>
    );
  }

  if (kind === 'MANOR') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        shapeRendering="crispEdges"
        className={`bg-[#14261c] border border-[#c084fc] shrink-0 ${className}`}
      >
        <rect width="24" height="24" fill="#0f291e" />
        {/* Lush Courtyard & Pond */}
        <rect x="2" y="17" width="20" height="5" fill="#166534" />
        <rect x="3" y="18" width="5" height="3" fill="#38bdf8" />
        <rect x="10" y="17" width="4" height="5" fill="#94a3b8" />
        {/* Noble Manor Walls */}
        <rect x="4" y="9" width="16" height="8" fill="#fef3c7" />
        <rect x="4" y="13" width="16" height="1" fill="#78350f" />
        <rect x="9" y="9" width="1" height="8" fill="#78350f" />
        <rect x="14" y="9" width="1" height="8" fill="#78350f" />
        {/* Emerald & Gold Roof */}
        <rect x="3" y="6" width="18" height="3" fill="#059669" />
        <rect x="6" y="4" width="12" height="2" fill="#10b981" />
        <rect x="9" y="3" width="6" height="1" fill="#34d399" />
        <rect x="3" y="9" width="18" height="1" fill="#fbbf24" />
        {/* Door & Windows */}
        <rect x="10" y="13" width="4" height="4" fill="#78350f" />
        <rect x="6" y="10" width="2" height="2" fill="#fde047" />
        <rect x="16" y="10" width="2" height="2" fill="#fde047" />
      </svg>
    );
  }

  if (kind === 'CONSTRUCTION_CENTER') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        shapeRendering="crispEdges"
        className={`bg-[#1e1610] border border-[#f59e0b] shrink-0 ${className}`}
      >
        <rect width="24" height="24" fill="#18120b" />
        {/* Stone Foundation */}
        <rect x="2" y="18" width="20" height="4" fill="#57534e" />
        <rect x="3" y="19" width="18" height="2" fill="#a8a29e" />
        {/* Workshop Walls */}
        <rect x="3" y="10" width="14" height="8" fill="#78350f" />
        <rect x="4" y="11" width="12" height="6" fill="#d97706" />
        {/* Royal Blueprint Drafting Table in Front */}
        <rect x="5" y="13" width="8" height="3" fill="#1d4ed8" />
        <rect x="6" y="14" width="6" height="1" fill="#93c5fd" />
        {/* Amber Slate Roof */}
        <rect x="2" y="7" width="16" height="3" fill="#b45309" />
        <rect x="4" y="5" width="12" height="2" fill="#f59e0b" />
        <rect x="2" y="10" width="16" height="1" fill="#fde047" />
        {/* Timber Crane & Pulley on Right */}
        <rect x="18" y="4" width="2" height="14" fill="#92400e" />
        <rect x="13" y="4" width="8" height="2" fill="#fbbf24" />
        <rect x="20" y="6" width="1" height="5" fill="#cbd5e1" />
        <rect x="19" y="11" width="3" height="3" fill="#f97316" />
      </svg>
    );
  }

  if (kind === 'CAMPFIRE') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ imageRendering: 'pixelated' }}
        className={`bg-[#1a110b] border border-[#f97316] shrink-0 ${className}`}
      >
        <rect width="24" height="24" fill="#140c08" />
        {/* Warm Soft Ambient Glow on Ground */}
        <rect x="5" y="15" width="14" height="6" fill="#3b1106" />
        <rect x="7" y="16" width="10" height="4" fill="#6c240c" />
        {/* Compact Stone Ring Base */}
        <rect x="6" y="18" width="3" height="2" fill="#57534e" />
        <rect x="7" y="18" width="1" height="1" fill="#a8a29e" />
        <rect x="15" y="18" width="3" height="2" fill="#57534e" />
        <rect x="16" y="18" width="1" height="1" fill="#a8a29e" />
        <rect x="9" y="19" width="6" height="2" fill="#44403c" />
        <rect x="10" y="19" width="4" height="1" fill="#78716c" />
        {/* Compact Crossed Firewood Logs */}
        <rect x="7" y="16" width="10" height="2" fill="#451a03" />
        <rect x="8" y="16" width="8" height="1" fill="#78350f" />
        <rect x="9" y="15" width="6" height="2" fill="#92400e" />
        {/* Glowing Red-Hot Ember Bed */}
        <rect x="9" y="16" width="6" height="1" fill="#dc2626" />
        <rect x="10" y="16" width="4" height="1" fill="#fb923c" />
        {/* Compact Outer Crimson-Orange Flame */}
        <rect x="8" y="11" width="8" height="5" fill="#ea580c" />
        <rect x="9" y="8" width="6" height="4" fill="#ea580c" />
        <rect x="11" y="6" width="2" height="2" fill="#dc2626" />
        {/* Mid Amber-Gold Flame */}
        <rect x="9" y="11" width="6" height="4" fill="#f97316" />
        <rect x="10" y="9" width="4" height="5" fill="#fbbf24" />
        {/* Bright White-Yellow Flame Core */}
        <rect x="10" y="12" width="4" height="3" fill="#fef08a" />
        <rect x="11" y="10" width="2" height="3" fill="#ffffff" />
        {/* Rising Ember Sparks & Outward Popping Sparks */}
        <rect x="8" y="6" width="1" height="1" fill="#fb923c" />
        <rect x="15" y="5" width="1" height="1" fill="#fde047" />
        <rect x="12" y="3" width="1" height="1" fill="#fef08a" />
        <rect x="4" y="14" width="1" height="1" fill="#f97316" />
        <rect x="19" y="13" width="1" height="1" fill="#fbbf24" />
      </svg>
    );
  }

  // ============================================================================
  // 5 BÌNH EXP ANH HÙNG (5 PHẨM CHẤT — 5 HÌNH DÁNG LỌ 8-BIT PIXEL 16x16 KHÁC NHAU)
  // Quy tắc: Giữ nguyên thiết kế hình dáng từng lọ, Bình EXP Anh Hùng (Đại) vẽ thành
  // bình hình tròn (bầu cầu tròn), và TẤT CẢ 5 bình đều mang dung dịch EXP màu TÍM.
  // ============================================================================
  if (kind === 'EXP_POTION_TINY') {
    // 1. Phẩm chất Thường (Trắng) — Ống Nghiệm Thủy Tinh Nhỏ (Dung dịch Tím)
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 16 16"
        shapeRendering="crispEdges"
        className={`shrink-0 ${className}`}
        aria-label="Bình EXP Anh Hùng (Bé)"
      >
        {/* Nút bần gỗ & cổ ống nghiệm */}
        <rect x="6" y="1" width="4" height="2" fill="#451a03" />
        <rect x="7" y="1" width="2" height="2" fill="#d97706" />
        <rect x="7" y="1" width="1" height="1" fill="#fde047" />
        {/* Viền thủy tinh & miệng ống */}
        <rect x="5" y="3" width="6" height="2" fill="#1e1b4b" />
        <rect x="6" y="3" width="4" height="1" fill="#e9d5ff" />
        {/* Thân ống nghiệm thon dài */}
        <rect x="5" y="5" width="6" height="9" fill="#1e1b4b" />
        <rect x="6" y="14" width="4" height="1" fill="#1e1b4b" />
        {/* Khoảng rỗng thủy tinh phía trên */}
        <rect x="6" y="4" width="4" height="3" fill="#312e81" />
        {/* Dung dịch EXP Tím Tử Tinh */}
        <rect x="6" y="7" width="4" height="7" fill="#7e22ce" />
        <rect x="6" y="7" width="3" height="6" fill="#a855f7" />
        <rect x="6" y="7" width="4" height="1" fill="#e9d5ff" />
        {/* Bọt khí & vệt phản quang thủy tinh */}
        <rect x="7" y="8" width="1" height="4" fill="#f3e8ff" />
        <rect x="7" y="8" width="1" height="1" fill="#ffffff" />
        <rect x="8" y="11" width="1" height="1" fill="#e9d5ff" />
        <rect x="8" y="5" width="1" height="1" fill="#c4b5fd" />
      </svg>
    );
  }

  if (kind === 'EXP_POTION_SMALL') {
    // 2. Phẩm chất Phổ biến (Lục) — Bình Cầu Nhỏ Cổ Thắt (Dung dịch Tím)
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 16 16"
        shapeRendering="crispEdges"
        className={`shrink-0 ${className}`}
        aria-label="Bình EXP Anh Hùng (Nhỏ)"
      >
        {/* Nút gỗ & đai dây tím quanh cổ bình */}
        <rect x="6" y="1" width="4" height="2" fill="#78350f" />
        <rect x="7" y="1" width="2" height="1" fill="#f59e0b" />
        <rect x="5" y="3" width="6" height="2" fill="#1e1b4b" />
        <rect x="6" y="3" width="4" height="1" fill="#e9d5ff" />
        <rect x="6" y="4" width="4" height="2" fill="#6b21a8" />
        <rect x="10" y="4" width="2" height="1" fill="#c084fc" />
        {/* Khung bầu tròn nhỏ thủy tinh (Viền tối 8-bit) */}
        <rect x="4" y="6" width="8" height="2" fill="#1e1b4b" />
        <rect x="3" y="8" width="10" height="5" fill="#1e1b4b" />
        <rect x="4" y="13" width="8" height="2" fill="#1e1b4b" />
        {/* Khoảng thủy tinh trên bầu */}
        <rect x="5" y="6" width="6" height="2" fill="#312e81" />
        {/* Dung dịch EXP Tím sủi bọt */}
        <rect x="4" y="8" width="8" height="5" fill="#7e22ce" />
        <rect x="5" y="13" width="6" height="1" fill="#581c87" />
        <rect x="4" y="8" width="8" height="1" fill="#d8b4fe" />
        <rect x="5" y="9" width="5" height="3" fill="#9333ea" />
        {/* Điểm sáng phản quang & bọt khí */}
        <rect x="5" y="9" width="2" height="2" fill="#f3e8ff" />
        <rect x="5" y="9" width="1" height="1" fill="#ffffff" />
        <rect x="9" y="11" width="1" height="1" fill="#e9d5ff" />
      </svg>
    );
  }

  if (kind === 'EXP_POTION_MEDIUM') {
    // 3. Phẩm chất Hiếm có (Lam) — Bình Tam Giác Giả Kim (Dung dịch Tím)
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 16 16"
        shapeRendering="crispEdges"
        className={`shrink-0 ${className}`}
        aria-label="Bình EXP Anh Hùng (Vừa)"
      >
        {/* Nút pha lê tím & cổ nạm bạc */}
        <rect x="6" y="1" width="4" height="2" fill="#4c1d95" />
        <rect x="7" y="1" width="2" height="2" fill="#c084fc" />
        <rect x="7" y="1" width="1" height="1" fill="#ffffff" />
        <rect x="5" y="3" width="6" height="2" fill="#1e1b4b" />
        <rect x="6" y="3" width="4" height="2" fill="#e2e8f0" />
        {/* Thân bình tam giác nở rộng dần xuống đáy */}
        <rect x="4" y="5" width="8" height="3" fill="#1e1b4b" />
        <rect x="3" y="8" width="10" height="3" fill="#1e1b4b" />
        <rect x="2" y="11" width="12" height="4" fill="#1e1b4b" />
        {/* Khoảng cổ thủy tinh */}
        <rect x="5" y="5" width="6" height="2" fill="#312e81" />
        {/* Dung dịch EXP Tím Tinh Hoa */}
        <rect x="5" y="7" width="6" height="1" fill="#d8b4fe" />
        <rect x="4" y="8" width="8" height="3" fill="#7e22ce" />
        <rect x="3" y="11" width="10" height="3" fill="#581c87" />
        <rect x="4" y="9" width="6" height="4" fill="#9333ea" />
        <rect x="4" y="8" width="7" height="1" fill="#e9d5ff" />
        {/* Tinh thể sáng & vệt phản chiếu */}
        <rect x="5" y="9" width="2" height="3" fill="#f3e8ff" />
        <rect x="5" y="9" width="1" height="1" fill="#ffffff" />
        <rect x="9" y="12" width="2" height="1" fill="#d8b4fe" />
        <rect x="10" y="10" width="1" height="1" fill="#ffffff" />
      </svg>
    );
  }

  if (kind === 'EXP_POTION_LARGE') {
    // 4. Phẩm chất Siêu hiếm (Tím) — Hồ Lô Pha Lê Tử Tinh (Dung dịch Tím)
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 16 16"
        shapeRendering="crispEdges"
        className={`shrink-0 ${className}`}
        aria-label="Bình EXP Anh Hùng (Lớn)"
      >
        {/* Nắp ngọc tím & miệng vàng */}
        <rect x="6" y="0" width="4" height="2" fill="#3b0764" />
        <rect x="7" y="0" width="2" height="2" fill="#c084fc" />
        <rect x="7" y="0" width="1" height="1" fill="#ffffff" />
        <rect x="5" y="2" width="6" height="1" fill="#fbbf24" />
        {/* Bầu trên của Hồ Lô */}
        <rect x="4" y="3" width="8" height="4" fill="#1e1b4b" />
        <rect x="5" y="3" width="6" height="4" fill="#7e22ce" />
        <rect x="6" y="4" width="3" height="2" fill="#d8b4fe" />
        <rect x="6" y="4" width="1" height="1" fill="#ffffff" />
        {/* Eo thắt đai Hoàng Kim + Dải lụa tím */}
        <rect x="5" y="7" width="6" height="2" fill="#451a03" />
        <rect x="5" y="7" width="6" height="1" fill="#fbbf24" />
        <rect x="7" y="7" width="2" height="2" fill="#fef08a" />
        <rect x="11" y="7" width="3" height="2" fill="#a855f7" />
        <rect x="12" y="9" width="2" height="1" fill="#e9d5ff" />
        {/* Bầu dưới lớn của Hồ Lô */}
        <rect x="3" y="9" width="10" height="5" fill="#1e1b4b" />
        <rect x="4" y="14" width="8" height="2" fill="#1e1b4b" />
        <rect x="4" y="9" width="8" height="5" fill="#6b21a8" />
        <rect x="5" y="14" width="6" height="1" fill="#581c87" />
        <rect x="4" y="9" width="7" height="1" fill="#e9d5ff" />
        <rect x="5" y="10" width="6" height="3" fill="#9333ea" />
        {/* Ánh sáng Tử Tinh huyền ảo */}
        <rect x="5" y="10" width="2" height="2" fill="#f3e8ff" />
        <rect x="5" y="10" width="1" height="1" fill="#ffffff" />
        <rect x="9" y="12" width="1" height="1" fill="#e9d5ff" />
      </svg>
    );
  }

  if (kind === 'EXP_POTION_GRAND') {
    // 5. Phẩm chất Huyền thoại (Vàng) — Đại Bình Hình Tròn Hoàng Gia (Spherical Royal Orb Potion - Dung dịch Tím)
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 16 16"
        shapeRendering="crispEdges"
        className={`shrink-0 ${className}`}
        aria-label="Bình EXP Anh Hùng (Đại)"
      >
        {/* Nút ngọc tím vương miện & cổ bình viền vàng */}
        <rect x="6" y="0" width="4" height="2" fill="#3b0764" />
        <rect x="7" y="0" width="2" height="2" fill="#c084fc" />
        <rect x="7" y="0" width="1" height="1" fill="#ffffff" />
        <rect x="5" y="2" width="6" height="2" fill="#78350f" />
        <rect x="5" y="2" width="6" height="1" fill="#fbbf24" />
        <rect x="7" y="2" width="2" height="1" fill="#fef08a" />
        {/* Khung viền Bình Hình Tròn (Bầu cầu tròn trịa 8-bit từ y=3 đến y=14) */}
        <rect x="4" y="3" width="8" height="1" fill="#1e1b4b" />
        <rect x="2" y="4" width="12" height="2" fill="#1e1b4b" />
        <rect x="1" y="6" width="14" height="6" fill="#1e1b4b" />
        <rect x="2" y="12" width="12" height="2" fill="#1e1b4b" />
        <rect x="4" y="14" width="8" height="2" fill="#1e1b4b" />
        {/* Khoảng thủy tinh trong suốt phía trên vòm cầu */}
        <rect x="4" y="4" width="8" height="2" fill="#312e81" />
        <rect x="3" y="5" width="10" height="1" fill="#312e81" />
        {/* Dung dịch EXP Tím Huyền Thoại đầy ắp trong bình tròn */}
        <rect x="3" y="6" width="10" height="1" fill="#e9d5ff" />
        <rect x="2" y="7" width="12" height="5" fill="#6b21a8" />
        <rect x="3" y="12" width="10" height="2" fill="#581c87" />
        <rect x="5" y="14" width="6" height="1" fill="#3b0764" />
        {/* Lớp sáng chuyển sắc Tím Tử Tinh bên trong bầu tròn */}
        <rect x="3" y="7" width="9" height="4" fill="#9333ea" />
        <rect x="4" y="8" width="6" height="3" fill="#a855f7" />
        {/* Đai vòng cung vàng nạm ngọc tím ôm ngang bụng bình tròn */}
        <rect x="2" y="9" width="12" height="1" fill="#d97706" />
        <rect x="4" y="9" width="8" height="1" fill="#fbbf24" />
        <rect x="7" y="8" width="2" height="3" fill="#fbbf24" />
        <rect x="7" y="9" width="2" height="1" fill="#f3e8ff" />
        {/* Vệt phản quang cong theo mặt cầu & bọt tinh hoa sáng */}
        <rect x="3" y="7" width="2" height="2" fill="#f3e8ff" />
        <rect x="4" y="6" width="2" height="1" fill="#ffffff" />
        <rect x="3" y="7" width="1" height="1" fill="#ffffff" />
        <rect x="11" y="11" width="1" height="1" fill="#e9d5ff" />
        <rect x="5" y="12" width="2" height="1" fill="#d8b4fe" />
      </svg>
    );
  }

  // ============================================================================
  // VẬT PHẨM TRANG VIÊN 8-BIT PIXEL 16x16 (ĐỒNG BỘ PHONG CÁCH TRANG BỊ)
  // ============================================================================
  if (kind === 'MANOR_FENCE') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 16 16"
        shapeRendering="crispEdges"
        className={`shrink-0 ${className}`}
        aria-label="Hàng Rào Gỗ Điền Viên"
      >
        {/* Viền tối */}
        <rect x="1" y="3" width="14" height="11" fill="#1c1917" />
        {/* 3 Cọc gỗ sồi vát nhọn */}
        <rect x="2" y="3" width="3" height="10" fill="#78350f" />
        <rect x="2" y="4" width="2" height="8" fill="#b45309" />
        <rect x="3" y="3" width="1" height="2" fill="#fcd34d" />
        <rect x="6" y="2" width="4" height="11" fill="#78350f" />
        <rect x="7" y="3" width="2" height="9" fill="#d97706" />
        <rect x="7" y="2" width="1" height="2" fill="#fde047" />
        <rect x="11" y="3" width="3" height="10" fill="#78350f" />
        <rect x="12" y="4" width="2" height="8" fill="#b45309" />
        <rect x="12" y="3" width="1" height="2" fill="#fcd34d" />
        {/* 2 Thanh ngang đóng đinh sắt */}
        <rect x="1" y="6" width="14" height="2" fill="#92400e" />
        <rect x="2" y="6" width="12" height="1" fill="#f59e0b" />
        <rect x="1" y="10" width="14" height="2" fill="#92400e" />
        <rect x="2" y="10" width="12" height="1" fill="#f59e0b" />
        {/* Thảm cỏ xanh dưới chân rào */}
        <rect x="1" y="13" width="14" height="2" fill="#15803d" />
        <rect x="2" y="12" width="3" height="2" fill="#22c55e" />
        <rect x="7" y="12" width="3" height="2" fill="#4ade80" />
        <rect x="12" y="12" width="2" height="2" fill="#22c55e" />
      </svg>
    );
  }

  if (kind === 'MANOR_GARDEN') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 16 16"
        shapeRendering="crispEdges"
        className={`shrink-0 ${className}`}
        aria-label="Luống Hoa & Thảo Dược"
      >
        {/* Khung gỗ chậu/luống đất */}
        <rect x="1" y="10" width="14" height="5" fill="#1c1917" />
        <rect x="2" y="11" width="12" height="3" fill="#78350f" />
        <rect x="2" y="11" width="12" height="1" fill="#b45309" />
        {/* Tán lá thảo dược xanh mướt */}
        <rect x="2" y="6" width="12" height="5" fill="#052e16" />
        <rect x="3" y="7" width="10" height="4" fill="#16a34a" />
        <rect x="4" y="6" width="8" height="3" fill="#22c55e" />
        <rect x="5" y="7" width="3" height="2" fill="#86efac" />
        {/* 3 Đóa hoa rực rỡ (Đỏ, Vàng, Hồng tím) */}
        <rect x="2" y="3" width="4" height="4" fill="#1c1917" />
        <rect x="3" y="4" width="2" height="2" fill="#f43f5e" />
        <rect x="3" y="4" width="1" height="1" fill="#fda4af" />
        <rect x="6" y="2" width="4" height="4" fill="#1c1917" />
        <rect x="7" y="3" width="2" height="2" fill="#fbbf24" />
        <rect x="7" y="3" width="1" height="1" fill="#ffffff" />
        <rect x="10" y="3" width="4" height="4" fill="#1c1917" />
        <rect x="11" y="4" width="2" height="2" fill="#ec4899" />
        <rect x="11" y="4" width="1" height="1" fill="#fbcfe8" />
      </svg>
    );
  }

  if (kind === 'MANOR_FOUNTAIN') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 16 16"
        shapeRendering="crispEdges"
        className={`shrink-0 ${className}`}
        aria-label="Đài Phun Nước Đá Cổ"
      >
        {/* Tia nước phun vọt trên đỉnh */}
        <rect x="7" y="1" width="2" height="4" fill="#38bdf8" />
        <rect x="7" y="1" width="1" height="2" fill="#ffffff" />
        <rect x="4" y="2" width="3" height="2" fill="#7dd3fc" />
        <rect x="9" y="2" width="3" height="2" fill="#7dd3fc" />
        <rect x="3" y="4" width="2" height="2" fill="#38bdf8" />
        <rect x="11" y="4" width="2" height="2" fill="#38bdf8" />
        {/* Đĩa phun tầng trên & trụ đá cẩm thạch */}
        <rect x="4" y="5" width="8" height="3" fill="#0f172a" />
        <rect x="5" y="6" width="6" height="1" fill="#e2e8f0" />
        <rect x="6" y="8" width="4" height="3" fill="#0f172a" />
        <rect x="7" y="8" width="2" height="3" fill="#cbd5e1" />
        {/* Hồ đá cẩm thạch tầng dưới & mặt nước lam ngọc */}
        <rect x="1" y="10" width="14" height="5" fill="#0f172a" />
        <rect x="2" y="11" width="12" height="3" fill="#94a3b8" />
        <rect x="3" y="11" width="10" height="2" fill="#0ea5e9" />
        <rect x="4" y="11" width="4" height="1" fill="#bae6fd" />
        <rect x="2" y="13" width="12" height="1" fill="#e2e8f0" />
      </svg>
    );
  }

  if (kind === 'MANOR_DEER') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 16 16"
        shapeRendering="crispEdges"
        className={`shrink-0 ${className}`}
        aria-label="Bãi Chăn Hươu Sao Linh Thú"
      >
        {/* Sừng hươu hoàng kim tỏa sáng */}
        <rect x="9" y="1" width="2" height="3" fill="#fde047" />
        <rect x="12" y="1" width="2" height="3" fill="#fde047" />
        <rect x="10" y="2" width="3" height="1" fill="#ffffff" />
        {/* Đầu & cổ Hươu Sao */}
        <rect x="9" y="3" width="5" height="5" fill="#1c1917" />
        <rect x="10" y="4" width="3" height="3" fill="#d97706" />
        <rect x="12" y="5" width="1" height="1" fill="#0f172a" />
        {/* Thân Hươu đốm sao & chân */}
        <rect x="2" y="7" width="10" height="5" fill="#1c1917" />
        <rect x="3" y="8" width="8" height="3" fill="#d97706" />
        <rect x="4" y="8" width="6" height="1" fill="#f59e0b" />
        {/* Đốm trắng sao trên lưng */}
        <rect x="4" y="9" width="1" height="1" fill="#fef08a" />
        <rect x="7" y="9" width="1" height="1" fill="#ffffff" />
        <rect x="9" y="9" width="1" height="1" fill="#fef08a" />
        {/* Chân hươu & thảm cỏ */}
        <rect x="3" y="12" width="2" height="3" fill="#78350f" />
        <rect x="9" y="12" width="2" height="3" fill="#78350f" />
        <rect x="1" y="14" width="14" height="2" fill="#15803d" />
        <rect x="2" y="14" width="12" height="1" fill="#4ade80" />
      </svg>
    );
  }

  if (kind === 'MANOR_STATUE') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 16 16"
        shapeRendering="crispEdges"
        className={`shrink-0 ${className}`}
        aria-label="Tượng Kỳ Lân Hoàng Kim"
      >
        {/* Sừng Thần Kỳ Lân & Bờm Lửa */}
        <rect x="9" y="0" width="3" height="2" fill="#ffffff" />
        <rect x="8" y="1" width="3" height="2" fill="#fef08a" />
        {/* Khung Tượng Kỳ Lân Vàng Ròng */}
        <rect x="4" y="2" width="9" height="9" fill="#1c1917" />
        <rect x="3" y="6" width="9" height="5" fill="#1c1917" />
        <rect x="6" y="3" width="6" height="4" fill="#f59e0b" />
        <rect x="7" y="3" width="4" height="2" fill="#fef08a" />
        <rect x="10" y="4" width="1" height="1" fill="#ef4444" />
        {/* Thân & cánh Kỳ Lân Hoàng Kim */}
        <rect x="4" y="7" width="7" height="4" fill="#d97706" />
        <rect x="5" y="7" width="5" height="3" fill="#fbbf24" />
        <rect x="4" y="5" width="3" height="2" fill="#fef08a" />
        <rect x="5" y="5" width="1" height="1" fill="#ffffff" />
        {/* Bệ đá cẩm thạch hoàng gia */}
        <rect x="2" y="11" width="12" height="4" fill="#0f172a" />
        <rect x="3" y="12" width="10" height="2" fill="#cbd5e1" />
        <rect x="4" y="12" width="8" height="1" fill="#f8fafc" />
        <rect x="5" y="13" width="6" height="1" fill="#fbbf24" />
      </svg>
    );
  }

  if (kind === 'DECO_TREE') {
    // Đồng bộ 100% với Cây Sồi Cổ Thụ 3 tầng tán lá của Engine vẽ Map (drawResourceNode TREE)
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 16 16"
        shapeRendering="crispEdges"
        className={`shrink-0 ${className}`}
      >
        {/* Bóng pixel răng cưa dưới gốc */}
        <rect x="4" y="13" width="8" height="2" fill="rgba(0,0,0,0.42)" />
        <rect x="3" y="13" width="10" height="1" fill="rgba(0,0,0,0.28)" />
        {/* Thân sồi cổ thụ có rễ & rãnh vỏ cây */}
        <rect x="6" y="9" width="4" height="5" fill="#1e130c" />
        <rect x="5" y="13" width="6" height="1" fill="#1e130c" />
        <rect x="6" y="9" width="3" height="5" fill="#4a2c18" />
        <rect x="6" y="9" width="1" height="5" fill="#7c4d2b" />
        <rect x="6" y="13" width="1" height="1" fill="#7c4d2b" />
        {/* Tán lá sồi 3 tầng dày có viền tối #0b2915 giống hệt drawResourceNode */}
        <rect x="2" y="5" width="12" height="5" fill="#0b2915" />
        <rect x="3" y="2" width="10" height="7" fill="#0b2915" />
        <rect x="5" y="1" width="6" height="3" fill="#0b2915" />
        <rect x="3" y="5" width="10" height="4" fill="#14532d" />
        <rect x="4" y="3" width="8" height="6" fill="#166534" />
        <rect x="4" y="2" width="7" height="5" fill="#15803d" />
        <rect x="5" y="1" width="5" height="3" fill="#16a34a" />
        <rect x="5" y="1" width="4" height="2" fill="#22c55e" />
        <rect x="4" y="4" width="3" height="2" fill="#22c55e" />
        <rect x="8" y="4" width="3" height="2" fill="#22c55e" />
        <rect x="6" y="1" width="2" height="1" fill="#4ade80" />
        <rect x="5" y="4" width="2" height="1" fill="#4ade80" />
        <rect x="9" y="4" width="1" height="1" fill="#86efac" />
      </svg>
    );
  }

  if (kind === 'DECO_GRASS_TUFT') {
    // Đồng bộ cụm cỏ thảo nguyên của Engine vẽ Map (#1a3a16, #3d7d35, #448c3b, #5cb84f)
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 16 16"
        shapeRendering="crispEdges"
        className={`shrink-0 ${className}`}
      >
        <rect x="3" y="13" width="10" height="1" fill="rgba(0,0,0,0.35)" />
        <rect x="2" y="12" width="12" height="2" fill="#1a3a16" />
        <rect x="3" y="8" width="2" height="5" fill="#3d7d35" />
        <rect x="5" y="6" width="2" height="7" fill="#448c3b" />
        <rect x="7" y="4" width="2" height="9" fill="#5cb84f" />
        <rect x="9" y="6" width="2" height="7" fill="#448c3b" />
        <rect x="11" y="8" width="2" height="5" fill="#3d7d35" />
        <rect x="7" y="4" width="1" height="3" fill="#86efac" />
      </svg>
    );
  }

  if (kind === 'DECO_BUSH') {
    // Đồng bộ bụi cây rừng của Engine vẽ Map
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 16 16"
        shapeRendering="crispEdges"
        className={`shrink-0 ${className}`}
      >
        <rect x="2" y="13" width="12" height="2" fill="rgba(0,0,0,0.38)" />
        <rect x="2" y="7" width="12" height="6" fill="#0b2915" />
        <rect x="3" y="5" width="10" height="7" fill="#14532d" />
        <rect x="4" y="6" width="8" height="5" fill="#166534" />
        <rect x="4" y="5" width="7" height="4" fill="#3d7d35" />
        <rect x="5" y="5" width="5" height="3" fill="#448c3b" />
        <rect x="5" y="5" width="3" height="2" fill="#5cb84f" />
      </svg>
    );
  }

  if (kind === 'DECO_FLOWER_BUSH') {
    // Đồng bộ cụm hoa mao lương vàng / anh túc đỏ / chuông xanh của Engine vẽ Map
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 16 16"
        shapeRendering="crispEdges"
        className={`shrink-0 ${className}`}
      >
        <rect x="2" y="13" width="12" height="2" fill="rgba(0,0,0,0.38)" />
        <rect x="2" y="7" width="12" height="6" fill="#0b2915" />
        <rect x="3" y="5" width="10" height="7" fill="#1a3a16" />
        <rect x="4" y="5" width="8" height="6" fill="#3d7d35" />
        <rect x="5" y="5" width="6" height="4" fill="#448c3b" />
        {/* Hoa anh túc đỏ (#ef4444 / #fca5a5) */}
        <rect x="4" y="6" width="2" height="2" fill="#ef4444" />
        <rect x="4" y="6" width="1" height="1" fill="#fca5a5" />
        {/* Hoa mao lương vàng (#facc15 / #fef08a) */}
        <rect x="8" y="5" width="2" height="2" fill="#facc15" />
        <rect x="8" y="5" width="1" height="1" fill="#fef08a" />
        {/* Hoa chuông xanh (#3b82f6 / #93c5fd) */}
        <rect x="10" y="8" width="2" height="2" fill="#3b82f6" />
        <rect x="10" y="8" width="1" height="1" fill="#93c5fd" />
        <rect x="6" y="9" width="2" height="2" fill="#f59e0b" />
      </svg>
    );
  }

  if (kind === 'DECO_ROCK') {
    // Đồng bộ tảng đá cuội / đá cảnh rêu phong của Engine vẽ Map (#1c1917, #57534e, #78716c, #a8a29e, #d6d3d1)
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 16 16"
        shapeRendering="crispEdges"
        className={`shrink-0 ${className}`}
      >
        <rect x="2" y="13" width="12" height="2" fill="rgba(0,0,0,0.42)" />
        <rect x="2" y="8" width="12" height="6" fill="#1c1917" />
        <rect x="4" y="5" width="8" height="8" fill="#1c1917" />
        <rect x="3" y="9" width="10" height="4" fill="#57534e" />
        <rect x="5" y="6" width="6" height="6" fill="#78716c" />
        <rect x="5" y="6" width="4" height="2" fill="#d6d3d1" />
        <rect x="3" y="9" width="3" height="2" fill="#a8a29e" />
        <rect x="4" y="10" width="3" height="2" fill="#448c3b" />
        <rect x="10" y="11" width="2" height="2" fill="#5cb84f" />
      </svg>
    );
  }

  if (kind === 'MYSTIC_IRON_ORE') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 16 16"
        shapeRendering="crispEdges"
        className={`shrink-0 ${className}`}
        aria-label="Đá Huyền Thiếc"
      >
        {/* Khung viền tối của khối khoáng thạch Huyền Thiếc 8-bit */}
        <rect x="5" y="1" width="6" height="2" fill="#0f172a" />
        <rect x="3" y="3" width="10" height="3" fill="#0f172a" />
        <rect x="2" y="6" width="12" height="6" fill="#0f172a" />
        <rect x="3" y="12" width="10" height="3" fill="#0f172a" />
        {/* Thân quặng sắt đen huyền cổ đại */}
        <rect x="6" y="2" width="4" height="2" fill="#334155" />
        <rect x="4" y="4" width="8" height="3" fill="#1e293b" />
        <rect x="3" y="7" width="10" height="5" fill="#1e293b" />
        <rect x="4" y="12" width="8" height="2" fill="#0f172a" />
        {/* Các mặt vát kim loại Huyền Thiếc ánh bạc xám */}
        <rect x="5" y="3" width="5" height="3" fill="#475569" />
        <rect x="4" y="6" width="6" height="4" fill="#334155" />
        <rect x="8" y="8" width="4" height="4" fill="#475569" />
        {/* Mạch tinh thể Lam Ngọc Huyền Thiếc phát sáng */}
        <rect x="6" y="3" width="2" height="2" fill="#38bdf8" />
        <rect x="7" y="2" width="1" height="1" fill="#ffffff" />
        <rect x="4" y="7" width="3" height="2" fill="#0284c7" />
        <rect x="5" y="7" width="2" height="1" fill="#7dd3fc" />
        <rect x="5" y="7" width="1" height="1" fill="#ffffff" />
        <rect x="9" y="6" width="2" height="3" fill="#0ea5e9" />
        <rect x="9" y="6" width="1" height="2" fill="#bae6fd" />
        <rect x="6" y="10" width="4" height="2" fill="#0284c7" />
        <rect x="7" y="10" width="2" height="1" fill="#7dd3fc" />
        {/* Tia lấp lánh quanh khối đá */}
        <rect x="2" y="3" width="1" height="1" fill="#7dd3fc" />
        <rect x="13" y="4" width="1" height="1" fill="#bae6fd" />
        <rect x="12" y="12" width="1" height="1" fill="#38bdf8" />
      </svg>
    );
  }

  if (kind === 'MARCH_ORDER') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 16 16"
        shapeRendering="crispEdges"
        className={`shrink-0 ${className}`}
        aria-label="Lệnh Hành Quân"
      >
        {/* Khung lệnh bài hoàng kim chiến trận */}
        <rect x="3" y="1" width="10" height="14" fill="#1c1008" />
        <rect x="2" y="2" width="12" height="12" fill="#451a03" />
        <rect x="3" y="2" width="10" height="12" fill="#b91c1c" />
        <rect x="4" y="3" width="8" height="10" fill="#dc2626" />
        {/* Viền vàng kim bốn góc */}
        <rect x="3" y="2" width="10" height="1" fill="#fbbf24" />
        <rect x="3" y="13" width="10" height="1" fill="#fbbf24" />
        <rect x="3" y="2" width="1" height="12" fill="#fbbf24" />
        <rect x="12" y="2" width="1" height="12" fill="#fbbf24" />
        {/* Biểu tượng Song Kiếm & Ấn Vàng ở tâm lệnh bài */}
        <rect x="7" y="4" width="2" height="7" fill="#fef08a" />
        <rect x="5" y="6" width="6" height="2" fill="#fbbf24" />
        <rect x="6" y="11" width="4" height="1" fill="#f59e0b" />
        <rect x="7" y="5" width="1" height="1" fill="#ffffff" />
      </svg>
    );
  }

  if (kind === 'RENAME_CARD') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 16 16"
        shapeRendering="crispEdges"
        className={`shrink-0 ${className}`}
        aria-label="Thẻ Đổi Tên Vương Quốc"
      >
        {/* Cuộn chiếu chỉ tím hoàng kim */}
        <rect x="2" y="1" width="12" height="2" fill="#fbbf24" />
        <rect x="3" y="3" width="10" height="10" fill="#581c87" />
        <rect x="4" y="4" width="8" height="8" fill="#fef3c7" />
        <rect x="2" y="13" width="12" height="2" fill="#fbbf24" />
        {/* Dòng chữ & bút lông hoàng gia */}
        <rect x="5" y="6" width="4" height="1" fill="#7c2d12" />
        <rect x="5" y="8" width="5" height="1" fill="#7c2d12" />
        <rect x="10" y="5" width="2" height="5" fill="#a855f7" />
        <rect x="9" y="10" width="2" height="1" fill="#fbbf24" />
      </svg>
    );
  }

  if (kind === 'LAND_EXPAND_CARD') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 16 16"
        shapeRendering="crispEdges"
        className={`shrink-0 ${className}`}
        aria-label="Thẻ Lệnh Mở Rộng Đất Vương Quốc"
      >
        {/* Viền khế ước vàng kim & nền bản đồ ngọc lục bảo */}
        <rect x="1" y="1" width="14" height="14" fill="#fbbf24" />
        <rect x="2" y="2" width="12" height="12" fill="#064e3b" />
        {/* Lưới chunk 16x16 & la bàn mở rộng */}
        <rect x="3" y="3" width="4" height="4" fill="#10b981" />
        <rect x="9" y="3" width="4" height="4" fill="#34d399" />
        <rect x="3" y="9" width="4" height="4" fill="#059669" />
        <rect x="9" y="9" width="4" height="4" fill="#34d399" />
        {/* Mũi tên mở rộng 2 hướng từ gốc A */}
        <rect x="7" y="2" width="2" height="12" fill="#fde68a" />
        <rect x="2" y="7" width="12" height="2" fill="#fde68a" />
        <rect x="6" y="6" width="4" height="4" fill="#a855f7" />
        <rect x="7" y="7" width="2" height="2" fill="#ffffff" />
      </svg>
    );
  }

  // 1. Tháp Cung Thủ (TOWER_ARCHER)
  if (kind === 'TOWER_ARCHER') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 16 16"
        shapeRendering="crispEdges"
        className="shrink-0"
      >
        <rect width="16" height="16" fill="#0f172a" />
        <rect x="0" y="0" width="16" height="1" fill="#38bdf8" />
        <rect x="0" y="15" width="16" height="1" fill="#38bdf8" />
        {/* Mái tháp nhọn xanh lam hoàng gia */}
        <rect x="7" y="2" width="2" height="1" fill="#fbbf24" />
        <rect x="6" y="3" width="4" height="1" fill="#2563eb" />
        <rect x="5" y="4" width="6" height="2" fill="#1d4ed8" />
        <rect x="4" y="6" width="8" height="1" fill="#fbbf24" />
        {/* Đài bắn cung trên đỉnh */}
        <rect x="5" y="7" width="6" height="2" fill="#78350f" />
        <rect x="7" y="7" width="2" height="2" fill="#fef08a" />
        {/* Thân tháp đá xám & gỗ */}
        <rect x="5" y="9" width="6" height="5" fill="#64748b" />
        <rect x="4" y="13" width="8" height="2" fill="#475569" />
        <rect x="7" y="10" width="2" height="2" fill="#0f172a" />
      </svg>
    );
  }

  // 2. Tháp Súng Hỏa Mai (TOWER_MUSKET)
  if (kind === 'TOWER_MUSKET') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 16 16"
        shapeRendering="crispEdges"
        className="shrink-0"
      >
        <rect width="16" height="16" fill="#1e1b18" />
        <rect x="0" y="0" width="16" height="1" fill="#f59e0b" />
        <rect x="0" y="15" width="16" height="1" fill="#f59e0b" />
        {/* Mái vòm đồng thau & nòng súng hỏa mai */}
        <rect x="5" y="3" width="6" height="2" fill="#b45309" />
        <rect x="4" y="5" width="8" height="1" fill="#fbbf24" />
        {/* Nòng súng hỏa mai vươn ngang */}
        <rect x="9" y="6" width="5" height="2" fill="#cbd5e1" />
        <rect x="13" y="6" width="2" height="2" fill="#f97316" />
        <rect x="5" y="6" width="5" height="3" fill="#78350f" />
        {/* Thân tháp gạch đá kiên cố */}
        <rect x="4" y="9" width="8" height="4" fill="#57534e" />
        <rect x="3" y="13" width="10" height="2" fill="#44403c" />
        <rect x="7" y="10" width="2" height="2" fill="#fbbf24" />
      </svg>
    );
  }

  // 3. Tháp Pháo Hạng Nặng (TOWER_CANNON)
  if (kind === 'TOWER_CANNON') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 16 16"
        shapeRendering="crispEdges"
        className="shrink-0"
      >
        <rect width="16" height="16" fill="#1c1917" />
        <rect x="0" y="0" width="16" height="1" fill="#ef4444" />
        <rect x="0" y="15" width="16" height="1" fill="#ef4444" />
        {/* Khẩu đại pháo gang đen cỡ lớn trên đỉnh */}
        <rect x="4" y="3" width="7" height="4" fill="#27272a" />
        <rect x="9" y="3" width="5" height="3" fill="#3f3f46" />
        <rect x="13" y="3" width="2" height="3" fill="#fbbf24" />
        <rect x="5" y="4" width="2" height="2" fill="#ef4444" />
        {/* Pháo đài đá bọc thép */}
        <rect x="3" y="7" width="10" height="2" fill="#dc2626" />
        <rect x="4" y="9" width="8" height="4" fill="#52525b" />
        <rect x="3" y="13" width="10" height="2" fill="#3f3f46" />
        <rect x="6" y="10" width="4" height="3" fill="#18181b" />
      </svg>
    );
  }

  // 4. Tháp Pháo Hextech (TOWER_HEXTECH)
  if (kind === 'TOWER_HEXTECH') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 16 16"
        shapeRendering="crispEdges"
        className="shrink-0"
      >
        <rect width="16" height="16" fill="#082f49" />
        <rect x="0" y="0" width="16" height="1" fill="#38bdf8" />
        <rect x="0" y="15" width="16" height="1" fill="#38bdf8" />
        {/* Quả cầu lõi năng lượng Hextech lơ lửng trên đỉnh */}
        <rect x="6" y="2" width="4" height="4" fill="#0284c7" />
        <rect x="7" y="3" width="2" height="2" fill="#e0f2fe" />
        <rect x="5" y="3" width="1" height="2" fill="#38bdf8" />
        <rect x="10" y="3" width="1" height="2" fill="#38bdf8" />
        {/* Vòng dẫn điện vàng đồng Hextech */}
        <rect x="4" y="6" width="8" height="2" fill="#fbbf24" />
        {/* Thân tháp ma đạo xanh tím */}
        <rect x="5" y="8" width="6" height="5" fill="#1e3a8a" />
        <rect x="7" y="9" width="2" height="4" fill="#38bdf8" />
        <rect x="4" y="13" width="8" height="2" fill="#b45309" />
      </svg>
    );
  }

  // ============================================================================
  // 25 ITEM TÚI & RƯƠNG TÀI NGUYÊN / TIỀN TỆ (PACK_FOOD / WOOD / STONE / GOLD / DIAMOND _ 1..5)
  // Cấp 1: Túi (Nhỏ) · Cấp 2: Túi (Lớn) · Cấp 3: Rương (Nhỏ) · Cấp 4: Rương (Vừa) · Cấp 5: Rương (Lớn)
  // ============================================================================
  const packMatch = String(kind || '').match(
    /^PACK_(FOOD|WOOD|STONE|GOLD|DIAMOND)_([1-5])$/
  );
  if (packMatch) {
    const resKind = packMatch[1] as 'FOOD' | 'WOOD' | 'STONE' | 'GOLD' | 'DIAMOND';
    const tier = Number(packMatch[2]); // 1..5

    const themeMap: Record<
      typeof resKind,
      {
        bagDark: string;
        bagMid: string;
        bagLight: string;
        symDark: string;
        symMain: string;
        symBright: string;
        cord: string;
      }
    > = {
      FOOD: {
        bagDark: '#3f2e18',
        bagMid: '#854d0e',
        bagLight: '#ca8a04',
        symDark: '#15803d',
        symMain: '#4ade80',
        symBright: '#fef08a',
        cord: '#dc2626',
      },
      WOOD: {
        bagDark: '#29180b',
        bagMid: '#78350f',
        bagLight: '#b45309',
        symDark: '#451a03',
        symMain: '#d97706',
        symBright: '#fde68a',
        cord: '#fbbf24',
      },
      STONE: {
        bagDark: '#1c1917',
        bagMid: '#57534e',
        bagLight: '#78716c',
        symDark: '#44403c',
        symMain: '#a8a29e',
        symBright: '#f5f5f4',
        cord: '#38bdf8',
      },
      GOLD: {
        bagDark: '#451a03',
        bagMid: '#b45309',
        bagLight: '#f59e0b',
        symDark: '#d97706',
        symMain: '#fde047',
        symBright: '#ffffff',
        cord: '#ef4444',
      },
      DIAMOND: {
        bagDark: '#0c2747',
        bagMid: '#0369a1',
        bagLight: '#0ea5e9',
        symDark: '#0284c7',
        symMain: '#38bdf8',
        symBright: '#e0f2fe',
        cord: '#fbbf24',
      },
    };
    const th = themeMap[resKind];
    const renderCenterEmblem = (cx: number, cy: number) => {
      if (resKind === 'FOOD') {
        // Bông lúa mì / Lương thực
        return (
          <>
            <rect x={cx - 1} y={cy - 2} width="2" height="4" fill={th.symMain} />
            <rect x={cx - 2} y={cy - 1} width="1" height="2" fill={th.symBright} />
            <rect x={cx + 1} y={cy - 1} width="1" height="2" fill={th.symBright} />
            <rect x={cx - 1} y={cy - 2} width="1" height="1" fill="#ffffff" />
          </>
        );
      }
      if (resKind === 'WOOD') {
        // Khúc gỗ tròn vân sáng
        return (
          <>
            <rect x={cx - 2} y={cy - 1} width="4" height="3" fill={th.symDark} />
            <rect x={cx - 1} y={cy - 1} width="2" height="2" fill={th.symMain} />
            <rect x={cx} y={cy - 1} width="1" height="1" fill={th.symBright} />
          </>
        );
      }
      if (resKind === 'STONE') {
        // Khối đá góc cạnh
        return (
          <>
            <rect x={cx - 2} y={cy - 1} width="4" height="3" fill={th.symMain} />
            <rect x={cx - 1} y={cy - 2} width="2" height="2" fill={th.symBright} />
            <rect x={cx} y={cy} width="2" height="2" fill={th.symDark} />
          </>
        );
      }
      if (resKind === 'GOLD') {
        // Đồng tiền vàng lấp lánh
        return (
          <>
            <rect x={cx - 2} y={cy - 2} width="4" height="4" fill={th.symMain} />
            <rect x={cx - 1} y={cy - 1} width="2" height="2" fill={th.symBright} />
          </>
        );
      }
      // Viên Kim Cương giác cắt
      return (
        <>
          <rect x={cx - 1} y={cy - 2} width="2" height="4" fill={th.symMain} />
          <rect x={cx - 2} y={cy - 1} width="4" height="2" fill={th.symMain} />
          <rect x={cx - 1} y={cy - 1} width="1" height="1" fill="#ffffff" />
        </>
      );
    };

    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 16 16"
        shapeRendering="crispEdges"
        className={`shrink-0 ${className}`}
        aria-label={String(kind)}
      >
        {tier === 1 ? (
          <>
            {/* Cấp 1 (WHITE): Túi Nhỏ */}
            <rect x="5" y="3" width="6" height="2" fill="#141013" />
            <rect x="6" y="3" width="4" height="1" fill={th.symMain} />
            <rect x="5" y="5" width="6" height="1" fill={th.cord} />
            <rect x="4" y="6" width="8" height="7" fill="#141013" />
            <rect x="5" y="6" width="6" height="6" fill={th.bagMid} />
            <rect x="5" y="6" width="3" height="5" fill={th.bagLight} />
            {renderCenterEmblem(8, 9)}
          </>
        ) : tier === 2 ? (
          <>
            {/* Cấp 2 (GREEN): Túi Lớn căng phồng */}
            <rect x="4" y="1" width="8" height="3" fill="#141013" />
            <rect x="5" y="2" width="6" height="2" fill={th.symMain} />
            <rect x="6" y="1" width="3" height="1" fill={th.symBright} />
            <rect x="4" y="4" width="8" height="2" fill={th.cord} />
            <rect x="2" y="6" width="12" height="9" fill="#141013" />
            <rect x="3" y="6" width="10" height="8" fill={th.bagMid} />
            <rect x="3" y="6" width="5" height="7" fill={th.bagLight} />
            <rect x="4" y="7" width="2" height="2" fill={th.symBright} />
            {renderCenterEmblem(8, 10)}
          </>
        ) : tier === 3 ? (
          <>
            {/* Cấp 3 (BLUE): Rương Nhỏ */}
            <rect x="3" y="4" width="10" height="9" fill="#141013" />
            <rect x="4" y="5" width="8" height="2" fill={th.bagLight} />
            <rect x="4" y="7" width="8" height="1" fill="#38bdf8" />
            <rect x="4" y="8" width="8" height="4" fill={th.bagMid} />
            <rect x="3" y="5" width="1" height="7" fill="#94a3b8" />
            <rect x="12" y="5" width="1" height="7" fill="#94a3b8" />
            {renderCenterEmblem(8, 9)}
          </>
        ) : tier === 4 ? (
          <>
            {/* Cấp 4 (PURPLE): Rương Vừa nạm ngọc tím */}
            <rect x="2" y="3" width="12" height="11" fill="#141013" />
            <rect x="3" y="4" width="10" height="3" fill={th.bagLight} />
            <rect x="4" y="4" width="4" height="1" fill={th.symBright} />
            <rect x="3" y="7" width="10" height="1" fill="#c084fc" />
            <rect x="3" y="8" width="10" height="5" fill={th.bagMid} />
            <rect x="3" y="4" width="1" height="9" fill="#fbbf24" />
            <rect x="12" y="4" width="1" height="9" fill="#fbbf24" />
            <rect x="7" y="6" width="2" height="3" fill="#fde047" />
            {renderCenterEmblem(8, 10)}
          </>
        ) : (
          <>
            {/* Cấp 5 (GOLD): Rương Lớn Huyền Thoại tràn đầy bảo vật */}
            <rect x="2" y="1" width="12" height="3" fill="#141013" />
            <rect x="3" y="2" width="10" height="2" fill="#f59e0b" />
            <rect x="4" y="1" width="8" height="1" fill="#fef08a" />
            {/* Kho báu tràn nắp rương */}
            <rect x="3" y="4" width="10" height="2" fill={th.symMain} />
            <rect x="5" y="4" width="6" height="1" fill={th.symBright} />
            <rect x="7" y="3" width="2" height="1" fill="#ffffff" />
            {/* Thân đại bảo rương hoàng kim */}
            <rect x="1" y="6" width="14" height="9" fill="#141013" />
            <rect x="2" y="6" width="12" height="1" fill="#fde047" />
            <rect x="2" y="7" width="12" height="7" fill={th.bagMid} />
            <rect x="3" y="7" width="10" height="5" fill={th.bagLight} />
            <rect x="2" y="6" width="2" height="8" fill="#fbbf24" />
            <rect x="12" y="6" width="2" height="8" fill="#fbbf24" />
            <rect x="2" y="13" width="12" height="1" fill="#fbbf24" />
            {renderCenterEmblem(8, 10)}
          </>
        )}
      </svg>
    );
  }

  if (kind === 'FARM') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        shapeRendering="crispEdges"
        className={`bg-[#261f1a] border border-[#78716c] shrink-0 ${className}`}
      >
        <rect width="24" height="24" fill="#422006" />
        <rect x="2" y="2" width="20" height="20" fill="#5c2d0c" />
        {/* Red Barn */}
        <rect x="3" y="3" width="8" height="8" fill="#141013" />
        <rect x="4" y="5" width="6" height="5" fill="#b91c1c" />
        <rect x="3" y="3" width="8" height="2" fill="#f59e0b" />
        <rect x="4" y="2" width="6" height="1" fill="#fde047" />
        {/* Golden Wheat Rows */}
        <rect x="13" y="5" width="2" height="5" fill="#eab308" />
        <rect x="13" y="4" width="2" height="2" fill="#fef08a" />
        <rect x="17" y="5" width="2" height="5" fill="#eab308" />
        <rect x="17" y="4" width="2" height="2" fill="#fef08a" />
        <rect x="5" y="14" width="2" height="6" fill="#eab308" />
        <rect x="5" y="13" width="2" height="2" fill="#fef08a" />
        <rect x="10" y="14" width="2" height="6" fill="#eab308" />
        <rect x="10" y="13" width="2" height="2" fill="#fef08a" />
        <rect x="15" y="14" width="2" height="6" fill="#eab308" />
        <rect x="15" y="13" width="2" height="2" fill="#fef08a" />
      </svg>
    );
  }

  // ============================================================================
  // BỘ TỰ ĐỘNG VẼ ĐỒ HỌA 2D PIXEL 8-BIT (16x16) CHO MỌI ITEM MỚI TRONG TƯƠNG LAI
  // Tự động nhận diện từ khóa/loại item (Lọ thuốc, Cuộn giấy/Sách, Kiếm/Vũ khí,
  // Khiên, Chìa khóa, Rương, Linh thạch/Ngọc, Thảo dược/Hạt giống...) hoặc băm
  // mã định danh để dựng hình 16x16 Pixel Art có viền tối & đổ bóng chuẩn như Trang Bị.
  // ============================================================================
  const keyStr = String(kind || 'ITEM').toUpperCase();
  let hash = 0;
  for (let i = 0; i < keyStr.length; i++) {
    hash = (hash * 31 + keyStr.charCodeAt(i)) >>> 0;
  }
  const palettes = [
    { dark: '#0f172a', mid: '#0284c7', bright: '#38bdf8', shine: '#e0f2fe', accent: '#fbbf24' },
    { dark: '#1c1917', mid: '#b45309', bright: '#f59e0b', shine: '#fef08a', accent: '#ef4444' },
    { dark: '#1e1b4b', mid: '#7e22ce', bright: '#a855f7', shine: '#f3e8ff', accent: '#fde047' },
    { dark: '#052e16', mid: '#15803d', bright: '#22c55e', shine: '#bbf7d0', accent: '#fbbf24' },
    { dark: '#450a0a', mid: '#b91c1c', bright: '#ef4444', shine: '#fecaca', accent: '#fde047' },
  ];
  const p = palettes[hash % palettes.length];

  const isPotionLike =
    keyStr.includes('POTION') ||
    keyStr.includes('ELIXIR') ||
    keyStr.includes('EXP') ||
    keyStr.includes('FLASK') ||
    keyStr.includes('VIAL');
  const isScrollOrBook =
    keyStr.includes('SCROLL') ||
    keyStr.includes('BOOK') ||
    keyStr.includes('TOME') ||
    keyStr.includes('CARD') ||
    keyStr.includes('MAP');
  const isKeyOrRelic =
    keyStr.includes('KEY') ||
    keyStr.includes('TOKEN') ||
    keyStr.includes('MEDAL') ||
    keyStr.includes('SEAL');
  const isHerbOrSeed =
    keyStr.includes('HERB') ||
    keyStr.includes('SEED') ||
    keyStr.includes('PLANT') ||
    keyStr.includes('LEAF') ||
    keyStr.includes('FRUIT');

  const shapeVariant = isPotionLike
    ? 3
    : isScrollOrBook
      ? 1
      : isKeyOrRelic
        ? 4
        : isHerbOrSeed
          ? 5
          : hash % 3;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      className={`shrink-0 ${className}`}
      aria-label={`Item Pixel ${keyStr}`}
    >
      {shapeVariant === 0 ? (
        <>
          {/* Kiểu 0: Rương / Hộp Bảo Vật 8-bit Pixel */}
          <rect x="2" y="3" width="12" height="10" fill={p.dark} />
          <rect x="3" y="4" width="10" height="3" fill={p.bright} />
          <rect x="4" y="4" width="5" height="1" fill={p.shine} />
          <rect x="3" y="7" width="10" height="1" fill={p.accent} />
          <rect x="3" y="8" width="10" height="4" fill={p.mid} />
          <rect x="7" y="6" width="2" height="3" fill={p.accent} />
          <rect x="7" y="7" width="1" height="1" fill="#ffffff" />
        </>
      ) : shapeVariant === 1 ? (
        <>
          {/* Kiểu 1: Cuộn Bí Kíp / Cổ Thư / Lệnh Bài 8-bit Pixel */}
          <rect x="3" y="2" width="10" height="12" fill={p.dark} />
          <rect x="2" y="2" width="12" height="2" fill={p.accent} />
          <rect x="2" y="12" width="12" height="2" fill={p.accent} />
          <rect x="4" y="4" width="8" height="8" fill="#fef3c7" />
          <rect x="5" y="5" width="6" height="2" fill={p.bright} />
          <rect x="6" y="7" width="4" height="3" fill={p.mid} />
          <rect x="7" y="7" width="2" height="1" fill={p.shine} />
        </>
      ) : shapeVariant === 3 ? (
        <>
          {/* Kiểu 3: Lọ Linh Dược Tròn 8-bit Pixel */}
          <rect x="6" y="1" width="4" height="2" fill="#78350f" />
          <rect x="7" y="1" width="2" height="1" fill={p.accent} />
          <rect x="5" y="3" width="6" height="2" fill={p.dark} />
          <rect x="3" y="5" width="10" height="8" fill={p.dark} />
          <rect x="4" y="13" width="8" height="2" fill={p.dark} />
          <rect x="4" y="6" width="8" height="6" fill={p.mid} />
          <rect x="4" y="6" width="8" height="1" fill={p.shine} />
          <rect x="5" y="7" width="5" height="4" fill={p.bright} />
          <rect x="5" y="7" width="2" height="2" fill="#ffffff" />
        </>
      ) : shapeVariant === 4 ? (
        <>
          {/* Kiểu 4: Chìa Khóa / Ấn Tín Hoàng Kim 8-bit Pixel */}
          <rect x="4" y="1" width="8" height="6" fill={p.dark} />
          <rect x="5" y="2" width="6" height="4" fill={p.accent} />
          <rect x="7" y="3" width="2" height="2" fill={p.bright} />
          <rect x="7" y="7" width="3" height="8" fill={p.dark} />
          <rect x="7" y="7" width="2" height="7" fill={p.accent} />
          <rect x="9" y="10" width="3" height="2" fill={p.accent} />
          <rect x="9" y="13" width="3" height="2" fill={p.accent} />
          <rect x="6" y="2" width="2" height="1" fill="#ffffff" />
        </>
      ) : shapeVariant === 5 ? (
        <>
          {/* Kiểu 5: Linh Thảo / Quả Thần 8-bit Pixel */}
          <rect x="6" y="1" width="5" height="4" fill="#052e16" />
          <rect x="7" y="2" width="3" height="2" fill="#4ade80" />
          <rect x="3" y="5" width="10" height="9" fill={p.dark} />
          <rect x="4" y="6" width="8" height="7" fill={p.mid} />
          <rect x="5" y="6" width="6" height="5" fill={p.bright} />
          <rect x="5" y="7" width="2" height="2" fill={p.shine} />
          <rect x="5" y="7" width="1" height="1" fill="#ffffff" />
        </>
      ) : (
        <>
          {/* Kiểu 2: Bảo Châu / Linh Thạch Cổ Đại 8-bit Pixel */}
          <rect x="4" y="2" width="8" height="12" fill={p.dark} />
          <rect x="2" y="4" width="12" height="8" fill={p.dark} />
          <rect x="4" y="3" width="8" height="10" fill={p.mid} />
          <rect x="3" y="4" width="10" height="8" fill={p.bright} />
          <rect x="5" y="4" width="4" height="3" fill={p.shine} />
          <rect x="5" y="4" width="2" height="2" fill="#ffffff" />
          <rect x="5" y="12" width="6" height="2" fill={p.accent} />
        </>
      )}
    </svg>
  );
};

interface EquipmentSlotIconProps {
  slot: EquipmentSlot;
  item?: EquipmentItem | null;
  visualKind?: EquipmentVisualKind;
  rarity?: EquipmentRarity;
  size?: number;
  className?: string;
}

export const EquipmentSlotIcon: React.FC<EquipmentSlotIconProps> = ({
  slot,
  item,
  visualKind,
  rarity,
  size = 24,
  className = '',
}) => {
  const resolved = item ? resolveEquipmentItemStructure(item) : null;
  const effectiveVisual: EquipmentVisualKind =
    visualKind ||
    resolved?.visualKind ||
    (slot === 'ARMOR'
      ? 'ARMOR_DEF'
      : slot === 'WEAPON'
        ? 'WEAPON_ATK'
        : slot);
  const effectiveRarity: EquipmentRarity =
    rarity || item?.rarity || 'WHITE';

  // ==========================================================================
  // 1. NÓN (HELMET) — 5 THIẾT KẾ THEO 5 PHẨM CHẤT
  // ==========================================================================
  if (effectiveVisual === 'HELMET') {
    if (effectiveRarity === 'WHITE') {
      // #1: Mũ Sắt Tân Binh (Nón sắt tròn đơn giản kèm quai da)
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" className={`shrink-0 ${className}`}>
          <rect x="4" y="3" width="8" height="8" fill="#1e293b" />
          <rect x="5" y="4" width="6" height="5" fill="#94a3b8" />
          <rect x="6" y="4" width="4" height="2" fill="#e2e8f0" />
          <rect x="3" y="8" width="10" height="2" fill="#64748b" />
          <rect x="4" y="10" width="2" height="3" fill="#78350f" />
          <rect x="10" y="10" width="2" height="3" fill="#78350f" />
          <rect x="6" y="12" width="4" height="1" fill="#92400e" />
        </svg>
      );
    }
    if (effectiveRarity === 'GREEN') {
      // #2: Mũ Đồng Chiến Trận (Mũ đồng có sừng ngắn & ngọc lục bảo giữa trán)
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" className={`shrink-0 ${className}`}>
          <rect x="2" y="3" width="2" height="3" fill="#fde68a" />
          <rect x="12" y="3" width="2" height="3" fill="#fde68a" />
          <rect x="3" y="4" width="10" height="9" fill="#14532d" />
          <rect x="4" y="4" width="8" height="7" fill="#65a30d" />
          <rect x="5" y="4" width="6" height="2" fill="#a3e635" />
          <rect x="4" y="7" width="8" height="2" fill="#ca8a04" />
          <rect x="7" y="6" width="2" height="5" fill="#eab308" />
          <rect x="7" y="5" width="2" height="2" fill="#22c55e" />
          <rect x="5" y="9" width="2" height="2" fill="#0f172a" />
          <rect x="9" y="9" width="2" height="2" fill="#0f172a" />
        </svg>
      );
    }
    if (effectiveRarity === 'BLUE') {
      // #3: Mũ Thép Lam Tinh (Mũ hiệp sĩ kín mặt có mào lông xanh lam & khe mắt chữ thập)
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" className={`shrink-0 ${className}`}>
          <rect x="6" y="1" width="4" height="2" fill="#38bdf8" />
          <rect x="5" y="2" width="6" height="1" fill="#0284c7" />
          <rect x="3" y="3" width="10" height="11" fill="#0f172a" />
          <rect x="4" y="4" width="8" height="9" fill="#cbd5e1" />
          <rect x="5" y="4" width="6" height="3" fill="#f8fafc" />
          <rect x="4" y="7" width="8" height="2" fill="#0284c7" />
          <rect x="7" y="6" width="2" height="7" fill="#38bdf8" />
          <rect x="5" y="8" width="2" height="1" fill="#0f172a" />
          <rect x="9" y="8" width="2" height="1" fill="#0f172a" />
          <rect x="5" y="11" width="6" height="1" fill="#64748b" />
        </svg>
      );
    }
    if (effectiveRarity === 'PURPLE') {
      // #4: Mũ Giáp Ám Kim (Mũ hắc ám có cặp sừng cong tím & mắt phát sáng tử tinh)
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" className={`shrink-0 ${className}`}>
          <rect x="1" y="2" width="2" height="4" fill="#c084fc" />
          <rect x="2" y="4" width="2" height="3" fill="#9333ea" />
          <rect x="13" y="2" width="2" height="4" fill="#c084fc" />
          <rect x="12" y="4" width="2" height="3" fill="#9333ea" />
          <rect x="3" y="4" width="10" height="10" fill="#1e1b4b" />
          <rect x="4" y="5" width="8" height="8" fill="#4c1d95" />
          <rect x="6" y="3" width="4" height="3" fill="#a855f7" />
          <rect x="7" y="4" width="2" height="4" fill="#f0abfc" />
          <rect x="5" y="8" width="2" height="2" fill="#e879f9" />
          <rect x="9" y="8" width="2" height="2" fill="#e879f9" />
          <rect x="6" y="11" width="4" height="2" fill="#311042" />
        </svg>
      );
    }
    // #5: GOLD — Vương Miện Long Thần (Mũ vương miện rồng vàng có đôi cánh & ngọc hồng ngọc)
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" className={`shrink-0 ${className}`}>
        <rect x="6" y="0" width="4" height="2" fill="#ef4444" />
        <rect x="7" y="0" width="2" height="1" fill="#fca5a5" />
        <rect x="1" y="3" width="2" height="5" fill="#fef08a" />
        <rect x="2" y="5" width="2" height="4" fill="#fbbf24" />
        <rect x="13" y="3" width="2" height="5" fill="#fef08a" />
        <rect x="12" y="5" width="2" height="4" fill="#fbbf24" />
        <rect x="3" y="3" width="10" height="11" fill="#451a03" />
        <rect x="4" y="4" width="8" height="9" fill="#f59e0b" />
        <rect x="5" y="4" width="6" height="3" fill="#fef08a" />
        <rect x="7" y="5" width="2" height="3" fill="#ef4444" />
        <rect x="7" y="8" width="2" height="5" fill="#fde047" />
        <rect x="5" y="8" width="2" height="2" fill="#0f172a" />
        <rect x="9" y="8" width="2" height="2" fill="#0f172a" />
      </svg>
    );
  }

  // ==========================================================================
  // 2. ÁO GIÁP VẬT LÝ (ARMOR_DEF) — 5 THIẾT KẾ THEO 5 PHẨM CHẤT
  // ==========================================================================
  if (effectiveVisual === 'ARMOR_DEF') {
    if (effectiveRarity === 'WHITE') {
      // #6: Áo Giáp Da Thuộc (Giáp da nâu đính đinh tán sắt)
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" className={`shrink-0 ${className}`}>
          <rect x="3" y="2" width="10" height="12" fill="#271206" />
          <rect x="4" y="3" width="8" height="10" fill="#78350f" />
          <rect x="5" y="4" width="6" height="6" fill="#92400e" />
          <rect x="6" y="2" width="4" height="2" fill="#0f172a" />
          <rect x="5" y="5" width="1" height="1" fill="#cbd5e1" />
          <rect x="10" y="5" width="1" height="1" fill="#cbd5e1" />
          <rect x="4" y="10" width="8" height="2" fill="#451a03" />
          <rect x="7" y="10" width="2" height="2" fill="#cbd5e1" />
        </svg>
      );
    }
    if (effectiveRarity === 'GREEN') {
      // #7: Giáp Xích Tinh Thiết (Giáp xích bạc viền lục bảo)
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" className={`shrink-0 ${className}`}>
          <rect x="2" y="2" width="12" height="12" fill="#14532d" />
          <rect x="2" y="3" width="3" height="4" fill="#84cc16" />
          <rect x="11" y="3" width="3" height="4" fill="#84cc16" />
          <rect x="4" y="3" width="8" height="10" fill="#64748b" />
          <rect x="5" y="4" width="6" height="6" fill="#94a3b8" />
          <rect x="6" y="5" width="4" height="4" fill="#22c55e" />
          <rect x="7" y="6" width="2" height="2" fill="#bbf7d0" />
          <rect x="4" y="10" width="8" height="2" fill="#ca8a04" />
        </svg>
      );
    }
    if (effectiveRarity === 'BLUE') {
      // #8: Trọng Giáp Kỵ Sĩ (Giáp tấm bạc cầu vai rộng & huy hiệu chữ thập lam)
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" className={`shrink-0 ${className}`}>
          <rect x="1" y="2" width="14" height="12" fill="#0f172a" />
          <rect x="1" y="3" width="4" height="4" fill="#38bdf8" />
          <rect x="11" y="3" width="4" height="4" fill="#38bdf8" />
          <rect x="4" y="3" width="8" height="10" fill="#cbd5e1" />
          <rect x="5" y="4" width="6" height="6" fill="#f8fafc" />
          <rect x="7" y="4" width="2" height="6" fill="#0284c7" />
          <rect x="5" y="6" width="6" height="2" fill="#0284c7" />
          <rect x="4" y="10" width="8" height="2" fill="#fbbf24" />
        </svg>
      );
    }
    if (effectiveRarity === 'PURPLE') {
      // #9: Giáp Hắc Thiết Hộ Vệ (Giáp gai hắc ám đính lõi tử tinh)
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" className={`shrink-0 ${className}`}>
          <rect x="0" y="2" width="3" height="2" fill="#c084fc" />
          <rect x="13" y="2" width="3" height="2" fill="#c084fc" />
          <rect x="1" y="3" width="14" height="11" fill="#1e1b4b" />
          <rect x="2" y="4" width="3" height="4" fill="#6b21a8" />
          <rect x="11" y="4" width="3" height="4" fill="#6b21a8" />
          <rect x="4" y="3" width="8" height="10" fill="#3b0764" />
          <rect x="5" y="4" width="6" height="6" fill="#7e22ce" />
          <rect x="6" y="5" width="4" height="4" fill="#e879f9" />
          <rect x="7" y="6" width="2" height="2" fill="#fdf4ff" />
          <rect x="4" y="10" width="8" height="2" fill="#a855f7" />
        </svg>
      );
    }
    // #10: GOLD — Thánh Giáp Long Lân (Giáp vảy rồng hoàng kim cầu vai cánh phượng)
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" className={`shrink-0 ${className}`}>
        <rect x="0" y="1" width="3" height="4" fill="#fef08a" />
        <rect x="13" y="1" width="3" height="4" fill="#fef08a" />
        <rect x="1" y="3" width="14" height="12" fill="#451a03" />
        <rect x="2" y="3" width="3" height="5" fill="#fbbf24" />
        <rect x="11" y="3" width="3" height="5" fill="#fbbf24" />
        <rect x="4" y="3" width="8" height="10" fill="#d97706" />
        <rect x="5" y="4" width="6" height="6" fill="#fde047" />
        <rect x="6" y="5" width="4" height="4" fill="#ef4444" />
        <rect x="7" y="6" width="2" height="2" fill="#fef08a" />
        <rect x="4" y="10" width="8" height="2" fill="#991b1b" />
        <rect x="7" y="10" width="2" height="3" fill="#fef08a" />
      </svg>
    );
  }

  // ==========================================================================
  // 3. ÁO GIÁP PHÉP (ARMOR_MAR) — 5 THIẾT KẾ PHÁP BÀO THEO 5 PHẨM CHẤT
  // ==========================================================================
  if (effectiveVisual === 'ARMOR_MAR') {
    if (effectiveRarity === 'WHITE') {
      // #11: Áo Choàng Học Đồ (Áo vải lanh xám nhạt thắt dây thừng)
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" className={`shrink-0 ${className}`}>
          <rect x="3" y="2" width="10" height="13" fill="#1e293b" />
          <rect x="4" y="3" width="8" height="11" fill="#94a3b8" />
          <rect x="2" y="4" width="2" height="6" fill="#64748b" />
          <rect x="12" y="4" width="2" height="6" fill="#64748b" />
          <rect x="6" y="3" width="4" height="3" fill="#e2e8f0" />
          <rect x="7" y="6" width="2" height="8" fill="#cbd5e1" />
          <rect x="4" y="9" width="8" height="1" fill="#78350f" />
        </svg>
      );
    }
    if (effectiveRarity === 'GREEN') {
      // #12: Pháp Bào Lục Ngọc (Áo choàng pháp sư rừng xanh đính ngọc bích)
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" className={`shrink-0 ${className}`}>
          <rect x="2" y="2" width="12" height="13" fill="#052e16" />
          <rect x="3" y="3" width="10" height="4" fill="#15803d" />
          <rect x="4" y="6" width="8" height="8" fill="#16a34a" />
          <rect x="1" y="4" width="2" height="6" fill="#22c55e" />
          <rect x="13" y="4" width="2" height="6" fill="#22c55e" />
          <rect x="7" y="4" width="2" height="3" fill="#86efac" />
          <rect x="6" y="7" width="4" height="7" fill="#4ade80" />
          <rect x="4" y="9" width="8" height="1" fill="#eab308" />
        </svg>
      );
    }
    if (effectiveRarity === 'BLUE') {
      // #13: Áo Choàng Tinh Tú (Pháp bào xanh lam thêu cổ ngữ sao băng)
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" className={`shrink-0 ${className}`}>
          <rect x="2" y="1" width="12" height="14" fill="#0c4a6e" />
          <rect x="1" y="3" width="3" height="7" fill="#0284c7" />
          <rect x="12" y="3" width="3" height="7" fill="#0284c7" />
          <rect x="4" y="3" width="8" height="11" fill="#0369a1" />
          <rect x="5" y="3" width="6" height="3" fill="#38bdf8" />
          <rect x="7" y="5" width="2" height="9" fill="#bae6fd" />
          <rect x="6" y="4" width="4" height="2" fill="#e0f2fe" />
          <rect x="4" y="9" width="8" height="1" fill="#7dd3fc" />
        </svg>
      );
    }
    if (effectiveRarity === 'PURPLE') {
      // #14: Pháp Y Tử Tinh (Pháp bào cổ cao huyền bí đính cầu ma thuật tím)
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" className={`shrink-0 ${className}`}>
          <rect x="4" y="0" width="8" height="3" fill="#581c87" />
          <rect x="2" y="2" width="12" height="13" fill="#2e1065" />
          <rect x="1" y="3" width="3" height="8" fill="#7e22ce" />
          <rect x="12" y="3" width="3" height="8" fill="#7e22ce" />
          <rect x="4" y="3" width="8" height="11" fill="#6b21a8" />
          <rect x="6" y="4" width="4" height="3" fill="#e879f9" />
          <rect x="7" y="5" width="2" height="1" fill="#ffffff" />
          <rect x="6" y="7" width="4" height="7" fill="#c084fc" />
          <rect x="4" y="9" width="8" height="1" fill="#fde047" />
        </svg>
      );
    }
    // #15: GOLD — Thánh Bào Thiên Sứ (Pháp bào hoàng kim hào quang cánh thiên thần)
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" className={`shrink-0 ${className}`}>
        <rect x="4" y="0" width="8" height="2" fill="#fef08a" />
        <rect x="0" y="2" width="3" height="8" fill="#fde047" />
        <rect x="13" y="2" width="3" height="8" fill="#fde047" />
        <rect x="2" y="2" width="12" height="13" fill="#78350f" />
        <rect x="3" y="3" width="10" height="11" fill="#f59e0b" />
        <rect x="5" y="3" width="6" height="11" fill="#fef9c3" />
        <rect x="6" y="4" width="4" height="3" fill="#38bdf8" />
        <rect x="7" y="5" width="2" height="1" fill="#ffffff" />
        <rect x="6" y="8" width="4" height="6" fill="#fbbf24" />
        <rect x="3" y="9" width="10" height="1" fill="#ef4444" />
      </svg>
    );
  }

  // ==========================================================================
  // 4. VŨ KHÍ KIẾM VẬT LÝ (WEAPON_ATK) — 5 THIẾT KẾ KIẾM THEO 5 PHẨM CHẤT
  // ==========================================================================
  if (effectiveVisual === 'WEAPON_ATK') {
    if (effectiveRarity === 'WHITE') {
      // #16: Trường Kiếm Rèn Thô (Kiếm sắt ngắn cán gỗ)
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" className={`shrink-0 ${className}`}>
          <rect x="11" y="2" width="2" height="2" fill="#e2e8f0" />
          <rect x="9" y="4" width="2" height="2" fill="#cbd5e1" />
          <rect x="7" y="6" width="2" height="2" fill="#94a3b8" />
          <rect x="5" y="8" width="2" height="2" fill="#64748b" />
          <rect x="3" y="9" width="5" height="2" fill="#475569" />
          <rect x="2" y="11" width="2" height="2" fill="#78350f" />
          <rect x="1" y="13" width="2" height="2" fill="#94a3b8" />
        </svg>
      );
    }
    if (effectiveRarity === 'GREEN') {
      // #17: Thanh Kiếm Thép Xanh (Đoản đao cong khảm ngọc lục bảo)
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" className={`shrink-0 ${className}`}>
          <rect x="11" y="1" width="3" height="2" fill="#ecfccb" />
          <rect x="9" y="3" width="3" height="2" fill="#bef264" />
          <rect x="7" y="5" width="3" height="2" fill="#84cc16" />
          <rect x="5" y="7" width="3" height="2" fill="#4d7c0f" />
          <rect x="3" y="8" width="6" height="2" fill="#ca8a04" />
          <rect x="5" y="8" width="2" height="2" fill="#22c55e" />
          <rect x="2" y="10" width="3" height="3" fill="#365314" />
          <rect x="1" y="13" width="2" height="2" fill="#4ade80" />
        </svg>
      );
    }
    if (effectiveRarity === 'BLUE') {
      // #18: Hàn Băng Trọng Kiếm (Đại kiếm băng lam bản rộng)
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" className={`shrink-0 ${className}`}>
          <rect x="11" y="1" width="4" height="3" fill="#e0f2fe" />
          <rect x="9" y="3" width="4" height="3" fill="#7dd3fc" />
          <rect x="7" y="5" width="4" height="3" fill="#38bdf8" />
          <rect x="5" y="7" width="4" height="3" fill="#0284c7" />
          <rect x="2" y="8" width="7" height="2" fill="#cbd5e1" />
          <rect x="5" y="8" width="2" height="2" fill="#0ea5e9" />
          <rect x="2" y="11" width="3" height="3" fill="#1e3a8a" />
          <rect x="1" y="13" width="2" height="2" fill="#38bdf8" />
        </svg>
      );
    }
    if (effectiveRarity === 'PURPLE') {
      // #19: Huyết Ảnh Ma Kiếm (Ma kiếm răng cưa tím-đỏ)
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" className={`shrink-0 ${className}`}>
          <rect x="12" y="1" width="3" height="3" fill="#f0abfc" />
          <rect x="9" y="2" width="4" height="3" fill="#c084fc" />
          <rect x="7" y="4" width="4" height="3" fill="#9333ea" />
          <rect x="5" y="6" width="4" height="3" fill="#6b21a8" />
          <rect x="8" y="4" width="2" height="4" fill="#ef4444" />
          <rect x="2" y="7" width="7" height="3" fill="#3b0764" />
          <rect x="5" y="8" width="2" height="2" fill="#f43f5e" />
          <rect x="2" y="11" width="3" height="3" fill="#4c1d95" />
          <rect x="1" y="13" width="2" height="2" fill="#e879f9" />
        </svg>
      );
    }
    // #20: GOLD — Thần Kiếm Thái Dương (Thánh kiếm hoàng kim rực sáng)
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" className={`shrink-0 ${className}`}>
        <rect x="11" y="0" width="4" height="4" fill="#ffffff" />
        <rect x="9" y="2" width="4" height="4" fill="#fef08a" />
        <rect x="7" y="4" width="4" height="4" fill="#facc15" />
        <rect x="5" y="6" width="4" height="4" fill="#eab308" />
        <rect x="1" y="7" width="8" height="3" fill="#f59e0b" />
        <rect x="4" y="7" width="3" height="3" fill="#ef4444" />
        <rect x="5" y="8" width="1" height="1" fill="#fef08a" />
        <rect x="2" y="11" width="3" height="3" fill="#991b1b" />
        <rect x="0" y="13" width="3" height="3" fill="#fde047" />
      </svg>
    );
  }

  // ==========================================================================
  // 5. VŨ KHÍ TRƯỢNG PHÉP (WEAPON_MAG) — 5 THIẾT KẾ TRƯỢNG THEO 5 PHẨM CHẤT
  // ==========================================================================
  if (effectiveVisual === 'WEAPON_MAG') {
    if (effectiveRarity === 'WHITE') {
      // #21: Trượng Gỗ Tập Sự (Gậy gỗ có tinh thể trắng nhỏ ở đỉnh)
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" className={`shrink-0 ${className}`}>
          <rect x="10" y="2" width="3" height="3" fill="#f8fafc" />
          <rect x="9" y="3" width="3" height="3" fill="#cbd5e1" />
          <rect x="8" y="5" width="2" height="2" fill="#92400e" />
          <rect x="6" y="7" width="2" height="2" fill="#78350f" />
          <rect x="4" y="9" width="2" height="2" fill="#78350f" />
          <rect x="2" y="11" width="2" height="3" fill="#451a03" />
        </svg>
      );
    }
    if (effectiveRarity === 'GREEN') {
      // #22: Trượng Ngọc Lục Bảo (Trượng dây leo ôm ngọc lục bảo)
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" className={`shrink-0 ${className}`}>
          <rect x="9" y="1" width="5" height="5" fill="#15803d" />
          <rect x="10" y="2" width="3" height="3" fill="#4ade80" />
          <rect x="11" y="2" width="1" height="1" fill="#ffffff" />
          <rect x="8" y="5" width="2" height="2" fill="#65a30d" />
          <rect x="6" y="7" width="2" height="2" fill="#3f6212" />
          <rect x="4" y="9" width="2" height="2" fill="#365314" />
          <rect x="2" y="11" width="2" height="3" fill="#22c55e" />
        </svg>
      );
    }
    if (effectiveRarity === 'BLUE') {
      // #23: Pháp Trượng Lam Băng (Trượng pha lê băng tuyết có sừng trăng lưỡi liềm)
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" className={`shrink-0 ${className}`}>
          <rect x="8" y="1" width="6" height="6" fill="#0284c7" />
          <rect x="10" y="1" width="3" height="4" fill="#7dd3fc" />
          <rect x="11" y="2" width="2" height="2" fill="#ffffff" />
          <rect x="7" y="4" width="2" height="3" fill="#cbd5e1" />
          <rect x="11" y="6" width="3" height="2" fill="#cbd5e1" />
          <rect x="7" y="7" width="2" height="2" fill="#0369a1" />
          <rect x="5" y="9" width="2" height="2" fill="#075985" />
          <rect x="3" y="11" width="2" height="2" fill="#0c4a6e" />
          <rect x="1" y="13" width="2" height="2" fill="#38bdf8" />
        </svg>
      );
    }
    if (effectiveRarity === 'PURPLE') {
      // #24: Quyền Trượng Hư Không (Trượng sừng quỷ ôm nhãn cầu ma giới tím)
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" className={`shrink-0 ${className}`}>
          <rect x="7" y="1" width="2" height="4" fill="#c084fc" />
          <rect x="11" y="5" width="4" height="2" fill="#c084fc" />
          <rect x="9" y="1" width="5" height="5" fill="#4c1d95" />
          <rect x="10" y="2" width="3" height="3" fill="#e879f9" />
          <rect x="11" y="3" width="1" height="1" fill="#fef08a" />
          <rect x="7" y="6" width="3" height="3" fill="#6b21a8" />
          <rect x="5" y="8" width="2" height="2" fill="#581c87" />
          <rect x="3" y="10" width="2" height="2" fill="#3b0764" />
          <rect x="1" y="12" width="2" height="3" fill="#a855f7" />
        </svg>
      );
    }
    // #25: GOLD — Thần Trượng Tinh Hà (Thánh trượng mặt trời đôi cánh hoàng kim)
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" className={`shrink-0 ${className}`}>
        <rect x="6" y="1" width="2" height="4" fill="#fef08a" />
        <rect x="11" y="6" width="4" height="2" fill="#fef08a" />
        <rect x="8" y="0" width="7" height="7" fill="#f59e0b" />
        <rect x="9" y="1" width="5" height="5" fill="#fef08a" />
        <rect x="10" y="2" width="3" height="3" fill="#ef4444" />
        <rect x="11" y="3" width="1" height="1" fill="#ffffff" />
        <rect x="7" y="6" width="3" height="3" fill="#fbbf24" />
        <rect x="5" y="8" width="2" height="2" fill="#d97706" />
        <rect x="3" y="10" width="2" height="2" fill="#b45309" />
        <rect x="1" y="12" width="2" height="3" fill="#fde047" />
      </svg>
    );
  }

  // ==========================================================================
  // 6. GIÀY (BOOTS) — 5 THIẾT KẾ THEO 5 PHẨM CHẤT
  // ==========================================================================
  if (effectiveVisual === 'BOOTS') {
    if (effectiveRarity === 'WHITE') {
      // #26: Giày Hành Quân Vải Bố (Giày da nâu đơn giản)
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" className={`shrink-0 ${className}`}>
          <rect x="4" y="3" width="5" height="9" fill="#451a03" />
          <rect x="5" y="4" width="3" height="7" fill="#78350f" />
          <rect x="4" y="9" width="9" height="4" fill="#92400e" />
          <rect x="3" y="13" width="10" height="2" fill="#1c1917" />
        </svg>
      );
    }
    if (effectiveRarity === 'GREEN') {
      // #27: Giày Da Truy Phong (Giày thợ săn viền xanh lá kèm khóa đồng)
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" className={`shrink-0 ${className}`}>
          <rect x="4" y="2" width="6" height="10" fill="#14532d" />
          <rect x="5" y="3" width="4" height="8" fill="#16a34a" />
          <rect x="4" y="2" width="6" height="2" fill="#86efac" />
          <rect x="6" y="6" width="2" height="2" fill="#eab308" />
          <rect x="4" y="9" width="10" height="4" fill="#15803d" />
          <rect x="5" y="10" width="8" height="2" fill="#4ade80" />
          <rect x="3" y="13" width="11" height="2" fill="#052e16" />
        </svg>
      );
    }
    if (effectiveRarity === 'BLUE') {
      // #28: Chiến Hài Bạc Tốc (Giày thép bạc có cánh gió xanh lam)
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" className={`shrink-0 ${className}`}>
          <rect x="2" y="4" width="2" height="4" fill="#7dd3fc" />
          <rect x="4" y="2" width="6" height="10" fill="#0f172a" />
          <rect x="5" y="3" width="4" height="8" fill="#cbd5e1" />
          <rect x="4" y="2" width="6" height="2" fill="#38bdf8" />
          <rect x="4" y="9" width="10" height="4" fill="#94a3b8" />
          <rect x="5" y="10" width="8" height="2" fill="#e0f2fe" />
          <rect x="3" y="13" width="11" height="2" fill="#0284c7" />
        </svg>
      );
    }
    if (effectiveRarity === 'PURPLE') {
      // #29: Giày Bóng Đêm Tức Thời (Giày sát thủ bóng tối vệt tím)
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" className={`shrink-0 ${className}`}>
          <rect x="1" y="3" width="3" height="3" fill="#e879f9" />
          <rect x="2" y="6" width="2" height="3" fill="#a855f7" />
          <rect x="4" y="2" width="6" height="10" fill="#2e1065" />
          <rect x="5" y="3" width="4" height="8" fill="#6b21a8" />
          <rect x="4" y="2" width="6" height="2" fill="#c084fc" />
          <rect x="4" y="9" width="10" height="4" fill="#4c1d95" />
          <rect x="5" y="10" width="8" height="2" fill="#d8b4fe" />
          <rect x="3" y="13" width="11" height="2" fill="#1e1b4b" />
        </svg>
      );
    }
    // #30: GOLD — Thần Hài Quang Tốc (Giày thần tốc đôi cánh hoàng kim rực rỡ)
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" className={`shrink-0 ${className}`}>
        <rect x="1" y="2" width="3" height="5" fill="#fef08a" />
        <rect x="2" y="4" width="2" height="4" fill="#facc15" />
        <rect x="4" y="2" width="6" height="10" fill="#78350f" />
        <rect x="5" y="3" width="4" height="8" fill="#f59e0b" />
        <rect x="4" y="2" width="6" height="2" fill="#fef08a" />
        <rect x="6" y="5" width="2" height="2" fill="#ef4444" />
        <rect x="4" y="9" width="10" height="4" fill="#d97706" />
        <rect x="5" y="9" width="8" height="2" fill="#fde047" />
        <rect x="3" y="13" width="11" height="2" fill="#451a03" />
      </svg>
    );
  }

  // ==========================================================================
  // 7. NHẪN (RING) — 5 THIẾT KẾ THEO 5 PHẨM CHẤT
  // ==========================================================================
  if (effectiveVisual === 'RING') {
    if (effectiveRarity === 'WHITE') {
      // #31: Nhẫn Đồng Chiến Binh (Vòng nhẫn sắt/đồng thô)
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" className={`shrink-0 ${className}`}>
          <rect x="6" y="2" width="4" height="2" fill="#cbd5e1" />
          <rect x="4" y="4" width="8" height="9" fill="#64748b" />
          <rect x="5" y="5" width="6" height="7" fill="#94a3b8" />
          <rect x="6" y="6" width="4" height="5" fill="#140c07" />
        </svg>
      );
    }
    if (effectiveRarity === 'GREEN') {
      // #32: Nhẫn Bạc Lục Bảo (Nhẫn đính ngọc lục bảo vuông)
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" className={`shrink-0 ${className}`}>
          <rect x="6" y="1" width="4" height="3" fill="#22c55e" />
          <rect x="7" y="1" width="2" height="2" fill="#bbf7d0" />
          <rect x="3" y="4" width="10" height="10" fill="#15803d" />
          <rect x="4" y="5" width="8" height="8" fill="#86efac" />
          <rect x="5" y="6" width="6" height="6" fill="#140c07" />
        </svg>
      );
    }
    if (effectiveRarity === 'BLUE') {
      // #33: Nhẫn Lam Ngọc Tinh Anh (Nhẫn bạc có ngọc bích lam & cánh bên)
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" className={`shrink-0 ${className}`}>
          <rect x="5" y="1" width="6" height="3" fill="#0284c7" />
          <rect x="6" y="1" width="4" height="2" fill="#7dd3fc" />
          <rect x="7" y="1" width="2" height="1" fill="#ffffff" />
          <rect x="3" y="4" width="10" height="10" fill="#1e3a8a" />
          <rect x="4" y="5" width="8" height="8" fill="#38bdf8" />
          <rect x="5" y="6" width="6" height="6" fill="#140c07" />
        </svg>
      );
    }
    if (effectiveRarity === 'PURPLE') {
      // #34: Nhẫn Huyết Long Tử Tinh (Nhẫn vuốt rồng ôm ngọc tím-đỏ)
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" className={`shrink-0 ${className}`}>
          <rect x="4" y="1" width="8" height="3" fill="#7e22ce" />
          <rect x="6" y="0" width="4" height="4" fill="#e11d48" />
          <rect x="7" y="1" width="2" height="2" fill="#f0abfc" />
          <rect x="3" y="4" width="10" height="10" fill="#3b0764" />
          <rect x="4" y="5" width="8" height="8" fill="#c084fc" />
          <rect x="5" y="6" width="6" height="6" fill="#140c07" />
        </svg>
      );
    }
    // #35: GOLD — Nhẫn Thần Vương Vĩnh Cửu (Nhẫn hoàng kim vương miện 3 viên bảo ngọc)
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" className={`shrink-0 ${className}`}>
        <rect x="3" y="1" width="2" height="2" fill="#38bdf8" />
        <rect x="11" y="1" width="2" height="2" fill="#22c55e" />
        <rect x="6" y="0" width="4" height="4" fill="#ef4444" />
        <rect x="7" y="1" width="2" height="2" fill="#fef08a" />
        <rect x="3" y="4" width="10" height="10" fill="#b45309" />
        <rect x="4" y="5" width="8" height="8" fill="#fde047" />
        <rect x="5" y="6" width="6" height="6" fill="#140c07" />
        <rect x="4" y="5" width="3" height="2" fill="#ffffff" />
      </svg>
    );
  }

  // ==========================================================================
  // 8. DÂY CHUYỀN (AMULET) — 5 THIẾT KẾ THEO 5 PHẨM CHẤT
  // ==========================================================================
  if (effectiveRarity === 'WHITE') {
    // #36: Dây Chuyền Hộ Mệnh (Dây thừng treo nanh đá trắng)
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" className={`shrink-0 ${className}`}>
        <rect x="4" y="1" width="2" height="6" fill="#78350f" />
        <rect x="10" y="1" width="2" height="6" fill="#78350f" />
        <rect x="6" y="7" width="4" height="7" fill="#cbd5e1" />
        <rect x="7" y="8" width="2" height="4" fill="#f8fafc" />
      </svg>
    );
  }
  if (effectiveRarity === 'GREEN') {
    // #37: Bùa Cổ Ngọc Bích (Dây đồng treo ngọc bích lục giác)
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" className={`shrink-0 ${className}`}>
        <rect x="4" y="1" width="2" height="5" fill="#ca8a04" />
        <rect x="10" y="1" width="2" height="5" fill="#ca8a04" />
        <rect x="5" y="6" width="6" height="8" fill="#14532d" />
        <rect x="6" y="7" width="4" height="6" fill="#22c55e" />
        <rect x="7" y="8" width="2" height="3" fill="#bbf7d0" />
      </svg>
    );
  }
  if (effectiveRarity === 'BLUE') {
    // #38: Dây Chuyền Giọt Lệ Lam (Dây bạc treo pha lê giọt nước xanh lam)
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" className={`shrink-0 ${className}`}>
        <rect x="4" y="1" width="2" height="5" fill="#cbd5e1" />
        <rect x="10" y="1" width="2" height="5" fill="#cbd5e1" />
        <rect x="5" y="6" width="6" height="8" fill="#0369a1" />
        <rect x="4" y="8" width="8" height="4" fill="#0284c7" />
        <rect x="6" y="7" width="4" height="6" fill="#38bdf8" />
        <rect x="7" y="8" width="2" height="2" fill="#e0f2fe" />
      </svg>
    );
  }
  if (effectiveRarity === 'PURPLE') {
    // #39: Ấn Chú Tâm Linh Tử Tinh (Dây chuyền cánh dơi tử tinh huyền bí)
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" className={`shrink-0 ${className}`}>
        <rect x="4" y="1" width="2" height="5" fill="#a855f7" />
        <rect x="10" y="1" width="2" height="5" fill="#a855f7" />
        <rect x="2" y="7" width="12" height="4" fill="#4c1d95" />
        <rect x="5" y="6" width="6" height="8" fill="#6b21a8" />
        <rect x="6" y="7" width="4" height="6" fill="#e879f9" />
        <rect x="7" y="8" width="2" height="2" fill="#fef08a" />
      </svg>
    );
  }
  // #40: GOLD — Thánh Tích Trái Tim Rồng (Dây chuyền hoàng kim đôi cánh ôm trái tim rồng đỏ)
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" className={`shrink-0 ${className}`}>
      <rect x="4" y="1" width="2" height="5" fill="#fde047" />
      <rect x="10" y="1" width="2" height="5" fill="#fde047" />
      <rect x="1" y="7" width="3" height="4" fill="#fef08a" />
      <rect x="12" y="7" width="3" height="4" fill="#fef08a" />
      <rect x="4" y="6" width="8" height="9" fill="#d97706" />
      <rect x="5" y="7" width="6" height="7" fill="#fde047" />
      <rect x="6" y="8" width="4" height="5" fill="#ef4444" />
      <rect x="7" y="9" width="2" height="2" fill="#ffffff" />
    </svg>
  );
};

interface GemPixelIconProps {
  rarity: EquipmentRarity;
  size?: number;
  className?: string;
}

export const GemPixelIcon: React.FC<GemPixelIconProps> = ({
  rarity,
  size = 16,
  className = '',
}) => {
  const palette: Record<
    EquipmentRarity,
    { outer: string; main: string; shine: string }
  > = {
    WHITE: { outer: '#52525b', main: '#e4e4e7', shine: '#ffffff' },
    GREEN: { outer: '#14532d', main: '#22c55e', shine: '#bbf7d0' },
    BLUE: { outer: '#0c4a6e', main: '#38bdf8', shine: '#e0f2fe' },
    PURPLE: { outer: '#4c1d95', main: '#a855f7', shine: '#f3e8ff' },
    GOLD: { outer: '#78350f', main: '#fbbf24', shine: '#fef08a' },
  };
  const c = palette[rarity] || palette.WHITE;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 12 12"
      shapeRendering="crispEdges"
      className={`shrink-0 ${className}`}
      aria-label="Icon Đá Quý"
    >
      {/* Diamond Cut Gem */}
      <rect x="4" y="1" width="4" height="10" fill={c.outer} />
      <rect x="2" y="3" width="8" height="6" fill={c.outer} />
      <rect x="1" y="4" width="10" height="4" fill={c.outer} />
      <rect x="4" y="2" width="4" height="8" fill={c.main} />
      <rect x="3" y="3" width="6" height="6" fill={c.main} />
      <rect x="2" y="4" width="8" height="4" fill={c.main} />
      <rect x="4" y="3" width="2" height="2" fill={c.shine} />
      <rect x="3" y="4" width="2" height="2" fill={c.shine} />
    </svg>
  );
};

export type ResourcePixelKind =
  | 'FOOD'
  | 'WOOD'
  | 'STONE'
  | 'GOLD'
  | 'DIAMOND'
  | 'POPULATION';

interface ResourcePixelIconProps {
  kind: ResourcePixelKind;
  size?: number;
  className?: string;
}

export const ResourcePixelIcon: React.FC<ResourcePixelIconProps> = ({
  kind,
  size = 16,
  className = '',
}) => {
  if (kind === 'FOOD') {
    // Bó lúa mạch vàng rực kiểu trang bị pixel 16x16
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 16 16"
        shapeRendering="crispEdges"
        className={`shrink-0 ${className}`}
        aria-label="Icon Lương Thực"
      >
        {/* Dark Outline */}
        <rect x="5" y="1" width="6" height="14" fill="#1c1917" />
        <rect x="3" y="3" width="10" height="8" fill="#1c1917" />
        {/* Golden Wheat Ears */}
        <rect x="6" y="2" width="2" height="3" fill="#fde047" />
        <rect x="9" y="2" width="2" height="3" fill="#facc15" />
        <rect x="4" y="4" width="2" height="3" fill="#fef08a" />
        <rect x="7" y="4" width="2" height="3" fill="#fbbf24" />
        <rect x="10" y="4" width="2" height="3" fill="#f59e0b" />
        <rect x="4" y="7" width="3" height="3" fill="#fbbf24" />
        <rect x="7" y="7" width="2" height="3" fill="#fde047" />
        <rect x="9" y="7" width="3" height="3" fill="#d97706" />
        {/* Red Ribbon Tie */}
        <rect x="5" y="10" width="6" height="2" fill="#dc2626" />
        <rect x="6" y="10" width="2" height="1" fill="#fca5a5" />
        {/* Stems */}
        <rect x="5" y="12" width="2" height="2" fill="#eab308" />
        <rect x="7" y="12" width="2" height="3" fill="#ca8a04" />
        <rect x="9" y="12" width="2" height="2" fill="#a16207" />
      </svg>
    );
  }

  if (kind === 'WOOD') {
    // Khúc gỗ sồi trung đại cắt ngang có vân gỗ & mầm lá
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 16 16"
        shapeRendering="crispEdges"
        className={`shrink-0 ${className}`}
        aria-label="Icon Gỗ"
      >
        {/* Dark Outline */}
        <rect x="1" y="4" width="14" height="9" fill="#1c1917" />
        <rect x="2" y="3" width="12" height="11" fill="#1c1917" />
        {/* Bark Body */}
        <rect x="2" y="5" width="9" height="7" fill="#78350f" />
        <rect x="2" y="5" width="9" height="2" fill="#92400e" />
        <rect x="3" y="8" width="7" height="1" fill="#451a03" />
        <rect x="2" y="10" width="9" height="2" fill="#451a03" />
        {/* Cut Wood Ring Face */}
        <rect x="10" y="5" width="4" height="7" fill="#fcd34d" />
        <rect x="11" y="6" width="2" height="5" fill="#d97706" />
        <rect x="11" y="7" width="1" height="3" fill="#fef08a" />
        {/* Green Sprout Top */}
        <rect x="5" y="2" width="3" height="2" fill="#22c55e" />
        <rect x="6" y="1" width="3" height="2" fill="#86efac" />
      </svg>
    );
  }

  if (kind === 'STONE') {
    // Khối đá pháo đài vát cạnh ánh bạc
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 16 16"
        shapeRendering="crispEdges"
        className={`shrink-0 ${className}`}
        aria-label="Icon Đá"
      >
        {/* Dark Outline */}
        <rect x="2" y="3" width="12" height="11" fill="#0f172a" />
        <rect x="1" y="5" width="14" height="8" fill="#0f172a" />
        {/* Main Stone Facets */}
        <rect x="3" y="4" width="10" height="9" fill="#94a3b8" />
        <rect x="2" y="6" width="12" height="6" fill="#64748b" />
        {/* Top Highlight Facet */}
        <rect x="4" y="4" width="7" height="3" fill="#e2e8f0" />
        <rect x="5" y="4" width="4" height="2" fill="#f8fafc" />
        <rect x="3" y="6" width="5" height="3" fill="#cbd5e1" />
        {/* Deep Shadow & Chiseled Crack */}
        <rect x="8" y="8" width="1" height="3" fill="#334155" />
        <rect x="9" y="9" width="2" height="1" fill="#334155" />
        <rect x="3" y="11" width="10" height="2" fill="#475569" />
      </svg>
    );
  }

  if (kind === 'GOLD') {
    // Đồng xu vàng hoàng gia dập nổi vương miện
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 16 16"
        shapeRendering="crispEdges"
        className={`shrink-0 ${className}`}
        aria-label="Icon Vàng"
      >
        {/* Dark Outline */}
        <rect x="4" y="1" width="8" height="14" fill="#1c1917" />
        <rect x="2" y="3" width="12" height="10" fill="#1c1917" />
        <rect x="1" y="4" width="14" height="8" fill="#1c1917" />
        {/* Outer Gold Rim */}
        <rect x="4" y="2" width="8" height="12" fill="#f59e0b" />
        <rect x="2" y="4" width="12" height="8" fill="#fbbf24" />
        <rect x="4" y="2" width="5" height="2" fill="#fef08a" />
        <rect x="2" y="4" width="2" height="4" fill="#fef08a" />
        {/* Inner Coin Recess */}
        <rect x="4" y="4" width="8" height="8" fill="#b45309" />
        <rect x="5" y="5" width="6" height="6" fill="#d97706" />
        {/* Embossed Emblem */}
        <rect x="7" y="5" width="2" height="6" fill="#fef08a" />
        <rect x="6" y="6" width="4" height="1" fill="#ffffff" />
        <rect x="6" y="9" width="4" height="1" fill="#fde047" />
      </svg>
    );
  }

  if (kind === 'DIAMOND') {
    // Viên kim cương lam bảo ngọc đa diện lấp lánh
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 16 16"
        shapeRendering="crispEdges"
        className={`shrink-0 ${className}`}
        aria-label="Icon Kim Cương"
      >
        {/* Dark Outline */}
        <rect x="4" y="1" width="8" height="3" fill="#082f49" />
        <rect x="2" y="3" width="12" height="5" fill="#082f49" />
        <rect x="1" y="5" width="14" height="3" fill="#082f49" />
        <rect x="3" y="8" width="10" height="3" fill="#082f49" />
        <rect x="5" y="11" width="6" height="2" fill="#082f49" />
        <rect x="7" y="13" width="2" height="2" fill="#082f49" />
        {/* Main Crystal Facets */}
        <rect x="4" y="2" width="8" height="2" fill="#7dd3fc" />
        <rect x="2" y="4" width="12" height="4" fill="#38bdf8" />
        <rect x="4" y="8" width="8" height="3" fill="#0284c7" />
        <rect x="6" y="11" width="4" height="2" fill="#0369a1" />
        <rect x="7" y="13" width="2" height="1" fill="#38bdf8" />
        {/* Specular Highlights */}
        <rect x="5" y="2" width="4" height="2" fill="#ffffff" />
        <rect x="3" y="4" width="4" height="2" fill="#e0f2fe" />
        <rect x="5" y="5" width="3" height="3" fill="#bae6fd" />
      </svg>
    );
  }

  // POPULATION (Icon Dân Số Pixel)
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      className={`shrink-0 ${className}`}
      aria-label="Icon Dân Số"
    >
      {/* Outline */}
      <rect x="4" y="1" width="8" height="7" fill="#1c1917" />
      <rect x="2" y="8" width="12" height="7" fill="#1c1917" />
      {/* Helmet / Hat */}
      <rect x="5" y="2" width="6" height="2" fill="#fbbf24" />
      <rect x="6" y="2" width="3" height="1" fill="#fef08a" />
      {/* Face */}
      <rect x="5" y="4" width="6" height="3" fill="#fed7aa" />
      <rect x="6" y="5" width="1" height="1" fill="#0f172a" />
      <rect x="9" y="5" width="1" height="1" fill="#0f172a" />
      {/* Shoulders & Tunic */}
      <rect x="3" y="9" width="10" height="5" fill="#ea580c" />
      <rect x="5" y="9" width="6" height="5" fill="#fb923c" />
      <rect x="7" y="9" width="2" height="3" fill="#fde047" />
    </svg>
  );
};

// ============================================================================
// ICON KỸ NĂNG KIỂU WARCRAFT VỚI NỀN PHÂN LOẠI THEO 6 TÔNG MÀU:
// - Tấn công vật lý (PHYSICAL): Đỏ
// - Phép (MAGIC): Tím
// - Phòng thủ (DEFENSE): Xanh lam
// - Buff (BUFF): Vàng
// - Debuff (DEBUFF): Xanh ngọc bích
// - Hồi máu (HEAL): Xanh lá cây
// ============================================================================
export const SKILL_THEME_META: Record<
  SkillColorTheme,
  {
    labelVi: string;
    borderHex: string;
    bgOuter: string;
    bgMid: string;
    bgCore: string;
    bgRay: string;
  }
> = {
  PHYSICAL: {
    labelVi: 'Vật Lý',
    borderHex: '#ef4444',
    bgOuter: '#450a0a',
    bgMid: '#991b1b',
    bgCore: '#dc2626',
    bgRay: '#fca5a5',
  },
  MAGIC: {
    labelVi: 'Phép Thuật',
    borderHex: '#a855f7',
    bgOuter: '#2e1065',
    bgMid: '#6b21a8',
    bgCore: '#9333ea',
    bgRay: '#e9d5ff',
  },
  DEFENSE: {
    labelVi: 'Phòng Thủ',
    borderHex: '#3b82f6',
    bgOuter: '#172554',
    bgMid: '#1e40af',
    bgCore: '#2563eb',
    bgRay: '#93c5fd',
  },
  BUFF: {
    labelVi: 'Cường Hóa (Buff)',
    borderHex: '#eab308',
    bgOuter: '#451a03',
    bgMid: '#92400e',
    bgCore: '#ca8a04',
    bgRay: '#fef08a',
  },
  DEBUFF: {
    labelVi: 'Suy Yếu (Debuff)',
    borderHex: '#14b8a6',
    bgOuter: '#042f2e',
    bgMid: '#115e59',
    bgCore: '#0d9488',
    bgRay: '#99f6e4',
  },
  HEAL: {
    labelVi: 'Hồi Máu',
    borderHex: '#22c55e',
    bgOuter: '#052e16',
    bgMid: '#166534',
    bgCore: '#16a34a',
    bgRay: '#bbf7d0',
  },
};

export function resolveSkillColorTheme(skill: UnitSkillInfo): SkillColorTheme {
  if (skill.theme) return skill.theme;
  const text = `${skill.id} ${skill.name} ${skill.description}`.toLowerCase();
  if (text.includes('hồi máu') || text.includes('chữa trị') || text.includes('heal')) {
    return 'HEAL';
  }
  if (text.includes('độc') || text.includes('debuff') || text.includes('làm chậm') || text.includes('suy yếu')) {
    return 'DEBUFF';
  }
  if (text.includes('phù hộ') || text.includes('khiên') || text.includes('phòng thủ') || text.includes('giáp')) {
    return 'DEFENSE';
  }
  if (text.includes('buff') || text.includes('tăng tốc') || text.includes('hào quang')) {
    return 'BUFF';
  }
  if (text.includes('phép') || text.includes('ma thuật')) {
    return 'MAGIC';
  }
  return 'PHYSICAL';
}

interface WarcraftSkillIconProps {
  skill: UnitSkillInfo;
  size?: number;
  className?: string;
}

export function resolveSkillIconGlyph(skill: UnitSkillInfo): SkillIconGlyph {
  if (skill.iconGlyph) return skill.iconGlyph;
  const text = `${skill.id} ${skill.name} ${skill.description}`.toLowerCase();
  if (text.includes('tên') || text.includes('cung') || text.includes('độc')) {
    return 'POISON_ARROW';
  }
  if (text.includes('phù hộ') || text.includes('khiên') || text.includes('lá chắn')) {
    return 'BLESSED_SHIELD';
  }
  if (text.includes('lửa') || text.includes('hỏa') || text.includes('thiêu')) {
    return 'FIREBALL';
  }
  if (text.includes('sét') || text.includes('lôi')) {
    return 'LIGHTNING';
  }
  if (text.includes('băng') || text.includes('hàn')) {
    return 'ICE_NOVA';
  }
  if (text.includes('hồi máu') || text.includes('chữa trị') || skill.theme === 'HEAL') {
    return 'HEAL_LIGHT';
  }
  if (text.includes('xoáy') || text.includes('bão')) {
    return 'WHIRLWIND';
  }
  if (text.includes('huyết') || text.includes('hút máu')) {
    return 'BLOOD_STRIKE';
  }
  if (text.includes('thiên thạch')) {
    return 'METEOR';
  }
  if (text.includes('hiệu triệu') || text.includes('tù và') || skill.theme === 'BUFF') {
    return 'WAR_CRY';
  }
  if (text.includes('nguyền') || text.includes('hắc ám')) {
    return 'DARK_CURSE';
  }
  return 'HOLY_SWORD';
}

export const WarcraftSkillIcon: React.FC<WarcraftSkillIconProps> = ({
  skill,
  size = 36,
  className = '',
}) => {
  const themeKey = resolveSkillColorTheme(skill);
  const t = SKILL_THEME_META[themeKey];
  const glyph = resolveSkillIconGlyph(skill);
  const isPassive = skill.isPassive === true;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      className={`shrink-0 ${className}`}
      aria-label={skill.name}
    >
      {/* 1. NỀN WARCRAFT THEO TÔNG MÀU KỸ NĂNG (Đỏ / Tím / Xanh lam / Vàng / Xanh ngọc bích / Xanh lá) */}
      <rect x="0" y="0" width="16" height="16" fill={t.bgOuter} />
      {/* Vùng sáng trung tâm & hào quang tỏa góc */}
      <rect x="2" y="2" width="12" height="12" fill={t.bgMid} />
      <rect x="4" y="3" width="8" height="10" fill={t.bgCore} />
      <rect x="3" y="4" width="10" height="8" fill={t.bgCore} />
      {/* Tia năng lượng chéo kiểu Warcraft icon */}
      <rect x="2" y="2" width="2" height="1" fill={t.bgRay} opacity="0.55" />
      <rect x="12" y="2" width="2" height="1" fill={t.bgRay} opacity="0.55" />
      <rect x="2" y="13" width="2" height="1" fill={t.bgRay} opacity="0.45" />
      <rect x="12" y="13" width="2" height="1" fill={t.bgRay} opacity="0.45" />
      <rect x="6" y="5" width="4" height="6" fill={t.bgRay} opacity="0.28" />

      {/* 2. VIỀN ICON KỸ NĂNG: Đứt khúc (Dashed) đối với Kỹ Năng Bị Động, Viền liền (Solid) đối với Kỹ Năng Chủ Động */}
      {isPassive ? (
        <>
          {[0, 4, 8, 12].map((seg) => (
            <React.Fragment key={seg}>
              <rect x={seg} y="0" width="2" height="1" fill={t.bgRay} opacity="0.85" />
              <rect x={seg + 2} y="15" width="2" height="1" fill={t.bgRay} opacity="0.65" />
              <rect x="0" y={seg + 2} width="1" height="2" fill={t.bgRay} opacity="0.8" />
              <rect x="15" y={seg} width="1" height="2" fill={t.bgRay} opacity="0.65" />
            </React.Fragment>
          ))}
        </>
      ) : (
        <>
          <rect x="0" y="0" width="16" height="1" fill={t.bgRay} opacity="0.75" />
          <rect x="0" y="0" width="1" height="16" fill={t.bgRay} opacity="0.6" />
          <rect x="0" y="15" width="16" height="1" fill="#090604" />
          <rect x="15" y="0" width="1" height="16" fill="#090604" />
        </>
      )}

      {/* 3. HÌNH VẼ 8-BIT PIXEL CHI TIẾT KỸ NĂNG (12 GLYPH TỰ ĐỘNG HÓA) */}
      {glyph === 'POISON_ARROW' ? (
        <>
          <rect x="9" y="2" width="5" height="5" fill="#042f2e" />
          <rect x="6" y="6" width="4" height="4" fill="#1c1917" />
          <rect x="10" y="3" width="3" height="3" fill="#4ade80" />
          <rect x="11" y="2" width="3" height="3" fill="#fef08a" />
          <rect x="9" y="5" width="2" height="2" fill="#f59e0b" />
          <rect x="7" y="7" width="2" height="2" fill="#d97706" />
          <rect x="5" y="9" width="2" height="2" fill="#b45309" />
          <rect x="2" y="11" width="3" height="3" fill="#a7f3d0" />
          <rect x="4" y="12" width="2" height="2" fill="#fde047" />
          <rect x="4" y="4" width="2" height="2" fill="#5eead4" />
          <rect x="11" y="9" width="2" height="2" fill="#5eead4" />
        </>
      ) : glyph === 'BLESSED_SHIELD' ? (
        <>
          <rect x="3" y="2" width="10" height="10" fill="#0f172a" />
          <rect x="5" y="12" width="6" height="3" fill="#0f172a" />
          <rect x="4" y="3" width="8" height="8" fill="#60a5fa" />
          <rect x="6" y="11" width="4" height="2" fill="#3b82f6" />
          <rect x="5" y="4" width="6" height="6" fill="#bfdbfe" />
          <rect x="7" y="3" width="2" height="10" fill="#fde047" />
          <rect x="4" y="6" width="8" height="2" fill="#fde047" />
          <rect x="7" y="6" width="2" height="2" fill="#ffffff" />
        </>
      ) : glyph === 'FIREBALL' || glyph === 'METEOR' ? (
        <>
          <rect x="4" y="4" width="8" height="8" fill="#450a0a" />
          <rect x="9" y="2" width="4" height="4" fill="#f97316" />
          <rect x="5" y="5" width="6" height="6" fill="#ef4444" />
          <rect x="6" y="6" width="4" height="4" fill="#fde047" />
          <rect x="7" y="7" width="2" height="2" fill="#ffffff" />
        </>
      ) : glyph === 'LIGHTNING' ? (
        <>
          <rect x="8" y="1" width="4" height="4" fill="#fef08a" />
          <rect x="6" y="5" width="5" height="3" fill="#fde047" />
          <rect x="5" y="7" width="6" height="2" fill="#ffffff" />
          <rect x="6" y="9" width="4" height="3" fill="#fde047" />
          <rect x="4" y="12" width="3" height="3" fill="#fef08a" />
        </>
      ) : glyph === 'HEAL_LIGHT' ? (
        <>
          <rect x="5" y="2" width="6" height="12" fill="#052e16" />
          <rect x="2" y="5" width="12" height="6" fill="#052e16" />
          <rect x="6" y="3" width="4" height="10" fill="#4ade80" />
          <rect x="3" y="6" width="10" height="4" fill="#4ade80" />
          <rect x="7" y="4" width="2" height="8" fill="#fef08a" />
          <rect x="4" y="7" width="8" height="2" fill="#fef08a" />
          <rect x="7" y="7" width="2" height="2" fill="#ffffff" />
        </>
      ) : glyph === 'ICE_NOVA' ? (
        <>
          <rect x="6" y="2" width="4" height="12" fill="#082f49" />
          <rect x="2" y="6" width="12" height="4" fill="#082f49" />
          <rect x="7" y="3" width="2" height="10" fill="#7dd3fc" />
          <rect x="3" y="7" width="10" height="2" fill="#7dd3fc" />
          <rect x="6" y="6" width="4" height="4" fill="#ffffff" />
        </>
      ) : (
        <>
          {/* Thánh Kiếm Farel chém chéo rực lửa trên nền Đỏ Vật Lý */}
          <rect x="10" y="1" width="4" height="4" fill="#1c1917" />
          <rect x="8" y="3" width="4" height="4" fill="#1c1917" />
          <rect x="6" y="5" width="4" height="4" fill="#1c1917" />
          <rect x="11" y="2" width="3" height="3" fill="#ffffff" />
          <rect x="9" y="4" width="3" height="3" fill="#fef08a" />
          <rect x="7" y="6" width="3" height="3" fill="#fbbf24" />
          <rect x="5" y="8" width="3" height="3" fill="#f59e0b" />
          <rect x="3" y="7" width="2" height="2" fill="#fde047" />
          <rect x="7" y="11" width="2" height="2" fill="#fde047" />
          <rect x="4" y="9" width="3" height="3" fill="#b45309" />
          <rect x="2" y="12" width="2" height="2" fill="#fef08a" />
          <rect x="3" y="3" width="2" height="2" fill="#ffffff" />
          <rect x="12" y="8" width="2" height="2" fill="#fef08a" />
        </>
      )}
    </svg>
  );
};

interface FormattedSkillDescriptionProps {
  text: string;
}

export const FormattedSkillDescription: React.FC<FormattedSkillDescriptionProps> = ({
  text,
}) => {
  const normalizedText = text.replace(/\s+/g, ' ').trim();
  const parts = normalizedText.split(/(\[[^\]]+\])/g);
  return (
    <>
      {parts.map((part, idx) => {
        if (part.startsWith('[') && part.endsWith(']')) {
          const colorHex = getSkillBracketColorHex(part);
          const cleanContent = part.slice(1, -1).replace(/\s+/g, ' ').trim();
          return (
            <span
              key={idx}
              style={{ color: colorHex }}
              className="font-sans font-bold"
            >
              {cleanContent}
            </span>
          );
        }
        return <React.Fragment key={idx}>{part}</React.Fragment>;
      })}
    </>
  );
};




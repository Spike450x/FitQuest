/**
 * FitQuest silhouettes — hand-authored SVG figures for every entity.
 *
 * Each function returns inline JSX rendered inside `<HeraldicFrame>`. The
 * silhouette uses `currentColor` for fills/strokes so the frame's tint
 * cascades through. Coordinates are within the 100×100 frame viewBox.
 *
 * Style conventions:
 *   - Fills only — no strokes (the frame ring is the only outline).
 *   - Silhouettes occupy roughly the central 60×60 area to fit the shield.
 *   - Visual identity must read at 32×32 (smallest size) — keep shapes bold.
 */

// ── MONSTERS ─────────────────────────────────────────────────────────────────

function GoblinScout() {
  return (
    <g fill="currentColor">
      {/* Hooded head + pointy ears */}
      <path d="M 50 28 L 40 36 L 30 40 L 34 50 L 28 56 L 36 60 L 38 70 L 50 74 L 62 70 L 64 60 L 72 56 L 66 50 L 70 40 L 60 36 Z" />
      <circle cx="42" cy="50" r="3" className="fill-rose-400" />
      <circle cx="58" cy="50" r="3" className="fill-rose-400" />
      <path d="M 44 62 L 48 64 L 52 64 L 56 62" stroke="currentColor" strokeWidth="2" fill="none" />
    </g>
  );
}

function GiantRat() {
  return (
    <g fill="currentColor">
      {/* Body + head + tail */}
      <ellipse cx="50" cy="58" rx="22" ry="14" />
      <ellipse cx="68" cy="50" rx="12" ry="10" />
      <circle cx="74" cy="44" r="3" />
      <circle cx="62" cy="44" r="3" />
      <circle cx="76" cy="50" r="1.5" className="fill-rose-300" />
      <path
        d="M 28 58 Q 14 64, 18 76"
        stroke="currentColor"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      <path d="M 70 38 L 74 30 L 76 38 Z" />
      <path d="M 60 38 L 56 30 L 58 38 Z" />
    </g>
  );
}

function ForestGoblin() {
  return (
    <g fill="currentColor">
      {/* Bigger goblin with crown of leaves */}
      <path d="M 50 22 L 38 28 L 26 32 L 30 44 L 22 52 L 30 58 L 32 72 L 50 78 L 68 72 L 70 58 L 78 52 L 70 44 L 74 32 L 62 28 Z" />
      <circle cx="42" cy="48" r="3.5" className="fill-amber-300" />
      <circle cx="58" cy="48" r="3.5" className="fill-amber-300" />
      <path
        d="M 40 62 L 46 66 L 54 66 L 60 62"
        stroke="currentColor"
        strokeWidth="2.5"
        fill="none"
      />
      {/* Leaf crown */}
      <path d="M 32 24 Q 36 18, 42 22" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M 58 22 Q 64 18, 68 24" stroke="currentColor" strokeWidth="2" fill="none" />
    </g>
  );
}

function OrcGrunt() {
  return (
    <g fill="currentColor">
      {/* Broad head with tusks */}
      <path d="M 50 24 L 36 28 L 28 38 L 30 56 L 38 70 L 50 76 L 62 70 L 70 56 L 72 38 L 64 28 Z" />
      <rect x="44" y="46" width="4" height="6" className="fill-rose-400" />
      <rect x="52" y="46" width="4" height="6" className="fill-rose-400" />
      {/* Tusks */}
      <path d="M 42 60 L 40 70 L 44 68 Z" className="fill-amber-100 dark:fill-amber-200" />
      <path d="M 58 60 L 60 70 L 56 68 Z" className="fill-amber-100 dark:fill-amber-200" />
      {/* Brow */}
      <rect x="38" y="38" width="24" height="3" />
    </g>
  );
}

function CaveSpider() {
  return (
    <g fill="currentColor">
      {/* Body */}
      <ellipse cx="50" cy="54" rx="14" ry="12" />
      <ellipse cx="50" cy="40" rx="10" ry="8" />
      {/* Eight legs */}
      <path
        d="M 38 50 Q 22 42, 18 30"
        stroke="currentColor"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M 38 56 Q 20 56, 14 50"
        stroke="currentColor"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M 38 60 Q 20 66, 16 74"
        stroke="currentColor"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M 42 64 Q 30 76, 32 84"
        stroke="currentColor"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M 62 50 Q 78 42, 82 30"
        stroke="currentColor"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M 62 56 Q 80 56, 86 50"
        stroke="currentColor"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M 62 60 Q 80 66, 84 74"
        stroke="currentColor"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M 58 64 Q 70 76, 68 84"
        stroke="currentColor"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
      {/* Eyes */}
      <circle cx="46" cy="38" r="1.5" className="fill-rose-400" />
      <circle cx="54" cy="38" r="1.5" className="fill-rose-400" />
      <circle cx="42" cy="42" r="1" className="fill-rose-400" />
      <circle cx="58" cy="42" r="1" className="fill-rose-400" />
    </g>
  );
}

function SkeletonWarrior() {
  return (
    <g fill="currentColor">
      {/* Skull */}
      <path d="M 50 24 L 36 28 L 32 42 L 36 56 L 42 60 L 42 70 L 58 70 L 58 60 L 64 56 L 68 42 L 64 28 Z" />
      {/* Eye sockets */}
      <ellipse cx="42" cy="42" rx="4" ry="5" className="fill-slate-950" />
      <ellipse cx="58" cy="42" rx="4" ry="5" className="fill-slate-950" />
      {/* Nose */}
      <path d="M 48 50 L 52 50 L 50 56 Z" className="fill-slate-950" />
      {/* Teeth */}
      <rect x="44" y="62" width="2" height="6" className="fill-slate-950" />
      <rect x="48" y="62" width="2" height="6" className="fill-slate-950" />
      <rect x="52" y="62" width="2" height="6" className="fill-slate-950" />
      <rect x="56" y="62" width="2" height="6" className="fill-slate-950" />
      {/* Crossed bones below */}
      <rect x="32" y="78" width="36" height="3" transform="rotate(-15 50 80)" />
      <rect x="32" y="78" width="36" height="3" transform="rotate(15 50 80)" />
    </g>
  );
}

function DarkWolf() {
  return (
    <g fill="currentColor">
      {/* Wolf head + ears */}
      <path d="M 30 32 L 40 22 L 46 30 L 54 30 L 60 22 L 70 32 L 72 52 L 68 64 L 50 72 L 32 64 L 28 52 Z" />
      <circle cx="42" cy="46" r="3" className="fill-amber-400" />
      <circle cx="58" cy="46" r="3" className="fill-amber-400" />
      <path d="M 48 56 L 50 60 L 52 56" stroke="currentColor" strokeWidth="2" fill="none" />
      {/* Fangs */}
      <path d="M 46 62 L 44 70 L 48 64 Z" className="fill-slate-100" />
      <path d="M 54 62 L 56 70 L 52 64 Z" className="fill-slate-100" />
    </g>
  );
}

function StoneTroll() {
  return (
    <g fill="currentColor">
      {/* Boulder-like head */}
      <path d="M 24 56 L 28 36 L 38 26 L 50 22 L 62 26 L 72 36 L 76 56 L 70 70 L 58 76 L 42 76 L 30 70 Z" />
      {/* Eyes deep-set */}
      <circle cx="42" cy="44" r="3.5" className="fill-slate-950" />
      <circle cx="58" cy="44" r="3.5" className="fill-slate-950" />
      <circle cx="42" cy="44" r="1.5" className="fill-amber-300" />
      <circle cx="58" cy="44" r="1.5" className="fill-amber-300" />
      {/* Rocky chunks */}
      <circle cx="32" cy="36" r="3" />
      <circle cx="68" cy="36" r="3" />
      <circle cx="26" cy="60" r="2.5" />
      <circle cx="74" cy="60" r="2.5" />
      {/* Mouth */}
      <path
        d="M 40 62 L 44 64 L 50 62 L 56 64 L 60 62 L 56 68 L 50 68 L 44 68 Z"
        className="fill-slate-950"
      />
    </g>
  );
}

function DarkMage() {
  return (
    <g fill="currentColor">
      {/* Hooded figure */}
      <path d="M 50 18 L 32 30 L 26 50 L 30 78 L 50 82 L 70 78 L 74 50 L 68 30 Z" />
      {/* Face shadow inside hood */}
      <path d="M 38 36 L 50 32 L 62 36 L 60 56 L 50 60 L 40 56 Z" className="fill-slate-950" />
      {/* Glowing eyes */}
      <circle cx="44" cy="46" r="2" className="fill-violet-400" />
      <circle cx="56" cy="46" r="2" className="fill-violet-400" />
      {/* Staff */}
      <rect x="74" y="32" width="2.5" height="50" />
      <circle cx="75" cy="30" r="4" className="fill-violet-400" />
      <circle cx="75" cy="30" r="2" className="fill-white dark:fill-violet-200" />
    </g>
  );
}

function AncientDragon() {
  return (
    <g fill="currentColor">
      {/* Wings */}
      <path d="M 20 50 Q 6 32, 14 22 Q 24 30, 30 44 Z" />
      <path d="M 80 50 Q 94 32, 86 22 Q 76 30, 70 44 Z" />
      {/* Head + neck */}
      <path d="M 50 26 L 38 30 L 32 44 L 34 56 L 42 64 L 58 64 L 66 56 L 68 44 L 62 30 Z" />
      {/* Horns */}
      <path d="M 38 28 L 32 18 L 40 22 Z" />
      <path d="M 62 28 L 68 18 L 60 22 Z" />
      {/* Glowing eyes */}
      <circle cx="44" cy="44" r="3" className="fill-amber-300" />
      <circle cx="56" cy="44" r="3" className="fill-amber-300" />
      {/* Snout + teeth */}
      <path d="M 42 58 L 50 64 L 58 58 L 56 66 L 50 70 L 44 66 Z" />
      <path
        d="M 46 64 L 46 68 M 50 65 L 50 70 M 54 64 L 54 68"
        stroke="currentColor"
        strokeWidth="1"
      />
      {/* Body hint */}
      <path d="M 38 74 L 50 82 L 62 74 L 58 78 L 50 84 L 42 78 Z" />
    </g>
  );
}

function LichKing() {
  return (
    <g fill="currentColor">
      {/* Crowned skull with spectral ribbons */}
      <path d="M 50 26 L 38 30 L 32 42 L 32 56 L 36 64 L 36 74 L 50 80 L 64 74 L 64 64 L 68 56 L 68 42 L 62 30 Z" />
      {/* Crown points */}
      <path d="M 36 32 L 32 18 L 40 28 Z" />
      <path d="M 50 22 L 50 14 L 56 22 Z" />
      <path d="M 64 32 L 68 18 L 60 28 Z" />
      {/* Crown gem */}
      <circle cx="50" cy="20" r="2.5" className="fill-violet-400" />
      {/* Eye sockets with violet glow */}
      <ellipse cx="42" cy="48" rx="4" ry="5" className="fill-slate-950" />
      <ellipse cx="58" cy="48" rx="4" ry="5" className="fill-slate-950" />
      <circle cx="42" cy="48" r="2" className="fill-violet-400" />
      <circle cx="58" cy="48" r="2" className="fill-violet-400" />
      {/* Nose + teeth */}
      <path d="M 48 56 L 52 56 L 50 62 Z" className="fill-slate-950" />
      <rect x="44" y="66" width="2" height="6" className="fill-slate-950" />
      <rect x="48" y="66" width="2" height="6" className="fill-slate-950" />
      <rect x="52" y="66" width="2" height="6" className="fill-slate-950" />
      <rect x="56" y="66" width="2" height="6" className="fill-slate-950" />
      {/* Wisp tendrils */}
      <path
        d="M 30 60 Q 22 70, 26 86"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M 70 60 Q 78 70, 74 86"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
    </g>
  );
}

export const MONSTER_SILHOUETTES: Record<string, () => React.ReactNode> = {
  'goblin-scout': GoblinScout,
  'giant-rat': GiantRat,
  'forest-goblin': ForestGoblin,
  'orc-grunt': OrcGrunt,
  'cave-spider': CaveSpider,
  'skeleton-warrior': SkeletonWarrior,
  'dark-wolf': DarkWolf,
  'stone-troll': StoneTroll,
  'dark-mage': DarkMage,
  'lich-king': LichKing,
  'ancient-dragon': AncientDragon,
};

// ── CLASSES ──────────────────────────────────────────────────────────────────

function Warrior() {
  return (
    <g fill="currentColor">
      {/* Crossed swords */}
      <path d="M 30 26 L 36 20 L 70 54 L 64 60 Z" />
      <path d="M 70 26 L 64 20 L 30 54 L 36 60 Z" />
      {/* Hilts */}
      <rect x="22" y="22" width="14" height="4" transform="rotate(-45 29 24)" />
      <rect x="64" y="22" width="14" height="4" transform="rotate(45 71 24)" />
      {/* Shield below */}
      <path d="M 50 50 L 70 56 C 70 70, 64 78, 50 86 C 36 78, 30 70, 30 56 Z" />
      <path
        d="M 50 58 L 60 62 C 60 70, 56 74, 50 78 C 44 74, 40 70, 40 62 Z"
        className="fill-white/20 dark:fill-slate-950/30"
      />
    </g>
  );
}

function Wizard() {
  return (
    <g fill="currentColor">
      {/* Hat */}
      <path d="M 50 16 L 28 56 L 72 56 Z" />
      <rect x="28" y="56" width="44" height="6" />
      {/* Star on hat */}
      <path
        d="M 50 28 L 53 36 L 60 36 L 55 41 L 57 48 L 50 44 L 43 48 L 45 41 L 40 36 L 47 36 Z"
        className="fill-amber-300"
      />
      {/* Staff with crystal */}
      <rect x="68" y="32" width="3" height="50" />
      <circle cx="69.5" cy="30" r="6" />
      <circle cx="69.5" cy="30" r="3" className="fill-white dark:fill-violet-200" />
      {/* Beard */}
      <path d="M 42 64 L 50 80 L 58 64 Q 50 70, 42 64 Z" />
    </g>
  );
}

function Rogue() {
  return (
    <g fill="currentColor">
      {/* Hooded figure */}
      <path d="M 50 18 L 34 28 L 30 48 L 38 56 L 36 78 L 50 82 L 64 78 L 62 56 L 70 48 L 66 28 Z" />
      {/* Mask line over eyes */}
      <rect x="36" y="40" width="28" height="5" className="fill-slate-950" />
      {/* Eyes */}
      <circle cx="44" cy="42.5" r="1.5" className="fill-amber-300" />
      <circle cx="56" cy="42.5" r="1.5" className="fill-amber-300" />
      {/* Crossed daggers below */}
      <path d="M 28 70 L 32 66 L 50 84 L 46 88 Z" />
      <path d="M 72 70 L 68 66 L 50 84 L 54 88 Z" />
    </g>
  );
}

export const CLASS_SILHOUETTES: Record<string, () => React.ReactNode> = {
  warrior: Warrior,
  wizard: Wizard,
  rogue: Rogue,
};

// ── SUBCLASSES ───────────────────────────────────────────────────────────────

function Berserker() {
  return (
    <g fill="currentColor">
      {/* Axe + horned helm */}
      <path d="M 50 20 L 42 26 L 38 22 L 34 28 L 42 36 L 50 32 L 58 36 L 66 28 L 62 22 L 58 26 Z" />
      <rect x="48" y="34" width="4" height="44" />
      <path d="M 22 56 L 48 50 L 48 70 L 22 64 Z" />
      <path d="M 78 56 L 52 50 L 52 70 L 78 64 Z" />
    </g>
  );
}

function Paladin() {
  return (
    <g fill="currentColor">
      {/* Shield with cross */}
      <path d="M 50 18 L 76 24 C 76 56, 68 76, 50 88 C 32 76, 24 56, 24 24 Z" />
      <rect x="46" y="32" width="8" height="44" className="fill-white/30 dark:fill-slate-950/40" />
      <rect x="30" y="48" width="40" height="8" className="fill-white/30 dark:fill-slate-950/40" />
    </g>
  );
}

function Archmage() {
  return (
    <g fill="currentColor">
      {/* Orb + radiating runes */}
      <circle cx="50" cy="50" r="20" />
      <circle cx="50" cy="50" r="10" className="fill-white/40 dark:fill-violet-300/40" />
      <circle cx="50" cy="50" r="4" className="fill-white dark:fill-violet-100" />
      {/* Runes */}
      <rect x="48" y="18" width="4" height="6" />
      <rect x="48" y="76" width="4" height="6" />
      <rect x="18" y="48" width="6" height="4" />
      <rect x="76" y="48" width="6" height="4" />
      <rect x="26" y="26" width="6" height="4" transform="rotate(45 29 28)" />
      <rect x="68" y="26" width="6" height="4" transform="rotate(-45 71 28)" />
      <rect x="26" y="70" width="6" height="4" transform="rotate(-45 29 72)" />
      <rect x="68" y="70" width="6" height="4" transform="rotate(45 71 72)" />
    </g>
  );
}

function Warlock() {
  return (
    <g fill="currentColor">
      {/* Skull with curved horns */}
      <path d="M 50 28 L 38 32 L 32 44 L 34 60 L 42 66 L 42 76 L 58 76 L 58 66 L 66 60 L 68 44 L 62 32 Z" />
      <ellipse cx="42" cy="46" rx="4" ry="5" className="fill-slate-950" />
      <ellipse cx="58" cy="46" rx="4" ry="5" className="fill-slate-950" />
      <path d="M 38 30 Q 24 22, 22 8 Q 30 22, 40 30" />
      <path d="M 62 30 Q 76 22, 78 8 Q 70 22, 60 30" />
      {/* Mouth grimace */}
      <rect x="44" y="66" width="2" height="6" className="fill-slate-950" />
      <rect x="48" y="66" width="2" height="6" className="fill-slate-950" />
      <rect x="52" y="66" width="2" height="6" className="fill-slate-950" />
      <rect x="56" y="66" width="2" height="6" className="fill-slate-950" />
    </g>
  );
}

function Assassin() {
  return (
    <g fill="currentColor">
      {/* Dagger + skull */}
      <path d="M 50 22 L 44 28 L 44 56 L 50 62 L 56 56 L 56 28 Z" />
      <rect x="40" y="62" width="20" height="3" />
      <rect x="48" y="62" width="4" height="14" />
      {/* Smoke / shadow trails */}
      <path d="M 32 70 Q 26 78, 30 88 Q 38 80, 36 70 Z" />
      <path d="M 68 70 Q 74 78, 70 88 Q 62 80, 64 70 Z" />
    </g>
  );
}

function Ranger() {
  return (
    <g fill="currentColor">
      {/* Bow + arrow */}
      <path
        d="M 28 22 Q 24 50, 28 78"
        stroke="currentColor"
        strokeWidth="3.5"
        fill="none"
        strokeLinecap="round"
      />
      <path d="M 28 22 L 28 78" stroke="currentColor" strokeWidth="1" strokeDasharray="2 3" />
      {/* Arrow */}
      <rect x="32" y="48" width="40" height="3" />
      <path d="M 72 44 L 84 50 L 72 56 Z" />
      <path d="M 30 44 L 24 50 L 30 56 L 32 50 Z" />
    </g>
  );
}

export const SUBCLASS_SILHOUETTES: Record<string, () => React.ReactNode> = {
  berserker: Berserker,
  paladin: Paladin,
  archmage: Archmage,
  warlock: Warlock,
  assassin: Assassin,
  ranger: Ranger,
};

// ── ABILITIES (15 — by class + dice pattern) ─────────────────────────────────

function PowerStrike() {
  return (
    <g fill="currentColor">
      <path d="M 30 24 L 38 18 L 76 56 L 68 64 Z" />
      <rect x="20" y="20" width="16" height="4" transform="rotate(-45 28 22)" />
      <path d="M 70 60 L 80 50 L 82 58 L 78 70 L 70 72 Z" className="fill-amber-300" />
    </g>
  );
}

function ShieldSlam() {
  return (
    <g fill="currentColor">
      <path d="M 50 18 L 74 24 C 74 50, 68 72, 50 84 C 32 72, 26 50, 26 24 Z" />
      <path
        d="M 50 36 L 58 48 L 70 48 L 60 56 L 64 70 L 50 62 L 36 70 L 40 56 L 30 48 L 42 48 Z"
        className="fill-white/30 dark:fill-slate-950/40"
      />
    </g>
  );
}

function WarCry() {
  return (
    <g fill="currentColor">
      <path d="M 30 40 L 50 36 L 50 64 L 30 60 Z" />
      <path d="M 50 36 L 70 24 L 70 76 L 50 64 Z" />
      <path
        d="M 72 42 Q 84 46, 84 50 Q 84 54, 72 58"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
      <path
        d="M 76 36 Q 90 42, 90 50 Q 90 58, 76 64"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
    </g>
  );
}

function BerserkerRage() {
  return (
    <g fill="currentColor">
      {/* Flame burst */}
      <path d="M 50 16 L 56 36 L 70 30 L 64 50 L 78 56 L 60 60 L 64 78 L 50 68 L 36 78 L 40 60 L 22 56 L 36 50 L 30 30 L 44 36 Z" />
      <circle cx="50" cy="50" r="8" className="fill-amber-300" />
    </g>
  );
}

function Unstoppable() {
  return (
    <g fill="currentColor">
      {/* Lightning bolt */}
      <path d="M 50 16 L 38 50 L 50 50 L 36 84 L 64 44 L 50 44 L 60 16 Z" />
      <path
        d="M 50 16 L 38 50 L 50 50 L 36 84 L 64 44 L 50 44 L 60 16 Z"
        className="fill-amber-300/40"
      />
    </g>
  );
}

function ArcaneBolt() {
  return (
    <g fill="currentColor">
      <circle cx="50" cy="50" r="10" />
      <circle cx="50" cy="50" r="4" className="fill-white dark:fill-violet-200" />
      <path d="M 50 20 L 56 38 L 50 50 L 44 38 Z" />
      <path d="M 50 80 L 56 62 L 50 50 L 44 62 Z" />
      <path d="M 20 50 L 38 56 L 50 50 L 38 44 Z" />
      <path d="M 80 50 L 62 56 L 50 50 L 62 44 Z" />
    </g>
  );
}

function ManaSurge() {
  return (
    <g fill="currentColor">
      <path d="M 50 18 Q 30 30, 30 50 Q 30 70, 50 82 Q 70 70, 70 50 Q 70 30, 50 18 Z" />
      <path
        d="M 50 30 Q 40 36, 40 50 Q 40 64, 50 70 Q 60 64, 60 50 Q 60 36, 50 30 Z"
        className="fill-white/30 dark:fill-violet-300/30"
      />
      <circle cx="50" cy="50" r="6" className="fill-white dark:fill-violet-100" />
    </g>
  );
}

function ChainLightning() {
  return (
    <g fill="currentColor">
      <path
        d="M 22 20 L 36 38 L 28 42 L 44 60 L 36 64 L 56 84"
        stroke="currentColor"
        strokeWidth="4"
        fill="none"
        strokeLinejoin="miter"
      />
      <path
        d="M 56 20 L 70 38 L 62 42 L 78 60 L 70 64 L 82 78"
        stroke="currentColor"
        strokeWidth="3"
        fill="none"
        strokeLinejoin="miter"
      />
    </g>
  );
}

function Meteor() {
  return (
    <g fill="currentColor">
      <circle cx="62" cy="38" r="14" />
      <circle cx="62" cy="38" r="8" className="fill-amber-300" />
      <circle cx="62" cy="38" r="3" className="fill-white" />
      {/* Tail */}
      <path d="M 50 38 L 22 64 L 16 78 L 30 72 Z" />
      <path d="M 56 44 L 28 70 L 24 80 L 36 76 Z" className="fill-amber-300/50" />
    </g>
  );
}

function TimeWarp() {
  return (
    <g fill="currentColor">
      <circle cx="50" cy="50" r="22" fill="none" stroke="currentColor" strokeWidth="3" />
      <circle cx="50" cy="50" r="14" fill="none" stroke="currentColor" strokeWidth="2" />
      <rect x="48" y="32" width="4" height="20" />
      <rect x="48" y="50" width="4" height="14" transform="rotate(60 50 50)" />
      <circle cx="50" cy="50" r="3" />
    </g>
  );
}

function Backstab() {
  return (
    <g fill="currentColor">
      <path d="M 30 26 L 36 22 L 76 62 L 70 68 Z" />
      <rect x="22" y="22" width="16" height="4" transform="rotate(-45 30 24)" />
      <path d="M 72 64 L 80 58 L 82 66 L 78 76 L 70 74 Z" className="fill-rose-400" />
    </g>
  );
}

function BladeDance() {
  return (
    <g fill="currentColor">
      <path d="M 24 30 L 32 22 L 50 50 L 42 58 Z" />
      <path d="M 76 30 L 68 22 L 50 50 L 58 58 Z" />
      <path d="M 24 70 L 32 78 L 50 50 L 42 42 Z" />
      <path d="M 76 70 L 68 78 L 50 50 L 58 42 Z" />
      <circle cx="50" cy="50" r="5" />
    </g>
  );
}

function DeathMark() {
  return (
    <g fill="currentColor">
      {/* Skull within crosshair */}
      <circle cx="50" cy="50" r="20" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <path
        d="M 50 22 L 50 38 M 50 62 L 50 78 M 22 50 L 38 50 M 62 50 L 78 50"
        stroke="currentColor"
        strokeWidth="2.5"
      />
      <path d="M 50 38 L 40 42 L 38 52 L 42 60 L 44 64 L 56 64 L 58 60 L 62 52 L 60 42 Z" />
      <circle cx="44" cy="50" r="2" className="fill-slate-950" />
      <circle cx="56" cy="50" r="2" className="fill-slate-950" />
    </g>
  );
}

function Assassinate() {
  return (
    <g fill="currentColor">
      <path d="M 50 16 L 40 26 L 40 60 L 50 68 L 60 60 L 60 26 Z" />
      <rect x="34" y="68" width="32" height="4" />
      <rect x="48" y="68" width="4" height="16" />
      <path d="M 28 30 Q 22 38, 26 50" stroke="currentColor" strokeWidth="2.5" fill="none" />
      <path d="M 72 30 Q 78 38, 74 50" stroke="currentColor" strokeWidth="2.5" fill="none" />
    </g>
  );
}

function ShadowClone() {
  return (
    <g fill="currentColor">
      {/* Three overlapping rogue silhouettes */}
      <g opacity="0.45">
        <path d="M 26 30 L 18 38 L 18 60 L 26 70 L 38 68 L 38 36 Z" />
      </g>
      <g opacity="0.45">
        <path d="M 74 30 L 82 38 L 82 60 L 74 70 L 62 68 L 62 36 Z" />
      </g>
      <path d="M 50 22 L 38 32 L 38 64 L 50 76 L 62 64 L 62 32 Z" />
      <rect x="40" y="42" width="20" height="4" className="fill-slate-950" />
    </g>
  );
}

export const ABILITY_SILHOUETTES: Record<string, () => React.ReactNode> = {
  // warrior
  'power-strike': PowerStrike,
  'shield-slam': ShieldSlam,
  'war-cry': WarCry,
  'berserker-rage': BerserkerRage,
  unstoppable: Unstoppable,
  // wizard
  'arcane-bolt': ArcaneBolt,
  'mana-surge': ManaSurge,
  'chain-lightning': ChainLightning,
  meteor: Meteor,
  'time-warp': TimeWarp,
  // rogue
  backstab: Backstab,
  'blade-dance': BladeDance,
  'death-mark': DeathMark,
  assassinate: Assassinate,
  'shadow-clone': ShadowClone,
};

// ── SPELLS (9 effect-tier) ───────────────────────────────────────────────────

function SpellDamage() {
  return (
    <g fill="currentColor">
      <path d="M 50 16 L 38 50 L 50 50 L 36 84 L 64 44 L 50 44 L 60 16 Z" />
    </g>
  );
}

function SpellHeal() {
  return (
    <g fill="currentColor">
      <path d="M 50 22 C 38 22, 30 32, 30 44 C 30 60, 50 78, 50 78 C 50 78, 70 60, 70 44 C 70 32, 62 22, 50 22 Z" />
      <rect x="46" y="40" width="8" height="20" className="fill-white dark:fill-emerald-200" />
      <rect x="38" y="48" width="24" height="8" className="fill-white dark:fill-emerald-200" />
    </g>
  );
}

function SpellStun() {
  return (
    <g fill="currentColor">
      {/* Snowflake */}
      <path
        d="M 50 18 L 50 82 M 22 50 L 78 50 M 30 30 L 70 70 M 70 30 L 30 70"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        d="M 45 24 L 50 18 L 55 24 M 24 45 L 18 50 L 24 55 M 76 45 L 82 50 L 76 55 M 45 76 L 50 82 L 55 76"
        stroke="currentColor"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="50" cy="50" r="4" />
    </g>
  );
}

function SpellLifesteal() {
  return (
    <g fill="currentColor">
      <path d="M 50 24 C 38 24, 30 34, 30 46 C 30 60, 50 80, 50 80 C 50 80, 70 60, 70 46 C 70 34, 62 24, 50 24 Z" />
      {/* Drip */}
      <circle cx="50" cy="84" r="4" className="fill-rose-400" />
      <path d="M 50 60 L 46 80 L 50 76 L 54 80 Z" className="fill-rose-300" />
    </g>
  );
}

function SpellDefense() {
  return (
    <g fill="currentColor">
      <path d="M 50 18 L 74 24 C 74 56, 68 76, 50 88 C 32 76, 26 56, 26 24 Z" />
      <path d="M 50 34 L 50 70" stroke="currentColor" strokeWidth="3" />
      <path d="M 36 52 L 64 52" stroke="currentColor" strokeWidth="3" />
    </g>
  );
}

function SpellMagicDamage() {
  // Bypass-def damage: skull + bolt
  return (
    <g fill="currentColor">
      <path d="M 50 22 L 38 26 L 32 38 L 34 56 L 42 64 L 42 74 L 58 74 L 58 64 L 66 56 L 68 38 L 62 26 Z" />
      <ellipse cx="42" cy="42" rx="4" ry="5" className="fill-slate-950" />
      <ellipse cx="58" cy="42" rx="4" ry="5" className="fill-slate-950" />
      <path
        d="M 50 24 L 44 40 L 50 40 L 46 56 L 56 38 L 50 38 L 54 24 Z"
        className="fill-amber-300"
      />
    </g>
  );
}

function SpellStamina() {
  return (
    <g fill="currentColor">
      <path d="M 54 18 L 30 52 L 46 52 L 38 82 L 70 44 L 54 44 L 64 18 Z" />
    </g>
  );
}

function SpellFire() {
  // Damage + heal mix — fiery emblem
  return (
    <g fill="currentColor">
      <path d="M 50 18 Q 38 32, 42 44 Q 38 38, 32 44 Q 26 58, 36 70 Q 46 82, 50 78 Q 54 82, 64 70 Q 74 58, 68 44 Q 62 38, 58 44 Q 62 32, 50 18 Z" />
      <path d="M 50 40 Q 44 50, 48 58 Q 50 62, 52 58 Q 56 50, 50 40 Z" className="fill-amber-300" />
    </g>
  );
}

function SpellStunHeal() {
  // Cross + sparkle
  return (
    <g fill="currentColor">
      <rect x="46" y="28" width="8" height="44" />
      <rect x="32" y="42" width="36" height="8" />
      <circle cx="20" cy="30" r="3" className="fill-amber-300" />
      <circle cx="80" cy="30" r="3" className="fill-amber-300" />
      <circle cx="20" cy="70" r="3" className="fill-amber-300" />
      <circle cx="80" cy="70" r="3" className="fill-amber-300" />
    </g>
  );
}

export type SpellEffectKey =
  | 'damage'
  | 'heal'
  | 'stun'
  | 'lifesteal'
  | 'defense'
  | 'magic-damage'
  | 'stamina'
  | 'fire'
  | 'stun-heal';

export const SPELL_SILHOUETTES: Record<SpellEffectKey, () => React.ReactNode> = {
  damage: SpellDamage,
  heal: SpellHeal,
  stun: SpellStun,
  lifesteal: SpellLifesteal,
  defense: SpellDefense,
  'magic-damage': SpellMagicDamage,
  stamina: SpellStamina,
  fire: SpellFire,
  'stun-heal': SpellStunHeal,
};

// ── ACTIVITIES (6) ───────────────────────────────────────────────────────────

function ActivityRun() {
  return (
    <g fill="currentColor">
      {/* Runner figure */}
      <circle cx="60" cy="24" r="6" />
      <path d="M 56 30 L 46 50 L 36 56 L 40 60 L 50 56 L 60 62 L 56 78 L 62 82 L 70 64 L 66 50 L 76 44 L 74 38 L 64 42 L 60 32 Z" />
    </g>
  );
}

function ActivityWorkout() {
  return (
    <g fill="currentColor">
      {/* Dumbbell */}
      <rect x="18" y="36" width="10" height="28" rx="2" />
      <rect x="28" y="42" width="10" height="16" />
      <rect x="38" y="46" width="24" height="8" />
      <rect x="62" y="42" width="10" height="16" />
      <rect x="72" y="36" width="10" height="28" rx="2" />
    </g>
  );
}

function ActivitySteps() {
  return (
    <g fill="currentColor">
      {/* Footprints */}
      <ellipse cx="36" cy="36" rx="8" ry="11" />
      <circle cx="32" cy="22" r="3" />
      <circle cx="40" cy="20" r="2.5" />
      <ellipse cx="60" cy="64" rx="8" ry="11" />
      <circle cx="56" cy="50" r="3" />
      <circle cx="64" cy="48" r="2.5" />
      <circle cx="68" cy="52" r="2" />
    </g>
  );
}

function ActivitySleep() {
  return (
    <g fill="currentColor">
      {/* Moon + Z's */}
      <path d="M 36 24 C 26 26, 18 36, 18 50 C 18 64, 28 76, 42 76 C 56 76, 64 68, 66 60 C 56 64, 44 56, 42 44 C 40 36, 32 32, 36 24 Z" />
      <text
        x="62"
        y="36"
        style={{ fontSize: 14, fontWeight: 700, fontFamily: 'sans-serif' }}
        fill="currentColor"
      >
        Z
      </text>
      <text
        x="72"
        y="26"
        style={{ fontSize: 10, fontWeight: 700, fontFamily: 'sans-serif' }}
        fill="currentColor"
      >
        z
      </text>
    </g>
  );
}

function ActivityWater() {
  return (
    <g fill="currentColor">
      {/* Water drop */}
      <path d="M 50 14 C 50 14, 28 38, 28 56 C 28 70, 38 82, 50 82 C 62 82, 72 70, 72 56 C 72 38, 50 14, 50 14 Z" />
      <path
        d="M 38 60 C 38 50, 44 44, 48 44"
        stroke="white"
        strokeOpacity="0.5"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
    </g>
  );
}

function ActivityNutrition() {
  return (
    <g fill="currentColor">
      {/* Apple */}
      <path d="M 50 28 C 38 24, 22 34, 24 52 C 26 70, 38 82, 50 78 C 62 82, 74 70, 76 52 C 78 34, 62 24, 50 28 Z" />
      <path
        d="M 50 28 L 50 18 L 56 14"
        stroke="currentColor"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      <ellipse cx="58" cy="14" rx="6" ry="3" />
    </g>
  );
}

export const ACTIVITY_SILHOUETTES: Record<string, () => React.ReactNode> = {
  run: ActivityRun,
  workout: ActivityWorkout,
  steps: ActivitySteps,
  sleep: ActivitySleep,
  water: ActivityWater,
  nutrition: ActivityNutrition,
};

// ── ACHIEVEMENTS (6) ─────────────────────────────────────────────────────────

function AchDungeonInitiate() {
  return (
    <g fill="currentColor">
      {/* Castle */}
      <rect x="22" y="48" width="56" height="32" />
      <rect x="22" y="40" width="6" height="10" />
      <rect x="34" y="40" width="6" height="10" />
      <rect x="60" y="40" width="6" height="10" />
      <rect x="72" y="40" width="6" height="10" />
      <rect x="44" y="32" width="12" height="18" />
      <path d="M 50 24 L 50 18" stroke="currentColor" strokeWidth="2" />
      <path d="M 48 16 L 56 18 L 52 22 L 56 26 L 48 24 Z" />
      <rect x="44" y="58" width="12" height="22" className="fill-slate-950" />
    </g>
  );
}

function AchGoblinSlayer() {
  return (
    <g fill="currentColor">
      {/* Goblin head + slash */}
      <path d="M 50 30 L 40 36 L 32 42 L 36 52 L 34 60 L 40 64 L 42 72 L 58 72 L 60 64 L 66 60 L 64 52 L 68 42 L 60 36 Z" />
      <circle cx="44" cy="48" r="2.5" className="fill-slate-950" />
      <circle cx="56" cy="48" r="2.5" className="fill-slate-950" />
      <path d="M 16 16 L 84 84" stroke="currentColor" strokeWidth="5" />
      <path d="M 16 16 L 84 84" stroke="white" strokeOpacity="0.4" strokeWidth="2" />
    </g>
  );
}

function AchWebWalker() {
  return (
    <g fill="currentColor">
      {/* Web pattern */}
      <circle cx="50" cy="50" r="32" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="50" cy="50" r="22" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="50" cy="50" r="12" fill="none" stroke="currentColor" strokeWidth="2" />
      <path
        d="M 50 18 L 50 82 M 18 50 L 82 50 M 27 27 L 73 73 M 73 27 L 27 73"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle cx="50" cy="50" r="4" />
    </g>
  );
}

function AchDarkArts() {
  return (
    <g fill="currentColor">
      {/* Pentagram star */}
      <path d="M 50 18 L 60 44 L 86 44 L 64 60 L 72 86 L 50 70 L 28 86 L 36 60 L 14 44 L 40 44 Z" />
      <circle cx="50" cy="50" r="14" className="fill-slate-950" />
      <circle cx="50" cy="50" r="6" />
    </g>
  );
}

function AchDragonheart() {
  return (
    <g fill="currentColor">
      {/* Heart with dragon scales */}
      <path d="M 50 78 C 30 64, 18 50, 18 36 C 18 26, 26 18, 36 18 C 42 18, 48 22, 50 28 C 52 22, 58 18, 64 18 C 74 18, 82 26, 82 36 C 82 50, 70 64, 50 78 Z" />
      <path
        d="M 38 36 L 42 32 L 46 36 L 50 32 L 54 36 L 58 32 L 62 36"
        stroke="white"
        strokeOpacity="0.5"
        strokeWidth="2"
        fill="none"
      />
      <path
        d="M 36 48 L 40 44 L 44 48 L 48 44 L 52 48 L 56 44 L 60 48 L 64 44"
        stroke="white"
        strokeOpacity="0.5"
        strokeWidth="2"
        fill="none"
      />
    </g>
  );
}

function AchLegendaryHaul() {
  return (
    <g fill="currentColor">
      {/* Treasure chest with star */}
      <rect x="20" y="42" width="60" height="36" rx="3" />
      <path d="M 20 42 C 20 30, 30 24, 50 24 C 70 24, 80 30, 80 42 Z" />
      <rect x="46" y="46" width="8" height="8" className="fill-slate-950" />
      <circle cx="50" cy="50" r="2" className="fill-amber-300" />
      <path
        d="M 50 14 L 53 22 L 62 22 L 55 27 L 58 36 L 50 31 L 42 36 L 45 27 L 38 22 L 47 22 Z"
        className="fill-amber-300"
      />
    </g>
  );
}

export const ACHIEVEMENT_SILHOUETTES: Record<string, () => React.ReactNode> = {
  'dungeon-initiate': AchDungeonInitiate,
  'goblin-slayer': AchGoblinSlayer,
  'web-walker': AchWebWalker,
  'dark-arts': AchDarkArts,
  dragonheart: AchDragonheart,
  'legendary-haul': AchLegendaryHaul,
};

// ── DUNGEON TIERS (4) ────────────────────────────────────────────────────────

function DungeonGoblinCaves() {
  return (
    <g fill="currentColor">
      {/* Cave mouth + glowing eyes */}
      <path d="M 16 80 C 16 50, 30 28, 50 28 C 70 28, 84 50, 84 80 Z" />
      <circle cx="40" cy="58" r="3" className="fill-amber-300" />
      <circle cx="60" cy="58" r="3" className="fill-amber-300" />
      <path
        d="M 20 80 L 26 70 L 30 80 M 38 80 L 44 72 L 50 80 L 56 72 L 62 80 M 70 80 L 76 72 L 80 80"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
    </g>
  );
}

function DungeonSpiderLair() {
  return (
    <g fill="currentColor">
      <circle cx="50" cy="50" r="14" />
      <circle cx="44" cy="46" r="1.5" className="fill-rose-400" />
      <circle cx="56" cy="46" r="1.5" className="fill-rose-400" />
      <path
        d="M 36 50 L 18 36 M 36 54 L 16 54 M 38 60 L 22 72 M 42 64 L 36 84 M 64 50 L 82 36 M 64 54 L 84 54 M 62 60 L 78 72 M 58 64 L 64 84"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </g>
  );
}

function DungeonDarkSanctum() {
  return (
    <g fill="currentColor">
      {/* Tower silhouette with rune */}
      <path d="M 38 18 L 42 22 L 42 30 L 36 36 L 36 80 L 64 80 L 64 36 L 58 30 L 58 22 L 62 18 L 58 18 L 56 22 L 50 22 L 44 22 L 42 18 Z" />
      <rect x="46" y="48" width="8" height="14" className="fill-slate-950" />
      <circle cx="50" cy="55" r="3" className="fill-violet-400" />
    </g>
  );
}

function DungeonDragonsKeep() {
  return (
    <g fill="currentColor">
      {/* Castle with dragon head poking out */}
      <rect x="20" y="48" width="60" height="32" />
      <rect x="20" y="40" width="8" height="10" />
      <rect x="36" y="40" width="8" height="10" />
      <rect x="56" y="40" width="8" height="10" />
      <rect x="72" y="40" width="8" height="10" />
      <path d="M 50 18 L 42 26 L 46 32 L 42 38 L 50 42 L 58 38 L 54 32 L 58 26 Z" />
      <circle cx="46" cy="30" r="1.5" className="fill-amber-300" />
      <circle cx="54" cy="30" r="1.5" className="fill-amber-300" />
      <path
        d="M 30 60 L 36 66 L 42 60 M 58 60 L 64 66 L 70 60"
        stroke="white"
        strokeOpacity="0.4"
        strokeWidth="2"
        fill="none"
      />
    </g>
  );
}

export const DUNGEON_SILHOUETTES: Record<string, () => React.ReactNode> = {
  'goblin-caves': DungeonGoblinCaves,
  'spider-lair': DungeonSpiderLair,
  'dark-sanctum': DungeonDarkSanctum,
  'dragons-keep': DungeonDragonsKeep,
};

// ── ITEMS (by type — fallback keys) ──────────────────────────────────────────

function ItemWeapon() {
  return (
    <g fill="currentColor">
      <path d="M 50 14 L 44 50 L 50 56 L 56 50 Z" />
      <rect x="40" y="56" width="20" height="4" />
      <rect x="48" y="60" width="4" height="22" />
      <rect x="42" y="80" width="16" height="4" />
    </g>
  );
}

function ItemArmor() {
  return (
    <g fill="currentColor">
      <path d="M 28 24 L 50 18 L 72 24 L 76 40 L 74 70 L 50 82 L 26 70 L 24 40 Z" />
      <path d="M 50 32 L 50 70" stroke="white" strokeOpacity="0.3" strokeWidth="2" />
      <circle cx="50" cy="42" r="2.5" className="fill-white/30" />
      <circle cx="50" cy="52" r="2.5" className="fill-white/30" />
      <circle cx="50" cy="62" r="2.5" className="fill-white/30" />
    </g>
  );
}

function ItemAccessory() {
  return (
    <g fill="currentColor">
      <circle cx="50" cy="58" r="20" fill="none" stroke="currentColor" strokeWidth="6" />
      <path d="M 50 16 L 44 30 L 50 38 L 56 30 Z" className="fill-amber-300" />
      <circle cx="50" cy="22" r="3" />
    </g>
  );
}

function ItemConsumable() {
  return (
    <g fill="currentColor">
      <rect x="42" y="14" width="16" height="10" rx="2" />
      <rect x="46" y="24" width="8" height="6" />
      <path d="M 32 56 C 32 40, 40 30, 50 30 C 60 30, 68 40, 68 56 L 68 72 C 68 80, 60 86, 50 86 C 40 86, 32 80, 32 72 Z" />
      <path
        d="M 38 56 C 38 70, 42 78, 50 80"
        stroke="white"
        strokeOpacity="0.4"
        strokeWidth="2.5"
        fill="none"
      />
    </g>
  );
}

// ── ITEMS (per item ID — weapons) ────────────────────────────────────────────

function WornSword() {
  return (
    <g fill="currentColor">
      <path d="M 50 16 L 46 55 L 50 61 L 54 55 Z" />
      <rect x="37" y="61" width="26" height="5" rx="1" />
      <rect x="47" y="66" width="6" height="15" rx="1" />
      <ellipse cx="50" cy="84" rx="5" ry="3" />
    </g>
  );
}

function OakStaff() {
  return (
    <g fill="currentColor">
      <rect x="47" y="16" width="6" height="68" rx="3" />
      <ellipse cx="50" cy="30" rx="10" ry="6" />
      <ellipse cx="50" cy="16" rx="5" ry="4" />
    </g>
  );
}

function HuntersBow() {
  return (
    <g fill="currentColor">
      {/* Bow limb */}
      <path d="M 44 16 C 28 30 28 70 44 84 L 47 80 C 33 68 33 32 47 20 Z" />
      {/* Bowstring */}
      <rect x="44" y="16" width="2" height="68" />
      {/* Grip wrap */}
      <rect x="40" y="46" width="9" height="8" rx="1" />
    </g>
  );
}

function IronSword() {
  return (
    <g fill="currentColor">
      <path d="M 50 14 L 44 56 L 50 62 L 56 56 Z" />
      <rect x="34" y="62" width="32" height="6" rx="2" />
      <rect x="47" y="68" width="6" height="14" rx="1" />
      <ellipse cx="50" cy="85" rx="6" ry="4" />
    </g>
  );
}

function ArcaneTome() {
  return (
    <g fill="currentColor">
      {/* Book cover */}
      <rect x="26" y="18" width="48" height="64" rx="3" />
      {/* Spine */}
      <rect x="26" y="18" width="7" height="64" rx="2" />
      {/* Arcane eye on cover */}
      <ellipse cx="53" cy="44" rx="10" ry="6" />
      <circle cx="53" cy="44" r="4" />
      {/* Decorative lines */}
      <rect x="36" y="56" width="28" height="3" rx="1" />
      <rect x="36" y="63" width="20" height="3" rx="1" />
      <rect x="36" y="70" width="24" height="3" rx="1" />
    </g>
  );
}

function TwinDaggers() {
  return (
    <g fill="currentColor">
      {/* Left dagger (angled top-left to bottom-right) */}
      <path d="M 30 22 L 27 26 L 54 70 L 58 66 Z" />
      <rect x="24" y="22" width="10" height="4" rx="1" transform="rotate(-40 29 24)" />
      {/* Right dagger (angled top-right to bottom-left) */}
      <path d="M 70 22 L 73 26 L 46 70 L 42 66 Z" />
      <rect x="66" y="22" width="10" height="4" rx="1" transform="rotate(40 71 24)" />
    </g>
  );
}

function DragonboneBlade() {
  return (
    <g fill="currentColor">
      {/* Wide blade */}
      <path d="M 50 14 L 40 58 L 50 64 L 60 58 Z" />
      {/* Serrated spine (bone-like protrusions on right) */}
      <path d="M 59 30 L 65 26 L 61 35 Z" />
      <path d="M 60 40 L 67 36 L 62 45 Z" />
      <path d="M 59 50 L 65 47 L 61 54 Z" />
      {/* Crossguard — wide and ornate */}
      <path d="M 32 64 L 38 58 L 62 58 L 68 64 L 62 70 L 38 70 Z" />
      {/* Grip */}
      <rect x="46" y="70" width="8" height="14" rx="2" />
      <circle cx="50" cy="86" r="4" />
    </g>
  );
}

function StaffOfAges() {
  return (
    <g fill="currentColor">
      {/* Staff shaft */}
      <rect x="47" y="34" width="6" height="54" rx="3" />
      {/* Orb */}
      <circle cx="50" cy="26" r="14" />
      <circle cx="50" cy="26" r="7" />
      {/* Crescent ring around orb */}
      <path d="M 38 20 C 34 26 36 34 42 36 C 36 30 36 22 42 16 Z" />
    </g>
  );
}

function Shadowfang() {
  return (
    <g fill="currentColor">
      {/* Curved fang blade */}
      <path d="M 48 14 C 48 14 70 28 68 58 L 62 60 C 64 34 46 22 42 20 Z" />
      {/* Inner curve (negative-space effect via shape) */}
      <path d="M 50 28 C 50 28 62 40 60 56 L 56 57 C 58 44 50 34 46 32 Z" />
      {/* Guard */}
      <path d="M 36 62 L 44 58 L 52 64 L 42 72 Z" />
      {/* Grip */}
      <rect x="34" y="70" width="14" height="6" rx="2" transform="rotate(-20 41 73)" />
    </g>
  );
}

function Stormcleaver() {
  return (
    <g fill="currentColor">
      {/* Axe handle */}
      <rect x="47" y="46" width="6" height="42" rx="3" />
      {/* Axe head — wide crescent */}
      <path d="M 50 14 C 30 14 22 26 22 38 C 22 50 30 56 50 54 C 36 50 30 44 30 38 C 30 28 38 20 50 20 Z" />
      <path d="M 50 14 C 70 14 78 26 78 38 C 78 50 70 56 50 54 C 64 50 70 44 70 38 C 70 28 62 20 50 20 Z" />
      {/* Lightning bolt cut-out (negative shape) */}
      <path d="M 54 24 L 46 36 L 52 36 L 44 50 L 56 36 L 50 36 Z" />
    </g>
  );
}

function VoidTome() {
  return (
    <g fill="currentColor">
      {/* Book */}
      <rect x="26" y="18" width="48" height="64" rx="3" />
      <rect x="26" y="18" width="7" height="64" rx="2" />
      {/* Void spiral on cover */}
      <circle cx="53" cy="46" r="16" />
      <circle cx="53" cy="46" r="11" />
      <circle cx="53" cy="46" r="6" />
      {/* Center void dot */}
      <circle cx="53" cy="46" r="2" />
    </g>
  );
}

function PhantomBlades() {
  return (
    <g fill="currentColor">
      {/* Left blade */}
      <path d="M 38 16 L 34 20 L 48 72 L 52 72 L 54 68 Z" />
      {/* Right blade — offset/mirrored */}
      <path d="M 62 16 L 66 20 L 52 72 L 48 72 L 46 68 Z" />
      {/* Crossguard left */}
      <rect x="28" y="20" width="14" height="4" rx="1" />
      {/* Crossguard right */}
      <rect x="58" y="20" width="14" height="4" rx="1" />
    </g>
  );
}

function Godslayer() {
  return (
    <g fill="currentColor">
      {/* Wide imposing blade */}
      <path d="M 50 12 L 42 60 L 50 66 L 58 60 Z" />
      {/* Ornate crossguard with upswept quillons */}
      <path d="M 28 66 L 34 60 L 66 60 L 72 66 L 66 72 L 34 72 Z" />
      <path d="M 28 66 L 22 58 L 30 58 Z" />
      <path d="M 72 66 L 78 58 L 70 58 Z" />
      {/* Grip */}
      <rect x="47" y="72" width="6" height="14" rx="1" />
      {/* Ornate pommel */}
      <path d="M 44 86 L 50 82 L 56 86 L 53 90 L 47 90 Z" />
    </g>
  );
}

function EternalGrimoire() {
  return (
    <g fill="currentColor">
      {/* Large ornate book */}
      <rect x="22" y="16" width="56" height="70" rx="4" />
      {/* Spine with decorative bands */}
      <rect x="22" y="16" width="9" height="70" rx="3" />
      <rect x="22" y="36" width="9" height="4" />
      <rect x="22" y="62" width="9" height="4" />
      {/* Ornate border on cover */}
      <rect x="34" y="22" width="38" height="58" rx="2" />
      {/* Clasp */}
      <ellipse cx="72" cy="51" rx="6" ry="8" />
      <circle cx="72" cy="51" r="3" />
      {/* Star on cover */}
      <path d="M 53 32 L 55 40 L 63 40 L 57 45 L 59 53 L 53 48 L 47 53 L 49 45 L 43 40 L 51 40 Z" />
    </g>
  );
}

function OblivionEdge() {
  return (
    <g fill="currentColor">
      {/* Cracked blade — two halves with void gap */}
      <path d="M 50 14 L 43 52 L 48 60 L 53 54 Z" />
      <path d="M 50 14 L 57 52 L 52 60 L 47 54 Z" />
      {/* Crack line void */}
      <path
        d="M 50 18 L 50 56"
        stroke="currentColor"
        strokeWidth="1"
        fill="none"
        strokeOpacity="0"
      />
      {/* Void shards floating off the blade */}
      <path d="M 57 28 L 63 24 L 62 30 Z" />
      <path d="M 58 40 L 65 38 L 63 44 Z" />
      <path d="M 43 32 L 37 28 L 38 34 Z" />
      {/* Crossguard */}
      <rect x="35" y="60" width="30" height="5" rx="1" />
      {/* Grip */}
      <rect x="47" y="65" width="6" height="14" rx="1" />
      <circle cx="50" cy="82" r="4" />
    </g>
  );
}

function FlintsteelDagger() {
  return (
    <g fill="currentColor">
      {/* Jagged dagger blade */}
      <path d="M 50 18 L 46 44 L 48 48 L 50 44 L 52 50 L 54 44 L 56 48 L 54 54 L 50 58 L 46 54 Z" />
      {/* Short crossguard */}
      <rect x="40" y="58" width="20" height="4" rx="1" />
      {/* Short grip */}
      <rect x="47" y="62" width="6" height="12" rx="1" />
      <circle cx="50" cy="77" r="3" />
    </g>
  );
}

function NecroticStaff() {
  return (
    <g fill="currentColor">
      {/* Staff shaft */}
      <rect x="47" y="38" width="6" height="50" rx="3" />
      {/* Skull — cranium */}
      <ellipse cx="50" cy="26" rx="13" ry="12" />
      {/* Skull — jaw */}
      <path d="M 40 32 L 40 38 L 60 38 L 60 32 C 56 36 44 36 40 32 Z" />
      {/* Eye sockets */}
      <ellipse cx="44" cy="24" rx="4" ry="3" />
      <ellipse cx="56" cy="24" rx="4" ry="3" />
      {/* Nose void */}
      <path d="M 48 30 L 50 27 L 52 30 Z" />
    </g>
  );
}

function EmberclawGauntlets() {
  return (
    <g fill="currentColor">
      {/* Gauntlet body */}
      <rect x="36" y="42" width="28" height="36" rx="4" />
      {/* Knuckle plate */}
      <rect x="34" y="36" width="32" height="10" rx="3" />
      {/* Three claw fingers */}
      <path d="M 40 36 L 37 18 L 41 14 L 44 36 Z" />
      <path d="M 50 34 L 48 14 L 52 14 L 50 34 Z" />
      <path d="M 60 36 L 56 36 L 59 14 L 63 18 Z" />
      {/* Ember glow detail line */}
      <rect x="38" y="52" width="24" height="3" rx="1" />
    </g>
  );
}

// ── ITEMS (per item ID — armor) ───────────────────────────────────────────────

function LeatherVest() {
  return (
    <g fill="currentColor">
      {/* Vest body */}
      <path d="M 30 30 L 36 22 L 50 26 L 64 22 L 70 30 L 72 70 L 50 76 L 28 70 Z" />
      {/* Collar/neck opening */}
      <path d="M 40 22 L 50 28 L 60 22 L 50 22 Z" />
      {/* Lace-up center */}
      <rect x="48" y="34" width="4" height="32" rx="1" />
      <rect x="42" y="38" width="16" height="3" rx="1" />
      <rect x="42" y="46" width="16" height="3" rx="1" />
      <rect x="42" y="54" width="16" height="3" rx="1" />
    </g>
  );
}

function PaddedRobe() {
  return (
    <g fill="currentColor">
      {/* Wide robe body */}
      <path d="M 26 30 L 32 20 L 50 24 L 68 20 L 74 30 L 78 82 L 22 82 Z" />
      {/* Hood/collar */}
      <path d="M 36 20 L 50 26 L 64 20 C 60 16 40 16 36 20 Z" />
      {/* Belt */}
      <rect x="26" y="52" width="48" height="6" rx="2" />
      {/* Buckle */}
      <rect x="46" y="50" width="8" height="10" rx="1" />
    </g>
  );
}

function ChainShirt() {
  return (
    <g fill="currentColor">
      {/* Shirt silhouette */}
      <path d="M 28 28 L 36 20 L 50 24 L 64 20 L 72 28 L 74 72 L 26 72 Z" />
      {/* Chain link rows */}
      <ellipse cx="38" cy="36" rx="4" ry="3" />
      <ellipse cx="50" cy="36" rx="4" ry="3" />
      <ellipse cx="62" cy="36" rx="4" ry="3" />
      <ellipse cx="44" cy="46" rx="4" ry="3" />
      <ellipse cx="56" cy="46" rx="4" ry="3" />
      <ellipse cx="38" cy="56" rx="4" ry="3" />
      <ellipse cx="50" cy="56" rx="4" ry="3" />
      <ellipse cx="62" cy="56" rx="4" ry="3" />
      <ellipse cx="44" cy="66" rx="4" ry="3" />
      <ellipse cx="56" cy="66" rx="4" ry="3" />
    </g>
  );
}

function BattlePlate() {
  return (
    <g fill="currentColor">
      {/* Shoulder pauldrons */}
      <ellipse cx="30" cy="30" rx="12" ry="10" />
      <ellipse cx="70" cy="30" rx="12" ry="10" />
      {/* Chest plate */}
      <path d="M 28 28 L 36 22 L 50 26 L 64 22 L 72 28 L 74 66 L 50 74 L 26 66 Z" />
      {/* Chest ridge */}
      <path d="M 50 30 L 50 66" stroke="white" strokeOpacity="0.3" strokeWidth="3" fill="none" />
      {/* Gorget/neck */}
      <rect x="40" y="20" width="20" height="8" rx="3" />
    </g>
  );
}

function DragonscaleArmor() {
  return (
    <g fill="currentColor">
      {/* Chest silhouette */}
      <path d="M 26 28 L 34 20 L 50 24 L 66 20 L 74 28 L 76 68 L 50 78 L 24 68 Z" />
      {/* Scale rows — offset diamond pattern */}
      <path d="M 34 32 L 40 28 L 46 32 L 40 36 Z" />
      <path d="M 46 32 L 52 28 L 58 32 L 52 36 Z" />
      <path d="M 58 32 L 64 28 L 70 32 L 64 36 Z" />
      <path d="M 28 42 L 34 38 L 40 42 L 34 46 Z" />
      <path d="M 40 42 L 46 38 L 52 42 L 46 46 Z" />
      <path d="M 52 42 L 58 38 L 64 42 L 58 46 Z" />
      <path d="M 64 42 L 70 38 L 76 42 L 70 46 Z" />
      <path d="M 34 52 L 40 48 L 46 52 L 40 56 Z" />
      <path d="M 46 52 L 52 48 L 58 52 L 52 56 Z" />
      <path d="M 58 52 L 64 48 L 70 52 L 64 56 Z" />
    </g>
  );
}

function ShadowweaveCloak() {
  return (
    <g fill="currentColor">
      {/* Hood */}
      <path d="M 32 20 C 32 14 68 14 68 20 L 72 32 L 62 28 L 50 32 L 38 28 L 28 32 Z" />
      {/* Flowing cloak body — asymmetric */}
      <path d="M 28 32 L 20 82 L 38 78 L 50 82 L 50 34 Z" />
      <path d="M 72 32 L 80 78 L 66 74 L 50 82 L 50 34 Z" />
      {/* Shadow wisps at hem */}
      <path d="M 22 78 L 18 86 L 26 82 Z" />
      <path d="M 76 76 L 82 84 L 74 80 Z" />
    </g>
  );
}

function TitanPlate() {
  return (
    <g fill="currentColor">
      {/* Massive shoulder pauldrons */}
      <ellipse cx="26" cy="28" rx="16" ry="14" />
      <ellipse cx="74" cy="28" rx="16" ry="14" />
      {/* Heavy chest plate */}
      <path d="M 24 26 L 36 18 L 50 22 L 64 18 L 76 26 L 78 70 L 50 80 L 22 70 Z" />
      {/* Chest ridge and plate lines */}
      <rect x="47" y="28" width="6" height="46" rx="1" />
      {/* Volcanic rivets */}
      <circle cx="36" cy="38" r="3" />
      <circle cx="64" cy="38" r="3" />
      <circle cx="36" cy="54" r="3" />
      <circle cx="64" cy="54" r="3" />
      <circle cx="50" cy="30" r="3" />
    </g>
  );
}

function SpecterShroud() {
  return (
    <g fill="currentColor">
      {/* Hooded shroud — wispy and asymmetric */}
      <path d="M 36 16 C 28 16 24 24 26 34 L 22 82 L 50 88 L 78 82 L 74 34 C 76 24 72 16 64 16 C 60 12 54 14 50 14 C 46 14 40 12 36 16 Z" />
      {/* Wraith face void */}
      <ellipse cx="50" cy="36" rx="12" ry="10" />
      {/* Wispy trailing edges */}
      <path d="M 22 70 L 14 80 L 22 76 Z" />
      <path d="M 78 68 L 86 78 L 78 74 Z" />
      <path d="M 30 82 L 26 90 L 34 86 Z" />
      <path d="M 70 82 L 74 90 L 66 86 Z" />
    </g>
  );
}

function CelestialAegis() {
  return (
    <g fill="currentColor">
      {/* Central chest plate */}
      <path d="M 30 30 L 36 22 L 50 26 L 64 22 L 70 30 L 72 66 L 50 76 L 28 66 Z" />
      {/* Wings — left */}
      <path d="M 30 30 L 16 22 L 18 38 L 28 44 Z" />
      <path d="M 28 44 L 14 40 L 18 54 L 28 56 Z" />
      {/* Wings — right */}
      <path d="M 70 30 L 84 22 L 82 38 L 72 44 Z" />
      <path d="M 72 44 L 86 40 L 82 54 L 72 56 Z" />
      {/* Celestial star */}
      <circle cx="50" cy="44" r="8" />
      <path d="M 50 34 L 52 41 L 60 44 L 52 47 L 50 54 L 48 47 L 40 44 L 48 41 Z" />
    </g>
  );
}

function ScavengersChain() {
  return (
    <g fill="currentColor">
      {/* Rough irregular armor body */}
      <path d="M 28 30 L 36 20 L 50 26 L 64 20 L 72 30 L 74 70 L 26 70 Z" />
      {/* Patchy repair plates */}
      <rect x="32" y="36" width="14" height="10" rx="1" />
      <rect x="52" y="42" width="16" height="12" rx="1" />
      <rect x="36" y="54" width="12" height="10" rx="1" />
      <rect x="54" y="58" width="10" height="8" rx="1" />
      {/* Chain loops */}
      <ellipse cx="50" cy="38" rx="5" ry="3" />
      <ellipse cx="50" cy="46" rx="5" ry="3" />
    </g>
  );
}

function ArachnoweaveCloak() {
  return (
    <g fill="currentColor">
      {/* Cloak body */}
      <path d="M 34 18 C 28 16 22 24 24 34 L 20 82 L 50 88 L 80 82 L 76 34 C 78 24 72 16 66 18 C 62 14 54 16 50 14 C 46 16 38 14 34 18 Z" />
      {/* Spider web pattern — radial from center */}
      <path d="M 50 38 L 30 54" stroke="white" strokeOpacity="0.3" strokeWidth="1.5" fill="none" />
      <path d="M 50 38 L 70 54" stroke="white" strokeOpacity="0.3" strokeWidth="1.5" fill="none" />
      <path d="M 50 38 L 50 62" stroke="white" strokeOpacity="0.3" strokeWidth="1.5" fill="none" />
      <path d="M 50 38 L 34 68" stroke="white" strokeOpacity="0.3" strokeWidth="1.5" fill="none" />
      <path d="M 50 38 L 66 68" stroke="white" strokeOpacity="0.3" strokeWidth="1.5" fill="none" />
      {/* Web rings */}
      <circle
        cx="50"
        cy="48"
        r="8"
        fill="none"
        stroke="white"
        strokeOpacity="0.25"
        strokeWidth="1.5"
      />
      <circle
        cx="50"
        cy="60"
        r="18"
        fill="none"
        stroke="white"
        strokeOpacity="0.2"
        strokeWidth="1.5"
      />
    </g>
  );
}

function BoneLatticeArmor() {
  return (
    <g fill="currentColor">
      {/* Chest silhouette */}
      <path d="M 28 28 L 36 20 L 50 24 L 64 20 L 72 28 L 74 68 L 50 78 L 26 68 Z" />
      {/* Bone lattice — crossed bones */}
      <rect x="36" y="38" width="28" height="5" rx="2" transform="rotate(-30 50 40)" />
      <rect x="36" y="38" width="28" height="5" rx="2" transform="rotate(30 50 40)" />
      <rect x="36" y="55" width="28" height="5" rx="2" transform="rotate(-30 50 57)" />
      <rect x="36" y="55" width="28" height="5" rx="2" transform="rotate(30 50 57)" />
      {/* Bone end knobs */}
      <circle cx="36" cy="34" r="4" />
      <circle cx="64" cy="34" r="4" />
      <circle cx="36" cy="66" r="4" />
      <circle cx="64" cy="66" r="4" />
    </g>
  );
}

function ScaleDragonKing() {
  return (
    <g fill="currentColor">
      {/* Legendary dragon scale chest — more ornate */}
      <path d="M 22 28 L 32 18 L 50 22 L 68 18 L 78 28 L 80 70 L 50 82 L 20 70 Z" />
      {/* Large central scale diamond */}
      <path d="M 50 28 L 62 42 L 50 56 L 38 42 Z" />
      {/* Inner scale */}
      <path d="M 50 34 L 58 44 L 50 52 L 42 44 Z" />
      {/* Surrounding scales */}
      <path d="M 26 36 L 34 30 L 38 38 L 30 42 Z" />
      <path d="M 74 36 L 66 30 L 62 38 L 70 42 Z" />
      <path d="M 26 52 L 34 46 L 38 54 L 30 58 Z" />
      <path d="M 74 52 L 66 46 L 62 54 L 70 58 Z" />
      {/* Crown-like top detail */}
      <path
        d="M 38 20 L 42 14 L 50 18 L 58 14 L 62 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
      />
    </g>
  );
}

// ── ITEMS (per item ID — accessories) ────────────────────────────────────────

function HealthCharm() {
  return (
    <g fill="currentColor">
      {/* Chain loop at top */}
      <circle cx="50" cy="20" r="5" fill="none" stroke="currentColor" strokeWidth="3" />
      {/* Chain */}
      <rect x="49" y="22" width="2" height="10" />
      {/* Heart shape */}
      <path d="M 50 76 L 28 54 C 24 50 24 42 30 38 C 36 34 44 38 50 44 C 56 38 64 34 70 38 C 76 42 76 50 72 54 Z" />
    </g>
  );
}

function StaminaBand() {
  return (
    <g fill="currentColor">
      {/* Wristband — viewed from slight angle, oval shape */}
      <ellipse cx="50" cy="50" rx="28" ry="16" fill="none" stroke="currentColor" strokeWidth="12" />
      {/* Band clasp */}
      <rect x="44" y="34" width="12" height="10" rx="2" />
      {/* Notch detail */}
      <rect x="40" y="46" width="20" height="4" rx="1" />
    </g>
  );
}

function RingOfWisdom() {
  return (
    <g fill="currentColor">
      {/* Ring band */}
      <circle cx="50" cy="60" r="20" fill="none" stroke="currentColor" strokeWidth="7" />
      {/* Gem setting */}
      <path d="M 44 40 L 50 22 L 56 40 L 50 36 Z" />
      <ellipse cx="50" cy="42" rx="8" ry="6" />
      {/* Eye gem detail */}
      <ellipse cx="50" cy="42" rx="4" ry="3" />
    </g>
  );
}

function WarriorsPendant() {
  return (
    <g fill="currentColor">
      {/* Chain */}
      <circle cx="50" cy="18" r="4" fill="none" stroke="currentColor" strokeWidth="3" />
      <rect x="49" y="20" width="2" height="8" />
      {/* Shield pendant */}
      <path d="M 36 28 L 50 26 L 64 28 L 66 56 L 50 68 L 34 56 Z" />
      {/* Shield center ridge */}
      <rect x="48" y="32" width="4" height="32" rx="1" />
      {/* Shield boss */}
      <circle cx="50" cy="44" r="6" />
    </g>
  );
}

function AmuletOfTheChampion() {
  return (
    <g fill="currentColor">
      {/* Chain */}
      <circle cx="50" cy="16" r="5" fill="none" stroke="currentColor" strokeWidth="3" />
      <rect x="49" y="19" width="2" height="8" />
      {/* Ornate amulet setting */}
      <path d="M 32 36 L 36 28 L 50 26 L 64 28 L 68 36 L 70 54 L 60 66 L 50 70 L 40 66 L 30 54 Z" />
      {/* Central large gem */}
      <ellipse cx="50" cy="46" rx="12" ry="10" />
      {/* Small accent gems */}
      <circle cx="36" cy="36" r="4" />
      <circle cx="64" cy="36" r="4" />
      <circle cx="34" cy="52" r="4" />
      <circle cx="66" cy="52" r="4" />
    </g>
  );
}

function Lifestone() {
  return (
    <g fill="currentColor">
      {/* Faceted gem — octagonal diamond cut */}
      <path d="M 50 16 L 68 28 L 74 50 L 68 72 L 50 84 L 32 72 L 26 50 L 32 28 Z" />
      {/* Upper facet */}
      <path d="M 50 16 L 68 28 L 50 36 L 32 28 Z" />
      {/* Inner facets */}
      <path d="M 50 36 L 68 28 L 74 50 L 50 50 Z" />
      <path d="M 50 36 L 32 28 L 26 50 L 50 50 Z" />
      {/* Center glow */}
      <circle cx="50" cy="50" r="8" />
    </g>
  );
}

function RingOfDominance() {
  return (
    <g fill="currentColor">
      {/* Ring band — thick and ornate */}
      <circle cx="50" cy="62" r="22" fill="none" stroke="currentColor" strokeWidth="9" />
      {/* Three raised gem settings on top */}
      <ellipse cx="36" cy="42" rx="6" ry="8" />
      <ellipse cx="50" cy="36" rx="6" ry="8" />
      <ellipse cx="64" cy="42" rx="6" ry="8" />
      {/* Gem highlights */}
      <ellipse cx="36" cy="42" rx="3" ry="4" />
      <ellipse cx="50" cy="36" rx="3" ry="4" />
      <ellipse cx="64" cy="42" rx="3" ry="4" />
    </g>
  );
}

function EmblemOfValor() {
  return (
    <g fill="currentColor">
      {/* Medal circle */}
      <circle cx="50" cy="54" r="28" />
      {/* 8-pointed star */}
      <path d="M 50 28 L 53 44 L 68 42 L 56 52 L 68 62 L 53 60 L 50 76 L 47 60 L 32 62 L 44 52 L 32 42 L 47 44 Z" />
      {/* Ribbon at top */}
      <path d="M 38 26 L 44 18 L 50 26 L 56 18 L 62 26 L 56 22 L 50 30 L 44 22 Z" />
    </g>
  );
}

function HeartOfTheCosmos() {
  return (
    <g fill="currentColor">
      {/* Cosmic starburst — irregular crystalline */}
      <path d="M 50 14 L 54 34 L 72 22 L 60 38 L 82 40 L 64 48 L 78 64 L 58 56 L 58 78 L 50 60 L 42 78 L 42 56 L 22 64 L 36 48 L 18 40 L 40 38 L 28 22 L 46 34 Z" />
      {/* Central star core */}
      <circle cx="50" cy="46" r="10" />
      {/* Inner void */}
      <circle cx="50" cy="46" r="5" />
    </g>
  );
}

function GoblinKingSignet() {
  return (
    <g fill="currentColor">
      {/* Ring band */}
      <circle cx="50" cy="64" r="20" fill="none" stroke="currentColor" strokeWidth="8" />
      {/* Signet face — flat top */}
      <rect x="36" y="30" width="28" height="22" rx="3" />
      {/* Crown engraving */}
      <path d="M 40 42 L 40 36 L 44 40 L 50 34 L 56 40 L 60 36 L 60 42 Z" />
      {/* Crown base */}
      <rect x="38" y="42" width="24" height="4" rx="1" />
    </g>
  );
}

function VenomfangBracer() {
  return (
    <g fill="currentColor">
      {/* Bracer body */}
      <rect x="32" y="40" width="36" height="30" rx="4" />
      {/* Bracer top edge */}
      <rect x="30" y="36" width="40" height="8" rx="3" />
      {/* Strap buckles */}
      <rect x="30" y="48" width="8" height="6" rx="1" />
      <rect x="62" y="48" width="8" height="6" rx="1" />
      {/* Two fang spikes on top */}
      <path d="M 42 36 L 39 16 L 45 20 L 47 36 Z" />
      <path d="M 58 36 L 61 16 L 55 20 L 53 36 Z" />
    </g>
  );
}

function SpiderspunTome() {
  return (
    <g fill="currentColor">
      {/* Book body */}
      <rect x="26" y="18" width="48" height="64" rx="3" />
      {/* Spine */}
      <rect x="26" y="18" width="7" height="64" rx="2" />
      {/* Spider web on cover */}
      <path d="M 53 38 L 53 72" stroke="white" strokeOpacity="0.3" strokeWidth="1.5" fill="none" />
      <path d="M 35 50 L 71 50" stroke="white" strokeOpacity="0.3" strokeWidth="1.5" fill="none" />
      <path d="M 38 40 L 68 60" stroke="white" strokeOpacity="0.3" strokeWidth="1.5" fill="none" />
      <path d="M 68 40 L 38 60" stroke="white" strokeOpacity="0.3" strokeWidth="1.5" fill="none" />
      <circle
        cx="53"
        cy="55"
        r="8"
        fill="none"
        stroke="white"
        strokeOpacity="0.25"
        strokeWidth="1.5"
      />
      <circle
        cx="53"
        cy="55"
        r="16"
        fill="none"
        stroke="white"
        strokeOpacity="0.2"
        strokeWidth="1.5"
      />
      {/* Spider on web */}
      <circle cx="53" cy="50" r="3" />
    </g>
  );
}

function WraithboundRing() {
  return (
    <g fill="currentColor">
      {/* Ring band */}
      <circle cx="50" cy="62" r="20" fill="none" stroke="currentColor" strokeWidth="7" />
      {/* Ghostly wisps rising */}
      <path d="M 42 42 C 40 34 44 26 40 18 C 42 20 44 18 44 16 C 46 20 44 24 46 30 C 46 36 44 40 42 42 Z" />
      <path d="M 50 38 C 48 30 52 22 48 14 C 50 16 52 14 52 12 C 54 16 52 20 54 26 C 54 32 52 36 50 38 Z" />
      <path d="M 58 42 C 56 34 60 26 56 18 C 58 20 60 18 60 16 C 62 20 60 24 62 30 C 62 36 60 40 58 42 Z" />
    </g>
  );
}

function DraconicSigil() {
  return (
    <g fill="currentColor">
      {/* Dragon claw slash — three marks */}
      <path d="M 30 24 C 28 26 32 38 44 58 C 40 60 34 66 30 74 L 36 76 C 40 68 46 62 52 60 C 40 40 34 28 36 22 Z" />
      <path d="M 44 20 C 42 22 44 34 54 54 C 50 56 46 62 44 70 L 50 72 C 52 64 58 58 64 56 C 54 36 50 24 50 18 Z" />
      <path d="M 58 24 C 56 26 56 38 64 58 C 62 60 58 66 58 74 L 64 74 C 64 66 70 60 76 58 C 68 40 62 28 62 22 Z" />
      {/* Dragon eye above */}
      <ellipse cx="50" cy="16" rx="8" ry="5" />
      <ellipse cx="50" cy="16" rx="3" ry="4" />
    </g>
  );
}

export const ITEM_SILHOUETTES: Record<string, () => React.ReactNode> = {
  // Type-level fallbacks
  weapon: ItemWeapon,
  armor: ItemArmor,
  accessory: ItemAccessory,
  consumable: ItemConsumable,

  // Weapons
  'worn-sword': WornSword,
  'oak-staff': OakStaff,
  'hunters-bow': HuntersBow,
  'iron-sword': IronSword,
  'arcane-tome': ArcaneTome,
  'twin-daggers': TwinDaggers,
  'dragonbone-blade': DragonboneBlade,
  'staff-of-ages': StaffOfAges,
  shadowfang: Shadowfang,
  stormcleaver: Stormcleaver,
  'void-tome': VoidTome,
  'phantom-blades': PhantomBlades,
  godslayer: Godslayer,
  'the-eternal-grimoire': EternalGrimoire,
  'oblivion-edge': OblivionEdge,
  'flintsteel-dagger': FlintsteelDagger,
  'necrotic-staff': NecroticStaff,
  'emberclaw-gauntlets': EmberclawGauntlets,

  // Armor
  'leather-vest': LeatherVest,
  'padded-robe': PaddedRobe,
  'chain-shirt': ChainShirt,
  'battle-plate': BattlePlate,
  'dragonscale-armor': DragonscaleArmor,
  'shadowweave-cloak': ShadowweaveCloak,
  'titan-plate': TitanPlate,
  'specter-shroud': SpecterShroud,
  'celestial-aegis': CelestialAegis,
  'scavengers-chain': ScavengersChain,
  'arachnoweave-cloak': ArachnoweaveCloak,
  'bone-lattice-armor': BoneLatticeArmor,
  'scale-dragon-king': ScaleDragonKing,

  // Accessories
  'health-charm': HealthCharm,
  'stamina-band': StaminaBand,
  'ring-of-wisdom': RingOfWisdom,
  'warriors-pendant': WarriorsPendant,
  'amulet-of-the-champion': AmuletOfTheChampion,
  lifestone: Lifestone,
  'ring-of-dominance': RingOfDominance,
  'emblem-of-valor': EmblemOfValor,
  'heart-of-the-cosmos': HeartOfTheCosmos,
  'goblin-king-signet': GoblinKingSignet,
  'venomfang-bracer': VenomfangBracer,
  'spiderspun-tome': SpiderspunTome,
  'wraithbound-ring': WraithboundRing,
  'draconic-sigil': DraconicSigil,
};

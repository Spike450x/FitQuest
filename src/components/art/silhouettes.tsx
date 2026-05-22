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

// ── ITEMS (by type) ──────────────────────────────────────────────────────────

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
      {/* Potion bottle */}
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

export const ITEM_SILHOUETTES: Record<string, () => React.ReactNode> = {
  weapon: ItemWeapon,
  armor: ItemArmor,
  accessory: ItemAccessory,
  consumable: ItemConsumable,
};

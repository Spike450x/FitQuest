/**
 * FitQuest item silhouettes — extracted from silhouettes.tsx for route-level
 * code splitting. Only the shop and inventory routes render item cards, so
 * keeping these SVG functions in their own module (one per non-spell item, plus
 * type-level fallbacks) means combat/character/dashboard routes never include
 * them in their shared chunk.
 *
 * Conventions match silhouettes.tsx:
 *   - Fills only (the heraldic frame supplies the outline ring)
 *   - currentColor so the frame's tint cascades through
 *   - Silhouettes occupy roughly the central 60×60 area of the 100×100 viewBox
 */

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

// ── ITEMS (per item ID — consumables) ────────────────────────────────────────

function MinorHealthPotion() {
  return (
    <g fill="currentColor">
      <rect x="46" y="14" width="8" height="7" rx="2" />
      <rect x="47" y="21" width="6" height="9" />
      <path d="M 38 52 C 38 38 42 30 50 30 C 58 30 62 38 62 52 L 62 64 C 62 72 56 78 50 78 C 44 78 38 72 38 64 Z" />
      <path
        d="M 42 46 C 42 40 44 36 48 34"
        stroke="white"
        strokeOpacity="0.4"
        strokeWidth="2"
        fill="none"
      />
    </g>
  );
}

function HealthPotion() {
  return (
    <g fill="currentColor">
      <rect x="44" y="12" width="12" height="9" rx="2" />
      <rect x="46" y="21" width="8" height="9" />
      <path d="M 30 56 C 30 40 38 30 50 30 C 62 30 70 40 70 56 L 70 68 C 70 78 62 84 50 84 C 38 84 30 78 30 68 Z" />
      <rect x="47" y="48" width="6" height="20" rx="1" />
      <rect x="40" y="55" width="20" height="6" rx="1" />
    </g>
  );
}

function GreaterHealthPotion() {
  return (
    <g fill="currentColor">
      <rect x="42" y="12" width="16" height="9" rx="3" />
      <rect x="44" y="21" width="12" height="7" />
      <path d="M 22 54 C 22 36 34 28 50 28 C 66 28 78 36 78 54 L 78 68 C 78 78 66 84 50 84 C 34 84 22 78 22 68 Z" />
      <rect x="47" y="48" width="6" height="22" rx="1" />
      <rect x="40" y="55" width="20" height="6" rx="1" />
      <path
        d="M 30 48 C 28 40 30 34 36 30"
        stroke="white"
        strokeOpacity="0.35"
        strokeWidth="2.5"
        fill="none"
      />
    </g>
  );
}

function ElixirOfLife() {
  return (
    <g fill="currentColor">
      <circle cx="50" cy="14" r="5" />
      <rect x="47" y="17" width="6" height="5" />
      <rect x="43" y="22" width="14" height="5" rx="2" />
      <rect x="46" y="27" width="8" height="6" />
      <path d="M 36 40 C 34 34 38 33 46 33 L 54 33 C 62 33 66 34 64 40 Z" />
      <rect x="38" y="40" width="24" height="8" rx="2" />
      <path d="M 24 68 C 24 54 32 48 50 48 C 68 48 76 54 76 68 L 76 74 C 76 82 66 86 50 86 C 34 86 24 82 24 74 Z" />
      <path d="M 50 76 L 40 66 C 38 64 40 60 44 60 C 46 60 48 62 50 64 C 52 62 54 60 56 60 C 60 60 62 64 60 66 Z" />
    </g>
  );
}

function MinorMagicPotion() {
  return (
    <g fill="currentColor">
      <path d="M 50 12 L 54 18 L 50 22 L 46 18 Z" />
      <rect x="47" y="22" width="6" height="8" />
      <path d="M 50 30 L 64 50 L 50 70 L 36 50 Z" />
      <path d="M 50 30 L 50 70" stroke="white" strokeOpacity="0.3" strokeWidth="1.5" fill="none" />
      <path d="M 36 50 L 64 50" stroke="white" strokeOpacity="0.3" strokeWidth="1.5" fill="none" />
    </g>
  );
}

function MagicPotion() {
  return (
    <g fill="currentColor">
      <path d="M 50 10 L 56 16 L 52 22 L 48 22 L 44 16 Z" />
      <rect x="46" y="22" width="8" height="8" />
      <path d="M 50 30 L 66 42 L 68 62 L 56 76 L 44 76 L 32 62 L 34 42 Z" />
      <path d="M 50 30 L 50 76" stroke="white" strokeOpacity="0.25" strokeWidth="1.5" fill="none" />
      <path d="M 34 42 L 66 42" stroke="white" strokeOpacity="0.25" strokeWidth="1.5" fill="none" />
      <path d="M 32 62 L 68 62" stroke="white" strokeOpacity="0.25" strokeWidth="1.5" fill="none" />
      <path d="M 50 50 L 52 46 L 54 50 L 58 50 L 55 53 L 56 57 L 50 54 L 44 57 L 45 53 L 42 50 L 46 50 L 48 46 Z" />
    </g>
  );
}

function GreaterMagicPotion() {
  return (
    <g fill="currentColor">
      <path d="M 50 10 L 58 16 L 54 24 L 46 24 L 42 16 Z" />
      <circle cx="50" cy="14" r="3" />
      <rect x="45" y="24" width="10" height="6" />
      <path d="M 50 30 L 72 40 L 76 64 L 60 80 L 40 80 L 24 64 L 28 40 Z" />
      <path d="M 50 30 L 50 80" stroke="white" strokeOpacity="0.2" strokeWidth="1.5" fill="none" />
      <path d="M 28 40 L 72 40" stroke="white" strokeOpacity="0.2" strokeWidth="1.5" fill="none" />
      <path d="M 24 64 L 76 64" stroke="white" strokeOpacity="0.2" strokeWidth="1.5" fill="none" />
      <path d="M 50 52 L 53 46 L 56 52 L 62 52 L 57 56 L 59 62 L 50 58 L 41 62 L 43 56 L 38 52 L 44 52 L 47 46 Z" />
    </g>
  );
}

function MinorStaminaPotion() {
  return (
    <g fill="currentColor">
      <rect x="44" y="14" width="12" height="6" rx="2" />
      <rect x="42" y="20" width="16" height="52" rx="4" />
      <rect x="40" y="44" width="20" height="5" rx="2" />
    </g>
  );
}

function StaminaPotion() {
  return (
    <g fill="currentColor">
      <rect x="42" y="12" width="16" height="8" rx="3" />
      <rect x="38" y="20" width="24" height="60" rx="5" />
      <rect x="36" y="36" width="28" height="5" rx="2" />
      <rect x="36" y="46" width="28" height="5" rx="2" />
      <rect x="36" y="56" width="28" height="5" rx="2" />
    </g>
  );
}

function GreaterStaminaPotion() {
  return (
    <g fill="currentColor">
      <rect x="36" y="10" width="28" height="8" rx="3" />
      <rect x="40" y="18" width="20" height="6" />
      <path d="M 24 30 C 24 24 32 24 40 24 L 60 24 C 68 24 76 24 76 30 L 78 70 C 78 80 70 86 50 86 C 30 86 22 80 22 70 Z" />
      <rect x="20" y="42" width="60" height="5" rx="1" />
      <rect x="20" y="60" width="60" height="5" rx="1" />
      <path d="M 22 50 C 16 50 16 58 22 58" fill="none" stroke="currentColor" strokeWidth="4" />
      <path d="M 78 50 C 84 50 84 58 78 58" fill="none" stroke="currentColor" strokeWidth="4" />
    </g>
  );
}

// ── PR3 ITEMS (per item ID) ──────────────────────────────────────────────────
// Compact silhouettes for the 56-item content-scaling drop. Each one reuses
// the existing visual vocabulary (sword/staff/bow/charm for weapons, plate/
// robe/cloak for armor, anklet/pendant/circlet for accessories, bottle for
// consumables) with one or two distinguishing details so the item reads
// at-a-glance on the shop card without bloating the bundle.

// ── PR3 Weapons ───────────────────────────────────────────────────────────────

function WoodenClub() {
  return (
    <g fill="currentColor">
      <path d="M 50 14 C 60 16 64 24 64 40 L 60 60 L 40 60 L 36 40 C 36 24 40 16 50 14 Z" />
      <rect x="47" y="60" width="6" height="24" rx="2" />
    </g>
  );
}

function ApprenticeWand() {
  return (
    <g fill="currentColor">
      <rect x="48" y="22" width="4" height="60" rx="2" />
      <path d="M 50 12 L 44 22 L 50 26 L 56 22 Z" />
      <circle cx="50" cy="18" r="3" className="fill-violet-300" />
    </g>
  );
}

function LeatherSling() {
  return (
    <g fill="currentColor">
      <path d="M 30 24 C 35 50 65 50 70 24" stroke="currentColor" strokeWidth="3" fill="none" />
      <ellipse cx="50" cy="58" rx="14" ry="9" />
      <circle cx="50" cy="58" r="5" className="fill-stone-400" />
    </g>
  );
}

function NoviceCharm() {
  return (
    <g fill="currentColor">
      <rect x="48" y="16" width="4" height="14" rx="1" />
      <path d="M 30 36 L 50 30 L 70 36 L 64 70 L 50 78 L 36 70 Z" />
      <circle cx="50" cy="50" r="6" className="fill-amber-200" />
    </g>
  );
}

function SteelMace() {
  return (
    <g fill="currentColor">
      <rect x="47" y="44" width="6" height="44" rx="2" />
      <path d="M 50 12 L 38 22 L 38 38 L 50 48 L 62 38 L 62 22 Z" />
      <path d="M 42 24 L 50 18 L 58 24 L 58 36 L 50 42 L 42 36 Z" className="fill-white/15" />
    </g>
  );
}

function CrystalStaff() {
  return (
    <g fill="currentColor">
      <rect x="47" y="32" width="6" height="56" rx="3" />
      <path d="M 50 8 L 38 22 L 44 36 L 56 36 L 62 22 Z" />
      <path d="M 50 16 L 44 24 L 50 32 L 56 24 Z" className="fill-cyan-300" />
    </g>
  );
}

function Shortbow() {
  return (
    <g fill="currentColor">
      <path d="M 38 20 C 26 38 26 62 38 80 L 41 76 C 32 60 32 40 41 24 Z" />
      <rect x="38" y="20" width="2" height="60" />
      <rect x="34" y="46" width="9" height="8" rx="1" />
    </g>
  );
}

function SpiritTotem() {
  return (
    <g fill="currentColor">
      <rect x="42" y="18" width="16" height="64" rx="3" />
      <circle cx="50" cy="32" r="4" className="fill-amber-200" />
      <path d="M 42 46 L 58 46 L 56 52 L 44 52 Z" className="fill-white/20" />
      <circle cx="50" cy="64" r="4" className="fill-emerald-300" />
    </g>
  );
}

function KrisBlade() {
  return (
    <g fill="currentColor">
      <path d="M 50 14 C 46 22 54 28 50 36 C 46 44 54 50 50 58 L 46 62 L 54 62 Z" />
      <rect x="38" y="62" width="24" height="5" rx="1" />
      <rect x="47" y="67" width="6" height="14" rx="1" />
    </g>
  );
}

function Flameblade() {
  return (
    <g fill="currentColor">
      <path d="M 50 12 C 52 24 46 30 50 40 C 54 50 48 56 50 64 L 44 60 L 56 60 Z" />
      <rect x="34" y="60" width="32" height="6" rx="1" />
      <path d="M 44 22 L 48 16 L 50 26 L 54 18 L 56 30 Z" className="fill-orange-400" />
      <rect x="47" y="66" width="6" height="16" rx="1" />
    </g>
  );
}

function LightningRod() {
  return (
    <g fill="currentColor">
      <rect x="47" y="30" width="6" height="58" rx="2" />
      <path d="M 50 8 L 38 28 L 46 28 L 38 44 L 50 30 L 50 22 Z" className="fill-yellow-300" />
      <ellipse cx="50" cy="32" rx="9" ry="4" />
    </g>
  );
}

function SilverRapier() {
  return (
    <g fill="currentColor">
      <path d="M 50 10 L 48 60 L 50 64 L 52 60 Z" />
      <path d="M 36 60 C 36 70 50 70 50 64 C 50 70 64 70 64 60 L 60 60 C 60 66 52 66 52 60 L 48 60 C 48 66 40 66 40 60 Z" />
      <rect x="47" y="68" width="6" height="14" rx="1" />
      <circle cx="50" cy="84" r="3" />
    </g>
  );
}

function Moonstaff() {
  return (
    <g fill="currentColor">
      <rect x="47" y="32" width="6" height="56" rx="3" />
      <path d="M 38 22 C 38 10 62 10 62 22 C 62 32 50 36 50 36 C 50 36 38 32 38 22 Z" />
      <path
        d="M 42 22 C 42 14 58 14 58 22 C 58 28 50 32 50 32 C 50 32 42 28 42 22 Z"
        className="fill-slate-100"
      />
    </g>
  );
}

function StarfallBow() {
  return (
    <g fill="currentColor">
      <path d="M 36 14 C 22 32 22 68 36 86 L 40 82 C 28 66 28 34 40 18 Z" />
      <rect x="36" y="14" width="2" height="72" />
      <path
        d="M 56 38 L 60 42 L 64 38 L 60 44 L 64 50 L 60 46 L 56 50 L 60 44 Z"
        className="fill-yellow-200"
      />
    </g>
  );
}

function Soulreaver() {
  return (
    <g fill="currentColor">
      <path d="M 50 8 L 38 60 L 50 66 L 62 60 Z" />
      <path d="M 46 20 L 50 14 L 54 20 L 50 32 Z" className="fill-purple-500" />
      <path d="M 30 64 L 38 56 L 62 56 L 70 64 L 62 70 L 38 70 Z" />
      <rect x="47" y="70" width="6" height="16" rx="1" />
    </g>
  );
}

function AstralTome() {
  return (
    <g fill="currentColor">
      <rect x="24" y="16" width="52" height="70" rx="4" />
      <rect x="24" y="16" width="8" height="70" rx="3" />
      <circle cx="52" cy="48" r="14" className="fill-indigo-400" />
      <circle cx="52" cy="48" r="2" className="fill-white" />
      <circle cx="44" cy="40" r="1.5" className="fill-white" />
      <circle cx="60" cy="40" r="1.5" className="fill-white" />
      <circle cx="56" cy="58" r="1.5" className="fill-white" />
      <circle cx="42" cy="56" r="1.5" className="fill-white" />
    </g>
  );
}

function Thunderclaws() {
  return (
    <g fill="currentColor">
      <path d="M 32 16 L 28 22 L 46 70 L 50 66 L 50 60 Z" />
      <path d="M 68 16 L 72 22 L 54 70 L 50 66 L 50 60 Z" />
      <path d="M 38 36 L 42 30 L 38 42 L 44 38 L 40 50 Z" className="fill-yellow-300" />
      <path d="M 62 36 L 58 30 L 62 42 L 56 38 L 60 50 Z" className="fill-yellow-300" />
    </g>
  );
}

function SpiritChanneler() {
  return (
    <g fill="currentColor">
      <rect x="47" y="34" width="6" height="54" rx="3" />
      <path d="M 32 26 C 32 12 50 8 50 8 C 50 8 68 12 68 26 L 60 34 L 40 34 Z" />
      <ellipse cx="50" cy="22" rx="6" ry="9" className="fill-amber-200" />
      <path d="M 50 12 L 50 32" stroke="white" strokeOpacity="0.4" strokeWidth="1.5" />
    </g>
  );
}

function WorldEnder() {
  return (
    <g fill="currentColor">
      <path d="M 50 6 L 36 64 L 50 70 L 64 64 Z" />
      <path d="M 46 14 L 50 8 L 54 14 L 50 36 Z" className="fill-red-400" />
      <path d="M 24 70 L 34 60 L 66 60 L 76 70 L 66 78 L 34 78 Z" />
      <path d="M 24 70 L 18 60 L 28 60 Z" />
      <path d="M 76 70 L 82 60 L 72 60 Z" />
      <rect x="46" y="78" width="8" height="14" rx="2" />
      <circle cx="50" cy="92" r="5" />
    </g>
  );
}

function CosmicCodex() {
  return (
    <g fill="currentColor">
      <rect x="20" y="12" width="60" height="78" rx="5" />
      <rect x="20" y="12" width="10" height="78" rx="3" />
      <rect x="34" y="20" width="42" height="62" rx="2" />
      <circle cx="55" cy="40" r="10" className="fill-indigo-500" />
      <circle cx="55" cy="40" r="15" fill="none" stroke="currentColor" strokeWidth="1" />
      <circle cx="55" cy="40" r="20" fill="none" stroke="currentColor" strokeWidth="1" />
      <circle cx="55" cy="40" r="2" className="fill-white" />
    </g>
  );
}

function ShadowbladeZenith() {
  return (
    <g fill="currentColor">
      <path d="M 36 14 L 32 18 L 48 70 L 52 70 L 56 66 Z" />
      <path d="M 64 14 L 68 18 L 52 70 L 48 70 L 44 66 Z" className="fill-current opacity-80" />
      <path d="M 26 22 L 38 22 L 36 26 L 28 26 Z" />
      <path d="M 74 22 L 62 22 L 64 26 L 72 26 Z" />
      <circle cx="50" cy="80" r="4" className="fill-purple-400" />
    </g>
  );
}

function CrownOfMind() {
  return (
    <g fill="currentColor">
      <rect x="22" y="48" width="56" height="14" rx="2" />
      <path d="M 22 48 L 30 22 L 38 44 L 50 14 L 62 44 L 70 22 L 78 48 Z" />
      <circle cx="50" cy="34" r="5" className="fill-amber-300" />
      <circle cx="30" cy="38" r="3" className="fill-blue-300" />
      <circle cx="70" cy="38" r="3" className="fill-blue-300" />
      <rect x="34" y="64" width="32" height="14" rx="2" />
      <ellipse cx="50" cy="78" rx="14" ry="8" />
    </g>
  );
}

function MerchantsCodex() {
  return (
    <g fill="currentColor">
      {/* Spine + cover */}
      <rect x="20" y="18" width="60" height="64" rx="3" />
      <rect x="24" y="22" width="52" height="56" className="fill-amber-100/30" />
      {/* Coin/seal on cover */}
      <circle cx="50" cy="50" r="11" className="fill-amber-300" />
      <circle cx="50" cy="50" r="6" />
      <text
        x="50"
        y="54"
        textAnchor="middle"
        fontSize="8"
        fontWeight="700"
        className="fill-amber-300"
      >
        $
      </text>
      {/* Page edge lines */}
      <rect x="78" y="22" width="2" height="56" className="fill-amber-200/40" />
      <rect x="20" y="34" width="60" height="1" className="fill-amber-200/40" />
      <rect x="20" y="66" width="60" height="1" className="fill-amber-200/40" />
    </g>
  );
}

// ── PR3 Armor ─────────────────────────────────────────────────────────────────

function ClothShirt() {
  return (
    <g fill="currentColor">
      <path d="M 32 26 L 50 22 L 68 26 L 70 40 L 68 72 L 50 78 L 32 72 L 30 40 Z" />
      <path d="M 50 30 L 50 76" stroke="white" strokeOpacity="0.25" strokeWidth="1.5" />
    </g>
  );
}

function StuddedJerkin() {
  return (
    <g fill="currentColor">
      <path d="M 30 26 L 50 20 L 70 26 L 74 42 L 72 72 L 50 80 L 28 72 L 26 42 Z" />
      <circle cx="40" cy="42" r="1.6" className="fill-stone-300" />
      <circle cx="50" cy="42" r="1.6" className="fill-stone-300" />
      <circle cx="60" cy="42" r="1.6" className="fill-stone-300" />
      <circle cx="40" cy="56" r="1.6" className="fill-stone-300" />
      <circle cx="50" cy="56" r="1.6" className="fill-stone-300" />
      <circle cx="60" cy="56" r="1.6" className="fill-stone-300" />
    </g>
  );
}

function ScaleMail() {
  return (
    <g fill="currentColor">
      <path d="M 28 24 L 50 18 L 72 24 L 76 40 L 74 70 L 50 82 L 26 70 L 24 40 Z" />
      <path
        d="M 36 36 C 36 32 44 32 44 36 C 44 32 52 32 52 36 C 52 32 60 32 60 36 C 60 32 68 32 68 36"
        fill="none"
        stroke="white"
        strokeOpacity="0.3"
        strokeWidth="1.5"
      />
      <path
        d="M 36 48 C 36 44 44 44 44 48 C 44 44 52 44 52 48 C 52 44 60 44 60 48 C 60 44 68 44 68 48"
        fill="none"
        stroke="white"
        strokeOpacity="0.3"
        strokeWidth="1.5"
      />
      <path
        d="M 36 60 C 36 56 44 56 44 60 C 44 56 52 56 52 60 C 52 56 60 56 60 60 C 60 56 68 56 68 60"
        fill="none"
        stroke="white"
        strokeOpacity="0.3"
        strokeWidth="1.5"
      />
    </g>
  );
}

function MageVestments() {
  return (
    <g fill="currentColor">
      <path d="M 30 22 L 50 18 L 70 22 L 78 46 L 74 76 L 50 84 L 26 76 L 22 46 Z" />
      <path d="M 50 18 L 50 84" stroke="white" strokeOpacity="0.35" strokeWidth="2" />
      <path d="M 50 30 L 44 38 L 50 44 L 56 38 Z" className="fill-indigo-300" />
      <path d="M 50 52 L 44 60 L 50 66 L 56 60 Z" className="fill-indigo-300" />
    </g>
  );
}

function ReflexLeathers() {
  return (
    <g fill="currentColor">
      <path d="M 32 24 L 50 20 L 68 24 L 72 40 L 70 70 L 50 78 L 30 70 L 28 40 Z" />
      <path d="M 38 36 L 62 36 L 60 42 L 40 42 Z" className="fill-white/20" />
      <path d="M 38 52 L 62 52 L 60 58 L 40 58 Z" className="fill-white/20" />
      <rect x="48" y="40" width="4" height="32" />
    </g>
  );
}

function MithrilMail() {
  return (
    <g fill="currentColor">
      <path d="M 26 22 L 50 16 L 74 22 L 78 42 L 76 72 L 50 84 L 24 72 L 22 42 Z" />
      <circle
        cx="40"
        cy="36"
        r="2.5"
        fill="none"
        stroke="white"
        strokeOpacity="0.4"
        strokeWidth="1"
      />
      <circle
        cx="50"
        cy="36"
        r="2.5"
        fill="none"
        stroke="white"
        strokeOpacity="0.4"
        strokeWidth="1"
      />
      <circle
        cx="60"
        cy="36"
        r="2.5"
        fill="none"
        stroke="white"
        strokeOpacity="0.4"
        strokeWidth="1"
      />
      <circle
        cx="45"
        cy="46"
        r="2.5"
        fill="none"
        stroke="white"
        strokeOpacity="0.4"
        strokeWidth="1"
      />
      <circle
        cx="55"
        cy="46"
        r="2.5"
        fill="none"
        stroke="white"
        strokeOpacity="0.4"
        strokeWidth="1"
      />
      <circle
        cx="40"
        cy="56"
        r="2.5"
        fill="none"
        stroke="white"
        strokeOpacity="0.4"
        strokeWidth="1"
      />
      <circle
        cx="50"
        cy="56"
        r="2.5"
        fill="none"
        stroke="white"
        strokeOpacity="0.4"
        strokeWidth="1"
      />
      <circle
        cx="60"
        cy="56"
        r="2.5"
        fill="none"
        stroke="white"
        strokeOpacity="0.4"
        strokeWidth="1"
      />
    </g>
  );
}

function OracleRobes() {
  return (
    <g fill="currentColor">
      <path d="M 28 20 L 50 14 L 72 20 L 80 50 L 76 80 L 50 88 L 24 80 L 20 50 Z" />
      <circle cx="50" cy="40" r="9" className="fill-amber-200" />
      <circle cx="50" cy="40" r="4" className="fill-current" />
      <path d="M 50 56 L 50 84" stroke="white" strokeOpacity="0.35" strokeWidth="2" />
    </g>
  );
}

function SilentCloak() {
  return (
    <g fill="currentColor">
      <path d="M 24 18 C 32 28 32 60 24 80 L 50 86 L 76 80 C 68 60 68 28 76 18 L 50 12 Z" />
      <path d="M 50 12 L 50 86" stroke="black" strokeOpacity="0.35" strokeWidth="2" />
      <circle cx="50" cy="22" r="3" className="fill-slate-400" />
    </g>
  );
}

function AegisOfLight() {
  return (
    <g fill="currentColor">
      <path d="M 24 22 L 50 14 L 76 22 L 80 44 L 76 76 L 50 88 L 24 76 L 20 44 Z" />
      <circle cx="50" cy="48" r="14" className="fill-amber-200" />
      <path
        d="M 50 38 L 52 46 L 60 46 L 54 51 L 56 59 L 50 54 L 44 59 L 46 51 L 40 46 L 48 46 Z"
        className="fill-amber-400"
      />
    </g>
  );
}

function ShadowstepCoat() {
  return (
    <g fill="currentColor">
      <path d="M 24 18 L 50 14 L 76 18 L 78 44 L 74 80 L 50 90 L 26 80 L 22 44 Z" />
      <path d="M 50 16 L 38 30 L 50 46 L 62 30 Z" className="fill-current opacity-70" />
      <path
        d="M 36 60 L 50 70 L 64 60"
        fill="none"
        stroke="white"
        strokeOpacity="0.35"
        strokeWidth="2"
      />
    </g>
  );
}

function GildedBulwark() {
  return (
    <g fill="currentColor">
      {/* Shield silhouette */}
      <path d="M 22 18 L 50 12 L 78 18 L 80 50 L 70 78 L 50 88 L 30 78 L 20 50 Z" />
      {/* Filigree border (lighter ring inside) */}
      <path
        d="M 30 24 L 50 19 L 70 24 L 71 50 L 64 70 L 50 78 L 36 70 L 29 50 Z"
        fill="none"
        stroke="white"
        strokeOpacity="0.45"
        strokeWidth="1.5"
      />
      {/* Coin emblem center */}
      <circle cx="50" cy="50" r="10" className="fill-amber-300" />
      <circle cx="50" cy="50" r="6" />
      {/* Filigree dots */}
      <circle cx="50" cy="26" r="1.8" className="fill-amber-300" />
      <circle cx="50" cy="78" r="1.8" className="fill-amber-300" />
      <circle cx="28" cy="50" r="1.6" className="fill-amber-300" />
      <circle cx="72" cy="50" r="1.6" className="fill-amber-300" />
    </g>
  );
}

function GuardianBulwark() {
  return (
    <g fill="currentColor">
      <path d="M 18 22 L 50 12 L 82 22 L 86 48 L 80 80 L 50 92 L 20 80 L 14 48 Z" />
      <path
        d="M 30 32 L 50 24 L 70 32 L 72 50 L 68 70 L 50 80 L 32 70 L 28 50 Z"
        className="fill-yellow-200"
      />
      <circle cx="50" cy="50" r="6" className="fill-current" />
      <path d="M 50 36 L 56 50 L 50 64 L 44 50 Z" className="fill-current" />
    </g>
  );
}

function StarfireVestments() {
  return (
    <g fill="currentColor">
      <path d="M 22 18 L 50 12 L 78 18 L 84 48 L 78 80 L 50 90 L 22 80 L 16 48 Z" />
      <circle cx="38" cy="38" r="2" className="fill-yellow-200" />
      <circle cx="62" cy="34" r="2" className="fill-yellow-200" />
      <circle cx="50" cy="50" r="3" className="fill-yellow-200" />
      <circle cx="34" cy="58" r="2" className="fill-yellow-200" />
      <circle cx="68" cy="60" r="2" className="fill-yellow-200" />
      <circle cx="46" cy="72" r="2" className="fill-yellow-200" />
      <circle cx="58" cy="76" r="2" className="fill-yellow-200" />
      <path d="M 50 30 L 50 84" stroke="white" strokeOpacity="0.3" strokeWidth="1.5" />
    </g>
  );
}

// ── PR3 Accessories ───────────────────────────────────────────────────────────

function SpeedAnklet() {
  return (
    <g fill="currentColor">
      <ellipse cx="50" cy="56" rx="22" ry="10" fill="none" stroke="currentColor" strokeWidth="5" />
      <path d="M 28 56 L 22 50 L 24 60 Z" className="fill-sky-400" />
      <path d="M 72 56 L 78 50 L 76 60 Z" className="fill-sky-400" />
    </g>
  );
}

function FocusPebble() {
  return (
    <g fill="currentColor">
      <ellipse cx="50" cy="56" rx="22" ry="16" />
      <ellipse cx="50" cy="50" rx="14" ry="9" className="fill-blue-300" />
      <circle cx="48" cy="48" r="3" className="fill-white/60" />
    </g>
  );
}

function SpiritPendant() {
  return (
    <g fill="currentColor">
      <path d="M 32 22 C 38 30 62 30 68 22" fill="none" stroke="currentColor" strokeWidth="2" />
      <rect x="48" y="22" width="4" height="20" />
      <path d="M 40 42 L 60 42 L 56 70 L 50 78 L 44 70 Z" />
      <circle cx="50" cy="56" r="5" className="fill-emerald-300" />
    </g>
  );
}

function AgilityBand() {
  return (
    <g fill="currentColor">
      <ellipse cx="50" cy="56" rx="24" ry="11" fill="none" stroke="currentColor" strokeWidth="6" />
      <path
        d="M 28 50 L 32 56 L 28 62"
        fill="none"
        stroke="white"
        strokeOpacity="0.5"
        strokeWidth="2"
      />
      <path
        d="M 72 50 L 68 56 L 72 62"
        fill="none"
        stroke="white"
        strokeOpacity="0.5"
        strokeWidth="2"
      />
      <circle cx="50" cy="56" r="3" className="fill-sky-300" />
    </g>
  );
}

function SilverChalice() {
  return (
    <g fill="currentColor">
      <path d="M 32 22 L 68 22 L 64 44 C 64 56 56 60 50 60 C 44 60 36 56 36 44 Z" />
      <rect x="46" y="60" width="8" height="16" />
      <ellipse cx="50" cy="80" rx="14" ry="5" />
      <ellipse cx="50" cy="30" rx="14" ry="4" className="fill-amber-200" />
    </g>
  );
}

function RuneBracelet() {
  return (
    <g fill="currentColor">
      <ellipse cx="50" cy="56" rx="22" ry="14" fill="none" stroke="currentColor" strokeWidth="6" />
      <circle cx="32" cy="56" r="3" className="fill-indigo-300" />
      <circle cx="50" cy="44" r="3" className="fill-indigo-300" />
      <circle cx="68" cy="56" r="3" className="fill-indigo-300" />
      <circle cx="50" cy="68" r="3" className="fill-indigo-300" />
    </g>
  );
}

function ThiefGloves() {
  return (
    <g fill="currentColor">
      <path d="M 30 30 L 38 24 L 46 30 L 46 70 L 30 70 Z" />
      <path d="M 70 30 L 62 24 L 54 30 L 54 70 L 70 70 Z" />
      <rect x="30" y="34" width="16" height="3" className="fill-white/30" />
      <rect x="54" y="34" width="16" height="3" className="fill-white/30" />
    </g>
  );
}

function WindWalkerBoots() {
  return (
    <g fill="currentColor">
      <path d="M 24 38 L 36 38 L 36 64 L 50 64 L 50 76 L 24 76 Z" />
      <path d="M 76 38 L 64 38 L 64 64 L 50 64 L 50 76 L 76 76 Z" />
      <path d="M 18 50 L 26 48 L 24 56 Z" className="fill-sky-300" />
      <path d="M 82 50 L 74 48 L 76 56 Z" className="fill-sky-300" />
    </g>
  );
}

function SageCirclet() {
  return (
    <g fill="currentColor">
      <path
        d="M 22 56 C 22 36 78 36 78 56 L 76 60 L 24 60 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path d="M 22 56 L 78 56" stroke="currentColor" strokeWidth="4" />
      <path d="M 50 36 L 46 48 L 54 48 Z" className="fill-amber-300" />
      <circle cx="50" cy="44" r="3" className="fill-amber-200" />
    </g>
  );
}

function RoguesTalisman() {
  return (
    <g fill="currentColor">
      <path d="M 32 22 L 68 22" stroke="currentColor" strokeWidth="2" />
      <rect x="48" y="22" width="4" height="14" />
      <path d="M 30 36 L 70 36 L 60 76 L 50 84 L 40 76 Z" />
      <path d="M 42 48 L 50 56 L 58 48 L 50 68 Z" className="fill-current opacity-80" />
      <circle cx="50" cy="56" r="3" className="fill-red-400" />
    </g>
  );
}

function TortoiseCharm() {
  return (
    <g fill="currentColor">
      <ellipse cx="50" cy="56" rx="22" ry="16" className="fill-emerald-600" />
      <ellipse cx="42" cy="50" rx="3" ry="2" className="fill-emerald-300" />
      <ellipse cx="58" cy="50" rx="3" ry="2" className="fill-emerald-300" />
      <ellipse cx="50" cy="58" rx="3" ry="2" className="fill-emerald-300" />
      <ellipse cx="42" cy="62" rx="3" ry="2" className="fill-emerald-300" />
      <ellipse cx="58" cy="62" rx="3" ry="2" className="fill-emerald-300" />
      <circle cx="30" cy="56" r="4" />
      <rect x="38" y="70" width="6" height="6" rx="1" />
      <rect x="56" y="70" width="6" height="6" rx="1" />
    </g>
  );
}

function PhoenixFeather() {
  return (
    <g fill="currentColor">
      <path
        d="M 50 12 C 36 24 36 56 42 76 L 50 84 L 58 76 C 64 56 64 24 50 12 Z"
        className="fill-orange-500"
      />
      <path
        d="M 50 24 C 44 32 44 56 48 70 L 50 76 L 52 70 C 56 56 56 32 50 24 Z"
        className="fill-yellow-300"
      />
      <rect x="48" y="76" width="4" height="14" />
    </g>
  );
}

function StormStride() {
  return (
    <g fill="currentColor">
      <path d="M 22 40 L 38 40 L 38 64 L 52 64 L 52 78 L 22 78 Z" />
      <path d="M 78 40 L 62 40 L 62 64 L 48 64 L 48 78 L 78 78 Z" />
      <path d="M 16 52 L 24 48 L 22 54 L 28 56 L 18 60 Z" className="fill-yellow-300" />
      <path d="M 84 52 L 76 48 L 78 54 L 72 56 L 82 60 Z" className="fill-yellow-300" />
    </g>
  );
}

function SigilOfClarity() {
  return (
    <g fill="currentColor">
      <path d="M 30 22 L 70 22" stroke="currentColor" strokeWidth="2" />
      <rect x="48" y="22" width="4" height="14" />
      <circle cx="50" cy="60" r="22" />
      <circle cx="50" cy="60" r="14" className="fill-cyan-200" />
      <path d="M 50 48 L 56 56 L 50 60 L 44 56 Z" />
      <path d="M 50 72 L 56 64 L 50 60 L 44 64 Z" />
    </g>
  );
}

function EyeOfEternity() {
  return (
    <g fill="currentColor">
      <path d="M 30 22 L 70 22" stroke="currentColor" strokeWidth="2" />
      <rect x="48" y="22" width="4" height="12" />
      <ellipse cx="50" cy="56" rx="26" ry="18" />
      <ellipse cx="50" cy="56" rx="18" ry="14" className="fill-indigo-300" />
      <circle cx="50" cy="56" r="8" className="fill-indigo-700" />
      <circle cx="50" cy="56" r="3" className="fill-white" />
      <circle cx="38" cy="50" r="1" className="fill-white" />
      <circle cx="62" cy="62" r="1" className="fill-white" />
    </g>
  );
}

function TwinSunsPendant() {
  return (
    <g fill="currentColor">
      <path d="M 30 22 L 70 22" stroke="currentColor" strokeWidth="2" />
      <rect x="48" y="22" width="4" height="14" />
      <circle cx="40" cy="58" r="14" className="fill-amber-300" />
      <circle cx="60" cy="58" r="14" className="fill-orange-400" />
      <circle cx="40" cy="58" r="6" className="fill-amber-500" />
      <circle cx="60" cy="58" r="6" className="fill-orange-600" />
    </g>
  );
}

function ChampionsSigil() {
  return (
    <g fill="currentColor">
      {/* Chain */}
      <path d="M 30 22 L 70 22" stroke="currentColor" strokeWidth="2" />
      <rect x="48" y="22" width="4" height="14" />
      {/* Outer medallion frame */}
      <circle cx="50" cy="60" r="22" />
      <circle cx="50" cy="60" r="18" className="fill-amber-100/40" />
      {/* Four-petal balanced sigil — one wedge per primary stat */}
      <path d="M 50 44 L 56 60 L 50 76 L 44 60 Z" className="fill-rose-400" />
      <path d="M 50 60 L 66 60 L 50 76 L 44 60 Z" className="fill-teal-400" />
      <path d="M 50 60 L 66 60 L 50 44 L 56 60 Z" className="fill-blue-400" />
      <path d="M 50 60 L 34 60 L 50 44 L 44 60 Z" className="fill-violet-400" />
      <circle cx="50" cy="60" r="3" />
    </g>
  );
}

// ── PR3 Consumables ───────────────────────────────────────────────────────────

function ArcaneElixir() {
  return (
    <g fill="currentColor">
      <rect x="42" y="12" width="16" height="8" rx="2" />
      <rect x="46" y="20" width="8" height="6" />
      <path d="M 32 56 C 32 38 40 28 50 28 C 60 28 68 38 68 56 L 68 76 C 68 84 60 88 50 88 C 40 88 32 84 32 76 Z" />
      <ellipse cx="50" cy="58" rx="14" ry="20" className="fill-indigo-300" />
      <circle cx="44" cy="50" r="2" className="fill-white" />
      <circle cx="56" cy="64" r="2" className="fill-white" />
      <circle cx="48" cy="70" r="1.5" className="fill-white" />
    </g>
  );
}

function TitanElixir() {
  return (
    <g fill="currentColor">
      <rect x="40" y="10" width="20" height="10" rx="2" />
      <rect x="44" y="20" width="12" height="6" />
      <path d="M 26 60 C 26 36 36 26 50 26 C 64 26 74 36 74 60 L 74 78 C 74 86 64 90 50 90 C 36 90 26 86 26 78 Z" />
      <ellipse cx="50" cy="60" rx="18" ry="22" className="fill-amber-400" />
      <path d="M 50 40 L 46 56 L 52 56 L 48 70 L 54 56 L 50 56 Z" className="fill-yellow-200" />
    </g>
  );
}

function PhoenixDraught() {
  return (
    <g fill="currentColor">
      <rect x="40" y="8" width="20" height="10" rx="2" />
      <path d="M 50 18 C 40 24 38 30 42 36 C 38 30 50 22 50 18 Z" className="fill-orange-300" />
      <path d="M 30 58 C 30 36 40 24 50 24 C 60 24 70 36 70 58 L 70 78 C 70 86 60 90 50 90 C 40 90 30 86 30 78 Z" />
      <ellipse cx="50" cy="60" rx="16" ry="22" className="fill-orange-400" />
      <path
        d="M 50 36 C 44 46 44 60 46 70 L 50 76 L 54 70 C 56 60 56 46 50 36 Z"
        className="fill-yellow-200"
      />
    </g>
  );
}

function BattleStim() {
  return (
    <g fill="currentColor">
      <rect x="44" y="14" width="12" height="8" rx="1" />
      <rect x="46" y="22" width="8" height="4" />
      <rect x="38" y="26" width="24" height="50" rx="3" />
      <rect x="38" y="40" width="24" height="6" className="fill-emerald-400" />
      <rect x="38" y="50" width="24" height="6" className="fill-amber-400" />
      <rect x="38" y="60" width="24" height="6" className="fill-violet-400" />
    </g>
  );
}

function SpiritTea() {
  return (
    <g fill="currentColor">
      <ellipse cx="50" cy="38" rx="20" ry="6" />
      <path d="M 30 38 C 30 60 36 76 50 80 C 64 76 70 60 70 38 Z" />
      <path d="M 70 44 C 80 44 82 60 70 64" fill="none" stroke="currentColor" strokeWidth="4" />
      <ellipse cx="50" cy="38" rx="14" ry="3" className="fill-emerald-300" />
      <path
        d="M 46 18 C 44 24 48 28 50 22 C 52 28 56 24 54 18"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </g>
  );
}

function SagesBrew() {
  return (
    <g fill="currentColor">
      <rect x="42" y="12" width="16" height="8" rx="2" />
      <rect x="46" y="20" width="8" height="4" />
      <path d="M 30 56 C 30 38 38 28 50 28 C 62 28 70 38 70 56 L 70 76 C 70 84 62 88 50 88 C 38 88 30 84 30 76 Z" />
      <ellipse cx="50" cy="50" rx="16" ry="8" className="fill-amber-400" />
      <ellipse cx="50" cy="68" rx="16" ry="8" className="fill-violet-400" />
      <path d="M 34 58 L 66 58" stroke="white" strokeOpacity="0.5" strokeWidth="2" />
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

  // Consumables
  'minor-health-potion': MinorHealthPotion,
  'health-potion': HealthPotion,
  'greater-health-potion': GreaterHealthPotion,
  'elixir-of-life': ElixirOfLife,
  'minor-magic-potion': MinorMagicPotion,
  'magic-potion': MagicPotion,
  'greater-magic-potion': GreaterMagicPotion,
  'minor-stamina-potion': MinorStaminaPotion,
  'stamina-potion': StaminaPotion,
  'greater-stamina-potion': GreaterStaminaPotion,

  // PR3 Weapons
  'wooden-club': WoodenClub,
  'apprentice-wand': ApprenticeWand,
  'leather-sling': LeatherSling,
  'novice-charm': NoviceCharm,
  'steel-mace': SteelMace,
  'crystal-staff': CrystalStaff,
  shortbow: Shortbow,
  'spirit-totem': SpiritTotem,
  'kris-blade': KrisBlade,
  flameblade: Flameblade,
  'lightning-rod': LightningRod,
  'silver-rapier': SilverRapier,
  moonstaff: Moonstaff,
  'starfall-bow': StarfallBow,
  soulreaver: Soulreaver,
  'astral-tome': AstralTome,
  thunderclaws: Thunderclaws,
  'spirit-channeler': SpiritChanneler,
  'world-ender': WorldEnder,
  'cosmic-codex': CosmicCodex,
  'shadowblade-zenith': ShadowbladeZenith,
  'crown-of-mind': CrownOfMind,
  'merchants-codex': MerchantsCodex,

  // PR3 Armor
  'cloth-shirt': ClothShirt,
  'studded-jerkin': StuddedJerkin,
  'scale-mail': ScaleMail,
  'mage-vestments': MageVestments,
  'reflex-leathers': ReflexLeathers,
  'mithril-mail': MithrilMail,
  'oracle-robes': OracleRobes,
  'silent-cloak': SilentCloak,
  'aegis-of-light': AegisOfLight,
  'shadowstep-coat': ShadowstepCoat,
  'guardian-bulwark': GuardianBulwark,
  'starfire-vestments': StarfireVestments,
  'gilded-bulwark': GildedBulwark,

  // PR3 Accessories
  'speed-anklet': SpeedAnklet,
  'focus-pebble': FocusPebble,
  'spirit-pendant': SpiritPendant,
  'agility-band': AgilityBand,
  'silver-chalice': SilverChalice,
  'rune-bracelet': RuneBracelet,
  'thief-gloves': ThiefGloves,
  'wind-walker-boots': WindWalkerBoots,
  'sage-circlet': SageCirclet,
  'rogues-talisman': RoguesTalisman,
  'tortoise-charm': TortoiseCharm,
  'phoenix-feather': PhoenixFeather,
  'storm-stride': StormStride,
  'sigil-of-clarity': SigilOfClarity,
  'eye-of-eternity': EyeOfEternity,
  'twin-suns-pendant': TwinSunsPendant,
  'champions-sigil': ChampionsSigil,

  // PR3 Consumables
  'arcane-elixir': ArcaneElixir,
  'titan-elixir': TitanElixir,
  'phoenix-draught': PhoenixDraught,
  'battle-stim': BattleStim,
  'spirit-tea': SpiritTea,
  'sages-brew': SagesBrew,
};

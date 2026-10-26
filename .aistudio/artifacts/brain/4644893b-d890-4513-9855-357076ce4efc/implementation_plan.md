# Wizard Chess 3D — 3D Piece Archetypes & Architectural Board Styles Plan

This update expands the **Wizard Chess 3D** Armory beyond material color swaps by introducing **4 distinct 3D Chess Piece Archetype Sets** and **5 Architectural 3D Board Styles** that dynamically transform both the physical 3D board structure and the surrounding room lighting, stone masonry, and brazier fire atmosphere.

## User Review & Critical Decisions

> [!IMPORTANT]
> All choices below reflect your confirmed selections from our planning check-in and integrate directly with the existing Gold economy and pre-game Lobby.

- **Confirmed Decision 1 — Four 3D Piece Archetype Sets**: Players can unlock and equip **Gothic Warriors** (default sculpted statues), **Classic Staunton** (turned tournament chessmen), **Arcane Runic & Cyber-Mech** (composite sentinel & obelisk units with glowing energy cores), and **Fantasy Dragon & Elemental Guardians** (winged drake knights, flame/frost spire bishops, and dragon-crowned monarchs), combinable with any unlocked material finish.
- **Confirmed Decision 2 — Five 3D Board Architectures + Full Room & Lighting Shifts**: Equipping a board style rebuilds the 3D board perimeter architecture (**Gothic Sanctum Altar**, **Runic Pedestal**, **Royal Wood Tournament Table**, **Floating Crystal Sanctum**, **Volcanic Lava Forge**) and shifts the surrounding 3D room's wall/floor masonry textures, window light hues, fog atmosphere, and volumetric brazier flame colors.
- **Confirmed Decision 3 — Dynamic Strike & Themed Shatter Physics**: All piece archetypes execute dynamic melee/kinetic lunge strikes on capture and burst into archetype-matched 3D debris (chiseled stone, polished hardwood & brass, glowing cyber-crystals, or volcanic dragonfire embers).

---

## 1. Overview & Core Concept

- **What It Does**: Elevates the Skin Armory into a complete 3D Customization Workshop where Gold earned from destroying enemy pieces and winning matches unlocks new **3D Piece Models (Archetypes)**, **Material Skins**, and **3D Board Architectures + Room Environments**.
- **Target Audience / Persona**: Players who want visual progression and variety—switching from dark Gothic fantasy to a warm Classic Staunton wood parlor, a glowing Arcane Cyber-Mech nexus, or a molten Dragon Forge.
- **Key Value**: Every unlocked board and piece archetype changes the actual 3D geometry, silhouette, ambient lighting, and capture shatter physics on the playing field.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Pre-Game Lobby & Armory Preview**:
   - On boot, the Game Lobby opens over the 3D scene. Clicking **Skin Shop** opens the expanded 3-tab Armory:
     - **Piece Types (3D Models)**
     - **Piece Finishes (Materials)**
     - **3D Board Styles & Environments**
2. **Unlocking & Live 3D Swapping**:
   - Selecting an unlocked **Piece Type** immediately rebuilds all 32 pieces on the board in their new 3D silhouette while preserving current board positions and active material finishes.
   - Selecting an unlocked **Board Style** immediately swaps the 3D board frame/pedestal geometry and transitions the room's stained-glass lighting, stone shader palette, and brazier flames.
3. **Dynamic Strike & Shatter Captures**:
   - During any match (vs Bot, Online PvP, or 1-Phone P1 vs P2), capturing a piece triggers the attacker's kinetic lunge/strike animation and shatters the defender into themed 3D fragments with a color-matched impact flash.

### Visual Identity & Theme

- **Piece Archetype Designs (Composite Multi-Part 3D Geometries)**:
  - **Gothic Warriors (Default)**: Hand-sculpted rigged warrior statues with broadswords, shields, and maces.
  - **Classic Staunton (300 Gold)**: Lathe-turned tournament silhouettes with molded base collars, felted pedestals, sculpted horse-head knights, slotted bishop mitres, crenellated castle rooks, coronet queens, and cross-crowned kings.
  - **Arcane Runic & Cyber-Mech (550 Gold)**: Angular mecha-sentinel hulls with hovering arcane halo rings, glowing visor slits, twin plasma-blade pawns, hovering thruster rooks, and core-reactor monarchs.
  - **Fantasy Dragon & Elemental Guardians (800 Gold)**: Horned drake-rider knights, coiled wyvern rooks, elemental crystal-spire bishops, flame-winged queens, and dragon-crested kings.
- **3D Board Architectures & Full Room Environment Presets**:
  - **Gothic Sanctum Altar (Default)**: Obsidian-and-gold rimmed altar with warm hearth braziers and moonlight blue / royal amber stained glass.
  - **Royal Wood Tournament Table (250 Gold)**: Carved mahogany cabinet skirt, brass corner medallions, turned corner legs, warm walnut/maple tiles, and cozy amber parlor illumination.
  - **Arcane Runic Pedestal (420 Gold)**: Stepped octagonal runestone dais with 4 levitating corner obelisks, etched glowing mana rings, andviolet-cyan astral room lighting.
  - **Floating Crystal Sanctum (600 Gold)**: Beveled prismatic quartz platform flanked by 8 hovering crystal shards, frost-blue brazier flames, and celestial ice cathedral lighting.
  - **Volcanic Lava Forge (750 Gold)**: Heavy dark basalt anvil frame with glowing molten magma channels, iron corner pylons, crimson-orange forge lighting, and roaring hellfire braziers.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1 — Decoupling 3D Piece Archetypes from Material Skins**:
  - *Chosen Approach*: Separate **Piece Types (3D geometry)** from **Piece Skins (PBR materials)** in the Armory.
  - *Why*: Allows multiplicative customization (4 Piece Types × 5 Material Skins = 20 distinct combinations) so players can play with Golden Staunton pieces, Jade Dragon statues, or Astral Cyber-Mechs.
- **Decision 2 — Procedural Multi-Part 3D Geometry + Synthetic Idle/Strike Kinematics**:
  - *Chosen Approach*: Build the new piece archetypes and board architectures in code using composite `THREE.Group` hierarchies (`LatheGeometry`, beveled `ExtrudeGeometry`, `CylinderGeometry`, `OctahedronGeometry`, `TorusGeometry`) with procedural idle breathing/hovering and kinetic strike animations.
  - *Why*: Guarantees instant zero-latency switching, zero external asset 404s, and seamless compatibility with the existing raycaster, board coordinates, and capture camera choreography.

---

## 4. Technical Architecture & Data Strategy

### Architecture & Component Diagram

```
┌───────────────────────────────────────────────────────────────────────────┐
│                        React HUD & Armory (App.tsx)                       │
│  ┌─────────────────────────┐  ┌────────────────────────────────────────┐  │
│  │  Game Lobby (On Boot)   │  │      3-Tab Sanctum Skin Armory         │  │
│  │  • Vs Bot (E / M / H)   │  │  1. Piece Types (4 3D Model Sets)      │  │
│  │  • Online PvP Queue     │  │  2. Piece Skins (5 PBR Finishes)       │  │
│  │  • 1-Phone P1 vs P2     │  │  3. Board Styles & Room Environments   │  │
│  └────────────┬────────────┘  └───────────────────┬────────────────────┘  │
└───────────────┼───────────────────────────────────┼───────────────────────┘
                │                                   │
                ▼                                   ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                     3D Wizard Chess Engine (Three.js)                     │
│  ┌───────────────────────────────────┐  ┌──────────────────────────────┐  │
│  │     3D Piece Archetype Builder    │  │ 3D Board & Room Transformer  │  │
│  │  • Gothic GLB Cloner              │  │ • Board Frame Mesh Builder   │  │
│  │  • Classic Staunton Lathe Builder │  │   (Wood, Runic, Crystal,     │  │
│  │  • Arcane Cyber-Mech Assembler    │  │    Lava Forge, Gothic)       │  │
│  │  • Dragon & Elemental Sculptor    │  │ • Room Light, Fog & Brazier  │  │
│  │  • Kinetic Strike & Shatter Sim   │  │   Flame Shader Controller    │  │
│  └───────────────────────────────────┘  └──────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────┘
```

### Data Model & State

- **`PIECE_ARCHETYPES` Catalog**: Metadata, Gold price, preview icon/badge, and shatter profile (`debrisGeo`, `flashColor`) for `'gothic_warriors'`, `'classic_staunton'`, `'arcane_cyber'`, and `'dragon_elemental'`.
- **`BOARD_STYLES` Catalog**: Metadata, Gold price, tile/frame PBR parameters, 3D architectural frame type (`'gothic' | 'wood_table' | 'runic_pedestal' | 'crystal_sanctum' | 'lava_forge'`), and room environment lighting profile (wall/floor look index, window light colors, fog color, and brazier flame RGB uniforms).
- **Economy Persistence (`localStorage`)**: Extends `EconomyState` with `ownedPieceTypes: string[]` and `activePieceType: string` while preserving existing Gold balances and unlocked skins.

### Interactive Component & State Mapping

- **Equipping a Piece Type (`applyPieceArchetype(typeId)`)**:
  - Updates `currentPieceArchetype` in the 3D engine, iterates through all active `boardState[r][c]` pieces, swaps each piece's `THREE.Group` mesh in place at its exact world position and rotation, and binds either the GLTF `AnimationMixer` (for Gothic Warriors) or the procedural idle/attack animator (for Staunton, Arcane Cyber-Mech, and Dragon/Elemental sets).
- **Equipping a Board Style (`applyBoardSkin(boardStyle)`)**:
  - Updates the 64 square tile materials, rebuilds `boardArchitectureGroup` (adding the carved wood skirt/legs, floating runic obelisks, hovering crystal shards, or molten lava channels), and updates the room's point lights, fog, stone look, and brazier flame shader uniforms.

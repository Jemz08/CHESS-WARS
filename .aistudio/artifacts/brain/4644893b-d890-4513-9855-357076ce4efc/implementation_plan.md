# Halloween Sanctum Bundle: Pumpkin Headless Horsemen, Wraith Reapers & Blood-Moon Graveyard

A complete seasonal Halloween expansion for the Sanctum Armory introducing a custom-sculpted **Pumpkin Headless Horsemen & Wraith Reapers** 3D piece set, a **Haunted Blood-Moon Graveyard** 3D world environment, a **Cursed Jack-o'-Lantern Crypt Altar** board architecture, a **Hallow Bone & Midnight Wraith** piece finish, and a new **Charred Pumpkin Bark** PBR material preset.

> [!IMPORTANT]
> **User Review & Confirmed Design Decisions**
> - **Full 4-Category Seasonal Bundle**: Adds coordinated Halloween skins across **Piece Sets**, **World Scenery**, **Altar Boards**, and **Piece Finishes**, plus a matching **Poliigon PBR Surface Texture** preset so every slot in the Armory has a dedicated Halloween option.
> - **3D Piece Set ("Hollow Jack & Wraith Reapers")**: Features sculpted Jack-o'-Lantern crowns and visors, Headless Horseman Knights holding glowing pumpkin heads aloft, hooded Wraith Reaper Queens and Bishops wielding spectral scythes, Haunted Crypt Rooks, and Cursed Lantern Bearer Pawns.
> - **3D World Scenery & Altar ("Haunted Blood-Moon Graveyard")**: Surrounds the board with a giant crimson Blood Moon, twisted dead oak trees, wrought-iron cemetery gates, floating Jack-o'-Lanterns, and swirling bats around a graveyard altar lined with carved tombstones and corner Jack-o'-Lantern braziers.

---

## 1. Overview & Core Concept

The Halloween Sanctum Bundle transforms the Wizard Chess arena into an atmospheric Gothic Halloween battleground. Players can equip the entire seasonal suite at once or mix-and-match individual Halloween items with existing skins and independent PBR surface textures:

1. **3D Piece Set (`hollow_reapers` — "Hollow Jack & Wraith Reapers")**:
   - **Pawn ("Lantern Thrall")**: Cloaked grave-watcher carrying a glowing iron Jack-o'-Lantern cage and a jagged sickle.
   - **Rook ("Haunted Crypt Tower")**: Weathered cemetery mausoleum pillar topped with wrought-iron spikes, gargoyle reliefs, and a carved pumpkin spire.
   - **Knight ("Headless Horseman")**: Armored spectral destrier rearing over a twisted dead-root base while its headless rider brandishes a blazing Jack-o'-Lantern skull and cursed broadsword.
   - **Bishop ("Soul-Harvester Wraith")**: Floating tattered-cowl wraith clutching a crooked soul-lantern staff and twin crescent reaper blades.
   - **Queen ("Banshee Scythe Empress")**: Crowned spectral matriarch draped in floating shadow-ribbons, wielding a double-headed crescent war-scythe with an inner pumpkin-fire core.
   - **King ("Pumpkin Lord Sovereign")**: Towering dread monarch wearing a spiked iron crown over a grinning carved Jack-o'-Lantern head, wielding the Great Cleaver Scythe of Samhain.
2. **3D World Scenery (`haunted_blood_graveyard` — "Haunted Blood-Moon Graveyard")**:
   - An eerie midnight sky dominated by an oversized crimson-orange Blood Moon, volumetric violet-indigo cemetery fog, gnarled leafless oak silhouettes, gothic wrought-iron cemetery arches, orbiting spectral bats, and bobbing candle-lit Jack-o'-Lanterns.
3. **3D Altar Board (`cursed_pumpkin_altar` — "Cursed Jack-o'-Lantern Crypt")**:
   - Cracked cemetery slate and charred pumpkin-wood squares bordered by wrought-iron graveyard fencing, tilted Gothic headstones, and four corner Jack-o'-Lantern braziers burning with dual orange pumpkin-fire and green ectoplasm flames.
4. **Piece Finish (`hallow_pumpkin_wraith` — "Hallow Bone & Midnight Wraith")**:
   - Bleached skull-bone ivory and charred phantom obsidian armor paired with glowing carved-pumpkin amber (`#ff6d00`) and spectral ectoplasm green (`#00e676`) weapons and eyes.
5. **PBR Surface Preset (`pumpkin_carved_bark` — "Charred Pumpkin Bark")**:
   - Scorched autumn timber and carved gourd micro-relief map selectable independently for **Piece Set**, **Table Base**, **Board Tiles**, or **Border & Trim**.

---

## 2. User Experience & Visual Design

### Aesthetic Direction
- **Gothic Samhain Atmosphere**: Balances sharp silhouettes (scythe blades, wrought-iron spikes, gnarled branches, tilted tombstones) with warm internal emissive glow from carved Jack-o'-Lantern cavities and cool spectral ectoplasm accents.
- **High-Contrast Readability**: White and Black sides remain immediately distinguishable in both 3D camera views and live gameplay—White pieces feature bleached bone-ash ivory with warm pumpkin-amber fire, while Black pieces feature midnight wraith-iron with eerie toxic-green/violet soul-fire.

### Color Palette & Mood
| Role | Hex | Visual Application |
| :--- | :--- | :--- |
| **Midnight Graveyard Sky** | `#0b0714` | Deep twilight-violet backdrop and horizon fog |
| **Blood Moon Crimson** | `#ff3d00` | Giant moon disc, rim-lighting, and dramatic shadow cast |
| **Jack-o'-Lantern Amber** | `#ff7700` | Carved pumpkin eyes/grins, corner lantern braziers, primary embers |
| **Spectral Ectoplasm** | `#00e676` | Wraith scythe runes, floating soul wisps, dark-side emissive accents |
| **Bleached Skull Bone** | `#e8dfd1` | Light piece armor and weathered tombstone highlights |
| **Phantom Wraith Iron** | `#16121d` | Dark piece armor, wrought-iron cemetery gates, and crypt slate |

### Typography & Hierarchy
- **Seasonal Rarity Badge**: Marked as `MYTHIC` with a custom `"HALLOWEEN EVENT"` tag in the Sanctum Armory cards so players can spot the new seasonal items immediately across all 4 tabs.
- **Clear Spec Telemetry**: Each Halloween card displays its thematic metadata (`Scythe Slash & Pumpkin Shatter`, `Haunted Crypt & Iron Fence`, `Blood Moon & Floating Lanterns`, `Bone Ivory & Wraith Obsidian`).

### Interactive Feedback & 3D Motion
- **Custom Idle Animations**:
  - Wraith Bishops and Queens gently levitate with a phase-shifted spectral bob; Headless Horseman Knights pulse their held Jack-o'-Lantern heads with flickering candle intensity.
- **Halloween Capture & Shatter Choreography**:
  - **Scythe Soul-Harvest Attack**: Attacking Halloween pieces execute a sweeping reaper-scythe arc accompanied by an orange-and-ectoplasm crescent slash trail.
  - **Pumpkin & Soul-Flame Shatter**: Captured pieces burst into carved pumpkin shards, fluttering bat silhouettes, and rising green/amber soul-flames with an eerie organ-chord and scythe-whisper audio cue.

---

## 3. Key Product Decisions & Trade-Offs

1. **Procedural Low-Poly Sculpting with Instanced Graveyard Props (60 FPS Guarantee)**:
   - **Decision**: Build all 6 Halloween piece silhouettes and the graveyard environment using shared, cached Three.js geometries (`LatheGeometry`, `ConeGeometry`, `TorusGeometry`, and merged static perimeter meshes) rather than heavy high-subdivision meshes.
   - **Rationale**: Preserves the smooth framerate optimization recently established while delivering unmistakable silhouettes (carved pumpkin grins, scythe blades, headless horseman pose, wrought-iron fences, and tombstones).
2. **Independent PBR Compatibility**:
   - **Decision**: Integrate the new `pumpkin_carved_bark` PBR texture into the existing 4-slot independent texture selector (`pieces`, `table`, `board`, `trim`) and wire `auto` mode to pair Halloween boards and pieces with charred pumpkin-wood and cemetery slate automatically.
   - **Rationale**: Respects the user's per-surface texture customization workflow without forcing a single texture across all surfaces.
3. **Hitbox-Safe Geometry Bounds**:
   - **Decision**: Keep decorative scythe tips, floating lanterns, and horseman capes strictly within the visual mesh group while the existing two-tier cylinder + board-tile raycaster (`resolveClickedSquareOnBoard`) handles click/touch selection.
   - **Rationale**: Ensures overhanging scythe blades or wings never block adjacent squares (like touching a Pawn and accidentally selecting the King).

---

## 4. Technical Architecture & Data Strategy

### System Architecture Diagram

```
+-----------------------------------------------------------------------------------+
|                            SANCTUM ARMORY & CATALOG                               |
|  - PieceArchetype: 'hollow_reapers'      - BoardSkin: 'cursed_pumpkin_altar'      |
|  - PieceSkin: 'hallow_pumpkin_wraith'    - WorldScenery: 'haunted_blood_graveyard'|
|  - PBR Preset: 'pumpkin_carved_bark' (Independent per-slot: Pieces/Table/Board)   |
+-----------------------------------------+-----------------------------------------+
                                          |
                     +--------------------+--------------------+
                     |                                         |
                     v                                         v
+-----------------------------------------+ +---------------------------------------+
|      3D PIECE & BOARD MODEL ENGINE      | |     3D WORLD & VFX/SFX ENGINE         |
|  - 6 'hollow_reapers' procedural meshes | |  - Blood Moon disc + cemetery fog     |
|    (Lantern Thrall, Crypt Rook,         | |  - Dead oak trees + iron gate arches  |
|     Headless Horseman, Wraith Bishop,   | |  - Orbiting bats + floating pumpkins  |
|     Banshee Queen, Pumpkin Sovereign)   | |  - Scythe slash + pumpkin-ember burst |
|  - 'haunted_crypt' board border:        | |  - Eerie organ + reaper-scythe audio  |
|    Iron fence, tombstones & 4 pumpkins  | |  - Live preview in SkinShowcaseCanvas |
+-----------------------------------------+ +---------------------------------------+
```

### Catalog & State Additions
- **Piece Archetype (`hollow_reapers`)**:
  - `attackStyle`: `'Scythe Soul-Harvest & Pumpkin Burst'`
  - Custom geometry builder for all 6 chess roles (`p`, `r`, `n`, `b`, `q`, `k`) with carved emissive Jack-o'-Lantern facial cut-outs and curved reaper scythes.
- **Board Skin (`cursed_pumpkin_altar`)**:
  - `archType`: `'haunted_crypt'`
  - Perimeter generator adding corner Jack-o'-Lantern pedestals, wrought-iron picket rails, and weathered Gothic gravestones around the 8×8 grid.
- **World Scenery (`haunted_blood_graveyard`)**:
  - Environment builder rendering the Blood Moon backdrop, dead forest ring, graveyard monoliths, and animated floating Jack-o'-Lantern particles in both the main 3D game arena and the Armory `SkinShowcaseCanvas` preview.
- **Piece Skin (`hallow_pumpkin_wraith`) & PBR Texture (`pumpkin_carved_bark`)**:
  - High-contrast bone-ivory vs. midnight-obsidian palette with `#ff6d00` pumpkin-amber and `#00e676` ectoplasm emissives, plus a procedural charred-bark/carved-gourd PBR canvas generator cached at GPU-friendly resolution.

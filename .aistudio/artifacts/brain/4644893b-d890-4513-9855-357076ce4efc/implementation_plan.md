# Implementation Plan — Majestic 3D World Sceneries & Armory Realm Unlocks

## 1. Overview & Goals
Expand the 3D world beyond the indoor Gothic Cathedral by introducing a new **World Sceneries (Realms)** category in the **Armory & Reliquary**, unlockable with Gold. Players can switch between the classic indoor **Gothic Cathedral Sanctum** and three open-air / cosmic 3D world realms surrounding the chessboard altar, complete with custom GLSL sky dome shaders, multi-part 3D architectural landmarks, orbiting bodies, atmospheric lighting, and dynamic particle weather.

---

## 2. World Scenery Catalog & Economy (`src/skinCatalog.ts`)
Add a `WorldScenery` catalog (`WORLD_SCENERIES`) and persist ownership and active selection in `EconomyState` (`ownedSceneries`, `activeScenery`):

1. **Gothic Cathedral Sanctum (`gothic_cathedral` — Default / 0 Gold)**
   - **Theme**: Enclosed moonlit Gothic abbey nave with stained glass lancet windows, vaulted stone pillars, and roaring hearth braziers.
2. **Celestial Astral Observatory (`celestial_observatory` — 200 Gold)**
   - **Sky & Atmosphere**: Deep-space procedural GLSL nebula sky dome with swirling violet/cyan cosmic clouds, twinkling starfield, and aurora ribbons.
   - **3D Landmarks & Orbiting Spectacle**: A grand open-air marble & brass astral platform featuring giant rotating armillary astrolabe rings encircling the arena, a ringed gas-giant planet and crescent moons on the horizon, and 8 levitating crystalline star-monoliths with engraved glowing runes.
   - **Particle Weather**: Drifting golden stardust motes and ascending astral mana wisps.
3. **Dragon Peak Sky Citadel (`dragon_sky_citadel` — 280 Gold)**
   - **Sky & Atmosphere**: High-altitude sunset-and-celestial-gold sky shader above a billowing procedural sea of glowing clouds at the mountain base.
   - **3D Landmarks & Orbiting Spectacle**: An ancient cliffside sovereign citadel courtyard with carved dragon-prow spires, broken Gothic sky-arches, distant floating mountain peaks with cascading mist waterfalls, and soaring dragon silhouettes gliding on high thermal orbits around the peak.
   - **Particle Weather**: Wind-swept golden sun-motes and drifting cloud mist.
4. **Volcanic Titan Forge (`volcanic_titan_forge` — 350 Gold)**
   - **Sky & Atmosphere**: Smoldering obsidian caldera sky dome with ash-storm clouds, crimson horizon glow, and a procedural molten magma sea below the platform.
   - **3D Landmarks & Orbiting Spectacle**: A colossal chained basalt forge platform suspended over an active volcanic crater by massive iron chains anchored to jagged obsidian monoliths, flanked by giant Titan anvil pillars and glowing lava conduits.
   - **Particle Weather**: Rising incandescent ember sparks and swirling volcanic ash particles.

---

## 3. Procedural 3D World Scenery Builder (`src/worldSceneries.js` & `src/wizardChessEngine.js`)
Create a dedicated 3D scenery module (`src/worldSceneries.js`) integrated into `wizardChessEngine.js`:
- **Seamless Indoor vs. Open-World Switching (`applyWorldScenery`)**:
  - When `gothic_cathedral` is active, show the cathedral architectural shell (`cathedralRoot` walls, columns, vaulted roof) and use indoor room bounds (`CATHEDRAL_BOUNDS`) and pillar collisions.
  - When an outdoor/cosmic scenery (`celestial_observatory`, `dragon_sky_citadel`, or `volcanic_titan_forge`) is active, hide the enclosing cathedral walls/roof/nave columns while keeping the central altar/board pedestal and twin braziers, expand camera orbit freedom so players can admire the 360° vista, and activate the selected 3D realm group.
- **Custom GLSL Sky Dome & Horizon Shaders**:
  - Full-sphere `THREE.ShaderMaterial` sky dome (`BackSide`) with realm-specific procedural nebulae, cloud strata, stars, and volcanic glow driven by `uTime`.
  - Lower horizon plane/ring shader for the sea of clouds (Sky Citadel), cosmic void vortex (Astral Observatory), or bubbling magma caldera (Titan Forge).
- **Multi-Part 3D Landmarks & Animated Orbiting Elements**:
  - Construct composite `THREE.Group` landmarks (armillary rings, floating monoliths, dragon-prow citadel spires, chained titan pylons, ringed planet, gliding sky-dragons) that animate smoothly in the main `THREE.Clock` loop.
- **Dynamic Particle Weather System**:
  - GPU-animated `THREE.Points` weather emitter (stardust, cloud mist, or rising volcanic embers) tailored to the active realm.
- **Adaptive Scene Lighting**:
  - Automatically tune hemisphere, directional sun/moon, and rim lights plus fog color/density to match each realm while keeping chess pieces crisp and readable.

---

## 4. Armory UI & HUD Integration (`src/App.tsx` & `src/styles.css`)
- **4th Tab in Armory & Reliquary (`World Sceneries`)**:
  - Add a **World Sceneries** tab alongside *3D Piece Sets*, *Piece Finishes*, and *3D Board Arenas* in the Armory modal.
  - Display each scenery's preview swatches, atmosphere badge, animated spectacle description, Gold price, and **Unlock / Equip** button.
- **Lobby & Top HUD Realm Indicator / Quick Switcher**:
  - Show the active World Scenery in the Lobby loadout summary and allow cycling owned World Sceneries directly from the HUD or Armory.

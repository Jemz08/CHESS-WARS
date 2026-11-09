# Implementation Plan: Cartoonish Toon Table Skin, Floating Toon Kingdom Scenery & Comprehensive Error Sweep

## 1. Confirmed User Decisions
- **Cartoonish Toon Altar Board & Table Skin**: **Comic-Book Inked Wood & Gold Pedestal Table (`toon_ink_wood_table`)** — A stylized cel-shaded parlor table featuring warm honey-birch and rich comic-walnut board tiles, a chunky beveled wood-and-gold apron, oversized comic-inked golden corner medallions, four exaggerated turned cartoon parlor legs, and bold pitch-black (`#050508`) inverted-hull outlines + interior ink crease lines across the table and tiles.
- **Cartoonish Toon 3D World Scenery**: **Floating Toon Kingdom (`toon_sky_kingdom`)** — A vibrant cel-shaded 360° sky kingdom featuring a stepped cartoon sky dome with stylized sunbeams, a quantized cel-shaded sea of clouds below, orbiting floating cartoon islands, splayed fairytale castle towers with fluttering pennants, rotating storybook windmills, bubbly cel-shaded trees, and puffy 3D cartoon clouds—all wrapped in crisp pitch-black comic outlines.
- **Error Sweep & Hardening Scope**: Full diagnostic and fix pass covering **3D rendering, shaders, and console errors**, **Firestore cloud save and leaderboard permission handling**, **Online matchmaking and room connection reliability**, and **Armory 3D showcase preview rendering**.

---

## 2. Visual Direction & 3D Architecture
- **Aesthetic Persona**: Hand-Inked Storybook Fantasy meets Arcane Tabletop Tactility.
- **Cel-Shaded & Inked Rendering Pipeline**:
  - **Stepped Toon Lighting**: Custom quantized lighting bands and procedural cel-painted wood/stone textures with high-contrast comic highlights and warm shadow steps.
  - **Dual-Layer Black Ink Outlines (`#050508`)**:
    1. **Inverted-Hull Silhouette (`THREE.BackSide`)** along outer contours of table legs, moldings, floating islands, castle turrets, and puffy clouds so every 3D form reads like a hand-inked illustration from any camera angle.
    2. **Crease Ink Lines (`THREE.EdgesGeometry` + `THREE.LineSegments`)** along crisp architectural bevels, board squares, and table trim so internal geometry retains comic-book definition.
- **Default Accessibility**: Both the **Comic-Inked Wood & Gold Pedestal Table** and **Floating Toon Kingdom** scenery will be unlocked by default (`price: 0`) alongside the **Cartoon Classic Toon** piece set so players can immediately equip a complete head-to-toe cartoon setup or preview it in the 3D Armory.

---

## 3. Core Features & Technical Execution

### A. Comic-Inked Wood & Gold Pedestal Table (`toon_ink_wood_table`)
- **Catalog & Economy Integration**:
  - Extend board architecture types with `'toon_table'` and register `toon_ink_wood_table` in the board catalog and default unlocked inventory.
- **3D Table & Tile Geometry**:
  - **Inked 64-Square Chessboard**: Honey-birch (`#fff0c2`) and comic-walnut (`#5e3a24`) squares with procedural hand-drawn wood grain and crisp black ink borders separating every square.
  - **Chunky Wood & Gold Pedestal Architecture**: Splayed cartoon table apron with inset cel-gold trim rails, oversized golden comic medallions at all four corners, four chunky lathe-turned cartoon parlor legs with exaggerated bulbs and foot pads, and floating golden comic crown/star emblems at each corner.
  - **Full Ink Pass**: Apply bold `#050508` inverted-hull shells and `EdgesGeometry` ink lines across the table frame, legs, corner medallions, and board tiles.

### B. Floating Toon Kingdom 3D World Scenery (`toon_sky_kingdom`)
- **Cel-Shaded Sky Dome & Cloud Sea (`uMode = 4`)**:
  - Extend the custom GLSL sky dome and horizon sea shaders with a dedicated quantized cel-shading mode (`uMode == 4`) producing stepped cerulean-to-sunlit-gold sky bands, rotating cartoon sunbeams, and a billowing cel-shaded sea of clouds beneath the board.
- **3D Floating Kingdom Diorama**:
  - **Floating Cartoon Islands**: Faceted low-poly rock spires topped with vibrant emerald grass caps, cascading cartoon waterfalls, and bold black silhouette outlines.
  - **Cartoon Castles & Windmills**: Splayed fairytale castle towers with conical roofs, glowing arched windows, rotating storybook windmill blades, and bubbly cel-shaded trees.
  - **Puffy Outlined Clouds & Star Motes**: Multi-sphere puffy white cartoon clouds with black inverted-hull outlines drifting lazily around the sanctuary, paired with gentle bobbing motion.
- **Armory 3D Miniature Preview**:
  - Build a dedicated interactive 3D miniature diorama in the Armory Showcase for `toon_sky_kingdom` (floating island, cartoon castle turret, puffy outlined clouds, and cel-shaded sky backdrop) and `toon_ink_wood_table` (miniature comic-inked wood & gold table with outlined legs and tiles).

### C. Comprehensive Error Sweep & System Hardening
- **3D Rendering, Shaders & Armory Showcase**:
  - Audit all custom GLSL shader injections (`onBeforeCompile` in `pieceOutlineAndGlow.js` and `worldSceneries.js`) to ensure zero WebGL shader warnings or uniform mismatches across skin/scenery transitions.
  - Ensure clean geometry/material disposal in the Armory 3D Showcase (`SkinShowcaseCanvas`) and live board engine when rapidly switching between standard PBR skins and Toon outlined skins.
- **Firestore Cloud Save & Leaderboard Resilience**:
  - Harden `firebase.ts` and `firestore.rules` so unauthenticated sessions, guest sessions, or restricted paths gracefully synchronize with local storage and fallback cleanly without throwing unhandled Firestore permission errors.
- **Online Matchmaking & Room Connection**:
  - Harden stale-room cleanup, transaction-based room joining, and real-time `onSnapshot` listeners so two devices searching simultaneously reliably pair into an active match without race conditions or orphaned waiting rooms.

---

## 4. Architecture & Data Flow

```text
+-------------------------------------------------------------------------+
|                        SKIN & SCENERY CATALOG                           |
|  - Piece Set : toon_classic ("Cartoon Classic Toon")                    |
|  - Finish    : toon_cel_ink ("Cartoon Cel-Ink")                         |
|  - Board     : toon_ink_wood_table ("Comic-Inked Wood & Gold Pedestal") |
|  - Scenery   : toon_sky_kingdom ("Floating Toon Kingdom")               |
+-------------------+---------------------------------+-------------------+
                    |                                 |
                    v                                 v
+---------------------------------------+ +-------------------------------+
|       LIVE 3D WIZARD CHESS ENGINE     | |    3D ARMORY SHOWCASE MODAL   |
|  - rebuildBoardArchitectureGroup()    | |  - Interactive 360° Preview   |
|    -> archType: 'toon_table'          | |  - Miniature Toon Table &     |
|    -> Black Hull + Crease Ink Pass    | |    Floating Kingdom Diorama   |
|  - createWorldSceneryManager()        | |  - Safe WebGL Resource        |
|    -> buildToonSkyKingdomGroup()      | |    Disposal on Tab Switch     |
|    -> GLSL Sky/Sea uMode = 4          | +-------------------------------+
+-------------------+-------------------+
                    |
                    v
+-------------------------------------------------------------------------+
|                CLOUD SAVE, LEADERBOARD & MATCHMAKING                    |
|  - Firestore Transaction Matchmaking + Stale Room Cleanup               |
|  - Permission-Safe Cloud Profile Sync & LocalStorage Fallback           |
+-------------------------------------------------------------------------+
```

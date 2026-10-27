# Implementation Plan — Live 3D Preview Centering, Scenery Isolation & Card Preview Buttons

Fix the 3D showcase preview centering issue, isolate scenery preview rendering so it never affects the background game board, and add a dedicated "Live 3D Preview" button on every item across Piece Sets, Boards, Finishes, and Sceneries.

## User Requirements & Clarifications

1. **Object Centering & Visibility in 3D Preview**:
   - Currently, the 3D showcase camera was positioned at `(0, 2.2, 4.4)` without calling `camera.lookAt()`, causing models to appear cut off, off-center, or invisible.
   - **Fix**: Calculate the exact `THREE.Box3` bounding box and geometric center for any rendered subject (pieces, board altars, or scenery dioramas). Offset the subject's local position by `-center.x`, `-box.min.y`, `-center.z` so it sits flush atop the pedestal, and target `camera.lookAt(0, boxHeight * 0.5, 0)` with adjusted camera distance.

2. **Scenery 3D Preview Isolation from Actual Game**:
   - Currently, tapping preview on a scenery card was invoking `getEngine()?.applyWorldScenery?.(scenery)`, which modified the active game board environment in the background.
   - **Fix**: Decouple the showcase inspection state from active game equipment. When tapping "Live 3D Preview", update only the inspection preview state (`inspectedSceneryId`) inside the modal. In `SkinShowcaseCanvas`, render a self-contained 3D diorama: an atmospheric sky dome with the scenery's authentic gradient, volumetric celestial glow, floating mini altar, and ambient particle weather.

3. **Dedicated "Live 3D Preview" Button for Each Item**:
   - Every card across **PIECE SETS**, **FINISHES**, **BOARDS**, and **SCENERIES** will feature an explicit `👁 Live 3D Preview` button.
   - When clicked, it updates the showcase inspection state and smoothly scrolls the modal up to the `#skin-showcase-section` so the user immediately sees their selection rendered in real time.
   - The primary `Equip` / `Unlock` buttons remain distinct and only apply changes to the player's active loadout.

---

## Proposed Changes

### 1. `src/SkinShowcaseCanvas.tsx`
- **Dynamic Bounding-Box Centering & Camera Framing**:
  - Compute `THREE.Box3().setFromObject(subjectGroup)`.
  - Recenter the model so `(x, z)` are at `0, 0` and the base rests exactly on the circular pedestal ring.
  - Position `camera.position.set(0, boxHeight * 0.75, maxDim * 2.2)` and call `camera.lookAt(0, boxHeight * 0.45, 0)`.
- **Immersive Scenery Sky Dome Diorama**:
  - When `activeTab === 'sceneries'`, render an inverted sky dome with the scenery's gradient, a floating sanctum dais with 4 runic pillars, and a floating particle system matching the realm's atmosphere (Crimson Ash for Blood Moon, Frosted Mist for Aurora, Gold Embers for Celestial Clouds, Obsidian Dust for Void).
  - All rendered exclusively within the showcase canvas context without dispatching events to `wizardChessEngine`.

### 2. `src/App.tsx`
- **Showcase Inspection State**:
  - Maintain `inspectedArchetypeId`, `inspectedPieceSkinId`, `inspectedBoardSkinId`, and `inspectedSceneryId` defaulting to the player's equipped items.
  - Pass the currently inspected items into `<SkinShowcaseCanvas />`.
- **Dedicated Card Preview Buttons**:
  - In `armoryTab === 'types'`: Add `Live 3D Preview` button to each Piece Set card.
  - In `armoryTab === 'pieces'`: Add `Live 3D Preview` button to each Material Finish card.
  - In `armoryTab === 'boards'`: Add `Live 3D Preview` button to each Board card.
  - In `armoryTab === 'sceneries'`: Replace the old game-affecting button with a local `Live 3D Preview` button.
- **Smooth Auto-Scroll to Showcase**:
  - When tapping any `Live 3D Preview` button, query `#skin-showcase-section` or scroll the modal body with `behavior: 'smooth'` to bring the 3D window into view.

### 3. `src/styles.css`
- Add styling for the `.card-preview-btn` (gold trim border, icon indicator, hover glow).
- Add `.active-inspecting` highlight on the currently previewed card.
- Ensure the showcase viewport has a clear badge indicating which item is currently being inspected.

---

## Verification Plan

1. **Compilation & Linting**:
   - Run `compile_applet` to confirm error-free TypeScript build.
   - Run `lint_applet` to check for missing props or imports.
2. **Visual & Interactive Validation**:
   - Verify that King pieces for Staunton, Arcane Cyber, Dragon Elemental, and Gothic Warriors appear perfectly centered in the 3D showcase viewport.
   - Verify that clicking "Live 3D Preview" on Blood Moon, Aurora, or Celestial sceneries renders the atmospheric sky dome inside the showcase window and leaves the background cathedral unchanged.
   - Verify that every card has a dedicated "Live 3D Preview" button that smoothly scrolls up to the showcase window.

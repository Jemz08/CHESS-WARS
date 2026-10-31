import * as THREE_NS from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';
import {
  buildProceduralPieceGroup,
  updateProceduralPieceAnimation,
  rebuildBoardArchitectureGroup
} from './customBoardAndPieceModels.js';
import {
  applyPoliigonPbrToMaterial,
  resolvePiecePoliigonPresets,
  resolveBoardPoliigonPresets,
  ensureGeometryHasUVs
} from './poliigonPbrTextures.js';
import { createWorldSceneryManager } from './worldSceneries.js';
import { createSoundAndVfxManager, PIECE_KILL_PROFILES, getArchetypeKillProfile } from './soundAndVfxEngine.js';

/** @type {any} */
const THREE = THREE_NS;
const SkeletonUtils = { clone: cloneSkeleton };

export function initWizardChess() {
    // =========================================================================
    // Constants & Board Coordinates
    // =========================================================================
    const PIECE_TYPES = ['pawn', 'rook', 'knight', 'bishop', 'queen', 'king'];
    const PIECE_VALUES = { pawn: 100, knight: 320, bishop: 330, rook: 500, queen: 900, king: 20000 };
    const BOARD_SQ_SIZE = 0.34;
    const BOARD_SURFACE_Y = 0.775;

    function boardToWorld(r, c) {
      return new THREE.Vector3(
        (c - 3.5) * BOARD_SQ_SIZE,
        BOARD_SURFACE_Y,
        (r - 3.5) * BOARD_SQ_SIZE
      );
    }

    function easeInOutCubic(x) {
      return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
    }

    function easeOutCubic(x) {
      return 1 - Math.pow(1 - x, 3);
    }

    // =========================================================================
    // Scene, Camera, Renderer, and Cathedral Lighting
    // =========================================================================
    const container = document.getElementById('canvas-container') || document.getElementById('viewport-container');
    if (container) container.innerHTML = '';
    const isAutomatedTest = Boolean(
      navigator.webdriver || new URLSearchParams(window.location.search).get('autotest') === '1'
    );
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: isAutomatedTest
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.needsUpdate = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.24;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    if (renderer.debug) {
      renderer.debug.checkShaderErrors = false;
    }
    renderer.domElement.addEventListener(
      'webglcontextlost',
      (e) => {
        e.preventDefault();
      },
      false
    );
    renderer.domElement.addEventListener(
      'webglcontextrestored',
      () => {
        renderer.shadowMap.needsUpdate = true;
        renderer.render(scene, camera);
      },
      false
    );
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x070a12);
    scene.fog = new THREE.FogExp2(0x080b14, 0.015);

    // Self-contained Cathedral PMREM Environment (inspired by three-gpu-pathtracer & realism-effects)
    function createCathedralPMREMEnvironment(glRenderer) {
      const pmremGen = new THREE.PMREMGenerator(glRenderer);
      pmremGen.compileEquirectangularShader();
      const envScene = new THREE.Scene();
      envScene.background = new THREE.Color(0x161412);
      const boxGeo = new THREE.BoxGeometry(1, 1, 1);
      const addPanel = (colorHex, intensity, pos, scl) => {
        const mat = new THREE.MeshBasicMaterial({
          color: new THREE.Color(colorHex).multiplyScalar(intensity)
        });
        const m = new THREE.Mesh(boxGeo, mat);
        m.position.fromArray(pos);
        m.scale.fromArray(scl);
        envScene.add(m);
      };
      // Upper Gothic clerestory & Rose Window light panels
      addPanel(0xdce6f7, 2.4, [0, 9.5, -12.0], [10.0, 2.0, 1.5]);
      addPanel(0xffe0b5, 2.2, [0, 9.5, 12.0], [10.0, 2.0, 1.5]);
      addPanel(0xd4deee, 1.8, [-9.0, 6.5, 0.0], [1.2, 4.5, 16.0]);
      addPanel(0xd4deee, 1.8, [9.0, 6.5, 0.0], [1.2, 4.5, 16.0]);
      // Warm twin fire cauldron & limestone floor bounce panels
      addPanel(0xff9438, 3.2, [-4.5, 1.6, 0.0], [2.2, 2.2, 4.0]);
      addPanel(0xff9438, 3.2, [4.5, 1.6, 0.0], [2.2, 2.2, 4.0]);
      addPanel(0x6e5c49, 0.9, [0, -4.0, 0.0], [16.0, 1.0, 24.0]);
      const envTex = pmremGen.fromScene(envScene, 0.04).texture;
      boxGeo.dispose();
      pmremGen.dispose();
      return envTex;
    }

    scene.environment = createCathedralPMREMEnvironment(renderer);
    if ('environmentIntensity' in scene) {
      scene.environmentIntensity = 0.24;
    }

    const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.22, 180);
    camera.position.set(0, 2.22, 2.72);

    const orbitControls = new OrbitControls(camera, renderer.domElement);
    orbitControls.enableDamping = true;
    orbitControls.dampingFactor = 0.16;
    orbitControls.maxPolarAngle = Math.PI * 0.88;
    orbitControls.minPolarAngle = 0.05;
    orbitControls.minDistance = 0.95;
    orbitControls.maxDistance = 36.0;
    orbitControls.target.set(0, 0.85, -0.15);
    orbitControls.update();

    // =========================================================================
    // Feature 5: Hold Shift + Mouse Drag (Left=Rotate, Right=Pan) Axis Lock (X or Y)
    // =========================================================================
    let isShiftKeyDown = false;
    const shiftDragState = {
      active: false,
      startX: 0,
      startY: 0,
      lockedAxis: null // 'x' | 'y' | null
    };

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Shift') isShiftKeyDown = true;
    });
    window.addEventListener('keyup', (e) => {
      if (e.key === 'Shift') {
        isShiftKeyDown = false;
        shiftDragState.lockedAxis = null;
      }
    });

    // Capture pointerdown BEFORE OrbitControls so Shift+LeftClick stays ROTATE (instead of OrbitControls' default Shift->PAN swap)
    renderer.domElement.addEventListener(
      'pointerdown',
      (e) => {
        shiftDragState.active = true;
        shiftDragState.startX = e.clientX;
        shiftDragState.startY = e.clientY;
        shiftDragState.lockedAxis = null;
        if (e.shiftKey) {
          isShiftKeyDown = true;
          if (e.button === 0) {
            try {
              Object.defineProperty(e, 'shiftKey', {
                get: () => false,
                configurable: true
              });
            } catch (err) {}
          }
        }
      },
      { capture: true }
    );

    window.addEventListener('pointerup', () => {
      shiftDragState.active = false;
      shiftDragState.lockedAxis = null;
    });

    const origHandleMouseMoveRotate = orbitControls._handleMouseMoveRotate.bind(orbitControls);
    orbitControls._handleMouseMoveRotate = function (event) {
      if (event.shiftKey || isShiftKeyDown) {
        const dx = Math.abs(event.clientX - shiftDragState.startX);
        const dy = Math.abs(event.clientY - shiftDragState.startY);
        if (!shiftDragState.lockedAxis && (dx > 2 || dy > 2)) {
          shiftDragState.lockedAxis = dx >= dy ? 'x' : 'y';
        }
        if (shiftDragState.lockedAxis === 'x') {
          return origHandleMouseMoveRotate({
            clientX: event.clientX,
            clientY: this._rotateStart.y
          });
        } else if (shiftDragState.lockedAxis === 'y') {
          return origHandleMouseMoveRotate({
            clientX: this._rotateStart.x,
            clientY: event.clientY
          });
        }
      } else {
        shiftDragState.lockedAxis = null;
      }
      return origHandleMouseMoveRotate(event);
    };

    const origHandleMouseMovePan = orbitControls._handleMouseMovePan.bind(orbitControls);
    orbitControls._handleMouseMovePan = function (event) {
      if (event.shiftKey || isShiftKeyDown) {
        const dx = Math.abs(event.clientX - shiftDragState.startX);
        const dy = Math.abs(event.clientY - shiftDragState.startY);
        if (!shiftDragState.lockedAxis && (dx > 2 || dy > 2)) {
          shiftDragState.lockedAxis = dx >= dy ? 'x' : 'y';
        }
        if (shiftDragState.lockedAxis === 'x') {
          return origHandleMouseMovePan({
            clientX: event.clientX,
            clientY: this._panStart.y
          });
        } else if (shiftDragState.lockedAxis === 'y') {
          return origHandleMouseMovePan({
            clientX: this._panStart.x,
            clientY: event.clientY
          });
        }
      } else {
        shiftDragState.lockedAxis = null;
      }
      return origHandleMouseMovePan(event);
    };

    // Dramatic Chiaroscuro Cathedral & Board Lighting (restoring original-example 3D stone relief & warm firelight contrast)
    const hemiLight = new THREE.HemisphereLight(0xd8ccb8, 0x261d14, 0.62);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff0d6, 2.55);
    keyLight.position.set(3.8, 8.5, 4.2);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 1.0;
    keyLight.shadow.camera.far = 22.0;
    const d = 3.2;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    // Subtle directional rim/fill (kept low so opposing directional lights never cancel normal-map mortar shadows)
    const rimLight = new THREE.DirectionalLight(0xd8cbb8, 0.72);
    rimLight.position.set(-4.5, 6.0, -6.5);
    scene.add(rimLight);

    const southFillLight = new THREE.DirectionalLight(0xffe4c0, 0.52);
    southFillLight.position.set(4.2, 5.8, 7.5);
    scene.add(southFillLight);

    // Twin Flickering Brazier Point Lights (centered at x = +/-3.65, z = 0.00; flanking column bounce is evaluated in shader)
    const brazierCoords = [
      { pos: [-3.65, 1.08, 0.00], baseIntensity: 4.35, dist: 18.0 },
      { pos: [3.65, 1.08, 0.00], baseIntensity: 4.35, dist: 18.0 }
    ];
    const brazierLights = [];
    for (const cfg of brazierCoords) {
      const pLight = new THREE.PointLight(0xff8e32, cfg.baseIntensity, cfg.dist, 1.40);
      pLight.position.set(cfg.pos[0], cfg.pos[1], cfg.pos[2]);
      pLight.userData.baseIntensity = cfg.baseIntensity;
      scene.add(pLight);
      brazierLights.push(pLight);
    }

    // Realistic Gaseous GLSL Brazier Flames & Soft Warm Firelight Glow (zero bouncing shapes)
    const brazierFireUniforms = [];
    const brazierGlowSprites = [];

    function createSoftGlowTexture() {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      const grad = ctx.createRadialGradient(128, 128, 2, 128, 128, 128);
      grad.addColorStop(0.0, 'rgba(255, 226, 155, 0.88)');
      grad.addColorStop(0.18, 'rgba(255, 154, 52, 0.50)');
      grad.addColorStop(0.45, 'rgba(255, 92, 16, 0.18)');
      grad.addColorStop(0.75, 'rgba(210, 48, 4, 0.04)');
      grad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 256, 256);
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    }

    // Strip the 14 tiny static icosphere spark balls baked above Opt8_Brazier_Flame_Mid (y > 1.26, height < 0.10)
    // while preserving 100% of the sculpted flame tongues (which start at y = 0.59..0.61)
    function stripIcosphereSparksFromFlameGeometry(geometry) {
      if (!geometry || !geometry.attributes || !geometry.attributes.position) return;
      const pos = geometry.attributes.position;
      if (geometry.index) {
        const idx = geometry.index.array;
        for (let i = 0; i < idx.length; i += 3) {
          const i0 = idx[i];
          const i1 = idx[i + 1];
          const i2 = idx[i + 2];
          const y0 = pos.getY(i0);
          const y1 = pos.getY(i1);
          const y2 = pos.getY(i2);
          const minY = Math.min(y0, y1, y2);
          if (minY > 1.25) {
            idx[i] = 0;
            idx[i + 1] = 0;
            idx[i + 2] = 0;
          }
        }
        geometry.index.needsUpdate = true;
      } else {
        for (let i = 0; i < pos.count; i += 3) {
          const y0 = pos.getY(i);
          const y1 = pos.getY(i + 1);
          const y2 = pos.getY(i + 2);
          if (Math.min(y0, y1, y2) > 1.25) {
            pos.setXYZ(i, 0, 0, 0);
            pos.setXYZ(i + 1, 0, 0, 0);
            pos.setXYZ(i + 2, 0, 0, 0);
          }
        }
        pos.needsUpdate = true;
      }
    }

    // =========================================================================
    // Cathedral Room Boundary Clamping (Floor, Ceiling, Side & End Walls)
    // & Solid Cylindrical Column Collision / Circumferential Sliding Solver
    // =========================================================================
    const CATHEDRAL_BOUNDS = {
      minX: -6.65,
      maxX: 6.65,
      minY: 0.34,
      maxY: 8.85,
      minZ: -18.10,
      maxZ: 18.10
    };

    // 12 freestanding columns spread wider across the nave; the 4 columns closest to the chessboard (z = +/-2.20)
    // have been removed to create a grand 13.70m open Atrium around the altar and centered fire braziers
    const CATHEDRAL_COLUMN_ROWS = [
      { z: -16.65, xAbs: 4.25 },
      { z: -11.85, xAbs: 4.25 },
      { z: -6.85,  xAbs: 4.65 },
      { z: 6.85,   xAbs: 4.65 },
      { z: 11.85,  xAbs: 4.25 },
      { z: 16.65,  xAbs: 4.25 }
    ];
    const CATHEDRAL_SOLID_PILLARS = [
      ...CATHEDRAL_COLUMN_ROWS.flatMap(({ z, xAbs }) => [
        { x: -xAbs, z, r: 0.86, maxY: 9.65, isColumn: true },
        { x: xAbs,  z, r: 0.86, maxY: 9.65, isColumn: true }
      ]),
      { x: -3.65, z: 0.00, r: 0.68, maxY: 1.95, isColumn: false },
      { x: 3.65,  z: 0.00, r: 0.68, maxY: 1.95, isColumn: false }
    ];

    let currentWorldSceneryId = 'gothic_cathedral';
    let currentWorldSceneryObj = null;
    const cathedralShellMeshes = [];
    const worldSceneryManager = createWorldSceneryManager(scene);
    const sfxVfxManager = createSoundAndVfxManager(scene, BOARD_SURFACE_Y);

    function clampPointToCathedralRoom(pt, isTarget = false) {
      const margin = isTarget ? 0.15 : 0.0;
      if (currentWorldSceneryId !== 'gothic_cathedral') {
        pt.x = Math.max(-28.0 - margin, Math.min(28.0 + margin, pt.x));
        pt.z = Math.max(-28.0 - margin, Math.min(28.0 + margin, pt.z));
        const localMinY = isTarget ? 0.20 : 0.34;
        pt.y = Math.max(localMinY, Math.min(22.0, pt.y));
        return;
      }
      pt.x = Math.max(CATHEDRAL_BOUNDS.minX - margin, Math.min(CATHEDRAL_BOUNDS.maxX + margin, pt.x));
      pt.z = Math.max(CATHEDRAL_BOUNDS.minZ - margin, Math.min(CATHEDRAL_BOUNDS.maxZ + margin, pt.z));
      // Account for the sloped side-aisle ceiling vault outside x = +/-4.15
      const aisleDrop = Math.max(0, Math.abs(pt.x) - 4.15) * 0.55;
      const localMaxY = Math.min(CATHEDRAL_BOUNDS.maxY, 9.05 - aisleDrop);
      const localMinY = isTarget ? 0.20 : CATHEDRAL_BOUNDS.minY;
      pt.y = Math.max(localMinY, Math.min(localMaxY, pt.y));
    }

    function enforceCathedralBoundsAndSolidColumns(prevPos, curPos, targetPos) {
      clampPointToCathedralRoom(targetPos, true);
      clampPointToCathedralRoom(curPos, false);

      if (isAnimatingMove) {
        if (Math.abs(curPos.x) < 2.48 && Math.abs(curPos.z) < 2.38) {
          curPos.y = Math.max(curPos.y, BOARD_SURFACE_Y + 0.30);
        }
        return;
      }

      const x0 = prevPos ? prevPos.x : curPos.x;
      const z0 = prevPos ? prevPos.z : curPos.z;
      let x1 = curPos.x;
      let z1 = curPos.z;
      const moveDx = x1 - x0;
      const moveDz = z1 - z0;
      const moveLenSq = moveDx * moveDx + moveDz * moveDz;
      const moveLen = Math.sqrt(moveLenSq);
      const isContinuousStep = Boolean(prevPos) && moveLen > 1e-5 && moveLen < 8.0;

      for (const p of CATHEDRAL_SOLID_PILLARS) {
        if (p.isColumn && currentWorldSceneryId !== 'gothic_cathedral') continue;
        if (curPos.y > p.maxY) continue;

        let tClosest = 1.0;
        if (isContinuousStep) {
          tClosest = ((p.x - x0) * moveDx + (p.z - z0) * moveDz) / moveLenSq;
          tClosest = Math.max(0.0, Math.min(1.0, tClosest));
        }
        const cxSeg = x0 + moveDx * tClosest;
        const czSeg = z0 + moveDz * tClosest;
        const dSeg = isContinuousStep ? Math.hypot(cxSeg - p.x, czSeg - p.z) : Infinity;
        const dEnd = Math.hypot(x1 - p.x, z1 - p.z);

        if (dSeg < p.r || dEnd < p.r) {
          if (typeof window.__wizardChessTelemetry === 'object' && window.__wizardChessTelemetry && p.isColumn) {
            window.__wizardChessTelemetry.columnDeflections = (window.__wizardChessTelemetry.columnDeflections || 0) + 1;
          }

          if (isContinuousStep) {
            // Smooth tangential circumferential slide around the column
            const startAng = Math.atan2(z0 - p.z, x0 - p.x);
            const endAng = Math.atan2(z1 - p.z, x1 - p.x);
            let deltaAng = endAng - startAng;
            while (deltaAng > Math.PI) deltaAng -= Math.PI * 2;
            while (deltaAng < -Math.PI) deltaAng += Math.PI * 2;

            // Project step onto unit tangent at startAng; if pushing dead-on into column center, bias toward center aisle
            const tanX = -Math.sin(startAng);
            const tanZ = Math.cos(startAng);
            let tangMove = moveDx * tanX + moveDz * tanZ;
            if (Math.abs(tangMove) < moveLen * 0.18) {
              const aisleSign = (p.x >= 0 ? -1 : 1) * Math.sign(moveDz || 1);
              tangMove = (tangMove >= 0 ? 1 : aisleSign || 1) * moveLen * 0.65;
            }
            const arcStep = Math.sign(deltaAng || tangMove || 1) * Math.max(Math.abs(deltaAng), Math.min(Math.PI * 0.35, Math.abs(tangMove) / p.r));
            const newAng = startAng + arcStep;
            x1 = p.x + Math.cos(newAng) * p.r;
            z1 = p.z + Math.sin(newAng) * p.r;
          } else {
            const radX = x1 - p.x;
            const radZ = z1 - p.z;
            const radLen = Math.hypot(radX, radZ);
            if (radLen > 1e-4) {
              x1 = p.x + (radX / radLen) * p.r;
              z1 = p.z + (radZ / radLen) * p.r;
            } else {
              x1 = p.x + (p.x >= 0 ? -p.r : p.r);
              z1 = p.z;
            }
          }
        }
      }

      // Solid Black Marble Altar (4.40m x 4.20m slab + pedestal) & Chessboard collision
      // Prevents the camera from passing down through either the chessboard OR the surrounding black marble altar rim
      const ALTAR_TOP_Y = 0.722;
      const ALTAR_HALF_X = 2.48; // 2.22m black marble slab half-width + 0.26m camera frustum near-clip margin
      const ALTAR_HALF_Z = 2.38; // 2.12m black marble slab half-depth + 0.26m camera frustum near-clip margin
      const BOARD_HALF_XZ = 1.66;
      if (Math.abs(targetPos.x) < 2.36 && Math.abs(targetPos.z) < 2.26) {
        const minTargetY =
          Math.abs(targetPos.x) < 1.56 && Math.abs(targetPos.z) < 1.56
            ? BOARD_SURFACE_Y + 0.05
            : ALTAR_TOP_Y + 0.05;
        if (targetPos.y < minTargetY) {
          targetPos.y = minTargetY;
        }
      }
      if (Math.abs(x1) < ALTAR_HALF_X && Math.abs(z1) < ALTAR_HALF_Z) {
        const isOverChessboard = Math.abs(x1) < BOARD_HALF_XZ && Math.abs(z1) < BOARD_HALF_XZ;
        const solidAltarTopY = isOverChessboard ? (BOARD_SURFACE_Y + 0.25) : (ALTAR_TOP_Y + 0.28); // 1.035m on board, 1.002m on black marble altar
        if (curPos.y < solidAltarTopY) {
          const wasInsideAltarFootprint =
            Boolean(prevPos) &&
            Math.abs(x0) < ALTAR_HALF_X - 0.005 &&
            Math.abs(z0) < ALTAR_HALF_Z - 0.005;
          const wasAboveAltarSlab =
            wasInsideAltarFootprint ||
            (Boolean(prevPos) && prevPos.y >= ALTAR_TOP_Y - 0.04) ||
            curPos.y >= ALTAR_TOP_Y - 0.10;
          if (wasAboveAltarSlab) {
            curPos.y = Math.max(curPos.y, solidAltarTopY);
          } else {
            const penX = ALTAR_HALF_X - Math.abs(x1);
            const penZ = ALTAR_HALF_Z - Math.abs(z1);
            if (penX < penZ) {
              x1 = (x1 >= 0 ? 1 : -1) * ALTAR_HALF_X;
            } else {
              z1 = (z1 >= 0 ? 1 : -1) * ALTAR_HALF_Z;
            }
          }
        }
      }

      // Solid Marble & Obsidian Chess Pieces collision during manual camera movement
      // (Bypassed when isAnimatingMove is true so automated duel/attack camera choreography never gets pinned between statues)
      if (
        !isAnimatingMove &&
        curPos.y < BOARD_SURFACE_Y + 0.85 &&
        typeof boardState === 'object' &&
        Array.isArray(boardState)
      ) {
        const pieceRad = 0.185;
        for (let r = 0; r < 8; r++) {
          const row = boardState[r];
          if (!row) continue;
          for (let c = 0; c < 8; c++) {
            const pc = row[c];
            if (!pc || !pc.mesh || !pc.mesh.parent) continue;
            const px = pc.mesh.position.x;
            const pz = pc.mesh.position.z;
            const pieceH = (typeof PIECE_HEIGHTS === 'object' && PIECE_HEIGHTS[pc.type]) ? PIECE_HEIGHTS[pc.type] : 0.42;
            const pieceTopY = pc.mesh.position.y + pieceH + 0.10;
            if (curPos.y >= pieceTopY) continue;

            let tPiece = 1.0;
            if (isContinuousStep) {
              tPiece = ((px - x0) * moveDx + (pz - z0) * moveDz) / moveLenSq;
              tPiece = Math.max(0.0, Math.min(1.0, tPiece));
            }
            const cxP = x0 + moveDx * tPiece;
            const czP = z0 + moveDz * tPiece;
            const dSegP = isContinuousStep ? Math.hypot(cxP - px, czP - pz) : Infinity;
            const dEndP = Math.hypot(x1 - px, z1 - pz);

            if (dSegP < pieceRad || dEndP < pieceRad) {
              if (
                prevPos &&
                prevPos.y >= pieceTopY - 0.08 &&
                Math.hypot(x0 - px, z0 - pz) < pieceRad * 0.85
              ) {
                curPos.y = Math.max(curPos.y, pieceTopY);
              } else {
                const radX = x1 - px;
                const radZ = z1 - pz;
                const radLen = Math.hypot(radX, radZ);
                if (radLen > 1e-4) {
                  x1 = px + (radX / radLen) * pieceRad;
                  z1 = pz + (radZ / radLen) * pieceRad;
                } else {
                  x1 = px + pieceRad;
                }
              }
            }
          }
        }
      }

      curPos.x = x1;
      curPos.z = z1;
      clampPointToCathedralRoom(curPos, false);

      // Update minimum column clearance telemetry across all 12 freestanding columns
      if (typeof window.__wizardChessTelemetry === 'object' && window.__wizardChessTelemetry) {
        let minClear = Infinity;
        for (const p of CATHEDRAL_SOLID_PILLARS) {
          if (!p.isColumn) continue;
          const d = Math.hypot(curPos.x - p.x, curPos.z - p.z);
          if (d < minClear) minClear = d;
        }
        window.__wizardChessTelemetry.lastColumnClearance = Number(minClear.toFixed(3));
        if (
          window.__wizardChessTelemetry.minColumnClearance === undefined ||
          minClear < window.__wizardChessTelemetry.minColumnClearance
        ) {
          window.__wizardChessTelemetry.minColumnClearance = Number(minClear.toFixed(3));
        }
      }
    }

    function createSculptedFlameTongueShader(cfg) {
      const uniforms = {
        uTime: { value: 0 },
        uZMin: { value: cfg.zMin },
        uZMax: { value: cfg.zMax },
        uLayerSeed: { value: cfg.layerSeed },
        uStrength: { value: cfg.strength },
        uOpacity: { value: cfg.opacity },
        uBaseColor: { value: new THREE.Color(...cfg.baseColor) },
        uMidColor: { value: new THREE.Color(...cfg.midColor) },
        uTipColor: { value: new THREE.Color(...cfg.tipColor) }
      };
      brazierFireUniforms.push(uniforms);

      return new THREE.ShaderMaterial({
        uniforms,
        vertexShader: `
          uniform float uTime;
          uniform float uZMin;
          uniform float uZMax;
          uniform float uLayerSeed;
          varying vec3 vLocalPos;
          varying vec3 vWorldPos;
          varying vec3 vWorldNormal;
          varying float vHeightNorm;

          void main() {
            vec3 pos = position;
            float h = clamp((pos.y - uZMin) / max(0.01, uZMax - uZMin), 0.0, 1.0);
            vHeightNorm = h;

            // Each brazier is centered at X = +/- 3.65, Z = 0.65 in local mesh space (world Z = 0.00)
            vec2 bCenter = vec2(sign(pos.x) * 3.65, 0.65);
            vec2 relXZ = vec2(pos.x, pos.z) - bCenter;

            // Distinct phase per sculpted tongue & fire layer so all 27 tongues dance independently
            float tonguePhase = relXZ.x * 14.0 + relXZ.y * 12.0 + uLayerSeed * 1.9;
            float sway = pow(h, 1.05);

            // Multi-frequency upward-propagating lateral flame wave (pinned at h = 0 in the logs)
            float waveX = sin(pos.y * 4.6 - uTime * 6.4 + tonguePhase) * 0.088
                        + cos(pos.y * 8.2 - uTime * 9.8 + tonguePhase * 1.35) * 0.048;
            float waveZ = cos(pos.y * 4.3 - uTime * 5.9 + tonguePhase * 1.15) * 0.088
                        + sin(pos.y * 7.8 - uTime * 9.1 + tonguePhase * 0.85) * 0.048;

            // Swirling thermal vortex twist + radial breathing around each brazier bowl
            float twistAngle = sin(uTime * 4.2 + pos.y * 4.5 + uLayerSeed) * 0.30 * sway;
            float cA = cos(twistAngle);
            float sA = sin(twistAngle);
            vec2 twistedXZ = vec2(relXZ.x * cA - relXZ.y * sA, relXZ.x * sA + relXZ.y * cA);
            float radialPulse = 1.0 + sin(uTime * 5.2 - h * 4.0 + tonguePhase) * 0.14 * sway;

            pos.x = bCenter.x + twistedXZ.x * radialPulse + waveX * sway;
            pos.z = bCenter.y + twistedXZ.y * radialPulse + waveZ * sway;

            // Active vertical flame-tongue licking (base h = 0 stays strictly anchored at uZMin)
            float lickStretch = 1.0 + (
              sin(uTime * 5.8 + tonguePhase * 1.3) * 0.22 +
              cos(uTime * 9.2 - tonguePhase * 0.9) * 0.12
            ) * smoothstep(0.05, 0.85, h);
            pos.y = uZMin + (pos.y - uZMin) * lickStretch;

            vLocalPos = pos;
            vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
            vWorldPos = worldPosition.xyz;
            vWorldNormal = normalize(mat3(modelMatrix) * normal);
            gl_Position = projectionMatrix * viewMatrix * worldPosition;
          }
        `,
        fragmentShader: `
          uniform float uTime;
          uniform float uZMin;
          uniform float uZMax;
          uniform float uLayerSeed;
          uniform float uStrength;
          uniform float uOpacity;
          uniform vec3 uBaseColor;
          uniform vec3 uMidColor;
          uniform vec3 uTipColor;
          varying vec3 vLocalPos;
          varying vec3 vWorldPos;
          varying vec3 vWorldNormal;
          varying float vHeightNorm;

          float hash3(vec3 p) {
            p = fract(p * vec3(443.897, 441.423, 437.195));
            p += dot(p, p.yzx + 19.19);
            return fract((p.x + p.y) * p.z);
          }

          float noise3(vec3 p) {
            vec3 i = floor(p);
            vec3 f = fract(p);
            f = f * f * (3.0 - 2.0 * f);
            return mix(
              mix(
                mix(hash3(i + vec3(0.0, 0.0, 0.0)), hash3(i + vec3(1.0, 0.0, 0.0)), f.x),
                mix(hash3(i + vec3(0.0, 1.0, 0.0)), hash3(i + vec3(1.0, 1.0, 0.0)), f.x),
                f.y
              ),
              mix(
                mix(hash3(i + vec3(0.0, 0.0, 1.0)), hash3(i + vec3(1.0, 0.0, 1.0)), f.x),
                mix(hash3(i + vec3(0.0, 1.0, 1.0)), hash3(i + vec3(1.0, 1.0, 1.0)), f.x),
                f.y
              ),
              f.z
            );
          }

          void main() {
            float h = clamp(vHeightNorm, 0.0, 1.0);
            vec3 V = normalize(cameraPosition - vWorldPos);
            vec3 N = normalize(vWorldNormal);

            // Real-time port of Cycles LayerWeight.Facing^2.4 gaseous feathering
            float facing = clamp(abs(dot(N, V)), 0.0, 1.0);
            float powFacing = pow(facing, 2.25);

            // Fast upward-convecting 3D flame turbulence that actively carves the flame tips
            float n1 = noise3(vec3(vLocalPos.x * 5.4, vLocalPos.y * 4.8 - uTime * 6.8, vLocalPos.z * 5.4 + uLayerSeed));
            float n2 = noise3(vec3(vLocalPos.x * 10.2 + 1.9, vLocalPos.y * 8.5 - uTime * 10.5, vLocalPos.z * 10.2 - uLayerSeed));
            float shimmer = mix(n1, n2, 0.45);

            // Dynamic tip erosion so flame tongues visibly lick up and recede
            float erodedH = clamp(h + (shimmer - 0.48) * 0.42 * smoothstep(0.08, 0.85, h), 0.0, 1.0);

            // Combine eroded height and (1.0 - facing) so grazing edges shift toward fiery orange-crimson
            float heatCoord = clamp(erodedH + (1.0 - facing) * 0.36 + (shimmer - 0.5) * 0.22, 0.0, 1.0);
            vec3 col = mix(uBaseColor, uMidColor, smoothstep(0.0, 0.45, heatCoord));
            col = mix(col, uTipColor, smoothstep(0.45, 0.90, heatCoord));

            float zAlpha = mix(0.96, 0.72, smoothstep(0.0, 0.68, erodedH)) * (1.0 - smoothstep(0.64, 0.98, erodedH));
            float baseSoft = smoothstep(0.0, 0.06, h);
            float flickerPulse = 0.76 + 0.48 * shimmer;
            float alpha = clamp(zAlpha * baseSoft * powFacing * uOpacity * flickerPulse, 0.0, 1.0);
            if (alpha < 0.004) discard;

            gl_FragColor = vec4(col * uStrength, alpha);
          }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide
      });
    }

    function createCharredEmberLogsShader() {
      const uniforms = {
        uTime: { value: 0 }
      };
      brazierFireUniforms.push(uniforms);

      return new THREE.ShaderMaterial({
        uniforms,
        vertexShader: `
          varying vec3 vLocalPos;
          varying vec3 vWorldNormal;
          void main() {
            vLocalPos = position;
            vWorldNormal = normalize(mat3(modelMatrix) * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform float uTime;
          varying vec3 vLocalPos;
          varying vec3 vWorldNormal;

          float hash3(vec3 p) {
            p = fract(p * vec3(443.897, 441.423, 437.195));
            p += dot(p, p.yzx + 19.19);
            return fract((p.x + p.y) * p.z);
          }

          float noise3(vec3 p) {
            vec3 i = floor(p);
            vec3 f = fract(p);
            f = f * f * (3.0 - 2.0 * f);
            return mix(
              mix(
                mix(hash3(i + vec3(0.0, 0.0, 0.0)), hash3(i + vec3(1.0, 0.0, 0.0)), f.x),
                mix(hash3(i + vec3(0.0, 1.0, 0.0)), hash3(i + vec3(1.0, 1.0, 0.0)), f.x),
                f.y
              ),
              mix(
                mix(hash3(i + vec3(0.0, 0.0, 1.0)), hash3(i + vec3(1.0, 0.0, 1.0)), f.x),
                mix(hash3(i + vec3(0.0, 1.0, 1.0)), hash3(i + vec3(1.0, 1.0, 1.0)), f.x),
                f.y
              ),
              f.z
            );
          }

          void main() {
            // Dark charred timber bark (#0B0807) fissured with glowing incandescent 2200K orange cracks & glowing coal bed base
            float nCrack = noise3(vLocalPos * 18.0);
            float nFine = noise3(vLocalPos * 38.0 + vec3(0.0, uTime * 0.25, 0.0));
            float pulse = 0.88 + 0.12 * sin(uTime * 2.3 + vLocalPos.x * 4.0 + vLocalPos.z * 4.0);

            // Lower coal cone (y < 0.59) vs upper charred logs (y >= 0.59)
            float isCoalBed = 1.0 - smoothstep(0.56, 0.61, vLocalPos.y);
            float crackMask = smoothstep(0.68, 0.88, nCrack * 0.7 + nFine * 0.3);
            float underGlow = clamp(-vWorldNormal.y * 0.45 + 0.35, 0.0, 1.0) * smoothstep(0.72, 0.56, vLocalPos.y);

            vec3 charBark = vec3(0.035, 0.025, 0.020);
            vec3 emberOrange = vec3(1.0, 0.36, 0.04) * 1.45 * pulse;
            vec3 hotCoal = vec3(1.0, 0.58, 0.12) * 1.65 * pulse;

            float emberWeight = clamp(isCoalBed * (0.45 + 0.55 * nFine) + crackMask * 0.85 + underGlow * 0.45, 0.0, 1.0);
            vec3 col = mix(charBark, emberOrange, emberWeight);
            col = mix(col, hotCoal, smoothstep(0.72, 0.96, emberWeight));

            gl_FragColor = vec4(col, 1.0);
          }
        `
      });
    }

    function createBrazierWarmGlowHalos() {
      const glowTex = createSoftGlowTexture();
      const brazierCenters = [
        { x: -3.65, y: 0.56, z: 0.00, seed: 1.3 },
        { x: 3.65, y: 0.56, z: 0.00, seed: 5.8 }
      ];

      for (const b of brazierCenters) {
        // Layer 1: Inner warm hearth core glow halo centered in the flame body
        const coreGlowMat = new THREE.SpriteMaterial({
          map: glowTex,
          color: 0xffb866,
          transparent: true,
          opacity: 0.42,
          depthWrite: false,
          blending: THREE.AdditiveBlending
        });
        const coreSprite = new THREE.Sprite(coreGlowMat);
        coreSprite.position.set(b.x, b.y + 0.28, b.z);
        coreSprite.scale.set(1.15, 1.25, 1.0);
        coreSprite.userData = { baseOpacity: 0.42, seed: b.seed };
        scene.add(coreSprite);
        brazierGlowSprites.push(coreSprite);

        // Layer 2: Wide, soft atmospheric warm glow halo bathing the surrounding air & ironwork
        const haloGlowMat = new THREE.SpriteMaterial({
          map: glowTex,
          color: 0xff8524,
          transparent: true,
          opacity: 0.28,
          depthWrite: false,
          blending: THREE.AdditiveBlending
        });
        const haloSprite = new THREE.Sprite(haloGlowMat);
        haloSprite.position.set(b.x, b.y + 0.38, b.z);
        haloSprite.scale.set(2.45, 2.30, 1.0);
        haloSprite.userData = { baseOpacity: 0.28, seed: b.seed + 2.1 };
        scene.add(haloSprite);
        brazierGlowSprites.push(haloSprite);
      }
    }

    createBrazierWarmGlowHalos();

    // Consolidated Window Point Lights (4 side-aisle + 2 end-wall lights instead of 22 separate PointLights;
    // fine local window & column raking relief is evaluated analytically in applyCathedralStoneRealismShader)
    const sideWinLights = [];
    for (const wz of [-8.8, 8.2]) {
      for (const sideSign of [-1, 1]) {
        const winLight = new THREE.PointLight(0x90beff, 4.2, 16.5, 1.35);
        winLight.position.set(sideSign * 5.3, 4.1, wz);
        scene.add(winLight);
        sideWinLights.push(winLight);
      }
    }
    const northWinLight = new THREE.PointLight(0x9bc4ff, 6.4, 20.0, 1.30);
    northWinLight.position.set(0, 5.2, -18.2);
    scene.add(northWinLight);

    const southWinLight = new THREE.PointLight(0xffb85c, 6.4, 20.0, 1.30);
    southWinLight.position.set(0, 5.2, 18.2);
    scene.add(southWinLight);

    // Impact Flash Light (kept visible=true with intensity=0 when idle so Three.js never recompiles shaders mid-attack!)
    const impactFlashLight = new THREE.PointLight(0xffb74d, 0, 6.0, 1.5);
    impactFlashLight.visible = true;
    scene.add(impactFlashLight);

    // =========================================================================
    // Materials for White & Black Sculpted Stone Chess Pieces (Independent Per-Side Support)
    // Enhanced with Poliigon Free PBR Texture Suites (Albedo, NormalGL, Roughness)
    // =========================================================================
    const whitePieceMat = new THREE.MeshStandardMaterial({
      color: 0xe6dfd0,
      roughness: 0.34,
      metalness: 0.06
    });
    applyPoliigonPbrToMaterial(whitePieceMat, 'travertine_limestone', {
      contextId: 'main',
      repeatX: 2,
      repeatY: 2,
      normalScale: 0.88,
      envMapIntensity: 1.35
    });

    const blackPieceMat = new THREE.MeshStandardMaterial({
      color: 0x222630,
      roughness: 0.28,
      metalness: 0.24
    });
    applyPoliigonPbrToMaterial(blackPieceMat, 'marble_nero_marquina', {
      contextId: 'main',
      repeatX: 2,
      repeatY: 2,
      normalScale: 0.88,
      envMapIntensity: 1.45
    });

    const whiteTrimMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      roughness: 0.26,
      metalness: 0.86
    });
    applyPoliigonPbrToMaterial(whiteTrimMat, 'metal_gold_hammered', {
      contextId: 'main',
      repeatX: 2,
      repeatY: 2,
      normalScale: 0.68,
      envMapIntensity: 1.6,
      useNormalMap: false
    });

    const blackTrimMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      roughness: 0.26,
      metalness: 0.86
    });
    applyPoliigonPbrToMaterial(blackTrimMat, 'metal_gold_hammered', {
      contextId: 'main',
      repeatX: 2,
      repeatY: 2,
      normalScale: 0.68,
      envMapIntensity: 1.6,
      useNormalMap: false
    });
    const goldTrimMat = whiteTrimMat;

    const whiteBladeMat = new THREE.MeshStandardMaterial({
      color: 0xdce4ee,
      roughness: 0.20,
      metalness: 0.88,
      emissive: 0x222832,
      emissiveIntensity: 0.25
    });
    applyPoliigonPbrToMaterial(whiteBladeMat, 'metal_steel_brushed', {
      contextId: 'main',
      repeatX: 2,
      repeatY: 2,
      normalScale: 0.72,
      envMapIntensity: 1.65,
      useNormalMap: false
    });

    const blackBladeMat = new THREE.MeshStandardMaterial({
      color: 0xdce4ee,
      roughness: 0.20,
      metalness: 0.88,
      emissive: 0x222832,
      emissiveIntensity: 0.25
    });
    applyPoliigonPbrToMaterial(blackBladeMat, 'metal_steel_brushed', {
      contextId: 'main',
      repeatX: 2,
      repeatY: 2,
      normalScale: 0.72,
      envMapIntensity: 1.65,
      useNormalMap: false
    });
    const forgedSteelMat = whiteBladeMat;

    // =========================================================================
    // Asset Loading (Cathedral GLB + 12 Rigged Piece GLBs)
    // =========================================================================
    const gltfLoader = new GLTFLoader();
    const pieceTemplates = {};
    const activeMixers = [];
    const shatterDebris = [];
    const clock = new THREE.Clock();

    const boardGroup = new THREE.Group();
    scene.add(boardGroup);
    const boardArchGroup = new THREE.Group();
    scene.add(boardArchGroup);
    const squareHighlightsGroup = new THREE.Group();
    scene.add(squareHighlightsGroup);
    const boardSquareMeshes = [];

    let currentPieceArchetype = 'gothic_warriors';
    let currentPieceArchetypeName = 'Gothic Sanctum Warriors';
    let currentPieceSkinObj = null;
    let whitePieceArchetype = 'gothic_warriors';
    let blackPieceArchetype = 'gothic_warriors';
    let currentBoardSkinObj = null;

    const lightSqMat = new THREE.MeshStandardMaterial({
      color: 0xdcd3c2,
      roughness: 0.38,
      metalness: 0.06
    });
    applyPoliigonPbrToMaterial(lightSqMat, 'marble_calacatta', {
      contextId: 'main',
      repeatX: 1.25,
      repeatY: 1.25,
      normalScale: 0.8,
      envMapIntensity: 1.35
    });

    const darkSqMat = new THREE.MeshStandardMaterial({
      color: 0x14171f,
      roughness: 0.28,
      metalness: 0.18
    });
    applyPoliigonPbrToMaterial(darkSqMat, 'marble_nero_marquina', {
      contextId: 'main',
      repeatX: 1.25,
      repeatY: 1.25,
      normalScale: 0.8,
      envMapIntensity: 1.45
    });

    const boardBorderMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      roughness: 0.26,
      metalness: 0.86
    });
    applyPoliigonPbrToMaterial(boardBorderMat, 'metal_gold_hammered', {
      contextId: 'main',
      repeatX: 2.5,
      repeatY: 2.5,
      normalScale: 0.72,
      envMapIntensity: 1.55
    });

    function buildChessBoardGrid() {
      const tileH = 0.036;
      const sqGeo = new THREE.BoxGeometry(BOARD_SQ_SIZE * 0.985, tileH, BOARD_SQ_SIZE * 0.985);

      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const isLight = (r + c) % 2 === 0;
          const sqMesh = new THREE.Mesh(sqGeo, isLight ? lightSqMat : darkSqMat);
          const pos = boardToWorld(r, c);
          sqMesh.position.set(pos.x, BOARD_SURFACE_Y - tileH * 0.5, pos.z);
          sqMesh.receiveShadow = true;
          sqMesh.userData = { r, c, isSquare: true };
          boardGroup.add(sqMesh);
          boardSquareMeshes.push(sqMesh);
        }
      }

      rebuildBoardArchitectureGroup(boardArchGroup, null, BOARD_SQ_SIZE, BOARD_SURFACE_Y, boardBorderMat, 'main');
    }

    buildChessBoardGrid();

    function applySkinToSideMaterials(side, skin) {
      if (!skin) return;
      const sideArch = side === 'w' ? whitePieceArchetype : blackPieceArchetype;
      const pbrPresets = resolvePiecePoliigonPresets(skin.id || 'classic_stone', sideArch);

      if (side === 'w') {
        whitePieceMat.color.set(skin.whiteHex || '#e6dfd0');
        whitePieceMat.roughness = skin.whiteRoughness ?? 0.34;
        whitePieceMat.metalness = skin.whiteMetalness ?? 0.06;
        whitePieceMat.emissive.set(skin.whiteEmissiveHex || '#000000');
        whitePieceMat.emissiveIntensity = skin.whiteEmissiveIntensity ?? 0;
        applyPoliigonPbrToMaterial(whitePieceMat, pbrPresets.whitePreset, {
          contextId: 'main',
          repeatX: 2,
          repeatY: 2,
          normalScale: pbrPresets.normalScaleVal,
          envMapIntensity: 1.38
        });

        whiteTrimMat.color.set(skin.trimHex || '#d4af37');
        whiteTrimMat.roughness = skin.trimRoughness ?? 0.26;
        whiteTrimMat.metalness = skin.trimMetalness ?? 0.86;
        applyPoliigonPbrToMaterial(whiteTrimMat, pbrPresets.trimPreset, {
          contextId: 'main',
          repeatX: 2,
          repeatY: 2,
          normalScale: pbrPresets.normalScaleVal * 0.78,
          envMapIntensity: 1.6,
          useNormalMap: false
        });

        whiteBladeMat.color.set(skin.bladeHex || '#dce4ee');
        whiteBladeMat.roughness = skin.bladeRoughness ?? 0.20;
        whiteBladeMat.metalness = skin.bladeMetalness ?? 0.88;
        whiteBladeMat.emissive.set(skin.bladeEmissiveHex || '#222832');
        whiteBladeMat.emissiveIntensity = skin.bladeEmissiveIntensity ?? 0.25;
        applyPoliigonPbrToMaterial(whiteBladeMat, pbrPresets.bladePreset, {
          contextId: 'main',
          repeatX: 2,
          repeatY: 2,
          normalScale: pbrPresets.normalScaleVal * 0.82,
          envMapIntensity: 1.65,
          useNormalMap: false
        });
      } else {
        blackPieceMat.color.set(skin.blackHex || '#222630');
        blackPieceMat.roughness = skin.blackRoughness ?? 0.28;
        blackPieceMat.metalness = skin.blackMetalness ?? 0.24;
        blackPieceMat.emissive.set(skin.blackEmissiveHex || '#000000');
        blackPieceMat.emissiveIntensity = skin.blackEmissiveIntensity ?? 0;
        applyPoliigonPbrToMaterial(blackPieceMat, pbrPresets.blackPreset, {
          contextId: 'main',
          repeatX: 2,
          repeatY: 2,
          normalScale: pbrPresets.normalScaleVal,
          envMapIntensity: 1.48
        });

        blackTrimMat.color.set(skin.trimHex || '#d4af37');
        blackTrimMat.roughness = skin.trimRoughness ?? 0.26;
        blackTrimMat.metalness = skin.trimMetalness ?? 0.86;
        applyPoliigonPbrToMaterial(blackTrimMat, pbrPresets.trimPreset, {
          contextId: 'main',
          repeatX: 2,
          repeatY: 2,
          normalScale: pbrPresets.normalScaleVal * 0.78,
          envMapIntensity: 1.6,
          useNormalMap: false
        });

        blackBladeMat.color.set(skin.bladeHex || '#dce4ee');
        blackBladeMat.roughness = skin.bladeRoughness ?? 0.20;
        blackBladeMat.metalness = skin.bladeMetalness ?? 0.88;
        blackBladeMat.emissive.set(skin.bladeEmissiveHex || '#222832');
        blackBladeMat.emissiveIntensity = skin.bladeEmissiveIntensity ?? 0.25;
        applyPoliigonPbrToMaterial(blackBladeMat, pbrPresets.bladePreset, {
          contextId: 'main',
          repeatX: 2,
          repeatY: 2,
          normalScale: pbrPresets.normalScaleVal * 0.82,
          envMapIntensity: 1.65,
          useNormalMap: false
        });
      }
      renderer.shadowMap.needsUpdate = true;
    }

    function applyPieceSkin(skin) {
      if (!skin) return;
      currentPieceSkinObj = skin;
      if (gameMode === 'multi') {
        const mySide = playerColor === 'b' ? 'b' : 'w';
        applySkinToSideMaterials(mySide, skin);
        broadcastLocalLoadoutToRoom();
      } else {
        applySkinToSideMaterials('w', skin);
        applySkinToSideMaterials('b', skin);
      }
    }

    let lastBuiltBoardArchKey = '';
    function applyBoardSkin(boardSkin) {
      if (!boardSkin) return;
      currentBoardSkinObj = boardSkin;
      const bPresets = resolveBoardPoliigonPresets(boardSkin.id || 'obsidian_sanctum', boardSkin.archType || 'gothic');

      lightSqMat.color.set(boardSkin.lightSqHex || '#dcd3c2');
      lightSqMat.roughness = boardSkin.lightRoughness ?? 0.38;
      lightSqMat.metalness = boardSkin.lightMetalness ?? 0.06;
      applyPoliigonPbrToMaterial(lightSqMat, bPresets.lightPreset, {
        contextId: 'main',
        repeatX: bPresets.repeatSq,
        repeatY: bPresets.repeatSq,
        normalScale: bPresets.normalScaleVal,
        envMapIntensity: 1.38
      });

      darkSqMat.color.set(boardSkin.darkSqHex || '#14171f');
      darkSqMat.roughness = boardSkin.darkRoughness ?? 0.28;
      darkSqMat.metalness = boardSkin.darkMetalness ?? 0.18;
      applyPoliigonPbrToMaterial(darkSqMat, bPresets.darkPreset, {
        contextId: 'main',
        repeatX: bPresets.repeatSq,
        repeatY: bPresets.repeatSq,
        normalScale: bPresets.normalScaleVal,
        envMapIntensity: 1.48
      });

      boardBorderMat.color.set(boardSkin.borderHex || '#d4af37');
      applyPoliigonPbrToMaterial(boardBorderMat, bPresets.borderPreset, {
        contextId: 'main',
        repeatX: bPresets.repeatBorder,
        repeatY: bPresets.repeatBorder,
        normalScale: bPresets.normalScaleVal,
        envMapIntensity: 1.55
      });

      // 1. Rebuild 3D Board Perimeter Architecture when board skin architecture, colors, or table PBR preset changes
      const nextBoardArchKey = `${boardSkin.id || 'obsidian_sanctum'}_${boardSkin.archType || 'gothic'}_${boardSkin.borderHex || ''}_${boardSkin.accentHex || ''}_${bPresets.borderPreset}_${bPresets.accentPreset}`;
      if (nextBoardArchKey !== lastBuiltBoardArchKey) {
        lastBuiltBoardArchKey = nextBoardArchKey;
        rebuildBoardArchitectureGroup(boardArchGroup, boardSkin, BOARD_SQ_SIZE, BOARD_SURFACE_Y, boardBorderMat, 'main');
      }

      // 2. Transform Full 3D Room Stone Masonry, Fog, Window Lights & Volumetric Brazier Flame Colors
      if (typeof boardSkin.wallLookIndex === 'number' && typeof setWallStoneLook === 'function') {
        setWallStoneLook(boardSkin.wallLookIndex);
      }
      if (typeof boardSkin.floorLookIndex === 'number' && typeof setFloorStoneLook === 'function') {
        setFloorStoneLook(boardSkin.floorLookIndex);
      }
      if (boardSkin.fogHex && scene.fog && currentWorldSceneryId === 'gothic_cathedral') {
        scene.fog.color.set(boardSkin.fogHex);
        scene.background = new THREE.Color(boardSkin.fogHex);
      }
      if (boardSkin.sideWindowHex) {
        for (const sw of sideWinLights) {
          sw.color.set(boardSkin.sideWindowHex);
        }
      }
      if (boardSkin.northWindowHex) {
        northWinLight.color.set(boardSkin.northWindowHex);
      }
      if (boardSkin.southWindowHex) {
        southWinLight.color.set(boardSkin.southWindowHex);
      }
      if (Array.isArray(boardSkin.brazierBaseRGB) && Array.isArray(boardSkin.brazierMidRGB) && Array.isArray(boardSkin.brazierTipRGB)) {
        for (const u of brazierFireUniforms) {
          if (u.uBaseColor) u.uBaseColor.value.setRGB(...boardSkin.brazierBaseRGB);
          if (u.uMidColor) u.uMidColor.value.setRGB(...boardSkin.brazierMidRGB);
          if (u.uTipColor) u.uTipColor.value.setRGB(...boardSkin.brazierTipRGB);
        }
      }
      if (boardSkin.brazierLightHex) {
        for (const bl of brazierLights) {
          bl.color.set(boardSkin.brazierLightHex);
        }
        for (const sp of brazierGlowSprites) {
          if (sp.material) sp.material.color.set(boardSkin.brazierLightHex);
        }
      }

      renderer.shadowMap.needsUpdate = true;
    }

    function applyWorldScenery(scenery, options = {}) {
      if (!scenery) return;
      const sceneryId = typeof scenery === 'string' ? scenery : scenery.id || 'gothic_cathedral';
      currentWorldSceneryId = sceneryId;
      if (typeof scenery === 'object') {
        currentWorldSceneryObj = scenery;
      }

      const isIndoorCathedral = sceneryId === 'gothic_cathedral';
      for (const shellMesh of cathedralShellMeshes) {
        shellMesh.visible = isIndoorCathedral;
      }

      worldSceneryManager.setScenery(scenery);
      sfxVfxManager.setActiveWorldScenery?.(sceneryId);

      if (isIndoorCathedral) {
        hemiLight.color.setHex(0xd8ccb8);
        hemiLight.groundColor.setHex(0x261d14);
        hemiLight.intensity = 0.62;
        keyLight.color.setHex(0xfff0d6);
        keyLight.intensity = 2.55;
        rimLight.color.setHex(0xd8cbb8);
        rimLight.intensity = 0.72;
        const fogHex = currentBoardSkinObj?.fogHex || '#080b14';
        if (scene.fog) {
          scene.fog.color.set(fogHex);
          scene.fog.density = 0.015;
        }
        scene.background = new THREE.Color(fogHex);
      } else if (currentWorldSceneryObj) {
        hemiLight.color.set(currentWorldSceneryObj.hemiSkyHex || '#b8c0ff');
        hemiLight.groundColor.set(currentWorldSceneryObj.hemiGroundHex || '#1f1138');
        hemiLight.intensity = currentWorldSceneryObj.hemiIntensity ?? 0.85;
        keyLight.color.set(currentWorldSceneryObj.keyLightHex || '#f0e6ff');
        keyLight.intensity = currentWorldSceneryObj.keyLightIntensity ?? 2.75;
        rimLight.color.set(currentWorldSceneryObj.rimLightHex || '#00f5d4');
        rimLight.intensity = currentWorldSceneryObj.rimLightIntensity ?? 1.1;
        const fogHex = currentWorldSceneryObj.fogHex || '#0b061d';
        if (scene.fog) {
          scene.fog.color.set(fogHex);
          scene.fog.density = currentWorldSceneryObj.fogDensity ?? 0.0045;
        }
        scene.background = new THREE.Color(fogHex);
      }

      if (options && options.flyToVista && typeof smoothCameraTo === 'function') {
        const zSign = playerColor === 'b' ? -1 : 1;
        if (isIndoorCathedral) {
          smoothCameraTo(new THREE.Vector3(0, 2.55, zSign * 6.65), new THREE.Vector3(0, 1.95, -zSign * 2.50), 0.9);
        } else {
          smoothCameraTo(new THREE.Vector3(zSign * 3.8, 3.35, zSign * 7.85), new THREE.Vector3(0, 1.85, -zSign * 4.5), 0.95);
        }
      }

      renderer.shadowMap.needsUpdate = true;
    }

    // =========================================================================
    // Native Baked Wall/Column Stone (Original Ashlar) & Floor Stone (Abbey Flagstone)
    // =========================================================================
    const WALL_STONE_LOOKS = [
      {
        name: 'Original Ashlar',
        fullName: 'Original Ashlar',
        useOriginalBaked: true,
        roughness: 0.78,
        normalScale: 1.18,
        colNormalScale: 1.06
      }
    ];

    const FLOOR_STONE_LOOKS = [
      {
        name: 'Abbey Flagstone',
        fullName: 'Abbey Flagstone',
        useOriginalBaked: true,
        roughness: 0.80,
        metalness: 0.02,
        normalScale: 1.18
      }
    ];

    let currentWallStoneLookIdx = 0;
    let currentFloorStoneLookIdx = 0;
    const cathedralWallMats = [];
    const cathedralColumnMats = [];
    const cathedralFloorMats = [];

    // Precomputed 128x128 tileable micro-chisel grain DataTexture (replaces 32 per-pixel 3D hashes every frame)
    const stoneMicroGrainTex = (() => {
      const size = 128;
      const data = new Uint8Array(size * size * 4);
      const fract = (v) => v - Math.floor(v);
      const hash2 = (x, y, s) => fract(Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453);
      const smoothNoise = (u, v, period, seed) => {
        const gx = u * period;
        const gy = v * period;
        const x0 = Math.floor(gx) % period;
        const y0 = Math.floor(gy) % period;
        const x1 = (x0 + 1) % period;
        const y1 = (y0 + 1) % period;
        const fx = gx - Math.floor(gx);
        const fy = gy - Math.floor(gy);
        const sx = fx * fx * (3 - 2 * fx);
        const sy = fy * fy * (3 - 2 * fy);
        const n00 = hash2(x0, y0, seed);
        const n10 = hash2(x1, y0, seed);
        const n01 = hash2(x0, y1, seed);
        const n11 = hash2(x1, y1, seed);
        return (n00 + (n10 - n00) * sx) * (1 - sy) + (n01 + (n11 - n01) * sx) * sy;
      };
      for (let y = 0; y < size; y++) {
        const v = y / size;
        for (let x = 0; x < size; x++) {
          const u = x / size;
          const mG1 = smoothNoise(u, v, 24, 1.7);
          const mG2 = smoothNoise(u, v, 64, 7.3);
          const idx = (y * size + x) * 4;
          data[idx] = Math.max(0, Math.min(255, Math.round(mG1 * 255)));
          data[idx + 1] = Math.max(0, Math.min(255, Math.round(mG2 * 255)));
          data[idx + 2] = Math.max(0, Math.min(255, Math.round((0.5 + (mG1 - mG2) * 0.7) * 255)));
          data[idx + 3] = 255;
        }
      }
      const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.magFilter = THREE.LinearFilter;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.generateMipmaps = true;
      tex.needsUpdate = true;
      return tex;
    })();

    // =========================================================================
    // Realism Stone Shader Enhancement (inspired by 0beqz/realism-effects HBAO/HBIL
    // & gkjohnson/three-gpu-pathtracer Cavity Micro-Occlusion + Specular Occlusion)
    // =========================================================================
    function applyCathedralStoneRealismShader(mat, isFloor = false) {
      if (!mat || mat.userData.hasRealismStoneShader) return;
      mat.userData.hasRealismStoneShader = true;
      mat.customProgramCacheKey = () => (isFloor ? 'cathedral-floor-realism-v3' : 'cathedral-stone-realism-v3');

      mat.onBeforeCompile = (shader) => {
        shader.uniforms.uCavityStrength = { value: isFloor ? 0.58 : 0.72 };
        shader.uniforms.uMicroDetailStrength = { value: isFloor ? 0.14 : 0.18 };
        shader.uniforms.uFireBounceStrength = { value: isFloor ? 0.16 : 0.24 };
        shader.uniforms.uMicroGrainMap = { value: stoneMicroGrainTex };

        shader.vertexShader = shader.vertexShader.replace(
          '#include <common>',
          `#include <common>
          varying vec3 vStoneWorldPos;`
        );
        shader.vertexShader = shader.vertexShader.replace(
          '#include <worldpos_vertex>',
          `#include <worldpos_vertex>
          vStoneWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;`
        );

        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <common>',
          `#include <common>
          varying vec3 vStoneWorldPos;
          uniform float uCavityStrength;
          uniform float uMicroDetailStrength;
          uniform float uFireBounceStrength;
          uniform sampler2D uMicroGrainMap;`
        );

        // Extract normal-map slope magnitude for Mortar/Crevice Cavity AO & Specular Micro-Occlusion,
        // plus precomputed tileable micro-chisel grain lookup (zero per-pixel 3D hash loops!).
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <normal_fragment_maps>',
          `float stoneCavityAO = 1.0;
          #include <normal_fragment_maps>
          #ifdef USE_NORMALMAP_TANGENTSPACE
            vec2 rawNrmXY = texture2D(normalMap, vNormalMapUv).xy * 2.0 - 1.0;
            float slopeSq = dot(rawNrmXY, rawNrmXY);
            stoneCavityAO = clamp(1.0 - slopeSq * uCavityStrength, 0.36, 1.0);
          #endif
          vec2 microUv = (vStoneWorldPos.xz + vStoneWorldPos.xy * 0.618) * 0.85;
          vec3 mgSample = texture2D(uMicroGrainMap, microUv).rgb - 0.5;
          float mG1 = mgSample.r;
          float mG2 = mgSample.g;
          vec3 microPerturb = vec3(mG1, mG2, mgSample.b) * uMicroDetailStrength;
          normal = normalize(normal + microPerturb * 0.22);
          diffuseColor.rgb *= mix(0.92, 1.07, clamp(0.5 + (mG1 * 0.65 + mG2 * 0.35), 0.0, 1.0));
          diffuseColor.rgb *= mix(1.0, stoneCavityAO, 0.68);
          roughnessFactor = clamp(roughnessFactor + (1.0 - stoneCavityAO) * 0.34 - mG1 * 0.06, 0.14, 0.99);`
        );

        // Add Horizon-Based Indirect Bounce (HBIL) from the twin fire cauldrons & upper lancet windows,
        // and apply Specular Micro-Occlusion in mortar crevices so grooves never have plastic shine.
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <lights_fragment_end>',
          `#include <lights_fragment_end>
          reflectedLight.directDiffuse *= mix(1.0, stoneCavityAO, 0.45);
          reflectedLight.indirectDiffuse *= stoneCavityAO;
          reflectedLight.directSpecular *= stoneCavityAO * stoneCavityAO;
          reflectedLight.indirectSpecular *= stoneCavityAO * stoneCavityAO;

          // Physical multi-bounce warm firelight GI from the twin atrium braziers & flanking columns
          vec3 toBrazierL = vec3(-3.65, 1.35, 0.0) - vStoneWorldPos;
          vec3 toBrazierR = vec3(3.65, 1.35, 0.0) - vStoneWorldPos;
          float distSqL = dot(toBrazierL, toBrazierL) + 2.6;
          float distSqR = dot(toBrazierR, toBrazierR) + 2.6;
          vec3 wNormal = inverseTransformDirection(normal, viewMatrix);
          float bounceL = max(0.0, dot(wNormal, normalize(toBrazierL)) * 0.65 + 0.35) / distSqL;
          float bounceR = max(0.0, dot(wNormal, normalize(toBrazierR)) * 0.65 + 0.35) / distSqR;
          vec3 fireBounceGI = vec3(1.0, 0.54, 0.20) * (bounceL + bounceR) * 5.2 * uFireBounceStrength * stoneCavityAO;

          // Analytic raking window-sill & end-wall grazing light (replaces 14 static PointLights at zero BRDF cost)
          vec3 toSideWin = vec3(sign(vStoneWorldPos.x) * 6.8, 3.8, vStoneWorldPos.z) - vStoneWorldPos;
          float sideWinDistSq = dot(toSideWin, toSideWin) + 3.2;
          float sideWinGraze = max(0.0, dot(wNormal, normalize(toSideWin)) * 0.75 + 0.25) / sideWinDistSq;
          vec3 windowGrazeGI = vec3(0.84, 0.89, 0.96) * sideWinGraze * 0.95 * stoneCavityAO;
          reflectedLight.indirectDiffuse += (fireBounceGI + windowGrazeGI) * diffuseColor.rgb;`
        );
      };
      mat.needsUpdate = true;
    }

    function setWallStoneLook() {
      currentWallStoneLookIdx = 0;
      const cfg = WALL_STONE_LOOKS[0];

      for (const mat of cathedralWallMats) {
        mat.map = mat.userData.origMap || mat.map;
        mat.normalMap = mat.userData.origNormalMap || mat.normalMap;
        mat.roughnessMap = mat.userData.origRoughnessMap || mat.roughnessMap;
        mat.emissiveMap = mat.userData.origEmissiveMap || null;
        mat.emissiveIntensity = 0.08;
        mat.roughness = cfg.roughness;
        mat.metalness = 0.02;
        if ('envMapIntensity' in mat) mat.envMapIntensity = 0.45;
        if (mat.color) mat.color.setRGB(1, 1, 1);
        if (mat.normalScale) mat.normalScale.set(cfg.normalScale, cfg.normalScale);
        mat.needsUpdate = true;
      }

      for (const mat of cathedralColumnMats) {
        mat.map = mat.userData.origMap || mat.map;
        mat.normalMap = mat.userData.origNormalMap || mat.normalMap;
        mat.roughnessMap = mat.userData.origRoughnessMap || mat.roughnessMap;
        mat.emissiveMap = mat.userData.origEmissiveMap || null;
        mat.emissiveIntensity = 0.08;
        mat.roughness = cfg.roughness;
        mat.metalness = 0.02;
        if ('envMapIntensity' in mat) mat.envMapIntensity = 0.48;
        if (mat.color) mat.color.setRGB(1, 1, 1);
        if (mat.normalScale) mat.normalScale.set(cfg.colNormalScale, cfg.colNormalScale);
        mat.needsUpdate = true;
      }

      return { index: 0, name: cfg.name, fullName: cfg.fullName };
    }

    function setFloorStoneLook() {
      currentFloorStoneLookIdx = 0;
      const cfg = FLOOR_STONE_LOOKS[0];

      for (const mat of cathedralFloorMats) {
        mat.map = mat.userData.origMap || mat.map;
        mat.normalMap = mat.userData.origNormalMap || mat.normalMap;
        mat.roughnessMap = mat.userData.origRoughnessMap || mat.roughnessMap;
        mat.emissiveMap = mat.userData.origEmissiveMap || null;
        mat.emissiveIntensity = 0.06;
        mat.roughness = cfg.roughness;
        mat.metalness = cfg.metalness;
        if (mat.color) mat.color.setRGB(1, 1, 1);
        if ('envMapIntensity' in mat) mat.envMapIntensity = 0.36;
        if (mat.normalScale) mat.normalScale.set(cfg.normalScale, cfg.normalScale);
        mat.needsUpdate = true;
      }

      return { index: 0, name: cfg.name, fullName: cfg.fullName };
    }

    function nextWallStoneLook() {
      return setWallStoneLook(0);
    }
    function prevWallStoneLook() {
      return setWallStoneLook(0);
    }
    function nextFloorStoneLook() {
      return setFloorStoneLook(0);
    }
    function prevFloorStoneLook() {
      return setFloorStoneLook(0);
    }

    async function loadAllAssets() {
      sfxVfxManager.setLobbyMusicActive?.(true);
      const loaderBar = document.getElementById('loader-bar');
      const loaderText = document.getElementById('loader-text');
      const loaderPct = document.getElementById('loader-pct');
      const loaderStepCount = document.getElementById('loader-step-count');
      const totalItems = PIECE_TYPES.length + 1;

      if (loaderBar) loaderBar.style.width = '6%';
      if (loaderPct) loaderPct.textContent = '6%';
      if (loaderStepCount) loaderStepCount.textContent = `0 / ${totalItems} Relics Awakened`;

      async function loadGltfModel(baseName) {
        let arrayBuffer = null;
        try {
          const resB64 = await fetch(`./assets/glb/${baseName}.glb.gz.b64`);
          if (resB64.ok) {
            const b64Text = (await resB64.text()).trim();
            if (b64Text.length > 64) {
              const binStr = atob(b64Text);
              const gzBytes = new Uint8Array(binStr.length);
              for (let i = 0; i < binStr.length; i++) {
                gzBytes[i] = binStr.charCodeAt(i);
              }
              const ds = new DecompressionStream('gzip');
              const stream = new Blob([gzBytes]).stream().pipeThrough(ds);
              arrayBuffer = await new Response(stream).arrayBuffer();
            }
          }
        } catch (e) {}

        if (!arrayBuffer) {
          const resGlb = await fetch(`./assets/glb/${baseName}.glb`);
          if (!resGlb.ok) throw new Error(`Failed to fetch ${baseName}`);
          arrayBuffer = await resGlb.arrayBuffer();
        }

        return new Promise((resolve, reject) => {
          gltfLoader.parse(arrayBuffer, './assets/glb/', (gltf) => resolve(gltf), (err) => reject(err));
        });
      }
      let loadedCount = 0;

      function bumpProgress(label) {
        loadedCount++;
        const pct = Math.min(100, Math.round((loadedCount / totalItems) * 100));
        if (loaderBar) loaderBar.style.width = `${pct}%`;
        if (loaderText) loaderText.textContent = label;
        if (loaderPct) loaderPct.textContent = `${pct}%`;
        if (loaderStepCount) {
          loaderStepCount.textContent = `${loadedCount} / ${totalItems} Relics Awakened`;
        }
        for (let i = 1; i <= loadedCount; i++) {
          const pip = document.querySelector(`.loader-node-pip[data-step="${i}"]`);
          if (pip) pip.classList.add('active');
        }
        sfxVfxManager.playLoadingStepSfx?.(loadedCount, totalItems);
      }

      // Instantiate custom GLSL shaders for the 3 sculpted brazier flame layers & charred ember logs
      const flameCoreShader = createSculptedFlameTongueShader({
        baseColor: [1.0, 0.96, 0.72],
        midColor: [1.0, 0.64, 0.12],
        tipColor: [1.0, 0.36, 0.03],
        strength: 1.85,
        opacity: 0.92,
        zMin: 0.60,
        zMax: 1.64,
        layerSeed: 0.0
      });
      const flameMidShader = createSculptedFlameTongueShader({
        baseColor: [1.0, 0.78, 0.25],
        midColor: [1.0, 0.40, 0.04],
        tipColor: [0.92, 0.16, 0.01],
        strength: 1.35,
        opacity: 0.82,
        zMin: 0.60,
        zMax: 1.52,
        layerSeed: 2.1
      });
      const flameOuterShader = createSculptedFlameTongueShader({
        baseColor: [1.0, 0.45, 0.06],
        midColor: [0.88, 0.18, 0.015],
        tipColor: [0.45, 0.03, 0.002],
        strength: 0.95,
        opacity: 0.68,
        zMin: 0.60,
        zMax: 1.36,
        layerSeed: 4.4
      });
      const charredEmberLogsShader = createCharredEmberLogsShader();

      // 1. Load Native Full-Height Cathedral Environment (shifted by z = -0.65 so the Obsidian Altar is centered at 0, 0.7215, 0)
      const maxAniso = renderer.capabilities.getMaxAnisotropy() || 8;
      await new Promise((resolve) => {
        loadGltfModel('option8_cathedral').then(
          (gltf) => {
            const cathedralRoot = gltf.scene;
            cathedralRoot.position.set(0, 0, -0.65);

            cathedralRoot.traverse((child) => {
              if (!child.isMesh) return;
              child.receiveShadow = true;
              const meshName = child.name || '';
              const mNameFirst = (Array.isArray(child.material) ? child.material[0]?.name : child.material?.name) || '';

              if (meshName.includes('Brazier_Flame_Core') || mNameFirst.includes('Flame_Core')) {
                child.material = flameCoreShader;
                child.castShadow = false;
                child.receiveShadow = false;
                child.renderOrder = 12;
                return;
              }
              if (meshName.includes('Brazier_Flame_Mid') || mNameFirst.includes('Flame_Mid')) {
                stripIcosphereSparksFromFlameGeometry(child.geometry);
                child.material = flameMidShader;
                child.castShadow = false;
                child.receiveShadow = false;
                child.renderOrder = 11;
                return;
              }
              if (meshName.includes('Brazier_Flame_Outer') || mNameFirst.includes('Flame_Outer')) {
                child.material = flameOuterShader;
                child.castShadow = false;
                child.receiveShadow = false;
                child.renderOrder = 10;
                return;
              }
              if (meshName.includes('Embers_Logs') || mNameFirst.includes('Ember')) {
                child.material = charredEmberLogsShader;
                child.castShadow = false;
                child.receiveShadow = false;
                return;
              }

              // Only the central Obsidian Altar casts real-time directional shadows;
              // cathedral columns/walls/ceiling and twin braziers use baked 3D Chiaroscuro & BVH ray-traced AO
              // so they never project clipped or directional shadows across the floor.
              const isShadowCasterProp =
                meshName.includes('Obsidian_Altar') ||
                meshName.includes('Altar_Golden_Runes');

              const mats = Array.isArray(child.material) ? child.material : [child.material];
              for (const mat of mats) {
                if (!mat) continue;
                const mName = mat.name || '';
                const isAmberGlass =
                  mName.includes('Amber') ||
                  mName.includes('Narthex_Amber') ||
                  meshName.includes('Narthex_Amber');
                const isGlass =
                  isAmberGlass ||
                  mName.includes('Glass') ||
                  mName.includes('Lancet') ||
                  mName.includes('Rose') ||
                  meshName.includes('Glass') ||
                  meshName.includes('Window');
                const isRay = mName.includes('GodRay') || meshName.includes('GodRay');

                for (const texKey of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap']) {
                  if (mat[texKey]) {
                    mat[texKey].anisotropy = maxAniso;
                    mat[texKey].needsUpdate = true;
                  }
                }

                // Preserve native 1024x1024 GLB-baked textures before any look switching
                if (!mat.userData.origCaptured) {
                  mat.userData.origCaptured = true;
                  mat.userData.origMap = mat.map || null;
                  mat.userData.origNormalMap = mat.normalMap || null;
                  mat.userData.origRoughnessMap = mat.roughnessMap || null;
                  mat.userData.origEmissiveMap = mat.emissiveMap || null;
                }

                if (mat.normalMap && mat.normalScale) {
                  const isDoorMat = mName.includes('Oak') || mName.includes('Door') || meshName.includes('Door');
                  const nScale = isDoorMat ? 1.05 : 1.15;
                  mat.normalScale.set(nScale, nScale);
                }

                if (isAmberGlass) {
                  mat.vertexColors = false;
                  mat.color = new THREE.Color(0xffe6b8);
                  mat.emissive = new THREE.Color(0xffa033);
                  mat.emissiveIntensity = 2.45;
                  mat.roughness = 0.15;
                  mat.metalness = 0.0;
                  mat.side = THREE.DoubleSide;
                  child.castShadow = false;
                } else if (isGlass) {
                  mat.vertexColors = false;
                  mat.color = new THREE.Color(0xdbeeff);
                  mat.emissive = new THREE.Color(0x68a8ff);
                  mat.emissiveIntensity = 2.65;
                  mat.roughness = 0.15;
                  mat.metalness = 0.0;
                  mat.side = THREE.DoubleSide;
                  child.castShadow = false;
                } else if (isRay) {
                  child.visible = false;
                  child.castShadow = false;
                  child.receiveShadow = false;
                } else {
                  if (mat.map) {
                    mat.vertexColors = true;
                  }
                  child.castShadow = isShadowCasterProp;

                  // Register Wall, Column/Arch/Plinth, and Floor stone materials for live 6-look switching & Realism Shader
                  if (mName.includes('Floor') || mName.includes('Flagstone') || meshName.includes('Floor')) {
                    applyCathedralStoneRealismShader(mat, true);
                    if (!cathedralFloorMats.includes(mat)) cathedralFloorMats.push(mat);
                  } else if (
                    mName.includes('Column_Stone') ||
                    mName.includes('Tracery') ||
                    meshName.includes('Plinth') ||
                    meshName.includes('Tracery')
                  ) {
                    applyCathedralStoneRealismShader(mat, false);
                    if (!cathedralColumnMats.includes(mat)) cathedralColumnMats.push(mat);
                  } else if (
                    mName.includes('Gothic_Ashlar') ||
                    mName.includes('Ashlar') ||
                    mName.includes('Vault') ||
                    meshName.includes('Cathedral_Stone')
                  ) {
                    applyCathedralStoneRealismShader(mat, false);
                    if (!cathedralWallMats.includes(mat)) cathedralWallMats.push(mat);
                  }
                }
                mat.needsUpdate = true;
              }

              const isAltarOrBrazier =
                meshName.includes('Obsidian_Altar') ||
                meshName.includes('Altar_Golden_Runes') ||
                meshName.includes('Altar') ||
                meshName.includes('Brazier') ||
                meshName.includes('Flame') ||
                meshName.includes('Ember');
              const isGodRayMesh = meshName.includes('GodRay') || mNameFirst.includes('GodRay');
              if (!isAltarOrBrazier && !isGodRayMesh) {
                cathedralShellMeshes.push(child);
                child.visible = currentWorldSceneryId === 'gothic_cathedral';
              }
            });

            // Initialize default Look 1/6 (Original Ashlar & Abbey Flagstone) on Wall/Column Stone and Floor Stone
            setWallStoneLook(0);
            setFloorStoneLook(0);
            scene.add(cathedralRoot);

            bumpProgress('Cathedral Architecture Loaded...');
            resolve();
          },
          (err) => {
            console.warn('Cathedral GLB load warning:', err);
            bumpProgress('Cathedral Loaded');
            resolve();
          }
        );
      });

      // 2. Load 6 Sculpted & Rigged Chess Piece Models in parallel
      await Promise.all(
        PIECE_TYPES.map(
          (type) =>
            new Promise((resolve) => {
              loadGltfModel(`${type}_white`).then(
                (gltf) => {
                  const toRemove = [];
                  gltf.scene.traverse((child) => {
                    const nm = child.name || '';
                    if (nm.includes('Icosphere') || nm.includes('glTF_not_exported')) {
                      child.visible = false;
                      toRemove.push(child);
                    } else if (child.isMesh && child.geometry) {
                      ensureGeometryHasUVs(child.geometry);
                    }
                  });
                  for (const rem of toRemove) {
                    if (rem.parent) rem.parent.remove(rem);
                  }

                  const tpl = {
                    scene: gltf.scene,
                    animations: gltf.animations || []
                  };
                  pieceTemplates[`${type}_w`] = tpl;
                  pieceTemplates[`${type}_b`] = tpl;
                  bumpProgress(`Summoned ${type.toUpperCase()} Statue...`);
                  resolve();
                },
                (err) => {
                  console.warn(`Piece load warning (${type}):`, err);
                  bumpProgress(`Loaded ${type}`);
                  resolve();
                }
              );
            })
        )
      );

      document.getElementById('loading-overlay')?.classList.add('hidden');
      sfxVfxManager.playLoadingCompleteSfx?.();
      sfxVfxManager.setLobbyMusicActive?.(true);
    }

    // =========================================================================
    // Chess Game State, Complete Move Rules, and AI Engine
    // =========================================================================
    let boardState = Array.from({ length: 8 }, () => Array(8).fill(null));
    let currentTurn = 'w';
    let selectedSquare = null;
    let validMoves = [];
    let isAnimatingMove = false;
    let gameOver = false;
    let capturedByWhite = 0;
    let capturedByBlack = 0;

    // Mode & Player Configuration
    let matchStarted = false; // False on boot until player selects a mode in the Game Lobby
    let gameMode = 'single'; // 'single' (vs Bot) | 'pass' (1-Phone P1 vs P2) | 'multi' (Online PvP)
    let botDifficulty = 'medium'; // 'easy' | 'medium' | 'hard'
    let passAutoFlip = true;
    let playerColor = 'w';   // 'w' | 'b' | 'spectator'
    let aiAutoPlay = true;
    let aiTimer = null;

    // Bullet, Blitz, and Rapid Time Control Presets & Dual Chess Clock State
    const TIME_CONTROL_PRESETS = {
      bullet_1: { id: 'bullet_1', category: 'bullet', categoryLabel: 'Bullet', label: 'Bullet • 1 min', shortLabel: 'Bullet 1m', minutes: 1, initialSeconds: 60 },
      bullet_2: { id: 'bullet_2', category: 'bullet', categoryLabel: 'Bullet', label: 'Bullet • 2 min', shortLabel: 'Bullet 2m', minutes: 2, initialSeconds: 120 },
      blitz_3:  { id: 'blitz_3',  category: 'blitz',  categoryLabel: 'Blitz',  label: 'Blitz • 3 min',  shortLabel: 'Blitz 3m',  minutes: 3, initialSeconds: 180 },
      blitz_5:  { id: 'blitz_5',  category: 'blitz',  categoryLabel: 'Blitz',  label: 'Blitz • 5 min',  shortLabel: 'Blitz 5m',  minutes: 5, initialSeconds: 300 },
      blitz_8:  { id: 'blitz_8',  category: 'blitz',  categoryLabel: 'Blitz',  label: 'Blitz • 8 min',  shortLabel: 'Blitz 8m',  minutes: 8, initialSeconds: 480 },
      rapid_10: { id: 'rapid_10', category: 'rapid',  categoryLabel: 'Rapid',  label: 'Rapid • 10 min', shortLabel: 'Rapid 10m', minutes: 10, initialSeconds: 600 },
      rapid_15: { id: 'rapid_15', category: 'rapid',  categoryLabel: 'Rapid',  label: 'Rapid • 15 min', shortLabel: 'Rapid 15m', minutes: 15, initialSeconds: 900 },
      rapid_30: { id: 'rapid_30', category: 'rapid',  categoryLabel: 'Rapid',  label: 'Rapid • 30 min', shortLabel: 'Rapid 30m', minutes: 30, initialSeconds: 1800 },
      rapid_60: { id: 'rapid_60', category: 'rapid',  categoryLabel: 'Rapid',  label: 'Rapid • 60 min', shortLabel: 'Rapid 60m', minutes: 60, initialSeconds: 3600 }
    };

    let timeControlCategory = 'blitz'; // 'bullet' | 'blitz' | 'rapid'
    let timeControlPresetId = 'blitz_5';
    let timeControlSeconds = 300;
    let whiteTimeRemaining = 300;
    let blackTimeRemaining = 300;
    let clockEmitAccum = 0;
    let lastLowTimeBeepSec = -1;

    function resolveTimeControlPreset(input) {
      if (!input) return TIME_CONTROL_PRESETS[timeControlPresetId] || TIME_CONTROL_PRESETS.blitz_5;
      if (typeof input === 'string') {
        if (TIME_CONTROL_PRESETS[input]) return TIME_CONTROL_PRESETS[input];
        if (input === 'bullet') return TIME_CONTROL_PRESETS.bullet_2;
        if (input === 'blitz') return TIME_CONTROL_PRESETS.blitz_5;
        if (input === 'rapid') return TIME_CONTROL_PRESETS.rapid_10;
      }
      if (typeof input === 'object') {
        if (input.presetId && TIME_CONTROL_PRESETS[input.presetId]) {
          return TIME_CONTROL_PRESETS[input.presetId];
        }
        if (input.id && TIME_CONTROL_PRESETS[input.id]) {
          return TIME_CONTROL_PRESETS[input.id];
        }
        if (input.category === 'bullet') return TIME_CONTROL_PRESETS.bullet_2;
        if (input.category === 'blitz') return TIME_CONTROL_PRESETS.blitz_5;
        if (input.category === 'rapid') return TIME_CONTROL_PRESETS.rapid_10;
      }
      return TIME_CONTROL_PRESETS.blitz_5;
    }

    function emitClockTick() {
      const preset = TIME_CONTROL_PRESETS[timeControlPresetId] || TIME_CONTROL_PRESETS.blitz_5;
      window.dispatchEvent(
        new CustomEvent('wizardchess:clocktick', {
          detail: {
            whiteTimeRemaining: Math.max(0, whiteTimeRemaining),
            blackTimeRemaining: Math.max(0, blackTimeRemaining),
            currentTurn,
            timeControlCategory,
            timeControlPresetId,
            timeControlSeconds,
            timeControlLabel: preset.label,
            timeControlShortLabel: preset.shortLabel,
            gameOver
          }
        })
      );
    }

    function setTimeControl(input, resetClocks = true) {
      const preset = resolveTimeControlPreset(input);
      timeControlCategory = preset.category;
      timeControlPresetId = preset.id;
      timeControlSeconds = preset.initialSeconds;
      if (resetClocks) {
        whiteTimeRemaining = timeControlSeconds;
        blackTimeRemaining = timeControlSeconds;
        lastLowTimeBeepSec = -1;
      }
      emitClockTick();
      updateTurnUI();
      return preset;
    }

    // Multiplayer & Online Matchmaking State
    let roomCode = null;
    let playerToken = localStorage.getItem('wizard_chess_token') || '';
    let roomEventSource = null;
    let roomPollTimer = null;
    let matchmakingPollTimer = null;
    let onlineQueueStatus = 'idle'; // 'idle' | 'searching' | 'matched'
    let activeWebSocket = null;
    let appliedMoveSeq = 0;
    let appliedResetCount = 0;

    // Camera Animation & Telemetry State
    const cameraTelemetry = {
      lastAttackSamples: [],
      attackCount: 0,
      maxStepDelta: 0,
      columnDeflections: 0,
      minColumnClearance: Infinity,
      lastColumnClearance: Infinity
    };
    window.__wizardChessTelemetry = cameraTelemetry;

    let activeCamTransition = null; // { startPos, endPos, startTarget, endTarget, elapsed, duration }

    function flushOrbitControlsDamping() {
      const wasDamping = orbitControls.enableDamping;
      orbitControls.enableDamping = false;
      orbitControls.update();
      enforceCathedralBoundsAndSolidColumns(null, camera.position, orbitControls.target);
      camera.lookAt(orbitControls.target);
      orbitControls.enableDamping = wasDamping;
    }

    function smoothCameraTo(targetPos, targetLookAt, duration = 0.75) {
      flushOrbitControlsDamping();
      const clampedPos = targetPos.clone();
      const clampedLook = targetLookAt.clone();
      enforceCathedralBoundsAndSolidColumns(clampedPos, clampedPos, clampedLook);
      activeCamTransition = {
        startPos: camera.position.clone(),
        endPos: clampedPos,
        startTarget: orbitControls.target.clone(),
        endTarget: clampedLook,
        elapsed: 0,
        duration: Math.max(0.05, duration)
      };
    }

    function setCameraForSide(color, immediate = false) {
      // White sits at +Z looking toward -Z (across the Obsidian Altar down the Cathedral Nave & Rose Window)
      // Black sits at -Z looking toward +Z (across the Obsidian Altar toward the South Narthex Royal Amber Triptych)
      const zSign = color === 'b' ? -1 : 1;
      const desiredPos = new THREE.Vector3(0, 2.22, zSign * 2.72);
      const desiredTarget = new THREE.Vector3(0, 0.85, zSign * -0.15);
      if (immediate) {
        activeCamTransition = null;
        camera.position.copy(desiredPos);
        orbitControls.target.copy(desiredTarget);
        flushOrbitControlsDamping();
      } else {
        smoothCameraTo(desiredPos, desiredTarget, 0.8);
      }
    }

    function getSideArchetype(color) {
      if (gameMode === 'multi') {
        return (color === 'w' ? whitePieceArchetype : blackPieceArchetype) || currentPieceArchetype || 'gothic_warriors';
      }
      return currentPieceArchetype || 'gothic_warriors';
    }

    function instantiatePiece(type, color, r, c) {
      const tpl = pieceTemplates[`${type}_${color}`];
      let root;
      let mixer = null;
      const actions = {};
      let proceduralAnim = null;

      const sideArchetype = getSideArchetype(color);
      const sideTrimMat = color === 'w' ? whiteTrimMat : blackTrimMat;
      const sideBladeMat = color === 'w' ? whiteBladeMat : blackBladeMat;

      if (sideArchetype !== 'gothic_warriors') {
        const built = buildProceduralPieceGroup(sideArchetype, type, color, {
          whitePieceMat,
          blackPieceMat,
          goldTrimMat: sideTrimMat,
          forgedSteelMat: sideBladeMat
        });
        root = built.root;
        proceduralAnim = {
          animRig: built.animRig,
          animParts: built.animParts,
          archetype: sideArchetype,
          pieceType: type,
          mode: 'idle',
          clipTime: 0
        };
      } else if (tpl && tpl.scene) {
        root = SkeletonUtils.clone(tpl.scene);
        const primaryMat = color === 'w' ? whitePieceMat : blackPieceMat;
        root.traverse((child) => {
          const nm = child.name || '';
          if (nm.includes('Icosphere') || nm.includes('glTF_not_exported')) {
            child.visible = false;
            return;
          }
          if (child.isMesh) {
            const mName = child.material?.name || '';
            if (mName.includes('Gold') || mName.includes('Trim') || mName.includes('Bronze') || mName.includes('Glow')) {
              child.material = sideTrimMat;
            } else if (mName.includes('Steel')) {
              child.material = sideBladeMat;
            } else {
              child.material = primaryMat;
            }
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        mixer = new THREE.AnimationMixer(root);
        for (const clip of tpl.animations) {
          actions[clip.name] = mixer.clipAction(clip);
        }
        activeMixers.push(mixer);
      } else {
        const builtFallback = buildProceduralPieceGroup('classic_staunton', type, color, {
          whitePieceMat,
          blackPieceMat,
          goldTrimMat: sideTrimMat,
          forgedSteelMat: sideBladeMat
        });
        root = builtFallback.root;
        proceduralAnim = {
          animRig: builtFallback.animRig,
          animParts: builtFallback.animParts,
          archetype: 'classic_staunton',
          pieceType: type,
          mode: 'idle',
          clipTime: 0
        };
      }

      const worldPos = boardToWorld(r, c);
      root.position.copy(worldPos);
      const scale = BOARD_SQ_SIZE;
      root.scale.set(scale, scale, scale);
      // White (at +Z, r=6,7) faces -Z (Math.PI); Black (at -Z, r=0,1) faces +Z (0)
      root.rotation.y = color === 'w' ? Math.PI : 0;
      scene.add(root);

      const pieceObj = {
        type,
        color,
        archetype: sideArchetype,
        r,
        c,
        mesh: root,
        mixer,
        actions,
        currentAction: null,
        proceduralAnim,
        hasMoved: false
      };

      root.traverse((child) => {
        child.userData.piece = pieceObj;
      });

      playPieceClip(pieceObj, 'Idle', true, 0);
      return pieceObj;
    }

    function rebuildBoardPieces(filterColor = null) {
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const existing = boardState[r][c];
          if (existing && (!filterColor || existing.color === filterColor)) {
            const savedMoved = Boolean(existing.hasMoved);
            const savedRotY = existing.mesh ? existing.mesh.rotation.y : (existing.color === 'w' ? Math.PI : 0);
            if (existing.mixer) {
              const mIdx = activeMixers.indexOf(existing.mixer);
              if (mIdx !== -1) activeMixers.splice(mIdx, 1);
            }
            if (existing.mesh) {
              scene.remove(existing.mesh);
            }
            const fresh = instantiatePiece(existing.type, existing.color, r, c);
            fresh.hasMoved = savedMoved;
            if (fresh.mesh) {
              fresh.mesh.rotation.y = savedRotY;
            }
            boardState[r][c] = fresh;
          }
        }
      }
      renderer.shadowMap.needsUpdate = true;
    }

    function applyPieceArchetype(archetypeInput) {
      const nextId = typeof archetypeInput === 'string' ? archetypeInput : archetypeInput?.id;
      if (!nextId) return;
      currentPieceArchetype = nextId;
      if (archetypeInput && typeof archetypeInput === 'object' && archetypeInput.name) {
        currentPieceArchetypeName = archetypeInput.name;
      }
      if (archetypeInput && typeof archetypeInput === 'object' && archetypeInput.flashColorHex) {
        impactFlashLight.color.set(archetypeInput.flashColorHex);
      }

      if (gameMode === 'multi') {
        const mySide = playerColor === 'b' ? 'b' : 'w';
        const prevArch = mySide === 'w' ? whitePieceArchetype : blackPieceArchetype;
        if (mySide === 'w') whitePieceArchetype = nextId;
        else blackPieceArchetype = nextId;
        if (currentPieceSkinObj) applySkinToSideMaterials(mySide, currentPieceSkinObj);
        if (prevArch !== nextId) {
          rebuildBoardPieces(mySide);
        }
        broadcastLocalLoadoutToRoom();
      } else {
        const needsRebuild = whitePieceArchetype !== nextId || blackPieceArchetype !== nextId;
        whitePieceArchetype = nextId;
        blackPieceArchetype = nextId;
        if (currentPieceSkinObj) {
          applySkinToSideMaterials('w', currentPieceSkinObj);
          applySkinToSideMaterials('b', currentPieceSkinObj);
        }
        if (needsRebuild) {
          rebuildBoardPieces(null);
        }
      }
    }

    function refreshPoliigonMaterials() {
      const fallbackSkin = currentPieceSkinObj || {
        id: 'classic_stone',
        whiteHex: '#e6dfd0',
        whiteRoughness: 0.34,
        whiteMetalness: 0.06,
        blackHex: '#222630',
        blackRoughness: 0.28,
        blackMetalness: 0.24,
        trimHex: '#d4af37',
        trimRoughness: 0.26,
        trimMetalness: 0.86,
        bladeHex: '#dce4ee',
        bladeRoughness: 0.20,
        bladeMetalness: 0.88,
        bladeEmissiveHex: '#222832',
        bladeEmissiveIntensity: 0.25
      };
      applySkinToSideMaterials('w', fallbackSkin);
      applySkinToSideMaterials('b', fallbackSkin);
      if (currentBoardSkinObj) {
        applyBoardSkin(currentBoardSkinObj);
      } else {
        applyBoardSkin({
          id: 'obsidian_sanctum',
          archType: 'gothic',
          lightSqHex: '#dcd3c2',
          lightRoughness: 0.38,
          lightMetalness: 0.06,
          darkSqHex: '#14171f',
          darkRoughness: 0.28,
          darkMetalness: 0.18,
          borderHex: '#d4af37',
          accentHex: '#ff9f1c'
        });
      }
      renderer.render(scene, camera);
    }

    // Exact per-piece Attack keyframe synchronization (24 fps Blender clips, zero overhead suspension freeze):
    // - All 6 pieces wind up smoothly through Frame 8..10 (0.29s..0.38s), launch their weapon strike at Frame 9..10 (0.35s..0.38s),
    //   make physical weapon contact at Frame 15 (0.58s..0.60s), and drive through the opponent at Frame 19.5..20 (0.76s..0.79s) before shatter burst!
    const ATTACK_SYNC_PROFILES = {
      pawn:   { timeScale: 1.15, swingStartClip: 0.36, contactClip: 0.60, blowClip: 0.78, maxLunge: 0.095 },
      king:   { timeScale: 1.10, swingStartClip: 0.34, contactClip: 0.56, blowClip: 0.75, maxLunge: 0.080 },
      queen:  { timeScale: 1.08, swingStartClip: 0.35, contactClip: 0.58, blowClip: 0.77, maxLunge: 0.065 },
      rook:   { timeScale: 1.06, swingStartClip: 0.35, contactClip: 0.58, blowClip: 0.77, maxLunge: 0.055 },
      knight: { timeScale: 1.08, swingStartClip: 0.35, contactClip: 0.58, blowClip: 0.77, maxLunge: 0.060 },
      bishop: { timeScale: 1.08, swingStartClip: 0.35, contactClip: 0.58, blowClip: 0.77, maxLunge: 0.065 }
    };

    function playPieceClip(piece, clipKeyword, loop = true, fadeSeconds = 0.18) {
      if (!piece) return;
      const lowerKw = clipKeyword.toLowerCase();
      if (piece.proceduralAnim) {
        if (lowerKw.includes('attack')) piece.proceduralAnim.mode = 'attack';
        else if (lowerKw.includes('move')) piece.proceduralAnim.mode = 'move';
        else if (lowerKw.includes('shatter')) piece.proceduralAnim.mode = 'shatter';
        else piece.proceduralAnim.mode = 'idle';
        piece.proceduralAnim.clipTime = 0;
        return;
      }
      if (!piece.actions) return;
      const key = Object.keys(piece.actions).find((k) =>
        k.toLowerCase().includes(lowerKw)
      );
      if (!key) return;
      const nextAction = piece.actions[key];
      const isIdle = lowerKw.includes('idle');
      const isAttack = lowerKw.includes('attack');
      if (piece.currentAction && piece.currentAction !== nextAction) {
        piece.currentAction.fadeOut(fadeSeconds);
      }
      nextAction.reset();
      nextAction.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
      nextAction.clampWhenFinished = !loop;
      if (isAttack) {
        const prof = ATTACK_SYNC_PROFILES[piece.type] || ATTACK_SYNC_PROFILES.queen;
        nextAction.timeScale = prof.timeScale;
      } else {
        // Deliberate, weighty stone stride and idle breathing (another 10% slower than 0.90)
        nextAction.timeScale = 0.81;
      }
      if (isIdle && (!fadeSeconds || fadeSeconds <= 0.01)) {
        // Stagger initial idle phase per board square so the 32 pieces breathe organically out of lockstep
        nextAction.time = ((piece.r * 5 + piece.c * 3) % 16) * 0.11;
      }
      nextAction.fadeIn(fadeSeconds).play();
      piece.currentAction = nextAction;
      if (piece.mixer) {
        piece.mixer.update(0.016);
      }
      renderer.shadowMap.needsUpdate = true;
    }

    function clearAllPieces() {
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          if (boardState[r][c] && boardState[r][c].mesh) {
            scene.remove(boardState[r][c].mesh);
          }
          boardState[r][c] = null;
        }
      }
      activeMixers.length = 0;
    }

    // Scripted Chess Notation & Step-Through Choreography State (Features 3a, 3b, 3c)
    let lobbyPaused = true;
    let scriptedGameActive = false;
    let scriptDeviated = false;
    let scriptMoves = [];
    let scriptCursor = 0;
    let moveHistory = [];
    let preMoveHighlightTask = null;
    let activeDuelSavedCam = null;
    const checkmateParticleSystems = [];
    const checkmateSharedChunkGeo = new THREE.DodecahedronGeometry(1, 0);
    const checkmateSharedSlabGeo = new THREE.BoxGeometry(0.92, 0.46, 1.18);
    const checkmateSharedShardGeo = new THREE.TetrahedronGeometry(1.18, 0);
    const checkmateSharedCrownGeo = new THREE.OctahedronGeometry(0.95, 0);
    let checkmateState = {
      active: false,
      bannerVisible: false,
      defeatedColor: null,
      winnerColor: null,
      isCheckWin: false,
      isTimeOutWin: false,
      kingFallAngleDeg: 0,
      kingKnockedOffBoard: false,
      triumphantPieceType: null,
      triumphantAttackTitle: null,
      debrisShardCount: 0,
      phase: 'none',
      savedPose: null
    };

    // =========================================================================
    // Gothic Sanctum Voice & Cathedral Horn/Gong Audio Announcer
    // =========================================================================
    let voiceEnabled = true;
    try {
      const savedVoice = localStorage.getItem('wizard_chess_voice_enabled');
      if (savedVoice !== null) voiceEnabled = savedVoice !== 'false';
    } catch (e) {}

    function playSanctumChordFX(kind = 'check_win') {
      if (!voiceEnabled && !sfxVfxManager.getSfxEnabled?.()) return;
      try {
        sfxVfxManager.playSanctumHornSfx?.(kind, voiceEnabled);
      } catch (e) {}
    }

    function announceSanctumEvent(eventType, _payload = {}) {
      if ((!voiceEnabled && !sfxVfxManager.getSfxEnabled?.()) || typeof window === 'undefined') return;
      if (navigator.webdriver) return;

      // Cancel any browser speech synthesis so the Checked / Victory announcement uses pure Mixkit Victory Fanfare SFX
      if ('speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel();
        } catch (e) {}
      }

      if (eventType === 'check_win') {
        playSanctumChordFX('check_win');
      } else if (eventType === 'check_alert' || eventType === 'custom') {
        playSanctumChordFX('check_alert');
      }
    }

    function setVoiceAnnouncerEnabled(enabled) {
      voiceEnabled = Boolean(enabled);
      try {
        localStorage.setItem('wizard_chess_voice_enabled', String(voiceEnabled));
      } catch (e) {}
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel();
        } catch (e) {}
      }
      if (voiceEnabled) {
        playSanctumChordFX('check_alert');
      }
      window.dispatchEvent(
        new CustomEvent('wizardchess:voicechange', { detail: { voiceEnabled } })
      );
      return voiceEnabled;
    }

    // =========================================================================
    // 3D Check Indicator Ring & Crimson Pillar Beacon
    // =========================================================================
    const checkIndicatorGroup = new THREE.Group();
    checkIndicatorGroup.visible = false;
    scene.add(checkIndicatorGroup);

    const checkOuterRingGeo = new THREE.RingGeometry(0.155, 0.205, 40);
    checkOuterRingGeo.rotateX(-Math.PI / 2);
    const checkOuterRingMat = new THREE.MeshBasicMaterial({
      color: 0xff2a3c,
      transparent: true,
      opacity: 0.92,
      side: THREE.DoubleSide
    });
    const checkOuterRingMesh = new THREE.Mesh(checkOuterRingGeo, checkOuterRingMat);
    checkIndicatorGroup.add(checkOuterRingMesh);

    const checkInnerRingGeo = new THREE.RingGeometry(0.105, 0.138, 32);
    checkInnerRingGeo.rotateX(-Math.PI / 2);
    const checkInnerRingMat = new THREE.MeshBasicMaterial({
      color: 0xf5d76e,
      transparent: true,
      opacity: 0.88,
      side: THREE.DoubleSide
    });
    const checkInnerRingMesh = new THREE.Mesh(checkInnerRingGeo, checkInnerRingMat);
    checkInnerRingMesh.position.y = 0.003;
    checkIndicatorGroup.add(checkInnerRingMesh);

    const checkBeaconGeo = new THREE.CylinderGeometry(0.14, 0.185, 0.85, 28, 1, true);
    const checkBeaconMat = new THREE.MeshBasicMaterial({
      color: 0xe63946,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const checkBeaconMesh = new THREE.Mesh(checkBeaconGeo, checkBeaconMat);
    checkBeaconMesh.position.y = 0.425;
    checkIndicatorGroup.add(checkBeaconMesh);

    function updateCheck3DIndicator(checkedColor) {
      if (!checkedColor) {
        checkIndicatorGroup.visible = false;
        return;
      }
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const p = boardState[r][c];
          if (p && p.type === 'king' && p.color === checkedColor) {
            const wPos = boardToWorld(r, c);
            checkIndicatorGroup.position.set(wPos.x, BOARD_SURFACE_Y + 0.011, wPos.z);
            checkIndicatorGroup.visible = true;
            return;
          }
        }
      }
      checkIndicatorGroup.visible = false;
    }

    function disposeCheckmateParticleSystems() {
      while (checkmateParticleSystems.length > 0) {
        const ps = checkmateParticleSystems.pop();
        if (!ps) continue;
        if (ps.points) scene.remove(ps.points);
        if (ps.geometry && typeof ps.geometry.dispose === 'function') ps.geometry.dispose();
        if (ps.material && typeof ps.material.dispose === 'function') ps.material.dispose();
      }
    }

    function restoreCheckmatePiecesPose() {
      const sp = checkmateState.savedPose;
      if (!sp) return;
      if (sp.kingPiece && sp.kingPiece.mesh && sp.kingHomePos) {
        sp.kingPiece.mesh.position.copy(sp.kingHomePos);
        sp.kingPiece.mesh.quaternion.copy(sp.kingHomeQuat);
        sp.kingPiece.mesh.scale.copy(sp.kingHomeScale);
        if (sp.kingPiece.currentAction) sp.kingPiece.currentAction.paused = false;
        if (sp.kingPiece.proceduralAnim) sp.kingPiece.proceduralAnim.paused = false;
        playPieceClip(sp.kingPiece, 'Idle', true, 0.08);
      }
      if (sp.attackerPiece && sp.attackerPiece.mesh && sp.attackerHomePos) {
        sp.attackerPiece.mesh.position.copy(sp.attackerHomePos);
        sp.attackerPiece.mesh.quaternion.copy(sp.attackerHomeQuat);
        sp.attackerPiece.mesh.scale.copy(sp.attackerHomeScale);
        playPieceClip(sp.attackerPiece, 'Idle', true, 0.08);
      }
      checkmateState.savedPose = null;
    }

    function clearCheckmateSequence() {
      restoreCheckmatePiecesPose();
      disposeCheckmateParticleSystems();
      checkmateState.active = false;
      checkmateState.bannerVisible = false;
      checkmateState.defeatedColor = null;
      checkmateState.winnerColor = null;
      checkmateState.isCheckWin = false;
      checkmateState.isTimeOutWin = false;
      checkmateState.kingFallAngleDeg = 0;
      checkmateState.kingKnockedOffBoard = false;
      checkmateState.triumphantPieceType = null;
      checkmateState.triumphantAttackTitle = null;
      checkmateState.debrisShardCount = 0;
      checkmateState.phase = 'none';
      checkIndicatorGroup.visible = false;
      const overlay = document.getElementById('checkmate-overlay');
      if (overlay) {
        overlay.classList.remove('visible', 'checkmate-impact-climax');
      }
    }

    function captureBoardSnapshot() {
      return {
        currentTurn,
        gameOver,
        capturedByWhite,
        capturedByBlack,
        whiteTimeRemaining,
        blackTimeRemaining,
        scriptCursor,
        scriptedGameActive,
        scriptDeviated,
        cells: boardState.map((row) =>
          row.map((p) => (p ? { type: p.type, color: p.color, hasMoved: Boolean(p.hasMoved) } : null))
        )
      };
    }

    function restoreBoardSnapshot(snap) {
      if (!snap) return false;
      if (aiTimer) {
        clearTimeout(aiTimer);
        aiTimer = null;
      }
      preMoveHighlightTask = null;
      activeMoveTweens.length = 0;
      clearCheckmateSequence();
      for (const d of shatterDebris) {
        if (d.mesh) scene.remove(d.mesh);
      }
      shatterDebris.length = 0;
      sfxVfxManager.clearAllVfx();
      impactFlashLight.intensity = 0;
      impactFlashLight.visible = false;
      if (activeDuelSavedCam) {
        camera.position.copy(activeDuelSavedCam.pos);
        orbitControls.target.copy(activeDuelSavedCam.target);
        activeDuelSavedCam = null;
      }
      orbitControls.enabled = true;
      orbitControls.update();

      clearAllPieces();
      clearSquareHighlights();
      selectedSquare = null;
      validMoves = [];
      isAnimatingMove = false;
      currentTurn = snap.currentTurn;
      gameOver = snap.gameOver;
      capturedByWhite = snap.capturedByWhite;
      capturedByBlack = snap.capturedByBlack;
      if (typeof snap.whiteTimeRemaining === 'number') {
        whiteTimeRemaining = snap.whiteTimeRemaining;
      }
      if (typeof snap.blackTimeRemaining === 'number') {
        blackTimeRemaining = snap.blackTimeRemaining;
      }
      if (typeof snap.scriptCursor === 'number') {
        scriptCursor = snap.scriptCursor;
      }
      if (typeof snap.scriptedGameActive === 'boolean') {
        scriptedGameActive = snap.scriptedGameActive;
      }
      if (typeof snap.scriptDeviated === 'boolean') {
        scriptDeviated = snap.scriptDeviated;
      }

      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const cell = snap.cells[r][c];
          if (cell) {
            const inst = instantiatePiece(cell.type, cell.color, r, c);
            inst.hasMoved = Boolean(cell.hasMoved);
            boardState[r][c] = inst;
          }
        }
      }

      renderer.shadowMap.needsUpdate = true;
      emitClockTick();
      updateTurnUI();
      if (typeof updateScriptBarUI === 'function') updateScriptBarUI();
      return true;
    }

    function resetChessBoard(orientCamera = true, preserveScript = false) {
      if (aiTimer) {
        clearTimeout(aiTimer);
        aiTimer = null;
      }
      preMoveHighlightTask = null;
      activeMoveTweens.length = 0;
      clearCheckmateSequence();
      sfxVfxManager.clearAllVfx();
      if (activeDuelSavedCam) {
        camera.position.copy(activeDuelSavedCam.pos);
        orbitControls.target.copy(activeDuelSavedCam.target);
        activeDuelSavedCam = null;
      }
      orbitControls.enabled = true;
      clearAllPieces();
      clearSquareHighlights();
      selectedSquare = null;
      validMoves = [];
      currentTurn = 'w';
      isAnimatingMove = false;
      gameOver = false;
      capturedByWhite = 0;
      capturedByBlack = 0;
      whiteTimeRemaining = timeControlSeconds;
      blackTimeRemaining = timeControlSeconds;
      lastLowTimeBeepSec = -1;
      moveHistory = [];
      scriptDeviated = false;
      if (!preserveScript) {
        scriptCursor = 0;
      }

      const backRow = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
      for (let c = 0; c < 8; c++) {
        boardState[7][c] = instantiatePiece(backRow[c], 'w', 7, c);
        boardState[6][c] = instantiatePiece('pawn', 'w', 6, c);
        boardState[1][c] = instantiatePiece('pawn', 'b', 1, c);
        boardState[0][c] = instantiatePiece(backRow[c], 'b', 0, c);
      }

      if (gameMode === 'pass') {
        playerColor = 'w';
      }

      if (orientCamera) {
        const viewSide = gameMode === 'pass' ? 'w' : (playerColor === 'b' ? 'b' : 'w');
        playerCamSide = viewSide;
        setActiveCamButton('btn-cam-player');
        setCameraForSide(viewSide, false);
      }

      renderer.shadowMap.needsUpdate = true;
      emitClockTick();
      updateTurnUI();
      if (typeof updateScriptBarUI === 'function') updateScriptBarUI();
      maybeScheduleAIMove();
    }

    // =========================================================================
    // Legal Chess Move Generation (Including Check Filtering)
    // =========================================================================
    function getPseudoMovesForPiece(r, c, board = boardState) {
      const piece = board[r][c];
      if (!piece) return [];
      const moves = [];
      const { type, color } = piece;
      const dir = color === 'w' ? -1 : 1;

      const inBounds = (nr, nc) => nr >= 0 && nr < 8 && nc >= 0 && nc < 8;
      const addMove = (nr, nc) => {
        if (!inBounds(nr, nc)) return false;
        const target = board[nr][nc];
        if (!target) {
          moves.push({ r: nr, c: nc, capture: false });
          return true;
        } else if (target.color !== color) {
          moves.push({ r: nr, c: nc, capture: true });
          return false;
        }
        return false;
      };

      if (type === 'pawn') {
        if (inBounds(r + dir, c) && !board[r + dir][c]) {
          moves.push({ r: r + dir, c, capture: false });
          const startRow = color === 'w' ? 6 : 1;
          if (r === startRow && !board[r + dir * 2][c]) {
            moves.push({ r: r + dir * 2, c, capture: false });
          }
        }
        for (const dc of [-1, 1]) {
          if (inBounds(r + dir, c + dc)) {
            const target = board[r + dir][c + dc];
            if (target && target.color !== color) {
              moves.push({ r: r + dir, c: c + dc, capture: true });
            }
          }
        }
      } else if (type === 'knight') {
        const jumps = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
        for (const [dr, dc] of jumps) addMove(r + dr, c + dc);
      } else if (type === 'king') {
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr !== 0 || dc !== 0) addMove(r + dr, c + dc);
          }
        }
      } else {
        const dirs = [];
        if (type === 'rook' || type === 'queen') dirs.push([-1,0],[1,0],[0,-1],[0,1]);
        if (type === 'bishop' || type === 'queen') dirs.push([-1,-1],[-1,1],[1,-1],[1,1]);
        for (const [dr, dc] of dirs) {
          for (let step = 1; step < 8; step++) {
            if (!addMove(r + dr * step, c + dc * step)) break;
          }
        }
      }
      return moves;
    }

    function isKingInCheck(color, board = boardState) {
      let kingR = -1;
      let kingC = -1;
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const p = board[r][c];
          if (p && p.color === color && p.type === 'king') {
            kingR = r;
            kingC = c;
            break;
          }
        }
      }
      if (kingR === -1) return true;
      const oppColor = color === 'w' ? 'b' : 'w';
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const p = board[r][c];
          if (p && p.color === oppColor) {
            const oppMoves = getPseudoMovesForPiece(r, c, board);
            if (oppMoves.some((m) => m.r === kingR && m.c === kingC)) {
              return true;
            }
          }
        }
      }
      return false;
    }

    function getLegalMovesForPiece(r, c) {
      const piece = boardState[r][c];
      if (!piece) return [];
      const pseudo = getPseudoMovesForPiece(r, c, boardState);
      const legal = [];
      for (const m of pseudo) {
        const savedTarget = boardState[m.r][m.c];
        boardState[m.r][m.c] = piece;
        boardState[r][c] = null;
        const inCheck = isKingInCheck(piece.color, boardState);
        boardState[r][c] = piece;
        boardState[m.r][m.c] = savedTarget;
        if (!inCheck) legal.push(m);
      }

      // Castling (Kingside O-O to c=6, Queenside O-O-O to c=2)
      const homeRow = piece.color === 'w' ? 7 : 0;
      if (
        piece.type === 'king' &&
        !piece.hasMoved &&
        r === homeRow &&
        c === 4 &&
        !isKingInCheck(piece.color, boardState)
      ) {
        // Kingside (O-O: King e->g [4->6], Rook h->f [7->5])
        const kRook = boardState[homeRow][7];
        if (
          kRook &&
          kRook.type === 'rook' &&
          kRook.color === piece.color &&
          !kRook.hasMoved &&
          !boardState[homeRow][5] &&
          !boardState[homeRow][6]
        ) {
          boardState[homeRow][5] = piece;
          boardState[homeRow][4] = null;
          const checkF = isKingInCheck(piece.color, boardState);
          boardState[homeRow][6] = piece;
          boardState[homeRow][5] = null;
          const checkG = isKingInCheck(piece.color, boardState);
          boardState[homeRow][4] = piece;
          boardState[homeRow][6] = null;
          if (!checkF && !checkG) {
            legal.push({ r: homeRow, c: 6, capture: false, castle: 'k', rookFromC: 7, rookToC: 5 });
          }
        }
        // Queenside (O-O-O: King e->c [4->2], Rook a->d [0->3])
        const qRook = boardState[homeRow][0];
        if (
          qRook &&
          qRook.type === 'rook' &&
          qRook.color === piece.color &&
          !qRook.hasMoved &&
          !boardState[homeRow][1] &&
          !boardState[homeRow][2] &&
          !boardState[homeRow][3]
        ) {
          boardState[homeRow][3] = piece;
          boardState[homeRow][4] = null;
          const checkD = isKingInCheck(piece.color, boardState);
          boardState[homeRow][2] = piece;
          boardState[homeRow][3] = null;
          const checkC = isKingInCheck(piece.color, boardState);
          boardState[homeRow][4] = piece;
          boardState[homeRow][2] = null;
          if (!checkD && !checkC) {
            legal.push({ r: homeRow, c: 2, capture: false, castle: 'q', rookFromC: 0, rookToC: 3 });
          }
        }
      }

      return legal;
    }

    function getAllLegalMoves(color) {
      const all = [];
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const p = boardState[r][c];
          if (p && p.color === color) {
            const moves = getLegalMovesForPiece(r, c);
            for (const m of moves) {
              all.push({ fromR: r, fromC: c, toR: m.r, toC: m.c, capture: m.capture });
            }
          }
        }
      }
      return all;
    }

    // =========================================================================
    // Square Highlights
    // =========================================================================
    function clearSquareHighlights() {
      while (squareHighlightsGroup.children.length > 0) {
        squareHighlightsGroup.remove(squareHighlightsGroup.children[0]);
      }
    }

    function showSquareHighlights(r, c, moves) {
      clearSquareHighlights();
      const selGeo = new THREE.RingGeometry(0.115, 0.155, 32);
      selGeo.rotateX(-Math.PI / 2);
      const selMat = new THREE.MeshBasicMaterial({ color: 0xf5d76e, side: THREE.DoubleSide });
      const selMesh = new THREE.Mesh(selGeo, selMat);
      const selPos = boardToWorld(r, c);
      selMesh.position.set(selPos.x, BOARD_SURFACE_Y + 0.01, selPos.z);
      squareHighlightsGroup.add(selMesh);

      for (const m of moves) {
        const pos = boardToWorld(m.r, m.c);
        if (m.capture) {
          const capGeo = new THREE.RingGeometry(0.12, 0.16, 32);
          capGeo.rotateX(-Math.PI / 2);
          const capMat = new THREE.MeshBasicMaterial({ color: 0xe63946, side: THREE.DoubleSide });
          const capMesh = new THREE.Mesh(capGeo, capMat);
          capMesh.position.set(pos.x, BOARD_SURFACE_Y + 0.012, pos.z);
          squareHighlightsGroup.add(capMesh);
        } else {
          const dotGeo = new THREE.CircleGeometry(0.06, 24);
          dotGeo.rotateX(-Math.PI / 2);
          const dotMat = new THREE.MeshBasicMaterial({
            color: 0x4ea8de,
            transparent: true,
            opacity: 0.85,
            side: THREE.DoubleSide
          });
          const dotMesh = new THREE.Mesh(dotGeo, dotMat);
          dotMesh.position.set(pos.x, BOARD_SURFACE_Y + 0.01, pos.z);
          squareHighlightsGroup.add(dotMesh);
        }
      }
    }

    // =========================================================================
    // Archetype-Aware Shatter Debris Physics (Stone, Wood/Brass, Cyber-Crystal, Dragonfire)
    // =========================================================================
    const sharedShardGeo = new THREE.DodecahedronGeometry(1, 0);
    const sharedSplinterGeo = new THREE.BoxGeometry(0.65, 1.85, 0.55);
    const sharedCrystalGeo = new THREE.OctahedronGeometry(1.15, 0);
    const sharedDragonGeo = new THREE.TetrahedronGeometry(1.25, 0);

    function spawnStoneShatter(worldPos, color, victimType = 'pawn', attackerType = 'queen', dirX = 0, dirZ = 1, attackerArchetype = null) {
      const primaryMat = color === 'w' ? whitePieceMat : blackPieceMat;
      const sideArchetype = getSideArchetype(color);
      const resolvedAttackerArch = attackerArchetype || getSideArchetype(color === 'w' ? 'b' : 'w');
      const sideTrimMat = color === 'w' ? whiteTrimMat : blackTrimMat;
      const sideBladeMat = color === 'w' ? whiteBladeMat : blackBladeMat;

      const vType = String(victimType || 'pawn').toLowerCase();
      const killProfile = getArchetypeKillProfile(resolvedAttackerArch, vType);

      // Trigger Chess Piece Set-specific procedural SFX and multi-stage 3D Kill VFX spectacle
      sfxVfxManager.playPieceKillSfx(vType, attackerType, resolvedAttackerArch);
      sfxVfxManager.spawnPieceKillVfx(worldPos, vType, color, attackerType, dirX, dirZ, resolvedAttackerArch);

      let mainGeo = sharedShardGeo;
      if (sideArchetype === 'classic_staunton') mainGeo = sharedSplinterGeo;
      else if (sideArchetype === 'arcane_cyber') mainGeo = sharedCrystalGeo;
      else if (sideArchetype === 'dragon_elemental') mainGeo = sharedDragonGeo;

      const glowingEmberMat = new THREE.MeshBasicMaterial({
        color: killProfile.primaryHex
      });

      const shardCount = killProfile.shardCount || 42;
      const velScale =
        vType === 'king' ? 1.48 :
        vType === 'queen' ? 1.35 :
        vType === 'rook' ? 1.25 :
        vType === 'knight' ? 1.30 :
        vType === 'bishop' ? 1.18 : 1.05;

      for (let i = 0; i < shardCount; i++) {
        const isGlowingCoreShard = i % 5 === 0;
        const isAccentShard = !isGlowingCoreShard && i % 3 === 0;
        const shardMat = isGlowingCoreShard
          ? glowingEmberMat
          : isAccentShard
            ? (sideArchetype === 'arcane_cyber' || sideArchetype === 'dragon_elemental'
                ? sideBladeMat
                : sideTrimMat)
            : primaryMat;
        const sz = (0.022 + Math.random() * 0.052) * (vType === 'rook' || vType === 'king' ? 1.18 : 1.0);
        const frag = new THREE.Mesh(mainGeo, shardMat);
        frag.scale.setScalar(sz);
        frag.position.set(
          worldPos.x + (Math.random() - 0.5) * 0.18,
          worldPos.y + 0.08 + Math.random() * 0.34,
          worldPos.z + (Math.random() - 0.5) * 0.18
        );
        frag.castShadow = true;
        scene.add(frag);
        shatterDebris.push({
          mesh: frag,
          baseScale: sz,
          vel: new THREE.Vector3(
            ((Math.random() - 0.5) * 2.5 + dirX * 0.65) * velScale,
            (1.35 + Math.random() * 2.35) * velScale,
            ((Math.random() - 0.5) * 2.5 + dirZ * 0.65) * velScale
          ),
          rotVel: new THREE.Vector3(
            (Math.random() - 0.5) * 18,
            (Math.random() - 0.5) * 18,
            (Math.random() - 0.5) * 18
          ),
          life: 2.35
        });
      }
      impactFlashLight.color.setHex(killProfile.primaryHex);
      impactFlashLight.position.set(worldPos.x, worldPos.y + 0.48, worldPos.z);
      impactFlashLight.intensity = killProfile.flashIntensity || 10.5;
    }

    // =========================================================================
    // Concrete 3D Piece Dimensions & Anti-Clipping Collision Constants
    // =========================================================================
    const PIECE_HEIGHTS = {
      pawn: 0.36,
      rook: 0.46,
      knight: 0.50,
      bishop: 0.51,
      queen: 0.55,
      king: 0.59
    };
    const MIN_PIECE_SEP = 0.318; // Stone pedestal diameter is ~0.29m; 0.318m enforces a solid concrete gap
    const MELEE_STANDOFF = 0.36; // Optimal melee standoff (1.06 squares) so sword blades visibly bridge the gap and cleave into defender before burst

    // =========================================================================
    // Smooth Attack Camera & Move Execution Choreography
    // =========================================================================
    function executeChessMove(fromR, fromC, toR, toC, options = {}) {
      const piece = boardState[fromR]?.[fromC];
      if (!piece || isAnimatingMove || gameOver) return false;
      if (piece.color !== currentTurn) return false;

      const targetOnDest = boardState[toR]?.[toC];
      // Strictly forbid friendly fire (a piece can never move onto or attack a piece of the same color)
      if (targetOnDest && targetOnDest.color === piece.color) {
        return false;
      }

      if (!options.fromRemote) {
        const legalForPiece = getLegalMovesForPiece(fromR, fromC);
        if (!legalForPiece.some((m) => m.r === toR && m.c === toC)) {
          return false;
        }
      }

      if (preMoveHighlightTask) {
        preMoveHighlightTask = null;
      }

      // Save board state snapshot (including pre-move scriptCursor & scriptDeviated) so Left Arrow / [ can step backward & re-record
      moveHistory.push({
        snapshot: captureBoardSnapshot(),
        move: {
          color: piece.color,
          pieceType: piece.type,
          fromR,
          fromC,
          toR,
          toC,
          capture: Boolean(targetOnDest),
          promotion: options.promotion || 'queen'
        }
      });

      // Advance scriptCursor if executing a scripted move or a manual move matching the script;
      // otherwise mark scriptDeviated = true and exit scriptedGameActive so the user takes over cleanly
      if (options.fromScript) {
        scriptCursor = Math.min(scriptMoves.length, scriptCursor + 1);
      } else if (!scriptDeviated && scriptCursor < scriptMoves.length) {
        const expected = scriptMoves[scriptCursor];
        if (
          expected &&
          expected.fromR === fromR &&
          expected.fromC === fromC &&
          expected.toR === toR &&
          expected.toC === toC
        ) {
          scriptCursor = Math.min(scriptMoves.length, scriptCursor + 1);
        } else {
          scriptDeviated = true;
          scriptedGameActive = false;
        }
      } else if (scriptMoves.length > 0) {
        scriptDeviated = true;
        scriptedGameActive = false;
      }
      if (typeof updateScriptBarUI === 'function') updateScriptBarUI();

      const captured = targetOnDest;
      const isCapture = Boolean(captured);
      isAnimatingMove = true;
      activeCamTransition = null;
      clearSquareHighlights();
      selectedSquare = null;
      validMoves = [];

      // Broadcast to multiplayer room (cloud API + static BroadcastChannel/localStorage fallback)
      if (gameMode === 'multi' && roomCode && !options.fromRemote) {
        sendMultiplayerMove({
          playerToken,
          color: piece.color,
          from: { r: fromR, c: fromC },
          to: { r: toR, c: toC },
          promotion: 'queen'
        });
      }

      const startPos = boardToWorld(fromR, fromC);
      const endPos = boardToWorld(toR, toC);
      const dx = endPos.x - startPos.x;
      const dz = endPos.z - startPos.z;
      const dist = Math.hypot(dx, dz) || 1;
      const dirX = dx / dist;
      const dirZ = dz / dist;
      const moveHeading = Math.atan2(dx, dz);
      piece.mesh.rotation.y = moveHeading;
      playPieceClip(piece, 'Move', true, 0.10);
      sfxVfxManager.playMoveStartSfx(piece.type, isCapture);

      // Detect Castling (King moves 2 files horizontally: e1->g1/c1 or e8->g8/c8) and animate the Rook simultaneously
      const isCastling = piece.type === 'king' && fromR === toR && Math.abs(toC - fromC) === 2;
      const castleRookFromC = isCastling ? (toC > fromC ? 7 : 0) : -1;
      const castleRookToC = isCastling ? (toC > fromC ? 5 : 3) : -1;
      const castleRook = isCastling ? boardState[fromR][castleRookFromC] : null;
      const castleRookStartPos = castleRook ? boardToWorld(fromR, castleRookFromC) : null;
      const castleRookEndPos = castleRook ? boardToWorld(fromR, castleRookToC) : null;
      if (castleRook && castleRook.mesh) {
        const rDx = castleRookEndPos.x - castleRookStartPos.x;
        const rDz = castleRookEndPos.z - castleRookStartPos.z;
        castleRook.mesh.rotation.y = Math.atan2(rDx, rDz);
        playPieceClip(castleRook, 'Move', true, 0.10);
      }

      // Defending enemy statue turns to face the incoming attacker shield-to-shield
      if (isCapture && captured && captured.mesh) {
        captured.mesh.rotation.y = Math.atan2(-dx, -dz);
      }

      // Full Concrete Standoff Distance for Melee Strike (0.36m for multi-square captures, scaled to 0.76*dist for 1-square captures so attacker always steps forward)
      const stopOffset = isCapture ? Math.min(MELEE_STANDOFF, dist * 0.76) : 0;
      const strikePos = new THREE.Vector3(
        endPos.x - dirX * stopOffset,
        BOARD_SURFACE_Y,
        endPos.z - dirZ * stopOffset
      );

      // Collect all bystander pieces (both friendly and enemy) on the board for concrete collision avoidance
      const bystanders = [];
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const other = boardState[r][c];
          if (other && other !== piece && other !== captured && other.mesh) {
            bystanders.push({
              piece: other,
              homePos: boardToWorld(r, c),
              height: PIECE_HEIGHTS[other.type] || 0.45
            });
          }
        }
      }

      // Pre-analyze Knight path vs bystanders so Knights cleanly skirt single blockers or vault high over walls
      const segDx = (isCapture ? strikePos.x : endPos.x) - startPos.x;
      const segDz = (isCapture ? strikePos.z : endPos.z) - startPos.z;
      const segLen = Math.hypot(segDx, segDz) || 0.001;
      const segUx = segDx / segLen;
      const segUz = segDz / segLen;
      const segPerpX = -segUz;
      const segPerpZ = segUx;

      let knightLateralSign = 0;
      let knightVaultPeak = 0;
      if (piece.type === 'knight') {
        let blockedPosSide = false;
        let blockedNegSide = false;
        let maxBlockerHeight = 0;
        for (const b of bystanders) {
          const relX = b.homePos.x - startPos.x;
          const relZ = b.homePos.z - startPos.z;
          const proj = relX * segUx + relZ * segUz;
          if (proj > 0.04 && proj < segLen - 0.04) {
            const signedPerp = relX * segPerpX + relZ * segPerpZ;
            if (Math.abs(signedPerp) < MIN_PIECE_SEP) {
              if (signedPerp >= 0) blockedPosSide = true;
              if (signedPerp <= 0) blockedNegSide = true;
              if (b.height > maxBlockerHeight) maxBlockerHeight = b.height;
            }
          }
        }
        if (blockedPosSide && !blockedNegSide) {
          knightLateralSign = -1; // Skirt cleanly around the open -perp channel
        } else if (blockedNegSide && !blockedPosSide) {
          knightLateralSign = 1;  // Skirt cleanly around the open +perp channel
        } else if (blockedPosSide && blockedNegSide) {
          // Solid wall of pieces across both L-channels: vault high above the tallest blocker's crown/helmet
          knightVaultPeak = maxBlockerHeight + 0.09;
        }
      }

      function resetBystandersToHome() {
        for (const b of bystanders) {
          b.piece.mesh.position.copy(b.homePos);
        }
      }

      // Concrete 3D Trajectory Solver: enforces zero mesh intersection against all friendly & enemy bystanders
      const isDiagonalSlide =
        Math.abs(toR - fromR) === Math.abs(toC - fromC) &&
        Math.abs(toR - fromR) >= 1 &&
        piece.type !== 'knight';

      function applyConcreteTrajectory(u, fromVec, toVec) {
        const ease = isCapture ? (0.28 * u + 0.72 * easeInOutCubic(u)) : easeInOutCubic(u);
        let bx = fromVec.x + (toVec.x - fromVec.x) * ease;
        let bz = fromVec.z + (toVec.z - fromVec.z) * ease;
        let by = BOARD_SURFACE_Y;

        const archSin = Math.sin(u * Math.PI);

        if (piece.type === 'knight') {
          if (knightLateralSign !== 0) {
            // Curve horizontally through the open L-corridor
            bx += segPerpX * knightLateralSign * 0.165 * archSin;
            bz += segPerpZ * knightLateralSign * 0.165 * archSin;
            by = BOARD_SURFACE_Y + archSin * 0.06;
          } else if (knightVaultPeak > 0) {
            // Broad, high stone-steed vault that clears the full height of blocking pieces
            by = BOARD_SURFACE_Y + Math.pow(archSin, 0.65) * knightVaultPeak;
          } else {
            by = BOARD_SURFACE_Y + archSin * 0.06;
          }
        }

        // Check every bystander (friendly or enemy) for concrete 3D non-penetration
        const effectiveMinSep = isDiagonalSlide ? 0.262 : MIN_PIECE_SEP;
        for (const b of bystanders) {
          const hx = b.homePos.x;
          const hz = b.homePos.z;
          const dHomeX = bx - hx;
          const dHomeZ = bz - hz;
          const dHome = Math.hypot(dHomeX, dHomeZ);

          // If the moving piece is already vertically above this bystander's top + 2.5cm margin, no horizontal push needed
          if (by >= BOARD_SURFACE_Y + b.height + 0.025) {
            b.piece.mesh.position.copy(b.homePos);
            continue;
          }

          // When squeezing diagonally between adjacent pieces, bystanders subtly yield outward within their square
          if (dHome < 0.36 && dHome > 0.001 && knightVaultPeak === 0) {
            const yieldProx = Math.max(0, (0.36 - dHome) / 0.36) * archSin;
            const yieldDist = Math.min(0.068, yieldProx * 0.082);
            b.piece.mesh.position.set(
              hx - (dHomeX / dHome) * yieldDist,
              BOARD_SURFACE_Y,
              hz - (dHomeZ / dHome) * yieldDist
            );
          } else {
            b.piece.mesh.position.copy(b.homePos);
          }

          // Hard concrete cylinder separation against bystander's instantaneous position
          const curBx = b.piece.mesh.position.x;
          const curBz = b.piece.mesh.position.z;
          const sepX = bx - curBx;
          const sepZ = bz - curBz;
          const sepDist = Math.hypot(sepX, sepZ);

          if (sepDist < effectiveMinSep) {
            if (piece.type === 'knight' && knightVaultPeak > 0) {
              // Ensure Knight pedestal bottom clears the blocker's crown/helmet
              by = Math.max(by, BOARD_SURFACE_Y + b.height + 0.03);
            } else if (sepDist > 0.0001) {
              const push = effectiveMinSep - sepDist;
              bx += (sepX / sepDist) * push;
              bz += (sepZ / sepDist) * push;
            } else {
              bx += segPerpX * effectiveMinSep;
              bz += segPerpZ * effectiveMinSep;
            }
          }
        }

        piece.mesh.position.set(bx, by, bz);
      }

      // Save Player Camera State for Smooth Eased Entry & Return
      const savedCamPos = camera.position.clone();
      const savedTarget = orbitControls.target.clone();

      // Calculate Optimal Unobstructed 3/4 Duel Camera Angle
      const midPoint = new THREE.Vector3(
        (strikePos.x + endPos.x) * 0.5,
        BOARD_SURFACE_Y + 0.32,
        (strikePos.z + endPos.z) * 0.5
      );

      // Score both perpendicular sides for foreground bystander occlusion across both mid and close camera poses
      const perpA = new THREE.Vector3(-dirZ, 0, dirX);
      const perpB = new THREE.Vector3(dirZ, 0, -dirX);
      const camFromMid = new THREE.Vector3().subVectors(savedCamPos, midPoint);
      const prefPerp = camFromMid.dot(perpA) >= 0 ? perpA : perpB;
      const altPerp = prefPerp === perpA ? perpB : perpA;

      function scoreDuelPerpOcclusion(perpVec) {
        let penalty = 0;
        const probes = [
          { perpMul: 1.24, dirMul: -0.34 },
          { perpMul: 0.92, dirMul: 0.14 }
        ];
        for (const pr of probes) {
          const camX = midPoint.x + perpVec.x * pr.perpMul + dirX * pr.dirMul;
          const camZ = midPoint.z + perpVec.z * pr.perpMul + dirZ * pr.dirMul;
          const rayX = midPoint.x - camX;
          const rayZ = midPoint.z - camZ;
          const rayLenSq = Math.max(0.0001, rayX * rayX + rayZ * rayZ);
          for (const b of bystanders) {
            const bPos = b.piece && b.piece.mesh ? b.piece.mesh.position : b.homePos;
            if (!bPos) continue;
            const px = bPos.x - camX;
            const pz = bPos.z - camZ;
            const t = (px * rayX + pz * rayZ) / rayLenSq;
            if (t > 0.10 && t < 0.98) {
              const cx = camX + rayX * t;
              const cz = camZ + rayZ * t;
              const distB = Math.hypot(bPos.x - cx, bPos.z - cz);
              if (distB < 0.44) {
                penalty += (0.44 - distB) * 12.0;
              }
            }
          }
        }
        return penalty;
      }

      const chosenPerp =
        scoreDuelPerpOcclusion(prefPerp) > scoreDuelPerpOcclusion(altPerp) + 0.25 ? altPerp : prefPerp;

      // Continuous Quadratic Bezier 3/4 orbit-and-dolly arc (savedCamPos -> duelCamMid -> duelCamClose)
      // so the attack camera glides in a single unbroken C-infinity sweep across approach + strike without ever stalling at tApproach
      const duelCamMid = new THREE.Vector3(
        midPoint.x + chosenPerp.x * 1.34 - dirX * 0.44,
        BOARD_SURFACE_Y + 0.96,
        midPoint.z + chosenPerp.z * 1.34 - dirZ * 0.44
      );
      const duelCamClose = new THREE.Vector3(
        midPoint.x + chosenPerp.x * 0.92 + dirX * 0.18,
        BOARD_SURFACE_Y + 0.74,
        midPoint.z + chosenPerp.z * 0.92 + dirZ * 0.18
      );
      const duelTargetStart = new THREE.Vector3(
        strikePos.x + dirX * 0.10,
        BOARD_SURFACE_Y + 0.34,
        strikePos.z + dirZ * 0.10
      );
      const duelTargetEnd = new THREE.Vector3(
        endPos.x - dirX * 0.05,
        BOARD_SURFACE_Y + 0.30,
        endPos.z - dirZ * 0.05
      );

      function evalQuadraticBezier(outVec, p0, p1, p2, t) {
        const inv = 1 - t;
        const c0 = inv * inv;
        const c1 = 2 * inv * t;
        const c2 = t * t;
        outVec.set(
          c0 * p0.x + c1 * p1.x + c2 * p2.x,
          c0 * p0.y + c1 * p1.y + c2 * p2.y,
          c0 * p0.z + c1 * p1.z + c2 * p2.z
        );
      }

      if (isCapture) {
        activeDuelSavedCam = {
          pos: savedCamPos.clone(),
          target: savedTarget.clone()
        };
        orbitControls.enabled = false;
        cameraTelemetry.lastAttackSamples = [];
        cameraTelemetry.attackCount += 1;
        cameraTelemetry.maxStepDelta = 0;
        cameraTelemetry.minCombatSeparation = Infinity;
      } else {
        cameraTelemetry.lastSpaceMoveSamples = [];
      }

      // Distance-scaled piece movement duration (slowed by ~12-18% + scaled per square so 4-5 space Bishop/Rook/Queen glides feel weighty and unhurried):
      // - 1 square move: 0.64s
      // - 4-5 square move: 1.10s - 1.29s
      const squaresMoved = Math.max(1, Math.hypot(toR - fromR, toC - fromC));
      const stdMoveDuration = Number((0.64 + Math.max(0, squaresMoved - 1) * 0.14).toFixed(3));
      const atkProfile = ATTACK_SYNC_PROFILES[piece.type] || ATTACK_SYNC_PROFILES.queen;
      const SWING_START_CLIP_TIME = atkProfile.swingStartClip;
      const CONTACT_CLIP_TIME = atkProfile.contactClip; // Weapon physically strikes defender, triggering flash & flinch
      const BLOW_CLIP_TIME = atkProfile.blowClip;       // After visible weapon impact, defender explodes into stone shards
      const tApproach = isCapture
        ? Number((0.66 + Math.max(0, squaresMoved - 1) * 0.125).toFixed(3))
        : stdMoveDuration;
      const tContact = isCapture ? (tApproach + CONTACT_CLIP_TIME / atkProfile.timeScale) : stdMoveDuration;
      const tImpact = isCapture ? (tApproach + BLOW_CLIP_TIME / atkProfile.timeScale) : stdMoveDuration;
      const tStrikeDone = isCapture ? (tImpact + 0.48) : stdMoveDuration;
      // Slower, distance-aware post-attack camera return (~1.30s - 1.60s instead of 0.64s)
      const camReturnDist = savedCamPos.distanceTo(duelCamClose);
      const returnDuration = isCapture ? Number((1.18 + Math.min(0.42, camReturnDist * 0.10)).toFixed(3)) : 0;
      const totalDuration = isCapture ? (tStrikeDone + returnDuration) : stdMoveDuration;

      if (!isCapture) {
        cameraTelemetry.lastSpaceMoveDuration = stdMoveDuration;
        cameraTelemetry.lastSquaresMoved = Number(squaresMoved.toFixed(3));
      } else {
        cameraTelemetry.lastCaptureTiming = {
          pieceType: piece.type,
          squaresMoved: Number(squaresMoved.toFixed(3)),
          tApproach: Number(tApproach.toFixed(3)),
          tContact: Number(tContact.toFixed(3)),
          tImpact: Number(tImpact.toFixed(3)),
          tStrikeDone: Number(tStrikeDone.toFixed(3)),
          returnDuration: Number(returnDuration.toFixed(3)),
          totalDuration: Number(totalDuration.toFixed(3))
        };
      }

      let elapsed = 0;
      let attackAnimStarted = false;
      let defenderFlinchTriggered = false;
      let shatterTriggered = false;
      let impactActualTime = tImpact;
      const postShatterPiecePos = strikePos.clone();
      const postStrikePiecePos = strikePos.clone();
      let prevCamPos = camera.position.clone();
      let prevPiecePos = piece.mesh.position.clone();

      function finishMove() {
        resetBystandersToHome();
        boardState[fromR][fromC] = null;
        boardState[toR][toC] = piece;
        piece.r = toR;
        piece.c = toC;
        piece.hasMoved = true;

        if (isCastling && castleRook) {
          boardState[fromR][castleRookFromC] = null;
          boardState[fromR][castleRookToC] = castleRook;
          castleRook.r = fromR;
          castleRook.c = castleRookToC;
          castleRook.hasMoved = true;
          if (castleRook.mesh) {
            castleRook.mesh.position.copy(castleRookEndPos);
            castleRook.mesh.rotation.y = castleRook.color === 'w' ? Math.PI : 0;
          }
          playPieceClip(castleRook, 'Idle', true, 0.18);
        }

        // Pawn Promotion to Queen
        if (piece.type === 'pawn' && (toR === 0 || toR === 7)) {
          scene.remove(piece.mesh);
          const promoted = instantiatePiece('queen', piece.color, toR, toC);
          promoted.hasMoved = true;
          boardState[toR][toC] = promoted;
          sfxVfxManager.playPromotionSfx();
          sfxVfxManager.spawnSquarePulseVfx(endPos, 0xe040fb, 0.38, 0.68);
        } else {
          piece.mesh.position.copy(endPos);
          piece.mesh.rotation.y = piece.color === 'w' ? Math.PI : 0;
          playPieceClip(piece, 'Idle', true, 0.18);
          if (!isCapture) {
            sfxVfxManager.playMoveLandSfx(piece.type, isCastling);
            sfxVfxManager.spawnSquarePulseVfx(endPos, isCastling ? 0xf5d76e : 0x4ea8de, isCastling ? 0.30 : 0.21, 0.38);
            if (isCastling && castleRookEndPos) {
              sfxVfxManager.spawnSquarePulseVfx(castleRookEndPos, 0xf5d76e, 0.28, 0.38);
            }
          }
        }

        if (isCapture) {
          if (piece.color === 'w') capturedByWhite += 1;
          else capturedByBlack += 1;
          activeDuelSavedCam = null;
          camera.position.copy(savedCamPos);
          orbitControls.target.copy(savedTarget);
          orbitControls.enabled = true;
          orbitControls.update();
        }

        currentTurn = currentTurn === 'w' ? 'b' : 'w';
        isAnimatingMove = false;

        const nextInCheck = isKingInCheck(currentTurn, boardState);
        const nextMoves = getAllLegalMoves(currentTurn);
        const moveEndsMatch = (!scriptedGameActive && nextInCheck) || nextMoves.length === 0;

        // 1-Phone P1 vs P2 (pass-and-play) automatic turn & camera handoff (skip if Check/Checkmate just ended the match!)
        if (gameMode === 'pass' && !moveEndsMatch) {
          playerColor = currentTurn;
          playerCamSide = currentTurn;
          if (nextMoves.length > 0 && passAutoFlip) {
            setActiveCamButton('btn-cam-player');
            setCameraForSide(currentTurn, false);
          }
          window.dispatchEvent(
            new CustomEvent('wizardchess:turnswitch', {
              detail: {
                turn: currentTurn,
                playerLabel: currentTurn === 'w' ? 'Player 1 (White)' : 'Player 2 (Black)'
              }
            })
          );
        }

        updateTurnUI();
        if (!gameOver) {
          maybeScheduleAIMove();
        }
      }

      function stepMove(dt) {
        elapsed += dt;

        if (!isCapture) {
          const u = Math.min(1, elapsed / totalDuration);
          applyConcreteTrajectory(u, startPos, endPos);
          if (isCastling && castleRook && castleRook.mesh) {
            const rEase = easeInOutCubic(u);
            castleRook.mesh.position.set(
              castleRookStartPos.x + (castleRookEndPos.x - castleRookStartPos.x) * rEase,
              BOARD_SURFACE_Y + Math.sin(u * Math.PI) * 0.05,
              castleRookStartPos.z + (castleRookEndPos.z - castleRookStartPos.z) * rEase
            );
          }
          const pDelta = piece.mesh.position.distanceTo(prevPiecePos);
          prevPiecePos.copy(piece.mesh.position);
          cameraTelemetry.lastSpaceMoveSamples.push({
            t: Number(elapsed.toFixed(3)),
            u: Number(u.toFixed(3)),
            piecePos: [
              Number(piece.mesh.position.x.toFixed(3)),
              Number(piece.mesh.position.y.toFixed(3)),
              Number(piece.mesh.position.z.toFixed(3))
            ],
            pieceStep: Number(pDelta.toFixed(4))
          });
          if (u >= 1) {
            finishMove();
            return true;
          }
          return false;
        }

        // Capture Sequence with Continuous C-infinity Quadratic Bezier Camera & Zero-Freeze Piece Choreography
        let phaseName = 'approach';
        if (elapsed <= tStrikeDone) {
          // Single unbroken C-infinity camera arc across both approach and strike (never stops at tApproach!)
          const uActive = Math.min(1, elapsed / tStrikeDone);
          const sActive = 0.38 * uActive + 0.62 * easeInOutCubic(uActive);
          evalQuadraticBezier(camera.position, savedCamPos, duelCamMid, duelCamClose, sActive);
          evalQuadraticBezier(orbitControls.target, savedTarget, duelTargetStart, duelTargetEnd, sActive);

          if (elapsed <= tApproach) {
            // Phase 1: Smooth Glide-In to Concrete Standoff Position
            phaseName = 'approach';
            const u = Math.min(1, elapsed / tApproach);
            applyConcreteTrajectory(u, startPos, strikePos);
          } else {
            // Phase 2: Rigged Attack (Continuous Stalk -> Physical Weapon Impact -> Shatter Burst -> Follow-Through Advance)
            phaseName = 'strike';
            const attackerArchetype = piece.archetype || getSideArchetype(piece.color);
            if (!attackAnimStarted) {
              attackAnimStarted = true;
              playPieceClip(piece, 'Attack', false, 0.08);
              sfxVfxManager.playAttackChargeAndSwingSfx(piece.type, captured?.type || 'pawn', attackerArchetype);
            }

            // Keep any bystanders immediately adjacent to strikePos yielded slightly outward during the weapon swing
            for (const b of bystanders) {
              const dxB = strikePos.x - b.homePos.x;
              const dzB = strikePos.z - b.homePos.z;
              const dB = Math.hypot(dxB, dzB);
              if (dB < 0.42 && dB > 0.001) {
                const yieldDist = ((0.42 - dB) / 0.42) * 0.068;
                b.piece.mesh.position.set(
                  b.homePos.x - (dxB / dB) * yieldDist,
                  BOARD_SURFACE_Y,
                  b.homePos.z - (dzB / dB) * yieldDist
                );
              } else {
                b.piece.mesh.position.copy(b.homePos);
              }
            }

            const atkClipTime = (elapsed - tApproach) * atkProfile.timeScale;

            // Archetype-specific root choreography during the strike phase:
            // - gothic_warriors (default): melee stalk & forward weapon lunge
            // - classic_staunton: telekinetic glide toward target while ascending vertically for straight-down anvil drop
            // - arcane_cyber: stabilized ranged laser-cannon lock-on stance with hydraulic recoil kickback (zero melee ram)
            // - dragon_elemental: holds aerial standoff hover (slight backward breath-pressure recoil, zero forward headbutt/ram)
            if (!shatterTriggered && captured && captured.mesh) {
              const stalkLead = 0.028;
              let lungeOffset = 0;
              if (attackerArchetype === 'dragon_elemental') {
                // Dragon hovers at standoff distance and recoils slightly from its sustained flamethrower breath stream
                const breathPhase = Math.min(1, atkClipTime / Math.max(0.1, BLOW_CLIP_TIME));
                lungeOffset = -Math.sin(breathPhase * Math.PI) * 0.024;
              } else if (attackerArchetype === 'classic_staunton') {
                // Staunton piece glides smoothly toward the target while ascending high into the air for its vertical anvil drop
                const glidePhase = Math.min(1, atkClipTime / Math.max(0.1, CONTACT_CLIP_TIME));
                const smoothGlide = glidePhase * glidePhase * (3 - 2 * glidePhase);
                lungeOffset = smoothGlide * Math.max(0.032, atkProfile.maxLunge * 0.85);
              } else if (attackerArchetype === 'arcane_cyber') {
                // Cyber-Mech holds stabilized ranged firing stance and recoils backward as dual railguns & chest laser discharge
                if (atkClipTime < 0.25) {
                  const lockPhase = Math.min(1, atkClipTime / 0.25);
                  lungeOffset = lockPhase * 0.012;
                } else {
                  const firePhase = Math.min(1, (atkClipTime - 0.25) / Math.max(0.05, BLOW_CLIP_TIME - 0.25));
                  lungeOffset = 0.012 - Math.sin(firePhase * Math.PI) * 0.034;
                }
              } else {
                // Default gothic_warriors melee stalk & lunge
                if (atkClipTime < SWING_START_CLIP_TIME) {
                  const windupProgress = Math.min(1, atkClipTime / Math.max(0.05, SWING_START_CLIP_TIME));
                  lungeOffset = windupProgress * stalkLead;
                } else {
                  const slashPhase = Math.min(
                    1,
                    (atkClipTime - SWING_START_CLIP_TIME) / Math.max(0.05, BLOW_CLIP_TIME - SWING_START_CLIP_TIME)
                  );
                  lungeOffset =
                    stalkLead + Math.sin(slashPhase * Math.PI * 0.85) * Math.max(0.018, atkProfile.maxLunge - stalkLead);
                }
              }
              piece.mesh.position.set(
                strikePos.x + dirX * lungeOffset,
                BOARD_SURFACE_Y,
                strikePos.z + dirZ * lungeOffset
              );
              const effectiveContactTime =
                attackerArchetype === 'dragon_elemental' || attackerArchetype === 'arcane_cyber'
                  ? Math.min(CONTACT_CLIP_TIME, 0.28)
                  : CONTACT_CLIP_TIME;
              if (atkClipTime < effectiveContactTime) {
                captured.mesh.position.copy(endPos);
              } else {
                // Weapon / laser beam / dragonfire makes impact on defender before defender bursts
                const shoveProgress = Math.min(
                  1,
                  (atkClipTime - effectiveContactTime) / Math.max(0.04, BLOW_CLIP_TIME - effectiveContactTime)
                );
                const shoveDist = shoveProgress * 0.045;
                captured.mesh.position.set(
                  endPos.x + dirX * shoveDist,
                  BOARD_SURFACE_Y,
                  endPos.z + dirZ * shoveDist
                );
              }

              const curSep = piece.mesh.position.distanceTo(captured.mesh.position);
              if (curSep < (cameraTelemetry.minCombatSeparation ?? Infinity)) {
                cameraTelemetry.minCombatSeparation = Number(curSep.toFixed(3));
              }
            }

            // Contact: weapon / laser / dragonfire strikes defender with set-specific 3D contact effect
            const contactThreshold =
              attackerArchetype === 'dragon_elemental' || attackerArchetype === 'arcane_cyber'
                ? Math.min(CONTACT_CLIP_TIME, 0.28)
                : CONTACT_CLIP_TIME;
            if (
              !defenderFlinchTriggered &&
              (atkClipTime >= contactThreshold || elapsed >= tContact + 0.06)
            ) {
              defenderFlinchTriggered = true;
              if (captured) {
                playPieceClip(captured, 'Shatter', false, 0.04);
                sfxVfxManager.playWeaponContactClashSfx(piece.type, captured.type, attackerArchetype);
                sfxVfxManager.spawnWeaponContactVfx(endPos, dirX, dirZ, captured.type, attackerArchetype);
                const contactProf = getArchetypeKillProfile(attackerArchetype, captured.type);
                impactFlashLight.color.setHex(contactProf.primaryHex || 0xffe0a3);
                impactFlashLight.position.set(
                  endPos.x - dirX * 0.08,
                  BOARD_SURFACE_Y + 0.28,
                  endPos.z - dirZ * 0.08
                );
                impactFlashLight.intensity = 6.2;
              }
            }

            // Blow Burst: after visible weapon impact & follow-through, defender explodes with piece-set-specific Kill VFX & SFX!
            if (!shatterTriggered && (atkClipTime >= BLOW_CLIP_TIME || elapsed >= tImpact + 0.06)) {
              shatterTriggered = true;
              impactActualTime = elapsed;
              postShatterPiecePos.copy(piece.mesh.position);
              if (captured && captured.mesh) {
                const shatterOrigin = captured.mesh.position.clone();
                scene.remove(captured.mesh);
                spawnStoneShatter(shatterOrigin, captured.color, captured.type, piece.type, dirX, dirZ, attackerArchetype);
                const killProf = getArchetypeKillProfile(attackerArchetype, captured.type);
                const isHumanCapture =
                  gameMode === 'pass' ||
                  (gameMode === 'single' && piece.color === playerColor) ||
                  (gameMode === 'multi' && piece.color === playerColor);
                window.dispatchEvent(
                  new CustomEvent('wizardchess:piececaptured', {
                    detail: {
                      attackerColor: piece.color,
                      attackerType: piece.type,
                      attackerArchetype,
                      capturedType: captured.type,
                      capturedColor: captured.color,
                      killTitle: killProf.title,
                      killSubtitle: killProf.subtitle,
                      isHumanCapture,
                      gameMode,
                      botDifficulty
                    }
                  })
                );
              }
            }

            // Immediately after shattering defender, attacker smoothly begins advancing toward endPos (no post-impact freeze!)
            if (shatterTriggered) {
              const postStrikeSpan = Math.max(0.08, tStrikeDone - impactActualTime);
              const uFollow = Math.min(1, Math.max(0, (elapsed - impactActualTime) / postStrikeSpan));
              piece.mesh.position.lerpVectors(postShatterPiecePos, endPos, uFollow * 0.38);
              postStrikePiecePos.copy(piece.mesh.position);
            }

            // Subtle damped perpendicular impact vibration right when the blow shatters the defender
            if (shatterTriggered && elapsed >= impactActualTime && elapsed <= impactActualTime + 0.26) {
              const shakeProgress = (elapsed - impactActualTime) / 0.26;
              const decay = (1 - shakeProgress) * (1 - shakeProgress);
              const amp = 0.024 * decay;
              camera.position.y += Math.sin(shakeProgress * Math.PI * 8) * amp;
            }
          }
        } else {
          // Phase 3: Complete Advance onto Captured Square & Smooth Unhurried Camera Ease-Back
          phaseName = 'return';
          const uReturn = Math.min(1, (elapsed - tStrikeDone) / Math.max(0.1, totalDuration - tStrikeDone));
          const easeRet = easeInOutCubic(uReturn);
          const pieceAdvanceBlend = 0.35 * uReturn + 0.65 * easeRet;

          piece.mesh.position.lerpVectors(postStrikePiecePos, endPos, pieceAdvanceBlend);
          camera.position.lerpVectors(duelCamClose, savedCamPos, easeRet);
          orbitControls.target.lerpVectors(duelTargetEnd, savedTarget, easeRet);
        }

        camera.lookAt(orbitControls.target);

        const stepDelta = camera.position.distanceTo(prevCamPos);
        const pieceStepDelta = piece.mesh.position.distanceTo(prevPiecePos);
        if (stepDelta > cameraTelemetry.maxStepDelta) {
          cameraTelemetry.maxStepDelta = stepDelta;
        }
        prevCamPos.copy(camera.position);
        prevPiecePos.copy(piece.mesh.position);

        cameraTelemetry.lastAttackSamples.push({
          t: Number(elapsed.toFixed(3)),
          phase: phaseName,
          camStep: Number(stepDelta.toFixed(4)),
          pieceStep: Number(pieceStepDelta.toFixed(4)),
          pos: [
            Number(camera.position.x.toFixed(3)),
            Number(camera.position.y.toFixed(3)),
            Number(camera.position.z.toFixed(3))
          ],
          target: [
            Number(orbitControls.target.x.toFixed(3)),
            Number(orbitControls.target.y.toFixed(3)),
            Number(orbitControls.target.z.toFixed(3))
          ],
          piecePos: [
            Number(piece.mesh.position.x.toFixed(3)),
            Number(piece.mesh.position.y.toFixed(3)),
            Number(piece.mesh.position.z.toFixed(3))
          ]
        });

        if (elapsed >= totalDuration) {
          finishMove();
          return true;
        }
        return false;
      }

      activeMoveTweens.push(stepMove);
      return true;
    }

    const activeMoveTweens = [];

    // =========================================================================
    // Single-Player Tactical AI (Auto-Plays Opponent Turn + Manual AI Button)
    // =========================================================================
    function evaluateBoardForColor(aiColor) {
      const oppColor = aiColor === 'w' ? 'b' : 'w';
      let total = 0;
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const p = boardState[r][c];
          if (!p) continue;
          const sign = p.color === aiColor ? 1 : -1;
          let val = PIECE_VALUES[p.type] || 100;
          const centerBonus = (3.5 - Math.abs(3.5 - r)) * 8 + (3.5 - Math.abs(3.5 - c)) * 8;
          if (p.type === 'knight' || p.type === 'bishop') {
            val += centerBonus * 1.4;
          } else if (p.type === 'pawn') {
            const adv = p.color === 'w' ? (6 - r) : (r - 1);
            val += adv * 14 + (3.5 - Math.abs(3.5 - c)) * 5;
          } else if (p.type === 'queen') {
            val += centerBonus * 0.6;
          }
          total += sign * val;
        }
      }
      if (isKingInCheck(oppColor, boardState)) total += 55;
      if (isKingInCheck(aiColor, boardState)) total -= 55;
      return total;
    }

    function chooseSmartAIMove(color) {
      const legalMoves = getAllLegalMoves(color);
      if (legalMoves.length === 0) return null;

      // Easy Bot: Forgiving 1-ply with high randomness so beginners can set up attacks
      if (botDifficulty === 'easy') {
        if (Math.random() < 0.38) {
          return legalMoves[Math.floor(Math.random() * legalMoves.length)];
        }
        let bestEasy = -Infinity;
        let easyCandidates = [];
        for (const m of legalMoves) {
          const target = boardState[m.toR][m.toC];
          let score = target ? PIECE_VALUES[target.type] * 0.65 : 0;
          score += (Math.random() - 0.5) * 220;
          if (score > bestEasy) {
            bestEasy = score;
            easyCandidates = [m];
          }
        }
        return easyCandidates[0] || legalMoves[0];
      }

      // Hard Bot: 2-ply tactical minimax with alpha-beta pruning & positional evaluation
      if (botDifficulty === 'hard') {
        const oppColor = color === 'w' ? 'b' : 'w';
        let bestHardScore = -Infinity;
        let hardCandidates = [];

        // Order captures and central moves first for better alpha-beta cutoffs
        const orderedMoves = [...legalMoves].sort((a, b) => {
          const capA = boardState[a.toR][a.toC] ? PIECE_VALUES[boardState[a.toR][a.toC].type] : 0;
          const capB = boardState[b.toR][b.toC] ? PIECE_VALUES[boardState[b.toR][b.toC].type] : 0;
          return capB - capA;
        });

        for (const m of orderedMoves) {
          const piece = boardState[m.fromR][m.fromC];
          const savedTarget = boardState[m.toR][m.toC];
          boardState[m.toR][m.toC] = piece;
          boardState[m.fromR][m.fromC] = null;

          // Evaluate opponent's strongest reply (2nd ply)
          let worstReplyScore = Infinity;
          const oppPseudoMoves = [];
          for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
              const op = boardState[r][c];
              if (op && op.color === oppColor) {
                const pm = getPseudoMovesForPiece(r, c, boardState);
                for (const om of pm) {
                  oppPseudoMoves.push({ fromR: r, fromC: c, toR: om.r, toC: om.c });
                }
              }
            }
          }

          if (oppPseudoMoves.length === 0) {
            worstReplyScore = isKingInCheck(oppColor, boardState) ? 50000 : 0;
          } else {
            for (const om of oppPseudoMoves) {
              const opPiece = boardState[om.fromR][om.fromC];
              const opTarget = boardState[om.toR][om.toC];
              boardState[om.toR][om.toC] = opPiece;
              boardState[om.fromR][om.fromC] = null;
              if (!isKingInCheck(oppColor, boardState)) {
                const evalScore = evaluateBoardForColor(color);
                if (evalScore < worstReplyScore) {
                  worstReplyScore = evalScore;
                }
              }
              boardState[om.fromR][om.fromC] = opPiece;
              boardState[om.toR][om.toC] = opTarget;
              if (worstReplyScore < bestHardScore - 20) break; // Alpha-beta cutoff
            }
          }

          boardState[m.fromR][m.fromC] = piece;
          boardState[m.toR][m.toC] = savedTarget;

          if (worstReplyScore === Infinity) {
            // Opponent had no legal moves (checkmate or stalemate!)
            worstReplyScore = isKingInCheck(oppColor, boardState) ? 50000 : 0;
          }

          const jitter = (Math.random() - 0.5) * 6;
          const finalScore = worstReplyScore + jitter;
          if (finalScore > bestHardScore + 1) {
            bestHardScore = finalScore;
            hardCandidates = [m];
          } else if (Math.abs(finalScore - bestHardScore) <= 1) {
            hardCandidates.push(m);
          }
        }

        return hardCandidates[Math.floor(Math.random() * hardCandidates.length)] || legalMoves[0];
      }

      // Medium Bot: Balanced tactical evaluation
      let bestScore = -Infinity;
      let bestCandidates = [];

      for (const m of legalMoves) {
        const piece = boardState[m.fromR][m.fromC];
        const target = boardState[m.toR][m.toC];
        let score = 0;

        // Material gain on capture
        if (target) {
          score += PIECE_VALUES[target.type] * 1.15 - PIECE_VALUES[piece.type] * 0.08;
        }

        // Center control bonus
        const centerDist = Math.abs(3.5 - m.toR) + Math.abs(3.5 - m.toC);
        score += (7 - centerDist) * 8;

        // Pawn advancement bonus
        if (piece.type === 'pawn') {
          const advance = color === 'w' ? (6 - m.toR) : (m.toR - 1);
          score += advance * 12;
        }

        // Simulate move to check if destination is hanging or gives check
        boardState[m.toR][m.toC] = piece;
        boardState[m.fromR][m.fromC] = null;
        const oppColor = color === 'w' ? 'b' : 'w';
        if (isKingInCheck(oppColor, boardState)) {
          score += 45;
        }
        // Check if opponent can recapture on destination square
        for (let rr = 0; rr < 8; rr++) {
          for (let cc = 0; cc < 8; cc++) {
            const opp = boardState[rr][cc];
            if (opp && opp.color === oppColor) {
              const oppMoves = getPseudoMovesForPiece(rr, cc, boardState);
              if (oppMoves.some((om) => om.r === m.toR && om.c === m.toC)) {
                score -= PIECE_VALUES[piece.type] * 0.75;
                break;
              }
            }
          }
        }
        boardState[m.fromR][m.fromC] = piece;
        boardState[m.toR][m.toC] = target;

        // Small jitter so AI varies openings
        score += (Math.random() - 0.5) * 14;

        if (score > bestScore + 1) {
          bestScore = score;
          bestCandidates = [m];
        } else if (Math.abs(score - bestScore) <= 1) {
          bestCandidates.push(m);
        }
      }

      return bestCandidates[Math.floor(Math.random() * bestCandidates.length)] || legalMoves[0];
    }

    function triggerAIMoveNow() {
      if (isAnimatingMove || gameOver) return false;
      const chosen = chooseSmartAIMove(currentTurn);
      if (!chosen) return false;
      return executeChessMove(chosen.fromR, chosen.fromC, chosen.toR, chosen.toC);
    }

    function maybeScheduleAIMove() {
      if (aiTimer) {
        clearTimeout(aiTimer);
        aiTimer = null;
      }
      if (!matchStarted || lobbyPaused) return;
      if (gameOver || isAnimatingMove || preMoveHighlightTask) return;
      if (scriptedGameActive) return;
      if (gameMode !== 'single' || !aiAutoPlay) return;

      const aiColor = playerColor === 'w' ? 'b' : 'w';
      if (currentTurn === aiColor) {
        const aiThinkDelayMs =
          timeControlCategory === 'bullet' ? 210 : timeControlCategory === 'blitz' ? 360 : 520;
        aiTimer = setTimeout(() => {
          aiTimer = null;
          if (
            matchStarted &&
            !lobbyPaused &&
            !scriptedGameActive &&
            gameMode === 'single' &&
            currentTurn === aiColor &&
            !isAnimatingMove &&
            !gameOver
          ) {
            triggerAIMoveNow();
          }
        }, aiThinkDelayMs);
      }
    }

    // =========================================================================
    // Feature 3 (3a, 3b, 3c): Chess Notation Parser & Step-Through Choreography
    // =========================================================================
    function createInitialVirtualBoard() {
      const b = Array.from({ length: 8 }, () => Array(8).fill(null));
      const backRow = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
      for (let c = 0; c < 8; c++) {
        b[7][c] = { type: backRow[c], color: 'w', hasMoved: false };
        b[6][c] = { type: 'pawn', color: 'w', hasMoved: false };
        b[1][c] = { type: 'pawn', color: 'b', hasMoved: false };
        b[0][c] = { type: backRow[c], color: 'b', hasMoved: false };
      }
      return b;
    }

    function getVirtualLegalMovesForSquare(r, c, vBoard) {
      const piece = vBoard[r][c];
      if (!piece) return [];
      const pseudo = getPseudoMovesForPiece(r, c, vBoard);
      const legal = [];
      for (const m of pseudo) {
        const savedTarget = vBoard[m.r][m.c];
        vBoard[m.r][m.c] = piece;
        vBoard[r][c] = null;
        const inCheck = isKingInCheck(piece.color, vBoard);
        vBoard[r][c] = piece;
        vBoard[m.r][m.c] = savedTarget;
        if (!inCheck) legal.push(m);
      }
      return legal;
    }

    function parseNotationToMoves(notationText) {
      const cleaned = String(notationText || '')
        .replace(/\[[^\]]*\]/g, ' ')
        .replace(/\{[^}]*\}/g, ' ')
        .replace(/;[^\n]*/g, ' ')
        .replace(/\([^)]*\)/g, ' ');

      const rawTokens = cleaned
        .split(/\s+/)
        .map((t) => t.replace(/^\d+\.+/g, '').trim())
        .filter((t) => t && !/^(1-0|0-1|1\/2-1\/2|\*|\d+\.?)$/.test(t));

      const vBoard = createInitialVirtualBoard();
      let turn = 'w';
      const parsedMoves = [];
      const promoMap = { q: 'queen', r: 'rook', b: 'bishop', n: 'knight' };
      const sanPieceMap = { N: 'knight', B: 'bishop', R: 'rook', Q: 'queen', K: 'king', P: 'pawn' };

      for (const rawTok of rawTokens) {
        let tok = rawTok.replace(/[+#!?]+$/g, '');
        if (!tok) continue;

        let matched = null;

        // 1. Castling (O-O / 0-0 / O-O-O / 0-0-0)
        if (/^(O-O-O|0-0-0|O-O|0-0)$/i.test(tok)) {
          const isQueenside = tok.length >= 5;
          const kr = turn === 'w' ? 7 : 0;
          const fromC = 4;
          const toC = isQueenside ? 2 : 6;
          if (vBoard[kr][fromC] && vBoard[kr][fromC].type === 'king') {
            matched = {
              fromR: kr,
              fromC,
              toR: kr,
              toC,
              pieceType: 'king',
              capture: false,
              promotion: null,
              castling: isQueenside ? 'q' : 'k'
            };
          }
        }

        // 2. Coordinate / UCI notation (e.g. e2e4, e2-e4, e4xd5, g1f3, e7e8q)
        if (!matched) {
          const uciMatch = tok.match(/^([a-h])([1-8])[-x]?([a-h])([1-8])(?:=?([qrbnQRBN]))?$/);
          if (uciMatch) {
            const fromC = uciMatch[1].charCodeAt(0) - 97;
            const fromR = 8 - parseInt(uciMatch[2], 10);
            const toC = uciMatch[3].charCodeAt(0) - 97;
            const toR = 8 - parseInt(uciMatch[4], 10);
            const promoChar = uciMatch[5] ? uciMatch[5].toLowerCase() : null;
            const p = vBoard[fromR]?.[fromC];
            if (p && p.color === turn) {
              matched = {
                fromR,
                fromC,
                toR,
                toC,
                pieceType: p.type,
                capture: Boolean(vBoard[toR]?.[toC]),
                promotion: promoChar ? promoMap[promoChar] : null
              };
            }
          }
        }

        // 3. Standard Algebraic Notation (SAN: e4, exd5, Nf3, Nc6, Bc4, Qxd5, Nbd7, R1e2, e8=Q)
        if (!matched) {
          let promotion = null;
          const promoEq = tok.match(/=([QRBNqrbn])$/);
          if (promoEq) {
            promotion = promoMap[promoEq[1].toLowerCase()] || 'queen';
            tok = tok.slice(0, -2);
          }

          let pieceType = 'pawn';
          let rest = tok;
          if (/^[NBRQK]/.test(rest)) {
            pieceType = sanPieceMap[rest[0]];
            rest = rest.slice(1);
          } else if (/^P/.test(rest)) {
            pieceType = 'pawn';
            rest = rest.slice(1);
          }

          const destMatch = rest.match(/([a-h])([1-8])$/);
          if (destMatch) {
            const toC = destMatch[1].charCodeAt(0) - 97;
            const toR = 8 - parseInt(destMatch[2], 10);
            const prefix = rest.slice(0, rest.length - 2).replace(/x/g, '');

            let disambigC = null;
            let disambigR = null;
            for (const ch of prefix) {
              if (ch >= 'a' && ch <= 'h') disambigC = ch.charCodeAt(0) - 97;
              else if (ch >= '1' && ch <= '8') disambigR = 8 - parseInt(ch, 10);
            }

            const candidates = [];
            for (let r = 0; r < 8; r++) {
              for (let c = 0; c < 8; c++) {
                const p = vBoard[r][c];
                if (!p || p.color !== turn || p.type !== pieceType) continue;
                if (disambigC !== null && c !== disambigC) continue;
                if (disambigR !== null && r !== disambigR) continue;
                const legals = getVirtualLegalMovesForSquare(r, c, vBoard);
                const hit = legals.find((m) => m.r === toR && m.c === toC);
                if (hit) {
                  candidates.push({
                    fromR: r,
                    fromC: c,
                    toR,
                    toC,
                    pieceType,
                    capture: Boolean(hit.capture || vBoard[toR][toC]),
                    promotion
                  });
                }
              }
            }
            if (candidates.length > 0) {
              matched = candidates[0];
            }
          }
        }

        if (!matched) {
          console.warn('Could not parse notation token:', rawTok);
          break;
        }

        const movingPiece = vBoard[matched.fromR][matched.fromC];
        vBoard[matched.fromR][matched.fromC] = null;
        if (matched.castling) {
          const kr = matched.fromR;
          if (matched.castling === 'k') {
            vBoard[kr][5] = vBoard[kr][7];
            vBoard[kr][7] = null;
          } else {
            vBoard[kr][3] = vBoard[kr][0];
            vBoard[kr][0] = null;
          }
        }
        const finalType =
          matched.promotion ||
          (movingPiece.type === 'pawn' && (matched.toR === 0 || matched.toR === 7)
            ? 'queen'
            : movingPiece.type);
        vBoard[matched.toR][matched.toC] = {
          type: finalType,
          color: turn,
          hasMoved: true
        };

        parsedMoves.push({
          index: parsedMoves.length,
          ply: parsedMoves.length + 1,
          moveNumber: Math.floor(parsedMoves.length / 2) + 1,
          color: turn,
          san: rawTok,
          fromR: matched.fromR,
          fromC: matched.fromC,
          toR: matched.toR,
          toC: matched.toC,
          pieceType: matched.pieceType,
          capture: matched.capture,
          promotion: matched.promotion || 'queen'
        });

        turn = turn === 'w' ? 'b' : 'w';
      }

      return parsedMoves;
    }

    function updateScriptBarUI() {
      const label = document.getElementById('script-step-label');
      const statusMsg = document.getElementById('script-status-msg');
      const prevBtn = document.getElementById('btn-script-prev');
      const nextBtn = document.getElementById('btn-script-next');

      const total = scriptMoves.length;
      if (label) {
        if (total === 0) {
          label.textContent = `Move ${moveHistory.length}`;
        } else if (scriptDeviated) {
          label.textContent = `Move ${moveHistory.length} • Custom Takeover`;
        } else if (scriptCursor < total) {
          const nextSan = scriptMoves[scriptCursor].san;
          label.textContent = `Step ${scriptCursor}/${total} • Next: ${nextSan}`;
        } else {
          label.textContent = `Step ${total}/${total} (Done)`;
        }
      }
      if (prevBtn) {
        prevBtn.disabled = moveHistory.length === 0 && !preMoveHighlightTask && !isAnimatingMove;
      }
      if (nextBtn) {
        nextBtn.disabled = gameOver || (!scriptDeviated && total > 0 && scriptCursor >= total && !preMoveHighlightTask);
      }
      if (statusMsg && total > 0) {
        if (scriptDeviated) {
          statusMsg.textContent = `Custom takeover active at Move ${moveHistory.length} (Use [ to step back or ] for AI move).`;
        } else {
          statusMsg.textContent = `Loaded ${total} half-moves. Step ${scriptCursor}/${total} ready (Use [ and ] to step, Arrow keys to rotate cam).`;
        }
      }
    }

    const DEFAULT_DIRECTOR_NOTATION =
      '1. e4 d5 2. exd5 Qxd5 3. Nc3 Qd8 4. d4 c6 5. Bc4 h6 6. Nf3 Bg4 7. Bxf7+ Kxf7 8. Ne5+ Ke8 9. Qxg4 Nf6 10. Qg6#';

    function loadNotationScript(notationStr, options = {}) {
      const parsed = parseNotationToMoves(notationStr);
      scriptMoves = parsed;
      scriptCursor = 0;
      scriptDeviated = false;
      scriptedGameActive = parsed.length > 0;
      const inputEl = document.getElementById('input-notation');
      if (inputEl && notationStr) {
        inputEl.value = notationStr;
      }
      resetChessBoard(Boolean(options.orientCamera), true);
      updateScriptBarUI();
      return {
        ok: parsed.length > 0,
        count: parsed.length,
        moves: parsed
      };
    }

    function completeCurrentMoveImmediately() {
      if (preMoveHighlightTask) {
        const mv = preMoveHighlightTask.move;
        const fromScriptFlag = Boolean(preMoveHighlightTask.fromScript);
        preMoveHighlightTask = null;
        executeChessMove(mv.fromR, mv.fromC, mv.toR, mv.toC, { fromScript: fromScriptFlag });
      }
      let safety = 0;
      while (activeMoveTweens.length > 0 && safety < 200) {
        safety++;
        for (let i = activeMoveTweens.length - 1; i >= 0; i--) {
          const done = activeMoveTweens[i](0.05);
          if (done) activeMoveTweens.splice(i, 1);
        }
      }
    }

    function isScriptMoveLegalOnCurrentBoard(mv) {
      if (!mv) return false;
      const piece = boardState[mv.fromR]?.[mv.fromC];
      if (!piece || piece.color !== currentTurn) return false;
      const destPiece = boardState[mv.toR]?.[mv.toC];
      if (destPiece && destPiece.color === piece.color) return false;
      const legals = getLegalMovesForPiece(mv.fromR, mv.fromC);
      return legals.some((m) => m.r === mv.toR && m.c === mv.toC);
    }

    function stepScriptForward() {
      if (gameOver) return false;

      // If a move animation or pre-move highlight is currently running, finish it cleanly before advancing
      if (isAnimatingMove || preMoveHighlightTask) {
        completeCurrentMoveImmediately();
        if (gameOver) return false;
        if (!scriptDeviated && scriptMoves.length > 0 && scriptCursor >= scriptMoves.length) return false;
      }

      // If no notation script has been loaded yet and no moves have been played, parse the default script in #input-notation
      if (scriptMoves.length === 0 && moveHistory.length === 0) {
        const defaultPgn =
          document.getElementById('input-notation')?.value || DEFAULT_DIRECTOR_NOTATION;
        loadNotationScript(defaultPgn, { orientCamera: false });
      }

      if (aiTimer) {
        clearTimeout(aiTimer);
        aiTimer = null;
      }

      // Determine whether the next scripted move is still valid on the current board
      let nextMove = null;
      let isFromScript = false;
      if (!scriptDeviated && scriptCursor < scriptMoves.length) {
        const candidate = scriptMoves[scriptCursor];
        if (isScriptMoveLegalOnCurrentBoard(candidate)) {
          nextMove = candidate;
          isFromScript = true;
          scriptedGameActive = true;
        } else {
          scriptDeviated = true;
          scriptedGameActive = false;
        }
      }

      // If the user took over and deviated from the script, Next ] cleanly executes a smart legal move for currentTurn
      if (!nextMove) {
        if (!scriptDeviated && scriptMoves.length > 0 && scriptCursor >= scriptMoves.length) {
          return false;
        }
        const aiFallback = chooseSmartAIMove(currentTurn);
        if (!aiFallback) return false;
        nextMove = {
          fromR: aiFallback.fromR,
          fromC: aiFallback.fromC,
          toR: aiFallback.toR,
          toC: aiFallback.toC,
          color: currentTurn
        };
        isFromScript = false;
      }

      const chkHighlight = document.getElementById('chk-premove-highlight');
      const chkBoth = document.getElementById('chk-premove-both');
      const showPreHighlight = chkHighlight ? chkHighlight.checked : true;
      const highlightBothSides = chkBoth ? chkBoth.checked : false;

      // Feature 3c: When triggering moves for the player's side (or both sides if toggled),
      // first show selecting the piece and its legal destination squares before executing the move!
      if (showPreHighlight && (nextMove.color === playerColor || highlightBothSides)) {
        selectedSquare = { r: nextMove.fromR, c: nextMove.fromC };
        validMoves = getLegalMovesForPiece(nextMove.fromR, nextMove.fromC);
        showSquareHighlights(nextMove.fromR, nextMove.fromC, validMoves);
        preMoveHighlightTask = {
          move: nextMove,
          fromScript: isFromScript,
          elapsedSim: 0,
          startWallMs: performance.now(),
          duration: 0.62
        };
        updateScriptBarUI();
        return true;
      }

      return executeChessMove(nextMove.fromR, nextMove.fromC, nextMove.toR, nextMove.toC, {
        fromScript: isFromScript
      });
    }

    function stepScriptBackward() {
      if (preMoveHighlightTask) {
        preMoveHighlightTask = null;
        clearSquareHighlights();
        selectedSquare = null;
        validMoves = [];
        updateScriptBarUI();
        return true;
      }

      if (moveHistory.length === 0) {
        return false;
      }

      const lastEntry = moveHistory.pop();
      restoreBoardSnapshot(lastEntry.snapshot);
      return true;
    }

    // =========================================================================
    // Feature 1: Toggle All On-Screen UI Off/On for Clean Cinematic Recording
    // =========================================================================
    function toggleUI(forceHidden) {
      const shouldHide =
        typeof forceHidden === 'boolean'
          ? forceHidden
          : !document.body.classList.contains('cinematic-ui-hidden');
      document.body.classList.toggle('cinematic-ui-hidden', shouldHide);
      const btnHide = document.getElementById('btn-hide-ui');
      if (btnHide) {
        btnHide.textContent = shouldHide ? 'Show UI [H]' : 'Hide UI [H]';
      }
      window.dispatchEvent(
        new CustomEvent('wizardchess:uichange', { detail: { uiHidden: shouldHide } })
      );
      return shouldHide;
    }

    // =========================================================================
    // Feature 4: Video-Game Style WASD + R/F Translation & Arrow-Key Rotation
    // with Configurable Speed (Default 10%) & Smooth Ease-In / Ease-Out
    // =========================================================================
    const heldCameraKeys = new Set();
    const CAM_MOVE_KEY_CODES = new Set([
      'KeyW',
      'KeyA',
      'KeyS',
      'KeyD',
      'KeyR',
      'KeyF',
      'ArrowUp',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight'
    ]);
    let cameraKeySpeedPct = 35;
    let cameraRotSpeedPct = 35;
    const keyMoveVelocity = new THREE.Vector3(0, 0, 0);
    const keyRotVelocity = { yaw: 0, pitch: 0 };

    function setCameraKeySpeedPercent(pct) {
      const clamped = Math.max(1, Math.min(200, Math.round(Number(pct) || 10)));
      cameraKeySpeedPct = clamped;
      const sliderEl = document.getElementById('input-cam-speed');
      const valEl = document.getElementById('cam-speed-val');
      if (sliderEl && Number(sliderEl.value) !== clamped) {
        sliderEl.value = String(clamped);
      }
      if (valEl) {
        valEl.textContent = `${clamped}%`;
      }
      return cameraKeySpeedPct;
    }

    function setCameraRotSpeedPercent(pct) {
      const clamped = Math.max(1, Math.min(200, Math.round(Number(pct) || 10)));
      cameraRotSpeedPct = clamped;
      const sliderEl = document.getElementById('input-rot-speed');
      const valEl = document.getElementById('rot-speed-val');
      if (sliderEl && Number(sliderEl.value) !== clamped) {
        sliderEl.value = String(clamped);
      }
      if (valEl) {
        valEl.textContent = `${clamped}%`;
      }
      return cameraRotSpeedPct;
    }

    const camSpeedSliderEl = document.getElementById('input-cam-speed');
    if (camSpeedSliderEl) {
      camSpeedSliderEl.addEventListener('input', (e) => {
        setCameraKeySpeedPercent(e.target.value);
      });
      camSpeedSliderEl.addEventListener('change', (e) => {
        setCameraKeySpeedPercent(e.target.value);
      });
    }

    const rotSpeedSliderEl = document.getElementById('input-rot-speed');
    if (rotSpeedSliderEl) {
      rotSpeedSliderEl.addEventListener('input', (e) => {
        setCameraRotSpeedPercent(e.target.value);
      });
      rotSpeedSliderEl.addEventListener('change', (e) => {
        setCameraRotSpeedPercent(e.target.value);
      });
    }

    function isTypingInInput(el) {
      if (!el) return false;
      const tag = (el.tagName || '').toUpperCase();
      if (tag === 'TEXTAREA' || el.isContentEditable) return true;
      if (tag === 'INPUT') {
        const type = (el.type || '').toLowerCase();
        return type !== 'range' && type !== 'checkbox' && type !== 'button';
      }
      return false;
    }

    window.addEventListener('keydown', (e) => {
      if (isTypingInInput(document.activeElement)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (CAM_MOVE_KEY_CODES.has(e.code)) {
        e.preventDefault();
        heldCameraKeys.add(e.code);
        return;
      }

      if (e.code === 'KeyH' || e.code === 'KeyU') {
        e.preventDefault();
        toggleUI();
      }
    });

    window.addEventListener('keyup', (e) => {
      if (CAM_MOVE_KEY_CODES.has(e.code)) {
        heldCameraKeys.delete(e.code);
      }
    });

    window.addEventListener('blur', () => {
      heldCameraKeys.clear();
    });

    // =========================================================================
    // Feature 7: Cinematic 3D Checkmate Particle System & Triumphant Piece
    // Knocking the Enemy King Off the Board with Stone Debris -> #checkmate-overlay
    // =========================================================================
    let cachedCheckmateParticleTex = null;
    function getCheckmateParticleTexture() {
      if (cachedCheckmateParticleTex || typeof document === 'undefined') return cachedCheckmateParticleTex;
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const grad = ctx.createRadialGradient(32, 32, 1, 32, 32, 30);
        grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
        grad.addColorStop(0.32, 'rgba(255, 240, 200, 0.92)');
        grad.addColorStop(0.68, 'rgba(255, 180, 90, 0.38)');
        grad.addColorStop(1.0, 'rgba(255, 120, 30, 0.0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 64, 64);
      }
      cachedCheckmateParticleTex = new THREE.CanvasTexture(canvas);
      cachedCheckmateParticleTex.colorSpace = THREE.SRGBColorSpace;
      return cachedCheckmateParticleTex;
    }

    function spawnCheckmateGpuDustAndEmberPlume(originPos, dirX, dirZ, primaryHex, secondaryHex, stoneHex, count = 190) {
      const geo = new THREE.BufferGeometry();
      const positions = new Float32Array(count * 3);
      const colors = new Float32Array(count * 3);
      const velocities = new Float32Array(count * 3);
      const gravities = new Float32Array(count);
      const drags = new Float32Array(count);

      const cPrimary = new THREE.Color(primaryHex || 0xff4d2a);
      const cSecondary = new THREE.Color(secondaryHex || 0xf5d76e);
      const cStone = new THREE.Color(stoneHex || 0xd8cfc0);
      const cWhite = new THREE.Color(0xfff9e6);

      for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        const spreadAngle = (Math.random() - 0.5) * Math.PI * 1.15;
        const cosA = Math.cos(spreadAngle);
        const sinA = Math.sin(spreadAngle);
        const coneDirX = dirX * cosA - dirZ * sinA;
        const coneDirZ = dirX * sinA + dirZ * cosA;

        const isHeavyDust = i % 3 === 0;
        const speed = isHeavyDust
          ? 0.65 + Math.random() * 1.95
          : 1.25 + Math.random() * 3.45;

        positions[i3] = originPos.x + (Math.random() - 0.5) * 0.22;
        positions[i3 + 1] = originPos.y + 0.05 + Math.random() * 0.36;
        positions[i3 + 2] = originPos.z + (Math.random() - 0.5) * 0.22;

        velocities[i3] = coneDirX * speed + (Math.random() - 0.5) * 0.95;
        velocities[i3 + 1] = (isHeavyDust ? 0.85 : 1.55) + Math.random() * 2.45;
        velocities[i3 + 2] = coneDirZ * speed + (Math.random() - 0.5) * 0.95;

        gravities[i] = isHeavyDust ? 4.8 : 2.6;
        drags[i] = isHeavyDust ? 1.35 : 0.85;

        const colPick = i % 5 === 0 ? cWhite : isHeavyDust ? cStone : i % 2 === 0 ? cPrimary : cSecondary;
        colors[i3] = colPick.r;
        colors[i3 + 1] = colPick.g;
        colors[i3 + 2] = colPick.b;
      }

      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      const mat = new THREE.PointsMaterial({
        size: 0.088,
        map: getCheckmateParticleTexture(),
        vertexColors: true,
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true
      });

      const points = new THREE.Points(geo, mat);
      scene.add(points);
      checkmateParticleSystems.push({
        points,
        geometry: geo,
        material: mat,
        velocities,
        gravities,
        drags,
        count,
        life: 2.45,
        maxLife: 2.45
      });
    }

    function spawnKingRimBounceDebris(rimPos, defeatedColor, dirX, dirZ, killProfile) {
      const stoneMat = defeatedColor === 'w' ? whitePieceMat : blackPieceMat;
      const trimMat = defeatedColor === 'w' ? whiteTrimMat : blackTrimMat;
      const emberMat = new THREE.MeshBasicMaterial({ color: killProfile?.secondaryHex || 0xf5d76e });

      for (let i = 0; i < 24; i++) {
        const sz = 0.016 + Math.random() * 0.032;
        const geo = i % 3 === 0 ? checkmateSharedSlabGeo : i % 2 === 0 ? checkmateSharedShardGeo : checkmateSharedChunkGeo;
        const mat = i % 5 === 0 ? emberMat : i % 3 === 0 ? trimMat : stoneMat;
        const frag = new THREE.Mesh(geo, mat);
        frag.scale.setScalar(sz);
        frag.position.set(
          rimPos.x + (Math.random() - 0.5) * 0.18,
          BOARD_SURFACE_Y + 0.03 + Math.random() * 0.10,
          rimPos.z + (Math.random() - 0.5) * 0.18
        );
        frag.castShadow = true;
        scene.add(frag);
        shatterDebris.push({
          mesh: frag,
          baseScale: sz,
          offBoardDrop: true,
          vel: new THREE.Vector3(
            dirX * (1.15 + Math.random() * 1.85) + (Math.random() - 0.5) * 1.4,
            0.95 + Math.random() * 1.75,
            dirZ * (1.15 + Math.random() * 1.85) + (Math.random() - 0.5) * 1.4
          ),
          rotVel: new THREE.Vector3(
            (Math.random() - 0.5) * 20,
            (Math.random() - 0.5) * 20,
            (Math.random() - 0.5) * 20
          ),
          life: 2.15
        });
      }

      spawnCheckmateGpuDustAndEmberPlume(
        rimPos,
        dirX,
        dirZ,
        killProfile?.primaryHex || 0xff4d2a,
        killProfile?.secondaryHex || 0xf5d76e,
        defeatedColor === 'w' ? 0xe6dfd0 : 0x3b4254,
        96
      );
      sfxVfxManager.spawnSquarePulseVfx(rimPos, 0xf5d76e, 0.42, 0.55);
    }

    function spawnKingFallImpact(worldPos, color, dirX = 0, dirZ = 1, attackerPiece = null) {
      const winnerColor = color === 'w' ? 'b' : 'w';
      const winnerArch = attackerPiece?.archetype || getSideArchetype(winnerColor);
      const attackerType = attackerPiece?.type || 'queen';
      const killProfile = getArchetypeKillProfile(winnerArch, 'king');

      sfxVfxManager.playWeaponContactClashSfx(attackerType, 'king', winnerArch);
      sfxVfxManager.playPieceKillSfx('king', attackerType, winnerArch);
      sfxVfxManager.spawnWeaponContactVfx(worldPos, dirX, dirZ, 'king', winnerArch);
      sfxVfxManager.spawnPieceKillVfx(worldPos, 'king', color, attackerType, dirX, dirZ, winnerArch);
      sfxVfxManager.triggerCameraShake?.(0.088, 0.78);

      const stoneMat = color === 'w' ? whitePieceMat : blackPieceMat;
      const trimMat = color === 'w' ? whiteTrimMat : blackTrimMat;
      const bladeMat = color === 'w' ? whiteBladeMat : blackBladeMat;
      const emberCoreMat = new THREE.MeshBasicMaterial({
        color: killProfile.primaryHex || 0xff1e42
      });
      const goldSparkMat = new THREE.MeshBasicMaterial({
        color: killProfile.secondaryHex || 0xf5d76e
      });

      const totalShards = 68;
      checkmateState.debrisShardCount = totalShards + 24;

      for (let i = 0; i < totalShards; i++) {
        const isEmber = i % 6 === 0;
        const isGoldCrown = !isEmber && i % 4 === 0;
        const isBladeFragment = !isEmber && !isGoldCrown && i % 5 === 0;
        const fragMat = isEmber
          ? (i % 12 === 0 ? goldSparkMat : emberCoreMat)
          : isGoldCrown
            ? trimMat
            : isBladeFragment
              ? bladeMat
              : stoneMat;

        const fragGeo = isGoldCrown
          ? checkmateSharedCrownGeo
          : i % 3 === 0
            ? checkmateSharedSlabGeo
            : i % 2 === 0
              ? checkmateSharedShardGeo
              : checkmateSharedChunkGeo;

        const sz = 0.022 + Math.random() * 0.052;
        const frag = new THREE.Mesh(fragGeo, fragMat);
        frag.scale.setScalar(sz);
        frag.position.set(
          worldPos.x + (Math.random() - 0.5) * 0.22,
          BOARD_SURFACE_Y + 0.05 + Math.random() * 0.36,
          worldPos.z + (Math.random() - 0.5) * 0.22
        );
        frag.castShadow = true;
        scene.add(frag);

        // Bias 65% of the stone debris strongly along the knock-off trajectory so a wave of stone shards accompanies the flying King off the board
        const forwardPush = (0.75 + Math.random() * 2.15) * (i < 46 ? 1.35 : 0.65);
        shatterDebris.push({
          mesh: frag,
          baseScale: sz,
          offBoardDrop: true,
          vel: new THREE.Vector3(
            dirX * forwardPush + (Math.random() - 0.5) * 2.25,
            1.25 + Math.random() * 2.65,
            dirZ * forwardPush + (Math.random() - 0.5) * 2.25
          ),
          rotVel: new THREE.Vector3(
            (Math.random() - 0.5) * 22,
            (Math.random() - 0.5) * 22,
            (Math.random() - 0.5) * 22
          ),
          life: 2.65
        });
      }

      // Spawn 3D GPU Point-Cloud Impact Plume & Ember Stream
      spawnCheckmateGpuDustAndEmberPlume(
        worldPos,
        dirX,
        dirZ,
        killProfile.primaryHex || 0xff1e42,
        killProfile.secondaryHex || 0xf5d76e,
        color === 'w' ? 0xe6dfd0 : 0x3b4254,
        210
      );

      impactFlashLight.color.setHex(killProfile.primaryHex || 0xff1e42);
      impactFlashLight.position.set(worldPos.x, BOARD_SURFACE_Y + 0.48, worldPos.z);
      impactFlashLight.intensity = 18.5;
    }

    function showCheckmateBanner(winnerColor, defeatedColor, isCheckWin = false, isTimeOutWin = false, triumphantPiece = null) {
      const overlay = document.getElementById('checkmate-overlay');
      const crownEl = document.getElementById('checkmate-crown');
      const titleEl = document.getElementById('checkmate-title');
      const subEl = document.getElementById('checkmate-subtitle');
      const impactTextEl = document.getElementById('checkmate-impact-text');

      const winnerName = winnerColor === 'w' ? 'White' : 'Black';
      const defeatedName = defeatedColor === 'w' ? 'White' : 'Black';
      const preset = TIME_CONTROL_PRESETS[timeControlPresetId] || TIME_CONTROL_PRESETS.blitz_5;

      const winnerArch = triumphantPiece?.archetype || getSideArchetype(winnerColor);
      const killProfile = getArchetypeKillProfile(winnerArch, 'king');
      const pieceLabel = triumphantPiece?.type
        ? triumphantPiece.type.charAt(0).toUpperCase() + triumphantPiece.type.slice(1)
        : 'Sovereign';

      checkmateState.triumphantPieceType = pieceLabel;
      checkmateState.triumphantAttackTitle = killProfile.title;

      if (crownEl) crownEl.textContent = winnerColor === 'w' ? '♔' : '♚';
      if (titleEl) {
        titleEl.textContent = isTimeOutWin
          ? 'Time Out — Victory!'
          : isCheckWin
            ? 'Check — Victory!'
            : 'Checkmate';
      }
      if (subEl) {
        subEl.textContent = isTimeOutWin
          ? `${winnerName} Wins on Time (${preset.shortLabel}) • ${defeatedName} King Knocked Off Board`
          : isCheckWin
            ? `${winnerName} Wins the Match • Triumphant ${pieceLabel} Knocked the ${defeatedName} King Off the Board`
            : `${winnerName} Triumphs • Triumphant ${pieceLabel} Knocked the ${defeatedName} King Off the Board`;
      }
      if (impactTextEl) {
        impactTextEl.textContent = `${winnerName} ${pieceLabel} • ${killProfile.title} • ${defeatedName} King Knocked Off Board with Stone Debris`;
      }
      if (overlay) {
        overlay.classList.add('visible', 'checkmate-impact-climax');
      }
      checkmateState.bannerVisible = true;

      window.dispatchEvent(
        new CustomEvent('wizardchess:checkmateoverlay', {
          detail: {
            winnerColor,
            defeatedColor,
            winnerName,
            defeatedName,
            triumphantPieceType: pieceLabel,
            attackTitle: killProfile.title,
            attackSubtitle: killProfile.subtitle,
            kingKnockedOffBoard: true,
            debrisShardCount: checkmateState.debrisShardCount || 92,
            isCheckWin,
            isTimeOutWin
          }
        })
      );
    }

    function triggerCheckmateSequence(defeatedColor = currentTurn, winnerColor = null, options = {}) {
      const actualWinner = winnerColor || (defeatedColor === 'w' ? 'b' : 'w');
      const isCheckWin = Boolean(options && options.isCheckWin);
      const isTimeOutWin = Boolean(options && options.isTimeOutWin);

      // Cleanly restore any prior checkmate pose & remove previous checkmate tween if replaying
      restoreCheckmatePiecesPose();
      disposeCheckmateParticleSystems();
      const overlayEl = document.getElementById('checkmate-overlay');
      if (overlayEl) {
        overlayEl.classList.remove('visible', 'checkmate-impact-climax');
      }

      // Find the defeated King on the board
      let kingPiece = null;
      let kingR = -1;
      let kingC = -1;
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const p = boardState[r][c];
          if (p && p.type === 'king' && p.color === defeatedColor) {
            kingPiece = p;
            kingR = r;
            kingC = c;
            break;
          }
        }
      }

      checkmateState.active = true;
      checkmateState.bannerVisible = false;
      checkmateState.defeatedColor = defeatedColor;
      checkmateState.winnerColor = actualWinner;
      checkmateState.isCheckWin = isCheckWin;
      checkmateState.isTimeOutWin = isTimeOutWin;
      checkmateState.kingFallAngleDeg = 0;
      checkmateState.kingKnockedOffBoard = false;
      checkmateState.phase = 'stagger';
      updateCheck3DIndicator(defeatedColor);

      if (!kingPiece || !kingPiece.mesh) {
        showCheckmateBanner(actualWinner, defeatedColor, isCheckWin, isTimeOutWin, null);
        return false;
      }

      // Identify the triumphant piece that delivered the Checkmate (or nearest attacking/royal piece of actualWinner)
      let triumphantPiece = null;
      let attackerR = -1;
      let attackerC = -1;

      if (moveHistory.length > 0) {
        const lastMv = moveHistory[moveHistory.length - 1].move;
        if (lastMv) {
          const candidate = boardState[lastMv.toR]?.[lastMv.toC];
          if (candidate && candidate.color === actualWinner && candidate !== kingPiece) {
            triumphantPiece = candidate;
            attackerR = lastMv.toR;
            attackerC = lastMv.toC;
          }
        }
      }

      if (!triumphantPiece) {
        for (let r = 0; r < 8 && !triumphantPiece; r++) {
          for (let c = 0; c < 8; c++) {
            const p = boardState[r][c];
            if (p && p.color === actualWinner && p !== kingPiece) {
              const moves = getPseudoMovesForPiece(r, c, boardState);
              if (moves.some((m) => m.r === kingR && m.c === kingC)) {
                triumphantPiece = p;
                attackerR = r;
                attackerC = c;
                break;
              }
            }
          }
        }
      }

      if (!triumphantPiece) {
        let bestScore = -Infinity;
        for (let r = 0; r < 8; r++) {
          for (let c = 0; c < 8; c++) {
            const p = boardState[r][c];
            if (p && p.color === actualWinner && p !== kingPiece && p.mesh) {
              const val = PIECE_VALUES[p.type] || 100;
              const d = Math.hypot(r - kingR, c - kingC);
              const score = val - d * 45;
              if (score > bestScore) {
                bestScore = score;
                triumphantPiece = p;
                attackerR = r;
                attackerC = c;
              }
            }
          }
        }
      }

      const homePos = boardToWorld(kingR, kingC);
      const attackerHomePos =
        triumphantPiece && attackerR >= 0
          ? boardToWorld(attackerR, attackerC)
          : new THREE.Vector3(homePos.x, BOARD_SURFACE_Y, homePos.z + (defeatedColor === 'b' ? 0.68 : -0.68));

      // Save original transforms so Replay King Fall (#btn-checkmate-replay) can replay cleanly any number of times
      checkmateState.savedPose = {
        kingPiece,
        kingHomePos: homePos.clone(),
        kingHomeQuat: kingPiece.mesh.quaternion.clone(),
        kingHomeScale: kingPiece.mesh.scale.clone(),
        attackerPiece: triumphantPiece,
        attackerHomePos: triumphantPiece?.mesh ? attackerHomePos.clone() : null,
        attackerHomeQuat: triumphantPiece?.mesh ? triumphantPiece.mesh.quaternion.clone() : null,
        attackerHomeScale: triumphantPiece?.mesh ? triumphantPiece.mesh.scale.clone() : null
      };

      // Compute Knock-Off Direction: blend the triumphant attacker's strike impulse with the nearest board edge vector
      // so the enemy King is physically knocked OFF the 8x8 chessboard and over the ornate border!
      const rawImpulse = new THREE.Vector2(
        homePos.x - attackerHomePos.x,
        homePos.z - attackerHomePos.z
      );
      if (rawImpulse.lengthSq() < 1e-4) {
        rawImpulse.set(0.28, defeatedColor === 'b' ? -1 : 1);
      }
      rawImpulse.normalize();

      // Nearest board edge direction from the King's square
      const edgeCandidates = [
        { dx: 0, dz: defeatedColor === 'b' ? -1 : 1, dist: 1.48 - Math.abs(homePos.z) },
        { dx: homePos.x >= 0 ? 1 : -1, dz: 0, dist: 1.48 - Math.abs(homePos.x) },
        { dx: rawImpulse.x, dz: rawImpulse.y, dist: 0.85 }
      ];
      edgeCandidates.sort((a, b) => a.dist - b.dist);
      const nearestEdge = edgeCandidates[0];

      let knockX = rawImpulse.x * 0.68 + nearestEdge.dx * 0.32;
      let knockZ = rawImpulse.y * 0.68 + nearestEdge.dz * 0.32;
      if (Math.hypot(knockX, knockZ) < 0.1) {
        knockX = rawImpulse.x;
        knockZ = rawImpulse.y;
      }
      const knockLen = Math.hypot(knockX, knockZ) || 1;
      const fallDirX = knockX / knockLen;
      const fallDirZ = knockZ / knockLen;

      // Calculate exact distance from homePos along (fallDirX, fallDirZ) to the outer board border (1.48m) and off-board landing (1.92m)
      const BOARD_RIM_HALF = 1.46;
      const txRim = Math.abs(fallDirX) > 1e-4 ? ((fallDirX > 0 ? BOARD_RIM_HALF : -BOARD_RIM_HALF) - homePos.x) / fallDirX : Infinity;
      const tzRim = Math.abs(fallDirZ) > 1e-4 ? ((fallDirZ > 0 ? BOARD_RIM_HALF : -BOARD_RIM_HALF) - homePos.z) / fallDirZ : Infinity;
      const distToBoardRim = Math.max(0.38, Math.min(2.25, Math.min(txRim > 0 ? txRim : Infinity, tzRim > 0 ? tzRim : Infinity)));
      const totalKnockoffDist = distToBoardRim + 0.46; // Lands 0.46m past the board rim, completely off the chessboard!

      // Highlight the defeated King's square and knock-off vector with crimson-and-gold Checkmate rings
      clearSquareHighlights();
      const outerRingGeo = new THREE.RingGeometry(0.135, 0.18, 36);
      outerRingGeo.rotateX(-Math.PI / 2);
      const outerRingMat = new THREE.MeshBasicMaterial({ color: 0xe63946, side: THREE.DoubleSide });
      const outerRing = new THREE.Mesh(outerRingGeo, outerRingMat);
      outerRing.position.set(homePos.x, BOARD_SURFACE_Y + 0.012, homePos.z);
      squareHighlightsGroup.add(outerRing);

      const innerRingGeo = new THREE.RingGeometry(0.095, 0.125, 36);
      innerRingGeo.rotateX(-Math.PI / 2);
      const innerRingMat = new THREE.MeshBasicMaterial({ color: 0xf5d76e, side: THREE.DoubleSide });
      const innerRing = new THREE.Mesh(innerRingGeo, innerRingMat);
      innerRing.position.set(homePos.x, BOARD_SURFACE_Y + 0.014, homePos.z);
      squareHighlightsGroup.add(innerRing);

      // Pause the King's idle mixer / procedural rig so its statue mesh tumbles cleanly as a rigid monument
      if (kingPiece.currentAction) {
        kingPiece.currentAction.paused = true;
      }
      if (kingPiece.proceduralAnim) {
        kingPiece.proceduralAnim.paused = true;
      }

      // Orient triumphant piece toward the enemy King and trigger its Attack clip & charge SFX
      const winnerArch = triumphantPiece?.archetype || getSideArchetype(actualWinner);
      const killProfile = getArchetypeKillProfile(winnerArch, 'king');
      if (triumphantPiece && triumphantPiece.mesh) {
        const atkYaw = Math.atan2(homePos.x - attackerHomePos.x, homePos.z - attackerHomePos.z);
        triumphantPiece.mesh.rotation.set(0, atkYaw, 0);
        playPieceClip(triumphantPiece, 'Attack', false, 0.06);
        sfxVfxManager.playAttackChargeAndSwingSfx(triumphantPiece.type, 'king', winnerArch);
      }

      // Face the King toward the charging triumphant attacker before being knocked off the board
      const baseYaw = Math.atan2(-fallDirX, -fallDirZ);
      const qBaseFacing = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), baseYaw);
      const tiltAxis = new THREE.Vector3(fallDirZ, 0, -fallDirX).normalize();
      const rollAxis = new THREE.Vector3(fallDirX, 0, fallDirZ).normalize();
      const qTilt = new THREE.Quaternion();
      const qRoll = new THREE.Quaternion();

      // Smoothly frame the checkmate strike & off-board knock-off trajectory if user isn't flying camera with WASD
      if (heldCameraKeys.size === 0) {
        const perpX = -fallDirZ;
        const perpZ = fallDirX;
        const sideSign = homePos.x * perpX + homePos.z * perpZ >= 0 ? 1 : -1;
        const camPos = new THREE.Vector3(
          homePos.x + perpX * sideSign * 1.38 - fallDirX * 0.42,
          BOARD_SURFACE_Y + 1.12,
          homePos.z + perpZ * sideSign * 1.38 - fallDirZ * 0.42
        );
        const lookTarget = new THREE.Vector3(
          homePos.x + fallDirX * (distToBoardRim * 0.48),
          BOARD_SURFACE_Y + 0.14,
          homePos.z + fallDirZ * (distToBoardRim * 0.48)
        );
        smoothCameraTo(camPos, lookTarget, 0.88);
      }

      const attackerStandOffPos = new THREE.Vector3(
        homePos.x - fallDirX * 0.24,
        BOARD_SURFACE_Y,
        homePos.z - fallDirZ * 0.24
      );
      const chargeDist = attackerHomePos.distanceTo(attackerStandOffPos);

      const tChargeImpact = 0.38; // Triumphant piece charges across the board & slams into the enemy King
      const tRimCross = 0.92;     // Flying King smashes & bounces over the ornate chessboard rim
      const tLandOffBoard = 1.48; // King crashes off the board onto the lower altar slab
      const tTotal = 1.82;

      let elapsed = 0;
      let impactTriggered = false;
      let rimBounceTriggered = false;
      let bannerShown = false;
      let wakeEmitAccum = 0;

      function applyKingKnockoffPose(horizDist, heightOffset, pitchRad, rollRad = 0) {
        checkmateState.kingFallAngleDeg = Number(((Math.min(Math.PI, Math.abs(pitchRad)) * 180) / Math.PI).toFixed(1));
        const px = homePos.x + fallDirX * horizDist;
        const py = BOARD_SURFACE_Y + heightOffset;
        const pz = homePos.z + fallDirZ * horizDist;
        kingPiece.mesh.position.set(px, py, pz);

        qTilt.setFromAxisAngle(tiltAxis, pitchRad);
        if (Math.abs(rollRad) > 1e-4) {
          qRoll.setFromAxisAngle(rollAxis, rollRad);
          qTilt.multiply(qRoll);
        }
        kingPiece.mesh.quaternion.copy(qTilt).multiply(qBaseFacing);
      }

      function stepKingFall(dt) {
        if (!checkmateState.active || !kingPiece.mesh) return true;
        elapsed += dt;

        if (elapsed <= tChargeImpact) {
          // Phase 1: Triumphant Piece Heroic Charge & Windup -> Enemy King Stagger
          checkmateState.phase = 'stagger';
          const u = Math.min(1, elapsed / tChargeImpact);
          const easeU = easeInOutCubic(u);

          if (triumphantPiece && triumphantPiece.mesh) {
            const leapArc = Math.sin(u * Math.PI) * Math.min(0.24, 0.08 + chargeDist * 0.14);
            triumphantPiece.mesh.position.set(
              attackerHomePos.x + (attackerStandOffPos.x - attackerHomePos.x) * easeU,
              BOARD_SURFACE_Y + leapArc,
              attackerHomePos.z + (attackerStandOffPos.z - attackerHomePos.z) * easeU
            );
          }

          const shudder = Math.sin(u * Math.PI * 8) * 0.08 * u;
          applyKingKnockoffPose(u * 0.03, 0, u * 0.16, shudder);
        } else {
          // At t = tChargeImpact (0.38s): Triumphant piece impacts the enemy King, unleashing the 3D stone debris particle system!
          if (!impactTriggered) {
            impactTriggered = true;
            spawnKingFallImpact(homePos, defeatedColor, fallDirX, fallDirZ, triumphantPiece);
          }

          // Triumphant piece follows through onto the enemy King's vacated square and claims it in victory
          if (triumphantPiece && triumphantPiece.mesh) {
            const uClaim = Math.min(1, (elapsed - tChargeImpact) / 0.34);
            const easeClaim = easeOutCubic(uClaim);
            triumphantPiece.mesh.position.set(
              attackerStandOffPos.x + (homePos.x - attackerStandOffPos.x) * easeClaim,
              BOARD_SURFACE_Y,
              attackerStandOffPos.z + (homePos.z - attackerStandOffPos.z) * easeClaim
            );
            if (uClaim >= 1 && triumphantPiece.proceduralAnim && triumphantPiece.proceduralAnim.mode !== 'idle') {
              playPieceClip(triumphantPiece, 'Idle', true, 0.22);
            }
          }

          // Emit continuous stone-dust & ember wake particles along the flying King's trajectory
          wakeEmitAccum += dt;
          if (elapsed < tLandOffBoard && wakeEmitAccum >= 0.065) {
            wakeEmitAccum = 0;
            const kPos = kingPiece.mesh.position;
            const stoneMat = defeatedColor === 'w' ? whitePieceMat : blackPieceMat;
            const frag = new THREE.Mesh(checkmateSharedShardGeo, stoneMat);
            const sz = 0.016 + Math.random() * 0.022;
            frag.scale.setScalar(sz);
            frag.position.set(
              kPos.x + (Math.random() - 0.5) * 0.12,
              Math.max(BOARD_SURFACE_Y + 0.04, kPos.y + 0.08),
              kPos.z + (Math.random() - 0.5) * 0.12
            );
            scene.add(frag);
            shatterDebris.push({
              mesh: frag,
              baseScale: sz,
              offBoardDrop: true,
              vel: new THREE.Vector3(
                fallDirX * 0.65 + (Math.random() - 0.5) * 1.1,
                0.55 + Math.random() * 0.95,
                fallDirZ * 0.65 + (Math.random() - 0.5) * 1.1
              ),
              rotVel: new THREE.Vector3(Math.random() * 14, Math.random() * 14, Math.random() * 14),
              life: 1.35
            });
          }

          if (elapsed <= tRimCross) {
            // Phase 2A: Enemy King Launched Airborne Toward the Board Edge (Tumultuous Knockback Arc)
            checkmateState.phase = 'topple';
            const uFlight = Math.min(1, (elapsed - tChargeImpact) / (tRimCross - tChargeImpact));
            const horizDist = 0.03 + (distToBoardRim - 0.03) * easeOutCubic(uFlight);
            const parabolicArc = Math.sin(uFlight * Math.PI) * 0.42 + uFlight * 0.06;
            const pitchRad = 0.16 + uFlight * 1.48; // Tumbles past 94 degrees as it reaches the board rim
            const rollRad = Math.sin(uFlight * Math.PI * 2.5) * 0.28;
            applyKingKnockoffPose(horizDist, parabolicArc, pitchRad, rollRad);
          } else if (elapsed <= tLandOffBoard) {
            // Phase 2B: Board Rim Collision Bounce & Plunge Off the Edge of the Board!
            checkmateState.phase = 'impact';
            checkmateState.kingKnockedOffBoard = true;

            if (!rimBounceTriggered) {
              rimBounceTriggered = true;
              const rimWorldPos = new THREE.Vector3(
                homePos.x + fallDirX * distToBoardRim,
                BOARD_SURFACE_Y + 0.04,
                homePos.z + fallDirZ * distToBoardRim
              );
              spawnKingRimBounceDebris(rimWorldPos, defeatedColor, fallDirX, fallDirZ, killProfile);
            }

            // Directly trigger the #checkmate-overlay UI right as the King is knocked over the board edge!
            if (!bannerShown) {
              bannerShown = true;
              showCheckmateBanner(actualWinner, defeatedColor, isCheckWin, isTimeOutWin, triumphantPiece);
            }

            const uPlunge = Math.min(1, (elapsed - tRimCross) / (tLandOffBoard - tRimCross));
            const horizDist = distToBoardRim + (totalKnockoffDist - distToBoardRim) * easeOutCubic(uPlunge);
            // Rim bounce hop followed by gravity drop below BOARD_SURFACE_Y onto the lower altar (-0.18m)
            const rimBounceArc = Math.sin(uPlunge * Math.PI) * 0.22 - uPlunge * uPlunge * 0.18 + (1 - uPlunge) * 0.06;
            const pitchRad = 1.64 + uPlunge * 0.68; // Continues tumbling over the edge (up to ~133 deg)
            const rollRad = (1 - uPlunge) * 0.22 + uPlunge * 0.35;
            applyKingKnockoffPose(horizDist, rimBounceArc, pitchRad, rollRad);
          } else {
            // Phase 3: Off-Board Settle & Restitution Tremor on the Lower Altar Beyond the Board Rim
            checkmateState.phase = 'fallen';
            checkmateState.kingKnockedOffBoard = true;
            const uSettle = Math.min(1, (elapsed - tLandOffBoard) / Math.max(0.05, tTotal - tLandOffBoard));
            const settleBounce = Math.abs(Math.sin(uSettle * Math.PI * 2.0)) * 0.055 * (1 - uSettle);
            const pitchRad = 2.32 - settleBounce * 1.4;
            applyKingKnockoffPose(totalKnockoffDist, -0.18 + settleBounce, pitchRad, 0.35);
          }
        }

        if (elapsed >= tTotal) {
          checkmateState.phase = 'fallen';
          checkmateState.kingKnockedOffBoard = true;
          applyKingKnockoffPose(totalKnockoffDist, -0.18, 2.32, 0.35);
          if (!bannerShown) {
            showCheckmateBanner(actualWinner, defeatedColor, isCheckWin, isTimeOutWin, triumphantPiece);
          }
          return true;
        }
        return false;
      }

      activeMoveTweens.push(stepKingFall);
      return true;
    }

    function handleTimeOutDefeat(timedOutColor = currentTurn) {
      if (gameOver) return;
      gameOver = true;
      if (aiTimer) {
        clearTimeout(aiTimer);
        aiTimer = null;
      }
      preMoveHighlightTask = null;
      clearSquareHighlights();
      selectedSquare = null;
      validMoves = [];

      const winnerColor = timedOutColor === 'w' ? 'b' : 'w';
      const winner = winnerColor === 'w' ? 'White' : 'Black';
      const defeated = timedOutColor === 'w' ? 'White' : 'Black';
      const turnText = document.getElementById('turn-text');
      const preset = TIME_CONTROL_PRESETS[timeControlPresetId] || TIME_CONTROL_PRESETS.blitz_5;
      if (turnText) {
        turnText.textContent = `Time Out (${preset.shortLabel}) — ${winner} Wins!`;
      }

      if (!checkmateState.active) {
        triggerCheckmateSequence(timedOutColor, winnerColor, {
          isCheckWin: false,
          isTimeOutWin: true
        });
      }

      announceSanctumEvent('check_win', {
        winner,
        defeated,
        isCheckmate: false,
        isTimeOutWin: true
      });

      const isHumanWin =
        gameMode === 'pass' ||
        (gameMode === 'single' && winnerColor === playerColor) ||
        (gameMode === 'multi' && winnerColor === playerColor);

      window.dispatchEvent(
        new CustomEvent('wizardchess:matchwon', {
          detail: {
            winnerColor,
            defeatedColor: timedOutColor,
            gameMode,
            botDifficulty,
            timeControlCategory,
            timeControlPresetId,
            isHumanWin,
            isCheckWin: false,
            isTimeOutWin: true
          }
        })
      );
      emitClockTick();
      updateTurnUI();
    }

    // =========================================================================
    // UI & Turn Status Updates
    // =========================================================================
    function updateTurnUI() {
      const turnDot = document.getElementById('turn-dot');
      const turnText = document.getElementById('turn-text');
      const modeBadge = document.getElementById('mode-badge');
      const btnAiMove = document.getElementById('btn-ai-move');
      const btnSideToggle = document.getElementById('btn-side-toggle');
      const roomPill = document.getElementById('room-pill');
      const capturedTray = document.getElementById('captured-tray');

      turnDot.className = 'turn-dot' + (currentTurn === 'b' ? ' black' : '');

      const legalMoves = getAllLegalMoves(currentTurn);
      const inCheck = isKingInCheck(currentTurn, boardState);
      // In interactive gameplay (!scriptedGameActive), putting a King in Check immediately wins the match!
      const checkEndsMatchNow = inCheck && (!scriptedGameActive || legalMoves.length === 0);

      updateCheck3DIndicator(inCheck ? currentTurn : null);

      if (checkEndsMatchNow || legalMoves.length === 0) {
        const wasAlreadyOver = gameOver;
        gameOver = true;
        if (inCheck) {
          const winnerColor = currentTurn === 'w' ? 'b' : 'w';
          const winner = currentTurn === 'w' ? 'Black' : 'White';
          const defeated = currentTurn === 'w' ? 'White' : 'Black';
          const isCheckmate = legalMoves.length === 0;
          turnText.textContent = isCheckmate
            ? `Checkmate — ${winner} Wins`
            : `CHECK! — ${winner} Wins!`;
          if (!checkmateState.active) {
            triggerCheckmateSequence(currentTurn, winnerColor, { isCheckWin: !isCheckmate });
          }
          if (!wasAlreadyOver) {
            announceSanctumEvent('check_win', {
              winner,
              defeated,
              isCheckmate
            });
            const isHumanWin =
              gameMode === 'pass' ||
              (gameMode === 'single' && winnerColor === playerColor) ||
              (gameMode === 'multi' && winnerColor === playerColor);
            window.dispatchEvent(
              new CustomEvent('wizardchess:matchwon', {
                detail: {
                  winnerColor,
                  defeatedColor: currentTurn,
                  gameMode,
                  botDifficulty,
                  isHumanWin,
                  isCheckWin: !isCheckmate
                }
              })
            );
          }
        } else {
          turnText.textContent = 'Stalemate — Draw';
        }
      } else if (!matchStarted) {
        turnText.textContent = 'Select Game Mode';
      } else {
        const turnLabel = currentTurn === 'w' ? 'White to Move' : 'Black to Move';
        const aiColor = playerColor === 'w' ? 'b' : 'w';
        const isAiTurn = !scriptedGameActive && gameMode === 'single' && currentTurn === aiColor;
        if (inCheck) {
          turnText.textContent = `${turnLabel} (Check!)`;
          announceSanctumEvent('check_alert', {
            checkedSide: currentTurn === 'w' ? 'White' : 'Black'
          });
        } else if (isAiTurn) {
          turnText.textContent = `${turnLabel} (AI)...`;
        } else {
          turnText.textContent = turnLabel;
        }
      }

      if (modeBadge) {
        if (!matchStarted) {
          modeBadge.textContent = 'Sanctum Lobby';
        } else if (gameMode === 'pass') {
          modeBadge.textContent = `2P • ${currentTurn === 'w' ? 'P1 White' : 'P2 Black'}`;
        } else if (gameMode === 'multi') {
          modeBadge.textContent = `Online ${roomCode ? `[${roomCode}]` : ''}`;
        } else {
          const diffCap = botDifficulty.charAt(0).toUpperCase() + botDifficulty.slice(1);
          modeBadge.textContent = `Vs Bot (${diffCap})`;
        }
      }
      if (btnAiMove) {
        btnAiMove.style.display = gameMode === 'multi' ? 'none' : 'inline-flex';
      }
      if (btnSideToggle) {
        btnSideToggle.style.display = gameMode === 'single' ? 'inline-flex' : 'none';
        btnSideToggle.textContent = playerColor === 'w' ? 'Play as Black' : 'Play as White';
      }
      if (roomPill) {
        roomPill.style.display = 'none';
      }

      if (capturedByWhite > 0 || capturedByBlack > 0) {
        capturedTray.textContent = `Captured — White: ${capturedByWhite} | Black: ${capturedByBlack}`;
      } else {
        capturedTray.textContent = '';
      }
      if (typeof updateScriptBarUI === 'function') updateScriptBarUI();
      emitClockTick();
      window.dispatchEvent(
        new CustomEvent('wizardchess:statechange', {
          detail: {
            matchStarted,
            gameMode,
            botDifficulty,
            playerColor,
            currentTurn,
            roomCode,
            onlineQueueStatus,
            gameOver,
            inCheck,
            checkedColor: inCheck ? currentTurn : null,
            winnerColor: checkmateState.winnerColor,
            timeControlCategory,
            timeControlPresetId,
            timeControlSeconds,
            whiteTimeRemaining,
            blackTimeRemaining
          }
        })
      );
    }

    // =========================================================================
    // Raycasting & Board Interaction (Two-Tier Cylinder Hitbox + Board Plane Disambiguation)
    // =========================================================================
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let pointerDownPos = { x: 0, y: 0 };

    // Analytical ray-cylinder intersection for upright piece hitboxes so tall back-rank crowns,
    // wide wings, weapons, or glow sprites never steal clicks from pawns/pieces behind them.
    function intersectRayVerticalCylinder(ray, cx, cz, radius, yMin, yMax) {
      const ox = ray.origin.x;
      const oy = ray.origin.y;
      const oz = ray.origin.z;
      const dx = ray.direction.x;
      const dy = ray.direction.y;
      const dz = ray.direction.z;

      const rx = ox - cx;
      const rz = oz - cz;
      const a = dx * dx + dz * dz;
      const b = 2 * (rx * dx + rz * dz);
      const c = rx * rx + rz * rz - radius * radius;

      let tCylMin = -Infinity;
      let tCylMax = Infinity;
      if (a < 1e-8) {
        if (c > 0) return null;
      } else {
        const disc = b * b - 4 * a * c;
        if (disc < 0) return null;
        const sqrtD = Math.sqrt(disc);
        tCylMin = (-b - sqrtD) / (2 * a);
        tCylMax = (-b + sqrtD) / (2 * a);
      }

      let tYMin = -Infinity;
      let tYMax = Infinity;
      if (Math.abs(dy) < 1e-8) {
        if (oy < yMin || oy > yMax) return null;
      } else {
        const t1 = (yMin - oy) / dy;
        const t2 = (yMax - oy) / dy;
        tYMin = Math.min(t1, t2);
        tYMax = Math.max(t1, t2);
      }

      const tNear = Math.max(tCylMin, tYMin, 0);
      const tFar = Math.min(tCylMax, tYMax);
      if (tNear > tFar || tFar <= 0) return null;

      const tMid = 0.5 * (tNear + tFar);
      const yMid = oy + dy * tMid;
      const normHeight = Math.max(0, Math.min(1, (yMid - yMin) / Math.max(0.01, yMax - yMin)));
      const midX = ox + dx * tMid - cx;
      const midZ = oz + dz * tMid - cz;
      const normRadial = Math.hypot(midX, midZ) / Math.max(0.01, radius);

      return {
        tNear,
        tMid,
        yMid,
        normHeight,
        normRadial
      };
    }

    function resolveClickedSquareOnBoard(ray) {
      // 1. Intersect the 8x8 board square tiles / horizontal board surface plane
      let sqR = -1;
      let sqC = -1;
      const sqHits = raycaster.intersectObjects(boardSquareMeshes, false);
      if (sqHits.length > 0 && sqHits[0].object?.userData?.isSquare) {
        sqR = sqHits[0].object.userData.r;
        sqC = sqHits[0].object.userData.c;
      } else if (Math.abs(ray.direction.y) > 1e-5) {
        const tPlane = (BOARD_SURFACE_Y - ray.origin.y) / ray.direction.y;
        if (tPlane > 0) {
          const px = ray.origin.x + ray.direction.x * tPlane;
          const pz = ray.origin.z + ray.direction.z * tPlane;
          const c = Math.floor(px / BOARD_SQ_SIZE + 4);
          const r = Math.floor(pz / BOARD_SQ_SIZE + 4);
          if (r >= 0 && r < 8 && c >= 0 && c < 8) {
            sqR = r;
            sqC = c;
          }
        }
      }

      // 2. Test all pieces on the board against Tier 1 (Core Pedestal + Body) and Tier 2 (Upper Crown) cylinders
      const coreHits = [];
      const crownHits = [];
      const coreRadius = BOARD_SQ_SIZE * 0.34;
      const crownRadius = BOARD_SQ_SIZE * 0.25;

      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const p = boardState[r][c];
          if (!p || !p.mesh) continue;
          const wPos = boardToWorld(r, c);
          // Core height is capped at 0.72-0.75 * BOARD_SQ_SIZE so tall back-rank King/Queen crowns
          // never overhang the line of sight to the Pawn row in front of them.
          const coreH =
            p.type === 'pawn'
              ? BOARD_SQ_SIZE * 0.72
              : BOARD_SQ_SIZE * 0.75;
          const hitCore = intersectRayVerticalCylinder(
            ray,
            wPos.x,
            wPos.z,
            coreRadius,
            BOARD_SURFACE_Y,
            BOARD_SURFACE_Y + coreH
          );
          if (hitCore) {
            coreHits.push({
              r,
              c,
              piece: p,
              ...hitCore,
              onBoardSquare: r === sqR && c === sqC
            });
          } else {
            const crownMaxH =
              p.type === 'king' || p.type === 'queen'
                ? BOARD_SQ_SIZE * 1.16
                : BOARD_SQ_SIZE * 0.96;
            const hitCrown = intersectRayVerticalCylinder(
              ray,
              wPos.x,
              wPos.z,
              crownRadius,
              BOARD_SURFACE_Y + coreH,
              BOARD_SURFACE_Y + crownMaxH
            );
            if (hitCrown) {
              crownHits.push({
                r,
                c,
                piece: p,
                ...hitCrown
              });
            }
          }
        }
      }

      // 3. If a piece is currently selected and the ray lands on a valid destination square (sqR, sqC),
      // check if the user tapped an empty/enemy valid move square (unless they tapped directly onto the base/core of another friendly piece)
      if (selectedSquare && sqR !== -1 && sqC !== -1) {
        const isSqValidMove = validMoves.some(
          (m) =>
            (m.r === sqR && m.c === sqC) ||
            (m.castle && m.r === sqR && m.rookFromC === sqC)
        );
        if (isSqValidMove) {
          const directFriendlySwitch = coreHits.find(
            (h) =>
              h.piece.color === currentTurn &&
              (h.r !== selectedSquare.r || h.c !== selectedSquare.c) &&
              h.onBoardSquare &&
              h.normHeight < 0.55
          );
          if (!directFriendlySwitch) {
            return { r: sqR, c: sqC };
          }
        }
      }

      // 4. Disambiguate among Tier 1 Core Hits:
      // When looking down at the board, if a ray clips the upper portion of a closer piece (e.g. King at r=7)
      // AND hits the lower body/base of the piece behind it (e.g. Pawn at r=6) or the piece standing on (sqR, sqC),
      // always prefer the piece hit closer to the board surface (lower normHeight / matching sqR, sqC)!
      if (coreHits.length > 0) {
        coreHits.sort((a, b) => {
          const scoreA = a.normHeight * 1.35 + a.normRadial * 0.35 - (a.onBoardSquare ? 0.55 : 0);
          const scoreB = b.normHeight * 1.35 + b.normRadial * 0.35 - (b.onBoardSquare ? 0.55 : 0);
          return scoreA - scoreB;
        });
        return { r: coreHits[0].r, c: coreHits[0].c };
      }

      // 5. If no Tier 1 Core Hitbox was hit, check if the intersected board square (sqR, sqC) has a piece on it
      if (sqR !== -1 && sqC !== -1 && boardState[sqR][sqC]) {
        return { r: sqR, c: sqC };
      }

      // 6. Otherwise, if the user clicked the upper crown of a piece (Tier 2) and no piece stood behind it on (sqR, sqC)
      if (crownHits.length > 0) {
        crownHits.sort((a, b) => a.tNear - b.tNear);
        return { r: crownHits[0].r, c: crownHits[0].c };
      }

      // 7. Fall back to the empty board square hit
      return { r: sqR, c: sqC };
    }

    renderer.domElement.addEventListener('pointerdown', (e) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
    });

    renderer.domElement.addEventListener('pointerup', (e) => {
      const moveDist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
      if (moveDist > 12) return;
      if (!matchStarted || lobbyPaused || isAnimatingMove || gameOver) return;

      // Enforce turn ownership in Multiplayer, and in Single Player only block while AI auto-move timer is actively pending
      if (gameMode === 'multi' && currentTurn !== playerColor) return;
      if (!scriptedGameActive && gameMode === 'single' && currentTurn !== playerColor && aiTimer !== null) return;

      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);

      const { r: clickedR, c: clickedC } = resolveClickedSquareOnBoard(raycaster.ray);

      if (clickedR === -1 || clickedC === -1) {
        if (preMoveHighlightTask) preMoveHighlightTask = null;
        clearSquareHighlights();
        selectedSquare = null;
        validMoves = [];
        return;
      }

      // Cancel any pending scripted pre-move highlight timer when the user manually interacts with the board
      if (preMoveHighlightTask) {
        preMoveHighlightTask = null;
      }

      if (selectedSquare) {
        const move = validMoves.find(
          (m) =>
            (m.r === clickedR && m.c === clickedC) ||
            (m.castle && m.r === clickedR && m.rookFromC === clickedC)
        );
        if (move) {
          executeChessMove(selectedSquare.r, selectedSquare.c, move.r, move.c);
          return;
        }
      }

      const clickedPiece = boardState[clickedR][clickedC];
      if (clickedPiece && clickedPiece.color === currentTurn) {
        selectedSquare = { r: clickedR, c: clickedC };
        validMoves = getLegalMovesForPiece(clickedR, clickedC);
        showSquareHighlights(clickedR, clickedC, validMoves);
        sfxVfxManager.playSelectSfx(clickedPiece.type);
        sfxVfxManager.spawnSquarePulseVfx(boardToWorld(clickedR, clickedC), 0xf5d76e, 0.22, 0.34);
      } else {
        clearSquareHighlights();
        selectedSquare = null;
        validMoves = [];
      }
    });

    // =========================================================================
    // Multiplayer Room Synchronization (Same-Origin API + Static Site Fallback)
    // =========================================================================
    const CLOUD_MP_API_BASE = '';
    const isStaticHost =
      window.location.hostname.includes('zipline') ||
      window.location.hostname.includes('github.io') ||
      window.location.protocol === 'file:';

    const MATCHMAKING_TIMEOUT_MS = 30000;
    let matchmakingTimeoutTimer = null;
    let matchmakingCountdownTimer = null;
    let matchmakingStartedAt = 0;
    let matchmakingPreferredColor = 'any';
    let matchmakingRating = 1000;
    let matchmakingQueueSize = 1;

    function clearMatchmakingTimers() {
      if (matchmakingPollTimer) {
        clearInterval(matchmakingPollTimer);
        matchmakingPollTimer = null;
      }
      if (matchmakingTimeoutTimer) {
        clearTimeout(matchmakingTimeoutTimer);
        matchmakingTimeoutTimer = null;
      }
      if (matchmakingCountdownTimer) {
        clearInterval(matchmakingCountdownTimer);
        matchmakingCountdownTimer = null;
      }
    }

    let staticBroadcastChannel = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        staticBroadcastChannel = new BroadcastChannel('wizard_chess_mp_channel');
        staticBroadcastChannel.onmessage = (ev) => {
          const msg = ev.data;
          if (!msg) return;
          if (msg.type === 'room_state' && msg.room && msg.room.code === roomCode) {
            applyRemoteRoomState(msg.room);
          } else if (
            msg.type === 'static_queue_matched' &&
            onlineQueueStatus === 'searching' &&
            msg.targetToken === playerToken &&
            msg.code
          ) {
            handleMatchmakingSuccess(msg.code, msg.color || 'w', msg.room, msg.opponentRating);
          }
        };
      }
    } catch (e) {}

    window.addEventListener('storage', (ev) => {
      if (ev.key === `wizard_chess_room_${roomCode}` && ev.newValue) {
        try {
          applyRemoteRoomState(JSON.parse(ev.newValue));
        } catch (e) {}
      }
    });

    function getStaticRoom(code) {
      try {
        const raw = localStorage.getItem(`wizard_chess_room_${code}`);
        return raw ? JSON.parse(raw) : null;
      } catch (e) {
        return null;
      }
    }

    function saveAndBroadcastStaticRoom(room) {
      try {
        localStorage.setItem(`wizard_chess_room_${room.code}`, JSON.stringify(room));
      } catch (e) {}
      try {
        if (staticBroadcastChannel) {
          staticBroadcastChannel.postMessage({ type: 'room_state', room });
        }
      } catch (e) {}
    }

    function ensurePlayerToken() {
      if (!playerToken) {
        playerToken = 'tok_' + Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
        try {
          localStorage.setItem('wizard_chess_token', playerToken);
        } catch (e) {}
      }
      return playerToken;
    }

    async function mpApiRequest(apiPath, options = {}) {
      const bases = isStaticHost
        ? (CLOUD_MP_API_BASE ? [CLOUD_MP_API_BASE] : [])
        : (CLOUD_MP_API_BASE ? ['', CLOUD_MP_API_BASE] : ['']);
      for (const base of bases) {
        try {
          const res = await fetch(`${base}${apiPath}`, options);
          if (res.ok) {
            const ct = res.headers.get('content-type') || '';
            if (ct.includes('application/json')) {
              return await res.json();
            }
          }
        } catch (e) {}
      }
      return null;
    }

    function getLocalPlayerLoadout() {
      return {
        pieceType: currentPieceArchetype || 'gothic_warriors',
        pieceTypeName: currentPieceArchetypeName || 'Gothic Sanctum Warriors',
        pieceSkinId: currentPieceSkinObj?.id || 'pale_alabaster',
        pieceSkinName: currentPieceSkinObj?.name || 'Alabaster & Obsidian',
        pieceSkin: currentPieceSkinObj || null
      };
    }

    function syncRoomLoadouts(room, rebuildIfNeeded = true) {
      if (!room) return;
      if (room.whiteLoadout) {
        if (room.whiteLoadout.pieceSkin) {
          applySkinToSideMaterials('w', room.whiteLoadout.pieceSkin);
        }
        const nextWType = room.whiteLoadout.pieceType || 'gothic_warriors';
        if (whitePieceArchetype !== nextWType) {
          whitePieceArchetype = nextWType;
          if (rebuildIfNeeded && !isAnimatingMove) {
            rebuildBoardPieces('w');
          }
        }
      }
      if (room.blackLoadout) {
        if (room.blackLoadout.pieceSkin) {
          applySkinToSideMaterials('b', room.blackLoadout.pieceSkin);
        }
        const nextBType = room.blackLoadout.pieceType || 'gothic_warriors';
        if (blackPieceArchetype !== nextBType) {
          blackPieceArchetype = nextBType;
          if (rebuildIfNeeded && !isAnimatingMove) {
            rebuildBoardPieces('b');
          }
        }
      }
    }

    async function broadcastLocalLoadoutToRoom() {
      if (gameMode !== 'multi' || !roomCode) return;
      const mySide = playerColor === 'b' ? 'b' : 'w';
      const loadout = getLocalPlayerLoadout();

      const stRoom = getStaticRoom(roomCode);
      if (stRoom) {
        if (mySide === 'w') stRoom.whiteLoadout = loadout;
        else stRoom.blackLoadout = loadout;
        stRoom.updatedAt = Date.now();
        saveAndBroadcastStaticRoom(stRoom);
      }

      if (activeWebSocket && activeWebSocket.readyState === WebSocket.OPEN) {
        try {
          activeWebSocket.send(
            JSON.stringify({
              type: 'room:loadout',
              code: roomCode,
              color: mySide,
              loadout
            })
          );
        } catch (e) {}
      }

      await mpApiRequest(`/api/rooms/${roomCode}/loadout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ color: mySide, loadout })
      });
    }

    function ensureWebSocketConnection() {
      if (isStaticHost) return null;
      if (activeWebSocket && (activeWebSocket.readyState === WebSocket.OPEN || activeWebSocket.readyState === WebSocket.CONNECTING)) {
        return activeWebSocket;
      }
      try {
        const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${proto}//${window.location.host}/ws`;
        const ws = new WebSocket(wsUrl);
        activeWebSocket = ws;

        ws.addEventListener('open', () => {
          if (onlineQueueStatus === 'searching') {
            ws.send(
              JSON.stringify({
                type: 'queue:join',
                playerToken: ensurePlayerToken(),
                preferredColor: matchmakingPreferredColor,
                rating: matchmakingRating,
                loadout: getLocalPlayerLoadout()
              })
            );
          } else if (gameMode === 'multi' && roomCode) {
            ws.send(JSON.stringify({ type: 'room:subscribe', code: roomCode, playerToken: ensurePlayerToken() }));
          }
        });

        ws.addEventListener('message', (ev) => {
          try {
            const msg = JSON.parse(String(ev.data));
            if (!msg || !msg.type) return;
            if (msg.type === 'queue:matched' && msg.code) {
              handleMatchmakingSuccess(msg.code, msg.color || 'w', msg.room, msg.opponentRating);
            } else if (msg.type === 'queue:searching') {
              if (typeof msg.queueSize === 'number') {
                matchmakingQueueSize = Math.max(1, msg.queueSize);
              }
            } else if (msg.type === 'queue:timeout') {
              if (onlineQueueStatus === 'searching') {
                cancelOnlineMatchmaking('timeout');
              }
            } else if (msg.type === 'room:state' && msg.room && msg.room.code === roomCode) {
              saveAndBroadcastStaticRoom(msg.room);
              applyRemoteRoomState(msg.room);
            }
          } catch (e) {}
        });

        ws.addEventListener('close', () => {
          if (activeWebSocket === ws) {
            activeWebSocket = null;
          }
        });
        return ws;
      } catch (e) {
        return null;
      }
    }

    async function sendMultiplayerMove(movePayload) {
      if (!roomCode) return;
      // 1. Update static local/BroadcastChannel room store immediately
      const stRoom = getStaticRoom(roomCode);
      if (stRoom) {
        stRoom.moves = stRoom.moves || [];
        stRoom.moves.push({
          seq: stRoom.moves.length + 1,
          color: movePayload.color,
          from: movePayload.from,
          to: movePayload.to,
          promotion: movePayload.promotion || 'queen',
          ts: Date.now()
        });
        stRoom.turn = movePayload.color === 'w' ? 'b' : 'w';
        stRoom.updatedAt = Date.now();
        saveAndBroadcastStaticRoom(stRoom);
      }
      // 2. Send via active WebSocket if open
      if (activeWebSocket && activeWebSocket.readyState === WebSocket.OPEN) {
        try {
          activeWebSocket.send(
            JSON.stringify({
              type: 'room:move',
              code: roomCode,
              ...movePayload
            })
          );
        } catch (e) {}
      }
      // 3. Also broadcast to cloud/local room REST API
      await mpApiRequest(`/api/rooms/${roomCode}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(movePayload)
      });
    }

    function stopMultiplayerSync() {
      if (roomEventSource) {
        roomEventSource.close();
        roomEventSource = null;
      }
      if (roomPollTimer) {
        clearInterval(roomPollTimer);
        roomPollTimer = null;
      }
      clearMatchmakingTimers();
    }

    function applyRemoteRoomState(room) {
      if (!room) return;
      syncRoomLoadouts(room, true);

      const statusEl = document.getElementById('hud-room-status');
      const bothReady = room.whiteJoined && room.blackJoined;
      if (statusEl) {
        statusEl.textContent = bothReady ? '2/2 Connected' : 'Waiting for Opponent';
      }
      const mpMsg = document.getElementById('mp-status-msg');
      if (mpMsg && roomCode) {
        mpMsg.textContent = bothReady
          ? `Both players connected to Room ${room.code}!`
          : `Room ${room.code} ready — waiting for second player to join...`;
      }

      window.dispatchEvent(
        new CustomEvent('wizardchess:roomupdate', {
          detail: {
            code: room.code,
            bothReady,
            room
          }
        })
      );

      if (room.resetCount > appliedResetCount) {
        appliedResetCount = room.resetCount;
        appliedMoveSeq = 0;
        resetChessBoard(false);
      }

      if (Array.isArray(room.moves) && room.moves.length > appliedMoveSeq) {
        const tryApplyNext = () => {
          if (isAnimatingMove) {
            setTimeout(tryApplyNext, 120);
            return;
          }
          if (appliedMoveSeq >= room.moves.length) return;
          const nextMove = room.moves[appliedMoveSeq];
          appliedMoveSeq = nextMove.seq || (appliedMoveSeq + 1);
          const pieceAtFrom = boardState[nextMove.from.r]?.[nextMove.from.c];
          if (pieceAtFrom) {
            executeChessMove(
              nextMove.from.r,
              nextMove.from.c,
              nextMove.to.r,
              nextMove.to.c,
              { fromRemote: true }
            );
          }
          if (appliedMoveSeq < room.moves.length) {
            setTimeout(tryApplyNext, 250);
          }
        };
        tryApplyNext();
      }
    }

    function startMultiplayerSync(code) {
      stopMultiplayerSync();
      roomCode = code;

      const ws = ensureWebSocketConnection();
      if (ws && ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify({ type: 'room:subscribe', code, playerToken: ensurePlayerToken() }));
        } catch (e) {}
      }

      if (!isStaticHost) {
        try {
          roomEventSource = new EventSource(`/api/rooms/${code}/events`);
          roomEventSource.onmessage = (ev) => {
            try {
              const data = JSON.parse(ev.data);
              if (data.room) applyRemoteRoomState(data.room);
            } catch (e) {}
          };
        } catch (e) {}
      }

      roomPollTimer = setInterval(async () => {
        if (gameMode !== 'multi' || !roomCode) return;
        const data = await mpApiRequest(
          `/api/rooms/${roomCode}/state?playerToken=${encodeURIComponent(playerToken)}`
        );
        if (data && data.ok && data.room) {
          saveAndBroadcastStaticRoom(data.room);
          applyRemoteRoomState(data.room);
          return;
        }
        const stRoom = getStaticRoom(roomCode);
        if (stRoom) {
          applyRemoteRoomState(stRoom);
        }
      }, 1500);
    }

    function handleMatchmakingSuccess(code, assignedColor, roomObj, opponentRating = 1000) {
      clearMatchmakingTimers();
      lobbyPaused = false;
      matchStarted = true;
      sfxVfxManager.setLobbyMusicActive?.(false);
      orbitControls.enabled = true;
      onlineQueueStatus = 'matched';
      scriptedGameActive = false;
      gameMode = 'multi';
      playerColor = assignedColor === 'b' ? 'b' : 'w';
      roomCode = code;
      appliedMoveSeq = 0;
      appliedResetCount = roomObj?.resetCount || 0;

      // Ensure our own side starts with our local loadout and sync opponent's loadout from roomObj
      const myLoadout = getLocalPlayerLoadout();
      if (playerColor === 'w') {
        whitePieceArchetype = myLoadout.pieceType;
        if (myLoadout.pieceSkin) applySkinToSideMaterials('w', myLoadout.pieceSkin);
      } else {
        blackPieceArchetype = myLoadout.pieceType;
        if (myLoadout.pieceSkin) applySkinToSideMaterials('b', myLoadout.pieceSkin);
      }
      if (roomObj) {
        if (playerColor === 'w' && !roomObj.whiteLoadout) roomObj.whiteLoadout = myLoadout;
        if (playerColor === 'b' && !roomObj.blackLoadout) roomObj.blackLoadout = myLoadout;
        syncRoomLoadouts(roomObj, false);
        saveAndBroadcastStaticRoom(roomObj);
      }

      resetChessBoard(true);
      startMultiplayerSync(roomCode);
      if (roomObj) {
        applyRemoteRoomState(roomObj);
      }
      broadcastLocalLoadoutToRoom();
      window.history.replaceState({}, '', `?room=${roomCode}`);
      window.dispatchEvent(
        new CustomEvent('wizardchess:matchfound', {
          detail: {
            code: roomCode,
            color: playerColor,
            opponentRating: opponentRating || 1000,
            room: roomObj
          }
        })
      );
      updateTurnUI();
    }

    function emitMatchmakingTick() {
      if (onlineQueueStatus !== 'searching') return;
      const elapsedMs = Math.max(0, Date.now() - matchmakingStartedAt);
      const remainingMs = Math.max(0, MATCHMAKING_TIMEOUT_MS - elapsedMs);
      const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));
      const ratingWindow = 150 + Math.floor(elapsedMs / 1000) * 45;
      window.dispatchEvent(
        new CustomEvent('wizardchess:matchmakingtick', {
          detail: {
            elapsedMs,
            remainingMs,
            remainingSec,
            timeoutSec: 30,
            rating: matchmakingRating,
            ratingWindow,
            queueSize: matchmakingQueueSize
          }
        })
      );
      if (elapsedMs >= MATCHMAKING_TIMEOUT_MS) {
        cancelOnlineMatchmaking('timeout');
      }
    }

    async function startOnlineMatchmaking(preferredColor = 'any', rating = 1000) {
      stopMultiplayerSync();
      ensurePlayerToken();
      matchmakingPreferredColor =
        preferredColor === 'w' || preferredColor === 'b' ? preferredColor : 'any';
      matchmakingRating = Number(rating) || 1000;
      matchmakingStartedAt = Date.now();
      matchmakingQueueSize = 1;
      onlineQueueStatus = 'searching';
      updateTurnUI();
      emitMatchmakingTick();

      // Automatically cancel matchmaking after 30 seconds if no suitable opponent is found
      matchmakingTimeoutTimer = setTimeout(() => {
        if (onlineQueueStatus === 'searching') {
          cancelOnlineMatchmaking('timeout');
        }
      }, MATCHMAKING_TIMEOUT_MS);

      matchmakingCountdownTimer = setInterval(() => {
        emitMatchmakingTick();
      }, 250);

      const myLoadout = getLocalPlayerLoadout();
      const ws = ensureWebSocketConnection();
      if (ws && ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(
            JSON.stringify({
              type: 'queue:join',
              playerToken,
              preferredColor: matchmakingPreferredColor,
              rating: matchmakingRating,
              loadout: myLoadout
            })
          );
        } catch (e) {}
      }

      const pollMatch = async () => {
        if (onlineQueueStatus !== 'searching') return;
        if (Date.now() - matchmakingStartedAt >= MATCHMAKING_TIMEOUT_MS) {
          cancelOnlineMatchmaking('timeout');
          return;
        }
        const currentLoadout = getLocalPlayerLoadout();
        const res = await mpApiRequest('/api/matchmaking/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerToken,
            preferredColor: matchmakingPreferredColor,
            rating: matchmakingRating,
            loadout: currentLoadout
          })
        });
        if (onlineQueueStatus !== 'searching') return;
        if (res && res.ok) {
          if (typeof res.queueSize === 'number') {
            matchmakingQueueSize = Math.max(1, res.queueSize);
          }
          if (res.status === 'matched' && res.code) {
            handleMatchmakingSuccess(res.code, res.color, res.room, res.opponentRating);
            return;
          }
        }
        // Fallback cross-tab matchmaking queue via localStorage if server is static
        if (!res) {
          try {
            const rawQ = localStorage.getItem('wizard_chess_static_queue');
            const parsedQ = rawQ ? JSON.parse(rawQ) : null;
            const now = Date.now();
            if (
              parsedQ &&
              parsedQ.playerToken !== playerToken &&
              now - parsedQ.ts < MATCHMAKING_TIMEOUT_MS
            ) {
              const waitSec = Math.max(0, (now - parsedQ.ts) / 1000);
              const allowedDelta = 150 + waitSec * 45;
              const ratingDelta = Math.abs((parsedQ.rating || 1000) - matchmakingRating);
              if (ratingDelta <= allowedDelta || waitSec >= 8) {
                localStorage.removeItem('wizard_chess_static_queue');
                const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
                let genCode = '';
                for (let i = 0; i < 4; i++) {
                  genCode += chars[Math.floor(Math.random() * chars.length)];
                }
                let oppColor = 'w';
                let myColor = 'b';
                if (parsedQ.preferredColor === 'b' && matchmakingPreferredColor !== 'b') {
                  oppColor = 'b';
                  myColor = 'w';
                } else if (matchmakingPreferredColor === 'w' && parsedQ.preferredColor !== 'w') {
                  myColor = 'w';
                  oppColor = 'b';
                }
                const staticRoom = {
                  code: genCode,
                  status: 'playing',
                  whiteJoined: true,
                  blackJoined: true,
                  whiteLoadout: myColor === 'w' ? currentLoadout : parsedQ.loadout || null,
                  blackLoadout: myColor === 'b' ? currentLoadout : parsedQ.loadout || null,
                  turn: 'w',
                  moves: [],
                  resetCount: 0,
                  updatedAt: now
                };
                saveAndBroadcastStaticRoom(staticRoom);
                if (staticBroadcastChannel) {
                  staticBroadcastChannel.postMessage({
                    type: 'static_queue_matched',
                    targetToken: parsedQ.playerToken,
                    code: genCode,
                    color: oppColor,
                    opponentRating: matchmakingRating,
                    room: staticRoom
                  });
                }
                handleMatchmakingSuccess(genCode, myColor, staticRoom, parsedQ.rating || 1000);
                return;
              }
            } else if (!parsedQ || parsedQ.playerToken === playerToken || now - parsedQ.ts >= MATCHMAKING_TIMEOUT_MS) {
              localStorage.setItem(
                'wizard_chess_static_queue',
                JSON.stringify({
                  playerToken,
                  preferredColor: matchmakingPreferredColor,
                  rating: matchmakingRating,
                  loadout: currentLoadout,
                  ts: matchmakingStartedAt
                })
              );
            }
          } catch (e) {}
        }
      };

      await pollMatch();
      if (onlineQueueStatus === 'searching') {
        matchmakingPollTimer = setInterval(pollMatch, 1200);
      }
    }

    async function cancelOnlineMatchmaking(reason = 'user') {
      const wasSearching = onlineQueueStatus === 'searching';
      clearMatchmakingTimers();
      onlineQueueStatus = 'idle';

      try {
        const rawQ = localStorage.getItem('wizard_chess_static_queue');
        if (rawQ) {
          const parsedQ = JSON.parse(rawQ);
          if (parsedQ && parsedQ.playerToken === playerToken) {
            localStorage.removeItem('wizard_chess_static_queue');
          }
        }
      } catch (e) {}

      if (activeWebSocket && activeWebSocket.readyState === WebSocket.OPEN) {
        try {
          activeWebSocket.send(JSON.stringify({ type: 'queue:leave', playerToken }));
        } catch (e) {}
      }
      await mpApiRequest('/api/matchmaking/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerToken })
      });

      if (wasSearching && reason === 'timeout') {
        window.dispatchEvent(
          new CustomEvent('wizardchess:matchmakingtimeout', {
            detail: { timeoutSec: 30 }
          })
        );
      }
      updateTurnUI();
    }

    function startBotMatch(difficulty = 'medium', side = 'w', timeControlOpt = null) {
      document.getElementById('loading-overlay')?.classList.add('hidden');
      cancelOnlineMatchmaking();
      stopMultiplayerSync();
      if (timeControlOpt) {
        setTimeControl(timeControlOpt, false);
      }
      lobbyPaused = false;
      matchStarted = true;
      sfxVfxManager.setLobbyMusicActive?.(false);
      orbitControls.enabled = true;
      scriptedGameActive = false;
      gameMode = 'single';
      botDifficulty = ['easy', 'medium', 'hard'].includes(difficulty) ? difficulty : 'medium';
      roomCode = null;
      onlineQueueStatus = 'idle';
      playerColor = side === 'b' ? 'b' : 'w';
      whitePieceArchetype = currentPieceArchetype;
      blackPieceArchetype = currentPieceArchetype;
      if (currentPieceSkinObj) {
        applySkinToSideMaterials('w', currentPieceSkinObj);
        applySkinToSideMaterials('b', currentPieceSkinObj);
      }
      window.history.replaceState({}, '', window.location.pathname);
      resetChessBoard(true);
      setCameraForSide(playerColor, true);
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.shadowMap.needsUpdate = true;
      renderer.render(scene, camera);
    }

    function startPassAndPlayMatch(autoFlip = true, timeControlOpt = null) {
      document.getElementById('loading-overlay')?.classList.add('hidden');
      cancelOnlineMatchmaking();
      stopMultiplayerSync();
      if (timeControlOpt) {
        setTimeControl(timeControlOpt, false);
      }
      lobbyPaused = false;
      matchStarted = true;
      sfxVfxManager.setLobbyMusicActive?.(false);
      orbitControls.enabled = true;
      scriptedGameActive = false;
      gameMode = 'pass';
      passAutoFlip = Boolean(autoFlip);
      roomCode = null;
      onlineQueueStatus = 'idle';
      playerColor = 'w';
      whitePieceArchetype = currentPieceArchetype;
      blackPieceArchetype = currentPieceArchetype;
      if (currentPieceSkinObj) {
        applySkinToSideMaterials('w', currentPieceSkinObj);
        applySkinToSideMaterials('b', currentPieceSkinObj);
      }
      window.history.replaceState({}, '', window.location.pathname);
      resetChessBoard(true);
      setCameraForSide('w', true);
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.shadowMap.needsUpdate = true;
      renderer.render(scene, camera);
    }

    function quitMatchToLobby() {
      cancelOnlineMatchmaking();
      stopMultiplayerSync();
      if (aiTimer) {
        clearTimeout(aiTimer);
        aiTimer = null;
      }
      preMoveHighlightTask = null;
      activeMoveTweens.length = 0;
      isAnimatingMove = false;
      matchStarted = false;
      lobbyPaused = true;
      gameOver = false;
      scriptedGameActive = false;
      scriptDeviated = false;
      roomCode = null;
      onlineQueueStatus = 'idle';
      heldCameraKeys.clear();
      orbitControls.enabled = false;
      for (const d of shatterDebris) {
        if (d.mesh) scene.remove(d.mesh);
      }
      shatterDebris.length = 0;
      impactFlashLight.intensity = 0;
      impactFlashLight.visible = false;
      const overlay = document.getElementById('checkmate-overlay');
      if (overlay) overlay.classList.remove('visible');
      sfxVfxManager.clearAllVfx?.();
      sfxVfxManager.stopAllGameplayAudio?.();
      sfxVfxManager.setLobbyMusicActive?.(true);
      window.history.replaceState({}, '', window.location.pathname);
      resetChessBoard(true, false);
      renderer.shadowMap.needsUpdate = true;
      renderer.render(scene, camera);
    }

    async function createMultiplayerRoom(preferredColor) {
      cancelOnlineMatchmaking();
      const mpMsg = document.getElementById('mp-status-msg');
      if (mpMsg) mpMsg.textContent = 'Creating room...';
      ensurePlayerToken();
      const myLoadout = getLocalPlayerLoadout();

      let data = await mpApiRequest('/api/rooms/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferredColor, playerToken, loadout: myLoadout })
      });

      // Pure static fallback if neither local nor remote server is reachable
      if (!data || !data.ok) {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let genCode = '';
        for (let i = 0; i < 4; i++) {
          genCode += chars[Math.floor(Math.random() * chars.length)];
        }
        const side = preferredColor === 'b' ? 'b' : 'w';
        const staticRoom = {
          code: genCode,
          status: 'waiting',
          whiteJoined: side === 'w',
          blackJoined: side === 'b',
          whiteLoadout: side === 'w' ? myLoadout : null,
          blackLoadout: side === 'b' ? myLoadout : null,
          turn: 'w',
          moves: [],
          resetCount: 0,
          updatedAt: Date.now()
        };
        saveAndBroadcastStaticRoom(staticRoom);
        data = {
          ok: true,
          code: genCode,
          color: side,
          playerToken,
          room: staticRoom
        };
      } else if (data.room) {
        saveAndBroadcastStaticRoom(data.room);
      }

      playerToken = data.playerToken;
      try {
        localStorage.setItem('wizard_chess_token', playerToken);
      } catch (e) {}
      matchStarted = true;
      scriptedGameActive = false;
      gameMode = 'multi';
      onlineQueueStatus = 'matched';
      playerColor = data.color;
      roomCode = data.code;
      appliedMoveSeq = 0;
      appliedResetCount = data.room.resetCount || 0;

      if (playerColor === 'w') {
        whitePieceArchetype = myLoadout.pieceType;
        if (myLoadout.pieceSkin) applySkinToSideMaterials('w', myLoadout.pieceSkin);
      } else {
        blackPieceArchetype = myLoadout.pieceType;
        if (myLoadout.pieceSkin) applySkinToSideMaterials('b', myLoadout.pieceSkin);
      }
      if (data.room) {
        syncRoomLoadouts(data.room, false);
      }

      const modalRoomEl = document.getElementById('modal-room-code');
      if (modalRoomEl) modalRoomEl.textContent = roomCode;
      const createdPanelEl = document.getElementById('room-created-panel');
      if (createdPanelEl) createdPanelEl.style.display = 'block';

      resetChessBoard(true);
      startMultiplayerSync(roomCode);
      applyRemoteRoomState(data.room);
      window.history.replaceState({}, '', `?room=${roomCode}`);
      return { code: roomCode, color: playerColor, room: data.room };
    }

    async function joinMultiplayerRoom(codeInput) {
      cancelOnlineMatchmaking();
      const code = String(codeInput || '').trim().toUpperCase();
      const mpMsg = document.getElementById('mp-status-msg');
      if (!code) {
        if (mpMsg) mpMsg.textContent = 'Please enter a 4-character Room Code.';
        return false;
      }
      if (mpMsg) mpMsg.textContent = `Joining room ${code}...`;
      ensurePlayerToken();
      const myLoadout = getLocalPlayerLoadout();

      let data = await mpApiRequest('/api/rooms/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, playerToken, loadout: myLoadout })
      });

      if (!data || !data.ok) {
        let stRoom = getStaticRoom(code);
        let assignedColor = 'b';
        if (!stRoom) {
          assignedColor = 'w';
          stRoom = {
            code,
            status: 'playing',
            whiteJoined: true,
            blackJoined: true,
            whiteLoadout: myLoadout,
            blackLoadout: null,
            turn: 'w',
            moves: [],
            resetCount: 0,
            updatedAt: Date.now()
          };
        } else {
          if (!stRoom.whiteJoined) {
            stRoom.whiteJoined = true;
            assignedColor = 'w';
            stRoom.whiteLoadout = myLoadout;
          } else {
            stRoom.blackJoined = true;
            assignedColor = 'b';
            stRoom.blackLoadout = myLoadout;
          }
          stRoom.status = stRoom.whiteJoined && stRoom.blackJoined ? 'playing' : 'waiting';
          stRoom.updatedAt = Date.now();
        }
        saveAndBroadcastStaticRoom(stRoom);
        data = {
          ok: true,
          code,
          color: assignedColor,
          playerToken,
          room: stRoom
        };
      } else if (data.room) {
        saveAndBroadcastStaticRoom(data.room);
      }

      playerToken = data.playerToken;
      try {
        localStorage.setItem('wizard_chess_token', playerToken);
      } catch (e) {}
      matchStarted = true;
      scriptedGameActive = false;
      gameMode = 'multi';
      onlineQueueStatus = 'matched';
      playerColor = data.color;
      roomCode = data.code;
      appliedMoveSeq = 0;
      appliedResetCount = data.room.resetCount || 0;

      if (playerColor === 'w') {
        whitePieceArchetype = myLoadout.pieceType;
        if (myLoadout.pieceSkin) applySkinToSideMaterials('w', myLoadout.pieceSkin);
      } else {
        blackPieceArchetype = myLoadout.pieceType;
        if (myLoadout.pieceSkin) applySkinToSideMaterials('b', myLoadout.pieceSkin);
      }
      if (data.room) {
        syncRoomLoadouts(data.room, false);
      }

      resetChessBoard(true);
      startMultiplayerSync(roomCode);
      applyRemoteRoomState(data.room);
      broadcastLocalLoadoutToRoom();
      window.history.replaceState({}, '', `?room=${roomCode}`);
      closeLobbyModal();
      return true;
    }

    // =========================================================================
    // Camera Presets & HUD Controls
    // =========================================================================
    const camButtons = [
      'btn-cam-player',
      'btn-cam-top',
      'btn-cam-side',
      'btn-cam-wide'
    ];

    function setActiveCamButton(activeId) {
      for (const id of camButtons) {
        const el = document.getElementById(id);
        if (el) el.classList.toggle('active', id === activeId);
      }
    }

    let playerCamSide = 'w';     // toggles 'w' (White) <-> 'b' (Black) on repeat click of Player Cam
    let overheadCamSide = 'w';   // toggles 'w' (White) <-> 'b' (Black) on repeat click of Overhead
    let sideCamSide = 'east';    // toggles 'east' (+X) <-> 'west' (-X) on repeat click of Side
    let cathedralWideSide = 'north'; // toggles 'north' (Rose Window) <-> 'south' (Narthex Triptych) on repeat click of Cathedral

    function setCameraPose(posArr, targetArr) {
      activeCamTransition = null;
      if (Array.isArray(posArr) && posArr.length === 3) {
        camera.position.set(posArr[0], posArr[1], posArr[2]);
      }
      if (Array.isArray(targetArr) && targetArr.length === 3) {
        orbitControls.target.set(targetArr[0], targetArr[1], targetArr[2]);
      }
      enforceCathedralBoundsAndSolidColumns(null, camera.position, orbitControls.target);
      flushOrbitControlsDamping();
    }

    function setCameraPreset(preset) {
      if (preset === 'player') {
        const wasPlayerActive = document.getElementById('btn-cam-player')?.classList.contains('active');
        if (wasPlayerActive) {
          playerCamSide = playerCamSide === 'w' ? 'b' : 'w';
        } else {
          playerCamSide = playerColor === 'b' ? 'b' : 'w';
        }
        setActiveCamButton('btn-cam-player');
        setCameraForSide(playerCamSide, false);
      } else if (preset === 'top') {
        const wasTopActive = document.getElementById('btn-cam-top')?.classList.contains('active');
        if (wasTopActive) {
          overheadCamSide = overheadCamSide === 'w' ? 'b' : 'w';
        } else {
          overheadCamSide = playerColor === 'b' ? 'b' : 'w';
        }
        setActiveCamButton('btn-cam-top');
        const zSign = overheadCamSide === 'b' ? -1 : 1;
        smoothCameraTo(new THREE.Vector3(0, 6.85, zSign * 3.65), new THREE.Vector3(0, 0.78, 0), 0.75);
      } else if (preset === 'side') {
        const wasSideActive = document.getElementById('btn-cam-side')?.classList.contains('active');
        if (wasSideActive) {
          sideCamSide = sideCamSide === 'east' ? 'west' : 'east';
        } else {
          sideCamSide = 'east';
        }
        setActiveCamButton('btn-cam-side');
        const xSign = sideCamSide === 'west' ? -1 : 1;
        smoothCameraTo(new THREE.Vector3(xSign * 2.85, 1.85, 0), new THREE.Vector3(0, 0.84, 0), 0.75);
      } else if (preset === 'wide') {
        const wasWideActive = document.getElementById('btn-cam-wide')?.classList.contains('active');
        if (wasWideActive) {
          cathedralWideSide = cathedralWideSide === 'north' ? 'south' : 'north';
        } else {
          cathedralWideSide = playerColor === 'b' ? 'south' : 'north';
        }
        setActiveCamButton('btn-cam-wide');
        if (currentWorldSceneryId !== 'gothic_cathedral') {
          const zSign = cathedralWideSide === 'south' ? -1 : 1;
          smoothCameraTo(new THREE.Vector3(zSign * 3.6, 3.25, zSign * 7.8), new THREE.Vector3(0, 1.85, -zSign * 4.2), 0.85);
        } else if (cathedralWideSide === 'south') {
          // Black's wide Cathedral perspective looking South toward the Narthex Triptych (chessboard centered in frame)
          smoothCameraTo(new THREE.Vector3(0, 2.55, -6.65), new THREE.Vector3(0, 1.95, 2.50), 0.85);
        } else {
          // White's wide Cathedral perspective looking North toward the Rose Window (chessboard centered in frame)
          smoothCameraTo(new THREE.Vector3(0, 2.55, 6.65), new THREE.Vector3(0, 1.95, -2.50), 0.85);
        }
      } else if (preset === 'white_backdrop') {
        smoothCameraTo(new THREE.Vector3(0, 2.35, -3.10), new THREE.Vector3(0, 2.20, 8.50), 0.85);
      } else if (preset === 'vaults') {
        smoothCameraTo(new THREE.Vector3(-1.60, 2.65, 3.20), new THREE.Vector3(2.20, 7.60, -9.50), 0.85);
      } else if (preset === 'side_windows') {
        smoothCameraTo(new THREE.Vector3(-1.40, 2.30, 0.60), new THREE.Vector3(5.20, 4.10, -5.80), 0.85);
      } else if (preset === 'back_windows') {
        smoothCameraTo(new THREE.Vector3(0, 3.40, -7.80), new THREE.Vector3(0, 4.60, -18.10), 0.85);
      } else if (preset === 'rear_windows') {
        smoothCameraTo(new THREE.Vector3(0, 3.40, 7.80), new THREE.Vector3(0, 4.60, 18.10), 0.85);
      }
    }

    document.getElementById('btn-cam-player')?.addEventListener('click', () => setCameraPreset('player'));
    document.getElementById('btn-cam-top')?.addEventListener('click', () => setCameraPreset('top'));
    document.getElementById('btn-cam-side')?.addEventListener('click', () => setCameraPreset('side'));
    document.getElementById('btn-cam-wide')?.addEventListener('click', () => setCameraPreset('wide'));
    document.getElementById('btn-hide-ui')?.addEventListener('click', () => toggleUI());

    document.getElementById('btn-script-modal')?.addEventListener('click', () => openLobbyModal('script'));
    document.getElementById('btn-script-prev')?.addEventListener('click', () => stepScriptBackward());
    document.getElementById('btn-script-next')?.addEventListener('click', () => stepScriptForward());

    document.getElementById('btn-ai-move')?.addEventListener('click', () => {
      triggerAIMoveNow();
    });

    document.getElementById('btn-side-toggle')?.addEventListener('click', () => {
      if (gameMode !== 'single') return;
      playerColor = playerColor === 'w' ? 'b' : 'w';
      resetChessBoard(true, scriptedGameActive);
    });

    document.getElementById('btn-reset')?.addEventListener('click', async () => {
      if (gameMode === 'multi' && roomCode) {
        const stRoom = getStaticRoom(roomCode);
        if (stRoom) {
          stRoom.moves = [];
          stRoom.turn = 'w';
          stRoom.resetCount = (stRoom.resetCount || 0) + 1;
          stRoom.updatedAt = Date.now();
          saveAndBroadcastStaticRoom(stRoom);
          applyRemoteRoomState(stRoom);
        }
        if (activeWebSocket && activeWebSocket.readyState === WebSocket.OPEN) {
          try {
            activeWebSocket.send(JSON.stringify({ type: 'room:reset', code: roomCode, playerToken }));
          } catch (e) {}
        }
        await mpApiRequest(`/api/rooms/${roomCode}/reset`, { method: 'POST' });
      } else {
        resetChessBoard(true, false);
      }
    });

    // =========================================================================
    // Lobby & Director Script Modal Interactions
    // =========================================================================
    const lobbyModal = document.getElementById('lobby-modal');
    let selectedSpColor = 'w';
    let selectedMpColor = 'w';

    function openLobbyModal(tab = null) {
      lobbyModal?.classList.add('open');
      if (tab === 'multi') switchLobbyTab('multi');
      else if (tab === 'script') switchLobbyTab('script');
      else if (tab === 'single') switchLobbyTab('single');
    }

    function closeLobbyModal() {
      lobbyModal?.classList.remove('open');
    }

    function switchLobbyTab(tab) {
      const isSingle = tab === 'single';
      const isMulti = tab === 'multi';
      const isScript = tab === 'script';
      document.getElementById('tab-single')?.classList.toggle('active', isSingle);
      document.getElementById('tab-multi')?.classList.toggle('active', isMulti);
      document.getElementById('tab-script')?.classList.toggle('active', isScript);
      const pSingle = document.getElementById('panel-single');
      const pMulti = document.getElementById('panel-multi');
      const pScript = document.getElementById('panel-script');
      if (pSingle) pSingle.style.display = isSingle ? 'block' : 'none';
      if (pMulti) pMulti.style.display = isMulti ? 'block' : 'none';
      if (pScript) pScript.style.display = isScript ? 'block' : 'none';
    }

    document.getElementById('btn-lobby')?.addEventListener('click', () => openLobbyModal());
    document.getElementById('btn-close-lobby')?.addEventListener('click', closeLobbyModal);
    document.getElementById('tab-single')?.addEventListener('click', () => switchLobbyTab('single'));
    document.getElementById('tab-multi')?.addEventListener('click', () => switchLobbyTab('multi'));
    document.getElementById('tab-script')?.addEventListener('click', () => switchLobbyTab('script'));

    document.getElementById('btn-preset-scandi')?.addEventListener('click', () => {
      document.getElementById('input-notation').value = DEFAULT_DIRECTOR_NOTATION;
    });
    document.getElementById('btn-preset-italian')?.addEventListener('click', () => {
      document.getElementById('input-notation').value =
        '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d4 exd4 6. cxd4 Bb4+';
    });
    document.getElementById('btn-preset-scholar')?.addEventListener('click', () => {
      document.getElementById('input-notation').value =
        '1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7#';
    });

    document.getElementById('btn-load-notation')?.addEventListener('click', () => {
      const val = document.getElementById('input-notation').value;
      const res = loadNotationScript(val, { orientCamera: false });
      if (res.ok) {
        closeLobbyModal();
      } else {
        document.getElementById('script-status-msg').textContent =
          'Could not parse notation. Please enter valid PGN/SAN (e.g. 1. e4 e5 2. Nf3 Nc6) or UCI.';
      }
    });

    document.getElementById('pick-sp-white')?.addEventListener('click', () => {
      selectedSpColor = 'w';
      document.getElementById('pick-sp-white').classList.add('selected');
      document.getElementById('pick-sp-black').classList.remove('selected');
    });
    document.getElementById('pick-sp-black')?.addEventListener('click', () => {
      selectedSpColor = 'b';
      document.getElementById('pick-sp-black').classList.add('selected');
      document.getElementById('pick-sp-white').classList.remove('selected');
    });

    document.getElementById('btn-start-single')?.addEventListener('click', () => {
      stopMultiplayerSync();
      scriptedGameActive = false;
      gameMode = 'single';
      roomCode = null;
      playerColor = selectedSpColor;
      window.history.replaceState({}, '', window.location.pathname);
      closeLobbyModal();
      resetChessBoard(true);
    });

    document.getElementById('pick-mp-white')?.addEventListener('click', () => {
      selectedMpColor = 'w';
      document.getElementById('pick-mp-white').classList.add('selected');
      document.getElementById('pick-mp-black').classList.remove('selected');
    });
    document.getElementById('pick-mp-black')?.addEventListener('click', () => {
      selectedMpColor = 'b';
      document.getElementById('pick-mp-black').classList.add('selected');
      document.getElementById('pick-mp-white').classList.remove('selected');
    });

    document.getElementById('btn-create-room')?.addEventListener('click', () => {
      createMultiplayerRoom(selectedMpColor);
    });

    document.getElementById('btn-enter-created-room')?.addEventListener('click', () => {
      closeLobbyModal();
    });

    document.getElementById('btn-copy-code')?.addEventListener('click', () => {
      if (!roomCode) return;
      navigator.clipboard?.writeText(roomCode);
      document.getElementById('mp-status-msg').textContent = `Copied room code ${roomCode}!`;
    });

    document.getElementById('btn-copy-link')?.addEventListener('click', () => {
      if (!roomCode) return;
      const inviteUrl = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;
      navigator.clipboard?.writeText(inviteUrl);
      document.getElementById('mp-status-msg').textContent = 'Copied invite link to clipboard!';
    });

    document.getElementById('room-pill')?.addEventListener('click', () => {
      openLobbyModal('multi');
    });

    document.getElementById('btn-join-room')?.addEventListener('click', () => {
      const val = document.getElementById('input-room-code').value;
      joinMultiplayerRoom(val);
    });

    document.getElementById('input-room-code')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        joinMultiplayerRoom(e.target.value);
      }
    });

    document.getElementById('btn-checkmate-stepback')?.addEventListener('click', () => {
      stepScriptBackward();
    });
    document.getElementById('btn-checkmate-replay')?.addEventListener('click', () => {
      const defCol = checkmateState.defeatedColor || currentTurn;
      const winCol = checkmateState.winnerColor || (defCol === 'w' ? 'b' : 'w');
      const winner = winCol === 'w' ? 'White' : 'Black';
      const defeated = defCol === 'w' ? 'White' : 'Black';
      announceSanctumEvent('check_win', { winner, defeated, isCheckmate: !checkmateState.isCheckWin });
      triggerCheckmateSequence(defCol, winCol, { isCheckWin: checkmateState.isCheckWin });
    });
    document.getElementById('btn-checkmate-newgame')?.addEventListener('click', () => {
      resetChessBoard(true, false);
    });
    document.getElementById('btn-checkmate-dismiss')?.addEventListener('click', () => {
      const overlay = document.getElementById('checkmate-overlay');
      if (overlay) overlay.classList.remove('visible');
      checkmateState.bannerVisible = false;
    });

    // =========================================================================
    // Programmatic API for Automated Verification & Camera Inspection
    // =========================================================================
    window.wizardChess = {
      setCameraPreset,
      setCameraPose,
      setCameraLook: setCameraPose,
      setCameraKeySpeedPercent,
      setCameraRotSpeedPercent,
      setWallStoneLook,
      nextWallStoneLook,
      prevWallStoneLook,
      setFloorStoneLook,
      nextFloorStoneLook,
      prevFloorStoneLook,
      WALL_STONE_LOOKS,
      FLOOR_STONE_LOOKS,
      applyPieceArchetype,
      applyPieceSkin,
      applyBoardSkin,
      applyWorldScenery,
      startBotMatch,
      startPassAndPlayMatch,
      quitMatchToLobby,
      stopAllGameplayAudio: () => sfxVfxManager.stopAllGameplayAudio?.(),
      startOnlineMatchmaking,
      cancelOnlineMatchmaking,
      createMultiplayerRoom,
      joinMultiplayerRoom,
      setBotDifficulty: (diff) => {
        if (['easy', 'medium', 'hard'].includes(diff)) {
          botDifficulty = diff;
          updateTurnUI();
        }
      },
      setTimeControl,
      getTimeControlPresets: () => TIME_CONTROL_PRESETS,
      setPassAutoFlip: (v) => {
        passAutoFlip = Boolean(v);
      },
      flipPassCameraNow: () => {
        setCameraForSide(currentTurn, false);
      },
      setVoiceAnnouncerEnabled,
      setSfxEnabled: (enabled) => sfxVfxManager.setSfxEnabled(enabled),
      getSfxEnabled: () => sfxVfxManager.getSfxEnabled(),
      setSfxVolume: (vol) => sfxVfxManager.setSfxVolume?.(vol),
      getSfxVolume: () => sfxVfxManager.getSfxVolume?.() ?? 1.0,
      playLobbyClickSfx: (variant = 'default') => sfxVfxManager.playLobbyClickSfx?.(variant),
      setLobbyMusicActive: (active) => sfxVfxManager.setLobbyMusicActive?.(active),
      setLobbyMusicEnabled: (enabled) => sfxVfxManager.setLobbyMusicEnabled?.(enabled),
      getLobbyMusicEnabled: () => sfxVfxManager.getLobbyMusicEnabled?.() ?? true,
      setLobbyMusicVolume: (vol) => sfxVfxManager.setLobbyMusicVolume?.(vol),
      getLobbyMusicVolume: () => sfxVfxManager.getLobbyMusicVolume?.() ?? 1.0,
      setLobbyPaused: (paused) => {
        lobbyPaused = Boolean(paused);
        if (lobbyPaused) {
          if (aiTimer) {
            clearTimeout(aiTimer);
            aiTimer = null;
          }
          preMoveHighlightTask = null;
          heldCameraKeys.clear();
          orbitControls.enabled = false;
        } else {
          orbitControls.enabled = true;
          clock.getDelta();
          renderer.shadowMap.needsUpdate = true;
          renderer.render(scene, camera);
          if (matchStarted) {
            maybeScheduleAIMove();
          }
        }
      },
      getLobbyPaused: () => lobbyPaused,
      triggerPieceKillVfxPreview: (victimType = 'queen', r = 3, c = 3, attackerArchetype = null) => {
        const wPos = boardToWorld(r, c);
        spawnStoneShatter(wPos, 'b', victimType, 'queen', 0, -1, attackerArchetype);
      },
      playShowcaseAttackSfx: (archetypeId = 'gothic_warriors', pieceType = 'king') => {
        sfxVfxManager.playAttackChargeAndSwingSfx(pieceType, 'queen', archetypeId);
        setTimeout(() => {
          sfxVfxManager.playWeaponContactClashSfx(pieceType, 'queen', archetypeId);
          sfxVfxManager.playPieceKillSfx('queen', pieceType, archetypeId);
        }, 380);
      },
      getShowcasePiece: (archetypeId = 'gothic_warriors', color = 'w', pieceType = 'king', customMats = null) => {
        const sideTrimMat = customMats?.goldTrimMat || (color === 'w' ? whiteTrimMat : blackTrimMat);
        const sideBladeMat = customMats?.forgedSteelMat || (color === 'w' ? whiteBladeMat : blackBladeMat);
        const primaryMat = customMats?.primaryMat || (color === 'w' ? whitePieceMat : blackPieceMat);

        if (archetypeId !== 'gothic_warriors') {
          const built = buildProceduralPieceGroup(archetypeId, pieceType, color, {
            whitePieceMat: primaryMat,
            blackPieceMat: primaryMat,
            goldTrimMat: sideTrimMat,
            forgedSteelMat: sideBladeMat
          });
          built.root.userData.proceduralAnim = {
            animRig: built.animRig,
            animParts: built.animParts,
            archetype: archetypeId,
            pieceType,
            mode: 'idle',
            clipTime: 0
          };
          return built.root;
        }

        // Gothic Warriors from native cloned GLTF template
        const tpl = pieceTemplates[`${pieceType}_${color}`] || pieceTemplates[`king_${color}`];
        if (tpl && tpl.scene) {
          const root = SkeletonUtils.clone(tpl.scene);
          root.traverse((child) => {
            const nm = child.name || '';
            if (nm.includes('Icosphere') || nm.includes('glTF_not_exported')) {
              child.visible = false;
              return;
            }
            if (child.isMesh) {
              const mName = child.material?.name || '';
              if (mName.includes('Gold') || mName.includes('Trim') || mName.includes('Bronze') || mName.includes('Glow')) {
                child.material = sideTrimMat;
              } else if (mName.includes('Steel')) {
                child.material = sideBladeMat;
              } else {
                child.material = primaryMat;
              }
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });
          root.userData.gltfAnimations = tpl.animations || [];
          return root;
        }

        // Fallback procedural model if gltf not ready
        const fallback = buildProceduralPieceGroup('classic_staunton', pieceType, color, {
          whitePieceMat: primaryMat,
          blackPieceMat: primaryMat,
          goldTrimMat: sideTrimMat,
          forgedSteelMat: sideBladeMat
        });
        fallback.root.userData.proceduralAnim = {
          animRig: fallback.animRig,
          animParts: fallback.animParts,
          archetype: 'classic_staunton',
          pieceType,
          mode: 'idle',
          clipTime: 0
        };
        return fallback.root;
      },
      announceSanctumEvent,
      refreshPoliigonMaterials,
      playHalloweenWhisperSfx: (variant = 'whisper') => {
        sfxVfxManager.playHalloweenWhisperAndWindGustSfx?.(variant);
      },
      holdCameraKey: (code, down = true) => {
        if (down) heldCameraKeys.add(code);
        else heldCameraKeys.delete(code);
      },
      executeChessMove,
      triggerAIMoveNow,
      resetChessBoard,
      openLobbyModal,
      closeLobbyModal,
      toggleUI,
      loadNotation: (pgn, opts) => loadNotationScript(pgn, opts),
      stepScriptForward,
      stepScriptBackward,
      triggerCheckmateSequence,
      testColumnCollisionSlide: (startArr, endArr, steps = 20) => {
        activeCamTransition = null;
        camera.position.set(startArr[0], startArr[1], startArr[2]);
        const path = [];
        for (let i = 1; i <= steps; i++) {
          const u = i / steps;
          const prev = camera.position.clone();
          camera.position.set(
            startArr[0] + (endArr[0] - startArr[0]) * u,
            startArr[1] + (endArr[1] - startArr[1]) * u,
            startArr[2] + (endArr[2] - startArr[2]) * u
          );
          enforceCathedralBoundsAndSolidColumns(prev, camera.position, orbitControls.target);
          path.push(camera.position.toArray().map((v) => Number(v.toFixed(3))));
        }
        renderer.render(scene, camera);
        return path;
      },
      setSinglePlayerSide: (color) => {
        stopMultiplayerSync();
        matchStarted = true;
        scriptedGameActive = false;
        gameMode = 'single';
        playerColor = color === 'b' ? 'b' : 'w';
        resetChessBoard(true);
      },
      setupCustomScenario: (pieces, turn = 'w') => {
        stopMultiplayerSync();
        if (aiTimer) {
          clearTimeout(aiTimer);
          aiTimer = null;
        }
        matchStarted = true;
        activeMoveTweens.length = 0;
        isAnimatingMove = false;
        gameOver = false;
        scriptedGameActive = false;
        scriptDeviated = false;
        preMoveHighlightTask = null;
        clearCheckmateSequence();
        clearSquareHighlights();
        clearAllPieces();
        for (const p of pieces) {
          const inst = instantiatePiece(p.type, p.color, p.r, p.c);
          inst.hasMoved = Boolean(p.hasMoved);
          boardState[p.r][p.c] = inst;
        }
        currentTurn = turn;
        updateTurnUI();
        renderer.render(scene, camera);
      },
      triggerDemoCapture: () => {
        // Set up an immediate pawn capture (e4 x d5) and execute it
        matchStarted = true;
        resetChessBoard(true);
        // Move White e2->e4 and Black d7->d5 immediately on boardState, then animate White e4xd5
        const wp = boardState[6][4];
        boardState[6][4] = null;
        boardState[4][4] = wp;
        wp.r = 4; wp.c = 4;
        wp.mesh.position.copy(boardToWorld(4, 4));

        const bp = boardState[1][3];
        boardState[1][3] = null;
        boardState[3][3] = bp;
        bp.r = 3; bp.c = 3;
        bp.mesh.position.copy(boardToWorld(3, 3));

        currentTurn = 'w';
        return executeChessMove(4, 4, 3, 3);
      },
      getState: () => ({
        matchStarted,
        gameMode,
        botDifficulty,
        passAutoFlip,
        onlineQueueStatus,
        scriptedGameActive,
        scriptDeviated,
        scriptMovesCount: scriptMoves.length,
        scriptCursor,
        moveHistoryCount: moveHistory.length,
        preMoveHighlightActive: Boolean(preMoveHighlightTask),
        selectedSquare,
        validMovesCount: validMoves.length,
        highlightMeshCount: squareHighlightsGroup.children.length,
        uiHidden: document.body.classList.contains('cinematic-ui-hidden'),
        playerColor,
        currentTurn,
        roomCode,
        isAnimatingMove,
        gameOver,
        inCheck: isKingInCheck(currentTurn, boardState),
        voiceEnabled,
        sfxEnabled: sfxVfxManager.getSfxEnabled(),
        activeWorldScenery: currentWorldSceneryId,
        checkmateState: { ...checkmateState },
        capturedByWhite,
        capturedByBlack,
        timeControlCategory,
        timeControlPresetId,
        timeControlSeconds,
        whiteTimeRemaining,
        blackTimeRemaining,
        cameraPos: camera.position.toArray(),
        cameraTarget: orbitControls.target.toArray(),
        playerCamSide,
        overheadCamSide,
        sideCamSide,
        cathedralWideSide,
        cameraKeySpeedPct,
        cameraRotSpeedPct,
        wallStoneLookIndex: currentWallStoneLookIdx,
        wallStoneLookName: WALL_STONE_LOOKS[currentWallStoneLookIdx]?.name || '',
        floorStoneLookIndex: currentFloorStoneLookIdx,
        floorStoneLookName: FLOOR_STONE_LOOKS[currentFloorStoneLookIdx]?.name || '',
        floorMaterialRoughness: cathedralFloorMats[0]?.roughness ?? null,
        floorMaterialMetalness: cathedralFloorMats[0]?.metalness ?? null,
        keyMoveVelocity: keyMoveVelocity.toArray().map((v) => Number(v.toFixed(4))),
        keyRotVelocity: {
          yaw: Number(keyRotVelocity.yaw.toFixed(4)),
          pitch: Number(keyRotVelocity.pitch.toFixed(4))
        },
        cathedralBounds: CATHEDRAL_BOUNDS,
        solidColumnsCount: CATHEDRAL_SOLID_PILLARS.filter((p) => p.isColumn).length,
        brazierPillars: CATHEDRAL_SOLID_PILLARS.filter((p) => !p.isColumn),
        telemetry: cameraTelemetry
      }),
      captureScreenshot: async (filename) => {
        renderer.render(scene, camera);
        const outCanvas = document.createElement('canvas');
        outCanvas.width = renderer.domElement.width;
        outCanvas.height = renderer.domElement.height;
        const ctx = outCanvas.getContext('2d');
        ctx.drawImage(renderer.domElement, 0, 0);

        const scale = outCanvas.width / window.innerWidth;

        // Draw Gothic Cathedral Checkmate Banner if active
        if (checkmateState.bannerVisible) {
          ctx.save();
          ctx.scale(scale, scale);
          const bw = 560;
          const bh = 168;
          const bx = (window.innerWidth - bw) / 2;
          const by = 84;

          ctx.fillStyle = 'rgba(10, 12, 20, 0.94)';
          ctx.strokeStyle = 'rgba(212, 175, 55, 0.88)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(bx, by, bw, bh, 6);
          ctx.fill();
          ctx.stroke();

          ctx.strokeStyle = 'rgba(212, 175, 55, 0.38)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.roundRect(bx + 6, by + 6, bw - 12, bh - 12, 4);
          ctx.stroke();

          ctx.textAlign = 'center';
          ctx.fillStyle = 'rgba(212, 175, 55, 0.88)';
          ctx.font = '600 12px Georgia, serif';
          ctx.fillText('✦   SANCTUM JUDGMENT   ✦', window.innerWidth / 2, by + 28);

          ctx.fillStyle = '#f5d76e';
          ctx.font = '26px serif';
          const crownChar = checkmateState.winnerColor === 'b' ? '♚' : '♔';
          ctx.fillText(crownChar, window.innerWidth / 2, by + 56);

          ctx.fillStyle = '#f7e299';
          ctx.font = 'bold 40px Georgia, serif';
          ctx.fillText('C H E C K M A T E', window.innerWidth / 2, by + 102);

          ctx.strokeStyle = 'rgba(212, 175, 55, 0.65)';
          ctx.beginPath();
          ctx.moveTo(bx + 90, by + 116);
          ctx.lineTo(bx + bw - 90, by + 116);
          ctx.stroke();

          const subTxt =
            document.getElementById('checkmate-subtitle')?.textContent ||
            'WHITE TRIUMPHS • THE BLACK KING HAS FALLEN';
          ctx.fillStyle = '#f0ece1';
          ctx.font = 'bold 14px Georgia, serif';
          ctx.fillText(subTxt.toUpperCase(), window.innerWidth / 2, by + 142);
          ctx.restore();
        }

        // Only draw HUD summary bar if UI is NOT hidden by cinematic mode
        if (!document.body.classList.contains('cinematic-ui-hidden')) {
          ctx.save();
          ctx.scale(scale, scale);
          ctx.fillStyle = 'rgba(12, 15, 22, 0.82)';
          ctx.strokeStyle = 'rgba(212, 175, 55, 0.45)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.roundRect(16, 16, 520, 42, 10);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#d4af37';
          ctx.font = 'bold 13px Inter, sans-serif';
          ctx.fillText('WIZARD CHESS', 30, 42);

          const turnStr = document.getElementById('turn-text')?.textContent || '';
          const modeStr = document.getElementById('mode-badge')?.textContent || '';
          ctx.fillStyle = '#f0ece1';
          ctx.font = '600 13px Inter, sans-serif';
          ctx.fillText(`${turnStr}   |   ${modeStr}`, 155, 42);

          if (lobbyModal?.classList.contains('open')) {
            ctx.fillStyle = 'rgba(6, 8, 14, 0.72)';
            ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
            const cw = 440;
            const ch = 290;
            const cx = (window.innerWidth - cw) / 2;
            const cy = (window.innerHeight - ch) / 2;
            ctx.fillStyle = 'rgba(14, 17, 26, 0.96)';
            ctx.strokeStyle = '#d4af37';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(cx, cy, cw, ch, 16);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#d4af37';
            ctx.font = 'bold 18px Inter, sans-serif';
            ctx.fillText('MULTIPLAYER LOBBY • ROOM CODE', cx + 28, cy + 42);

            ctx.fillStyle = '#9aa0a6';
            ctx.font = '13px Inter, sans-serif';
            ctx.fillText('Share this 4-character Room Code with Player 2:', cx + 28, cy + 82);

            ctx.fillStyle = '#f5d76e';
            ctx.font = 'bold 38px monospace';
            ctx.fillText(roomCode || '----', cx + 150, cy + 138);

            ctx.fillStyle = '#4ea8de';
            ctx.font = '600 14px Inter, sans-serif';
            ctx.fillText('Create Room  •  Join Room by Code  •  Live Move Sync', cx + 42, cy + 195);

            ctx.fillStyle = '#f0ece1';
            ctx.font = '13px Inter, sans-serif';
            ctx.fillText(`Host Assigned: ${playerColor === 'w' ? 'White' : 'Black'}  |  Status: Waiting for Opponent`, cx + 48, cy + 240);
          }
          ctx.restore();
        }

        const dataUrl = outCanvas.toDataURL('image/png');
        const res = await fetch('/api/upload-screenshot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: dataUrl, filename })
        });
        return res.json();
      }
    };

    window.wizardChess.stepBy = (seconds, steps = 24) => {
      const subDt = seconds / steps;
      for (let i = 0; i < steps; i++) {
        stepScene(subDt, false);
      }
      renderer.render(scene, camera);
    };

    // =========================================================================
    // Main Animation Loop
    // =========================================================================
    let elapsedTotal = 0;
    function stepScene(dt, doRender = true) {
      elapsedTotal += dt;
      const prevCamPos = camera.position.clone();

      // Advance Dual Chess Clocks (Bullet, Blitz, Rapid) during active thinking time
      // Paused while move/capture animations play so 3D combat animations never penalize fast Bullet clocks
      if (
        matchStarted &&
        !lobbyPaused &&
        !gameOver &&
        !scriptedGameActive &&
        !isAnimatingMove &&
        timeControlSeconds > 0
      ) {
        if (currentTurn === 'w') {
          whiteTimeRemaining = Math.max(0, whiteTimeRemaining - dt);
        } else {
          blackTimeRemaining = Math.max(0, blackTimeRemaining - dt);
        }

        const activeClock = currentTurn === 'w' ? whiteTimeRemaining : blackTimeRemaining;
        if (activeClock > 0 && activeClock <= 10) {
          const wholeSec = Math.ceil(activeClock);
          if (wholeSec !== lastLowTimeBeepSec) {
            lastLowTimeBeepSec = wholeSec;
            sfxVfxManager.playLobbyClickSfx?.('tab');
          }
        }

        clockEmitAccum += dt;
        if (clockEmitAccum >= 0.1 || activeClock <= 0) {
          clockEmitAccum = 0;
          emitClockTick();
        }

        if (activeClock <= 0) {
          handleTimeOutDefeat(currentTurn);
        }
      }

      for (const mixer of activeMixers) {
        mixer.update(dt);
      }

      // Advance procedural animations on non-Gothic 3D piece archetypes (Staunton, Arcane Cyber-Mech, Dragon Elemental)
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const p = boardState[r][c];
          if (p && p.proceduralAnim && !p.proceduralAnim.paused) {
            updateProceduralPieceAnimation(p, dt, elapsedTotal);
          }
        }
      }

      // Pulse the 3D Crimson-and-Gold Check Indicator Ring & Beacon when a King is in Check
      if (checkIndicatorGroup.visible) {
        const pulse = 1 + Math.sin(elapsedTotal * 6.5) * 0.085;
        checkOuterRingMesh.scale.set(pulse, pulse, 1);
        checkInnerRingMesh.rotation.z += dt * 1.4;
        checkBeaconMat.opacity = 0.16 + (Math.sin(elapsedTotal * 5.2) * 0.5 + 0.5) * 0.18;
      }

      // Advance levitating board architecture nodes (Runic Obelisks, Floating Crystals, Forge Embers)
      if (Array.isArray(boardArchGroup.userData.dynamicNodes)) {
        for (const node of boardArchGroup.userData.dynamicNodes) {
          if (node.mesh) {
            node.mesh.position.y = node.baseY + Math.sin(elapsedTotal * 2.4 + node.phase) * 0.032;
            node.mesh.rotation.y += dt * 0.85;
          }
        }
      }

      // Feature 3c: Advance pre-move piece selection & valid-squares highlight beat before executing scripted move
      if (preMoveHighlightTask && !isAnimatingMove) {
        preMoveHighlightTask.elapsedSim += dt;
        const wallElapsed = (performance.now() - preMoveHighlightTask.startWallMs) / 1000;
        if (
          preMoveHighlightTask.elapsedSim >= preMoveHighlightTask.duration ||
          wallElapsed >= preMoveHighlightTask.duration
        ) {
          const mv = preMoveHighlightTask.move;
          const fromScriptFlag = Boolean(preMoveHighlightTask.fromScript);
          preMoveHighlightTask = null;
          executeChessMove(mv.fromR, mv.fromC, mv.toR, mv.toC, { fromScript: fromScriptFlag });
        }
      }

      for (let i = activeMoveTweens.length - 1; i >= 0; i--) {
        const done = activeMoveTweens[i](dt);
        if (done) activeMoveTweens.splice(i, 1);
      }

      // Feature 4: Video-game style WASD + R/F camera translation AND Arrow-key camera rotation
      // with separate UI-configurable Move Speed & Rot Speed (both default 10%) and smooth ease-in / ease-out velocity damping
      if (!isAnimatingMove) {
        const moveSpeedScale = cameraKeySpeedPct / 100;
        const rotSpeedScale = cameraRotSpeedPct / 100;
        const maxMoveSpeed = 3.2 * moveSpeedScale; // 0.32 m/s at default 10%
        const maxVertSpeed = 2.6 * moveSpeedScale; // 0.26 m/s at default 10%
        const maxRotSpeed = 1.2 * rotSpeedScale;   // 0.12 rad/s at default 10%

        const forward = new THREE.Vector3().subVectors(orbitControls.target, camera.position);
        forward.y = 0;
        if (forward.lengthSq() < 1e-6) {
          camera.getWorldDirection(forward);
          forward.y = 0;
        }
        forward.normalize();
        const right = new THREE.Vector3(-forward.z, 0, forward.x).normalize();

        const horizDir = new THREE.Vector3(0, 0, 0);
        if (heldCameraKeys.has('KeyW')) horizDir.add(forward);
        if (heldCameraKeys.has('KeyS')) horizDir.sub(forward);
        if (heldCameraKeys.has('KeyD')) horizDir.add(right);
        if (heldCameraKeys.has('KeyA')) horizDir.sub(right);
        if (horizDir.lengthSq() > 1e-6) horizDir.normalize();

        const desiredMoveVel = horizDir.multiplyScalar(maxMoveSpeed);
        if (heldCameraKeys.has('KeyR')) desiredMoveVel.y += maxVertSpeed;
        if (heldCameraKeys.has('KeyF')) desiredMoveVel.y -= maxVertSpeed;

        let desiredYawVel = 0;
        let desiredPitchVel = 0;
        if (heldCameraKeys.has('ArrowLeft')) desiredYawVel += maxRotSpeed;
        if (heldCameraKeys.has('ArrowRight')) desiredYawVel -= maxRotSpeed;
        if (heldCameraKeys.has('ArrowUp')) desiredPitchVel += maxRotSpeed;
        if (heldCameraKeys.has('ArrowDown')) desiredPitchVel -= maxRotSpeed;

        // Smooth ease-in when keys are pressed and smooth ease-out when keys are released
        const easeAlpha = 1 - Math.exp(-Math.max(0.001, dt) * 7.5);
        keyMoveVelocity.lerp(desiredMoveVel, easeAlpha);
        keyRotVelocity.yaw += (desiredYawVel - keyRotVelocity.yaw) * easeAlpha;
        keyRotVelocity.pitch += (desiredPitchVel - keyRotVelocity.pitch) * easeAlpha;

        if (keyMoveVelocity.lengthSq() < 1e-8 && desiredMoveVel.lengthSq() === 0) {
          keyMoveVelocity.set(0, 0, 0);
        }
        if (Math.abs(keyRotVelocity.yaw) < 1e-5 && desiredYawVel === 0) keyRotVelocity.yaw = 0;
        if (Math.abs(keyRotVelocity.pitch) < 1e-5 && desiredPitchVel === 0) keyRotVelocity.pitch = 0;

        const hasActiveMove = keyMoveVelocity.lengthSq() > 0;
        const hasActiveRot = keyRotVelocity.yaw !== 0 || keyRotVelocity.pitch !== 0;

        if (hasActiveMove || hasActiveRot) {
          activeCamTransition = null;

          if (hasActiveMove) {
            const moveDelta = keyMoveVelocity.clone().multiplyScalar(dt);
            const beforeMovePos = camera.position.clone();
            camera.position.add(moveDelta);
            enforceCathedralBoundsAndSolidColumns(beforeMovePos, camera.position, orbitControls.target);
            const actualMoveDelta = camera.position.clone().sub(beforeMovePos);
            orbitControls.target.add(actualMoveDelta);
          }

          if (hasActiveRot) {
            const lookOffset = new THREE.Vector3().subVectors(orbitControls.target, camera.position);
            const dist = Math.max(0.5, lookOffset.length());
            const dir = lookOffset.normalize();
            let yaw = Math.atan2(dir.x, dir.z);
            let pitch = Math.asin(Math.max(-0.98, Math.min(0.98, dir.y)));

            yaw += keyRotVelocity.yaw * dt;
            pitch = Math.max(-1.35, Math.min(1.35, pitch + keyRotVelocity.pitch * dt));

            const cosP = Math.cos(pitch);
            const newOffset = new THREE.Vector3(
              Math.sin(yaw) * cosP * dist,
              Math.sin(pitch) * dist,
              Math.cos(yaw) * cosP * dist
            );
            orbitControls.target.copy(camera.position).add(newOffset);
          }

          if (heldCameraKeys.size > 0) {
            document
              .querySelectorAll('#btn-cam-player, #btn-cam-wide, #btn-cam-top, #btn-cam-side')
              .forEach((b) => b.classList.remove('active'));
          }
        }
      }

      if (activeCamTransition && !isAnimatingMove) {
        activeCamTransition.elapsed += dt;
        const u = Math.min(1, activeCamTransition.elapsed / activeCamTransition.duration);
        const ease = easeInOutCubic(u);
        camera.position.lerpVectors(activeCamTransition.startPos, activeCamTransition.endPos, ease);
        orbitControls.target.lerpVectors(activeCamTransition.startTarget, activeCamTransition.endTarget, ease);
        enforceCathedralBoundsAndSolidColumns(prevCamPos, camera.position, orbitControls.target);
        camera.lookAt(orbitControls.target);
        if (u >= 1) {
          activeCamTransition = null;
          flushOrbitControlsDamping();
        }
      } else if (orbitControls.enabled && !isAnimatingMove) {
        orbitControls.update();
        enforceCathedralBoundsAndSolidColumns(prevCamPos, camera.position, orbitControls.target);
        camera.lookAt(orbitControls.target);
      } else if (isAnimatingMove) {
        enforceCathedralBoundsAndSolidColumns(prevCamPos, camera.position, orbitControls.target);
        camera.lookAt(orbitControls.target);
      }

      if (impactFlashLight.intensity > 0) {
        impactFlashLight.intensity = Math.max(0, impactFlashLight.intensity - dt * 28);
      }

      for (let i = shatterDebris.length - 1; i >= 0; i--) {
        const d = shatterDebris[i];
        d.life -= dt;
        if (d.life <= 0) {
          scene.remove(d.mesh);
          shatterDebris.splice(i, 1);
          continue;
        }
        d.vel.y -= 9.8 * dt;
        d.mesh.position.addScaledVector(d.vel, dt);
        const onBoardSurface =
          Math.abs(d.mesh.position.x) < 1.52 && Math.abs(d.mesh.position.z) < 1.52;
        const floorBounceY = d.offBoardDrop && !onBoardSurface ? BOARD_SURFACE_Y - 0.18 : BOARD_SURFACE_Y + 0.03;
        if (d.mesh.position.y < floorBounceY) {
          d.mesh.position.y = floorBounceY;
          d.vel.y *= -0.35;
          d.vel.x *= 0.72;
          d.vel.z *= 0.72;
        }
        // Bounce flying stone shards off intact pieces on the board so all statues feel solid
        if (d.mesh.position.y < BOARD_SURFACE_Y + 0.48) {
          for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
              const p = boardState[r][c];
              if (p && p.mesh) {
                const rx = d.mesh.position.x - p.mesh.position.x;
                const rz = d.mesh.position.z - p.mesh.position.z;
                const rDist = Math.hypot(rx, rz);
                if (rDist < 0.165 && rDist > 0.0001) {
                  const nx = rx / rDist;
                  const nz = rz / rDist;
                  d.mesh.position.x = p.mesh.position.x + nx * 0.165;
                  d.mesh.position.z = p.mesh.position.z + nz * 0.165;
                  const vn = d.vel.x * nx + d.vel.z * nz;
                  if (vn < 0) {
                    d.vel.x -= 1.55 * vn * nx;
                    d.vel.z -= 1.55 * vn * nz;
                  }
                }
              }
            }
          }
        }
        d.mesh.rotation.x += d.rotVel.x * dt;
        d.mesh.rotation.y += d.rotVel.y * dt;
        d.mesh.rotation.z += d.rotVel.z * dt;
        if (d.life < 0.5) {
          const s = Math.max(0.01, d.life * 2);
          d.mesh.scale.setScalar((d.baseScale || 0.036) * s);
        }
      }

      // Advance 3D GPU Checkmate Dust & Ember Particle Systems
      for (let i = checkmateParticleSystems.length - 1; i >= 0; i--) {
        const ps = checkmateParticleSystems[i];
        ps.life -= dt;
        if (ps.life <= 0) {
          scene.remove(ps.points);
          ps.geometry.dispose();
          ps.material.dispose();
          checkmateParticleSystems.splice(i, 1);
          continue;
        }
        const posAttr = ps.geometry.attributes.position;
        const posArr = posAttr.array;
        const velArr = ps.velocities;
        const gravArr = ps.gravities;
        const dragArr = ps.drags;
        for (let p = 0; p < ps.count; p++) {
          const p3 = p * 3;
          const damp = Math.max(0.5, 1 - dragArr[p] * dt);
          velArr[p3] *= damp;
          velArr[p3 + 2] *= damp;
          velArr[p3 + 1] -= gravArr[p] * dt;

          posArr[p3] += velArr[p3] * dt;
          posArr[p3 + 1] += velArr[p3 + 1] * dt;
          posArr[p3 + 2] += velArr[p3 + 2] * dt;

          const overBoard = Math.abs(posArr[p3]) < 1.52 && Math.abs(posArr[p3 + 2]) < 1.52;
          const minY = overBoard ? BOARD_SURFACE_Y + 0.018 : BOARD_SURFACE_Y - 0.18;
          if (posArr[p3 + 1] < minY) {
            posArr[p3 + 1] = minY;
            velArr[p3 + 1] *= -0.28;
            velArr[p3] *= 0.68;
            velArr[p3 + 2] *= 0.68;
          }
        }
        posAttr.needsUpdate = true;
        const lifeRatio = Math.max(0, ps.life / ps.maxLife);
        ps.material.opacity = Math.min(0.95, Math.pow(lifeRatio, 0.78) * 1.15);
      }

      // Advance volumetric GLSL brazier flames & active warm firelight flicker
      for (let i = 0; i < brazierFireUniforms.length; i++) {
        brazierFireUniforms[i].uTime.value = elapsedTotal;
      }

      // Advance 3D World Scenery sky shaders, orbiting landmarks, soaring dragons & particle weather
      worldSceneryManager.update(dt, elapsedTotal);
      // Advance Piece-Specific 3D Kill VFX & Procedural Camera Shake
      sfxVfxManager.update(dt, camera);
      for (let i = 0; i < brazierGlowSprites.length; i++) {
        const sp = brazierGlowSprites[i];
        const baseOp = sp.userData.baseOpacity || 0.4;
        const seed = sp.userData.seed || 0;
        sp.material.opacity =
          baseOp +
          Math.sin(elapsedTotal * 5.2 + seed) * 0.045 +
          Math.cos(elapsedTotal * 8.4 + seed * 1.3) * 0.025;
      }
      for (let i = 0; i < brazierLights.length; i++) {
        const baseInt = brazierLights[i].userData.baseIntensity || 3.2;
        brazierLights[i].intensity =
          baseInt +
          Math.sin(elapsedTotal * 5.6 + i * 1.7) * 0.28 +
          Math.cos(elapsedTotal * 9.1 + i) * 0.16;
      }

      if (isAnimatingMove || activeMoveTweens.length > 0 || shatterDebris.length > 0 || checkmateState.active) {
        renderer.shadowMap.needsUpdate = true;
      }

      if (doRender) {
        renderer.render(scene, camera);
      }
    }

    let manualStepMode = false;
    window.wizardChess.setManualStepMode = (v) => {
      manualStepMode = Boolean(v);
    };

    function animate() {
      if (!navigator.webdriver && !manualStepMode) {
        requestAnimationFrame(animate);
      }
      if (manualStepMode) return;
      if (lobbyPaused && !navigator.webdriver) {
        clock.getDelta();
        return;
      }
      const dt = Math.min(clock.getDelta(), 0.1);
      stepScene(dt || 0.016, true);
    }

    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });


    // Startup sequence: initialize the 3D board & render loop immediately so the canvas is never blank,
    // then upgrade pieces in-place as soon as GLTF assets finish streaming
    const params = new URLSearchParams(window.location.search);
    const urlSide = params.get('side');
    const urlRoom = params.get('room');
    if (urlSide === 'b' || urlSide === 'black') {
      playerColor = 'b';
    }
    resetChessBoard(true, true);
    setCameraForSide(playerColor, true);
    orbitControls.enabled = false;
    renderer.render(scene, camera);
    if (!navigator.webdriver) {
      animate();
    }

    (async () => {
      await loadAllAssets();
      if (urlRoom && !matchStarted) {
        await joinMultiplayerRoom(urlRoom);
      } else {
        rebuildBoardPieces();
      }
      renderer.shadowMap.needsUpdate = true;
      renderer.render(scene, camera);
      window.dispatchEvent(new CustomEvent('wizardchess:ready'));
      if (navigator.webdriver) {
        window.wizardChess.stepBy(0.9, 15);
      }
    })();
}

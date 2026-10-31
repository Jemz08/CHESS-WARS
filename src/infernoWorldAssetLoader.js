import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * 3D Asset Loader for the Volcanic Scenery ("Inferno World Free" by ITHappy Studios)
 * Source: https://www.cgtrader.com/free-3d-models/exterior/historic-exterior/inferno-world-free
 *         https://ithappystudios.com/free/inferno-world-free/
 *
 * Files in /public/assets/inferno/:
 *   - inferno_world_assets.glb (All 76 modular 3D assets from Inferno World Free)
 *   - inferno_scene_layout.json (All 288 root node placements of the Inferno World Free island & caldera scene)
 *   - Textures_4.png (Low-poly gradient color palette atlas)
 *   - Coin_color.png (Low-poly gold coin color texture)
 */

const gltfLoader = new GLTFLoader();
const textureLoader = new THREE.TextureLoader();

let rawNodesByName = null;
let packLoadPromise = null;
let sceneLayoutCache = null;
let sceneLayoutPromise = null;
const normalizedTemplateCache = new Map();

let sharedMaterials = null;

/**
 * Returns clean, flat-shaded low-poly materials using the official Inferno World Free
 * color palette (`Textures_4.png` and `Coin_color.png`), without noisy PBR normal/bump maps.
 */
export function getInfernoWorldMaterials() {
  if (sharedMaterials) return sharedMaterials;

  let colorAtlasTex = null;
  let coinColorTex = null;

  if (typeof window !== 'undefined') {
    colorAtlasTex = textureLoader.load('/assets/inferno/Textures_4.png');
    colorAtlasTex.colorSpace = THREE.SRGBColorSpace;
    colorAtlasTex.flipY = false;
    colorAtlasTex.userData = { isSharedPoliigonTex: true, isSharedInfernoTex: true };

    coinColorTex = textureLoader.load('/assets/inferno/Coin_color.png');
    coinColorTex.colorSpace = THREE.SRGBColorSpace;
    coinColorTex.flipY = false;
    coinColorTex.userData = { isSharedPoliigonTex: true, isSharedInfernoTex: true };
  }

  const tagMat = (mat) => {
    mat.userData = { isSharedPoliigonTex: true, isSharedInfernoMat: true };
    return mat;
  };

  sharedMaterials = {
    Color: tagMat(
      new THREE.MeshStandardMaterial({
        name: 'Color',
        map: colorAtlasTex,
        roughness: 0.68,
        metalness: 0.08,
        flatShading: true,
        side: THREE.FrontSide
      })
    ),
    Emission: tagMat(
      new THREE.MeshStandardMaterial({
        name: 'Emission',
        map: colorAtlasTex,
        emissive: new THREE.Color(0xff6d00),
        emissiveMap: colorAtlasTex,
        emissiveIntensity: 2.15,
        roughness: 0.22,
        metalness: 0.12,
        flatShading: true,
        side: THREE.FrontSide
      })
    ),
    Metall: tagMat(
      new THREE.MeshStandardMaterial({
        name: 'Metall',
        map: colorAtlasTex,
        roughness: 0.34,
        metalness: 0.72,
        flatShading: true,
        side: THREE.FrontSide
      })
    ),
    Coin: tagMat(
      new THREE.MeshStandardMaterial({
        name: 'Coin',
        map: coinColorTex,
        emissive: new THREE.Color(0xff9e00),
        emissiveMap: coinColorTex,
        emissiveIntensity: 0.32,
        roughness: 0.25,
        metalness: 0.86,
        flatShading: true,
        side: THREE.FrontSide
      })
    ),
    Bone: tagMat(
      new THREE.MeshStandardMaterial({
        name: 'Bone',
        color: 0xe6dcc8,
        roughness: 0.56,
        metalness: 0.06,
        emissive: 0x26150a,
        emissiveIntensity: 0.12,
        flatShading: true,
        side: THREE.FrontSide
      })
    ),
    LavaPool: tagMat(
      new THREE.MeshStandardMaterial({
        name: 'LavaPool',
        color: 0xff7b00,
        emissive: 0xff3d00,
        emissiveIntensity: 2.05,
        roughness: 0.18,
        metalness: 0.08,
        flatShading: true,
        side: THREE.FrontSide,
        polygonOffset: true,
        polygonOffsetFactor: 1,
        polygonOffsetUnits: 1
      })
    )
  };

  return sharedMaterials;
}

function applyInfernoMaterials(rootObj, castShadow = true, receiveShadow = true) {
  const mats = getInfernoWorldMaterials();
  rootObj.traverse((node) => {
    if (!node.isMesh) return;
    node.castShadow = castShadow;
    node.receiveShadow = receiveShadow;

    if (node.geometry && !node.geometry.attributes.normal) {
      node.geometry.computeVertexNormals();
    }

    const remapMat = (orig) => {
      const mName = orig?.name || 'Color';
      if (mats[mName]) return mats[mName];
      return mats.Color;
    };

    if (Array.isArray(node.material)) {
      node.material = node.material.map(remapMat);
    } else {
      node.material = remapMat(node.material);
    }
  });
}

/**
 * Loads `/assets/inferno/inferno_world_assets.glb` and indexes all 76 named 3D asset nodes.
 */
export function loadInfernoWorldPack() {
  if (rawNodesByName) {
    return Promise.resolve(rawNodesByName);
  }
  if (packLoadPromise) {
    return packLoadPromise;
  }
  if (typeof window === 'undefined') {
    return Promise.resolve(new Map());
  }

  packLoadPromise = new Promise((resolve) => {
    gltfLoader.load(
      '/assets/inferno/inferno_world_assets.glb',
      (gltf) => {
        const map = new Map();
        const root = gltf.scene || (gltf.scenes && gltf.scenes[0]);
        if (root) {
          applyInfernoMaterials(root, true, true);
          root.traverse((obj) => {
            if (obj.name && obj !== root) {
              map.set(obj.name, obj);
            }
          });
        }
        rawNodesByName = map;
        resolve(map);
      },
      undefined,
      (err) => {
        console.warn('[InfernoWorldAssetLoader] Failed to load inferno_world_assets.glb:', err);
        packLoadPromise = null;
        resolve(new Map());
      }
    );
  });

  return packLoadPromise;
}

/**
 * Loads `/assets/inferno/inferno_scene_layout.json` containing the 288 root node placements
 * of the official Inferno World Free island & volcanic mountain caldera scene.
 */
export function loadInfernoSceneLayout() {
  if (sceneLayoutCache) {
    return Promise.resolve(sceneLayoutCache);
  }
  if (sceneLayoutPromise) {
    return sceneLayoutPromise;
  }
  if (typeof window === 'undefined') {
    return Promise.resolve(null);
  }

  sceneLayoutPromise = fetch('/assets/inferno/inferno_scene_layout.json')
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => {
      sceneLayoutCache = data;
      return data;
    })
    .catch((err) => {
      console.warn('[InfernoWorldAssetLoader] Failed to load inferno_scene_layout.json:', err);
      sceneLayoutPromise = null;
      return null;
    });

  return sceneLayoutPromise;
}

/**
 * Builds and caches a bottom-anchored (`min.y = 0`), XZ-centered (`0, 0`) template
 * for any of the 76 assets in `inferno_world_assets.glb`.
 *When `normMode === 'raw'`, preserves the original Blender unit dimensions while bottom-anchoring.
 */
export function getInfernoAssetTemplate(assetName, normMode = 'raw') {
  const cacheKey = `${assetName}__${normMode}`;
  if (normalizedTemplateCache.has(cacheKey)) {
    return Promise.resolve(normalizedTemplateCache.get(cacheKey));
  }

  return loadInfernoWorldPack().then((packMap) => {
    if (normalizedTemplateCache.has(cacheKey)) {
      return normalizedTemplateCache.get(cacheKey);
    }

    // Resolve aliases (e.g. PlatformStar_001_002 -> PlatformStar_001.002, Coal_002 -> Coal_002.007, Spike_001 -> Spike_001.008)
    let srcNode =
      packMap.get(assetName) ||
      packMap.get(assetName.replace('_002', '.002')) ||
      packMap.get(`${assetName}.007`) ||
      packMap.get(`${assetName}.008`);

    if (!srcNode) {
      return null;
    }

    const cloned = srcNode.clone(true);
    cloned.position.set(0, 0, 0);
    cloned.rotation.set(0, 0, 0);
    cloned.scale.set(1, 1, 1);
    applyInfernoMaterials(cloned, true, true);

    if (normMode === 'origin') {
      // Exact Blender origin & scale (used when reassembling the 288-node scene layout)
      normalizedTemplateCache.set(cacheKey, cloned);
      return cloned;
    }

    const rawHolder = new THREE.Group();
    rawHolder.add(cloned);
    rawHolder.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(rawHolder);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    let normScale = 1.0;
    if (normMode === 'height') {
      normScale = 1.0 / Math.max(1e-4, size.y);
    } else if (normMode === 'max') {
      normScale = 1.0 / Math.max(1e-4, size.x, size.y, size.z);
    }

    const wrapper = new THREE.Group();
    wrapper.name = `InfernoTemplate_${assetName}`;
    rawHolder.position.set(-center.x * normScale, -box.min.y * normScale, -center.z * normScale);
    rawHolder.scale.setScalar(normScale);
    wrapper.add(rawHolder);

    normalizedTemplateCache.set(cacheKey, wrapper);
    return wrapper;
  });
}

/**
 * Mounts an individual 3D asset from the 76-asset Inferno World Free pack into `targetParent`.
 * By default (`normMode = 'raw'`), the asset is bottom-anchored (`min.y = 0`) and XZ-centered
 * in its native Blender proportions so `scale` acts directly on Blender meters, or you can
 * pass `normMode: 'height'` or `'max'` for unit-normalized sizing.
 */
export function mountInfernoWorldModel(targetParent, assetName, options = {}) {
  if (!targetParent) return null;

  const {
    scale = 1.0,
    position = [0, 0, 0],
    rotation = null,
    rotationY = 0,
    normMode = 'raw',
    castShadow = true,
    receiveShadow = true,
    overrideMaterial = null,
    excludeFromBounds = false,
    onLoaded = null
  } = options;

  const container = new THREE.Group();
  container.name = `InfernoAsset_${assetName}`;
  container.position.set(position[0] || 0, position[1] || 0, position[2] || 0);
  if (rotation && Array.isArray(rotation)) {
    container.rotation.set(rotation[0] || 0, rotation[1] || 0, rotation[2] || 0);
  } else {
    container.rotation.y = rotationY || 0;
  }

  if (typeof scale === 'number') {
    container.scale.setScalar(scale);
  } else if (Array.isArray(scale)) {
    container.scale.set(scale[0], scale[1], scale[2]);
  }

  if (excludeFromBounds) {
    container.userData.excludeFromBounds = true;
  }

  targetParent.add(container);

  getInfernoAssetTemplate(assetName, normMode).then((tpl) => {
    if (!tpl) return;
    const instance = tpl.clone(true);
    instance.traverse((ch) => {
      if (excludeFromBounds) {
        ch.userData.excludeFromBounds = true;
      }
      if (ch.isMesh) {
        ch.castShadow = castShadow;
        ch.receiveShadow = receiveShadow;
        if (overrideMaterial) {
          ch.material = overrideMaterial;
        }
      }
    });
    container.add(instance);
    if (typeof onLoaded === 'function') {
      onLoaded(instance, container);
    }
  });

  return container;
}

/**
 * Mounts the complete 288-node Inferno World Free volcanic island & outer mountain caldera
 * scene from `inferno_scene_layout.json` and `inferno_world_assets.glb`, centered around
 * the chessboard at `(0, 0, 0)` with automatic radial courtyard clearance so no rocks or
 * statues clip the chessboard.
 */
export function mountFullInfernoWorldScene(targetParent, options = {}) {
  const {
    sceneScale = 0.28,
    plazaCenter = [0.0, 15.22, -2.0],
    yOffset = -0.04,
    minClearanceRadius = 9.8,
    animatedGearsOut = null,
    onLoaded = null
  } = options;

  const sceneRoot = new THREE.Group();
  sceneRoot.name = 'InfernoWorldFullScene';
  targetParent.add(sceneRoot);

  Promise.all([loadInfernoWorldPack(), loadInfernoSceneLayout()]).then(([packMap, layout]) => {
    if (!packMap || !layout || !Array.isArray(layout.instances)) return;

    const [px, py, pz] = plazaCenter;
    const boundsMap = layout.assetBounds || {};

    // The Star Platform landmark cluster (`PlatformStar_001.001` at [-17.1, 17.5] + StatueKnight_002.002 +
    // Axe_001.003 + PedestalBig_001.003 + ChestBig_001.001 + flanking braziers & gold piles) sits on the
    // upper-left quadrant of the main island. Shift that entire cluster together by a uniform offset so
    // the Star Platform's inner edge clears the central chessboard courtyard while keeping every statue,
    // axe, pedestal, chest, and brazier on top of it 100% locked in alignment!
    const starClusterNames = new Set([
      'PlatformStar_001.001',
      'StatueKnight_002.002',
      'Axe_001.003',
      'PedestalBig_001.003',
      'ChestBig_001.001',
      'Brazier_002.010',
      'Pedestal_001.005',
      'Brazier_004.005',
      'Brazier_004.016',
      'GoldPileSmall_001.009',
      'GoldPileBig_001.005',
      'GoldPileSmall_001.010',
      'GoldPileSmall_001.012'
    ]);
    const starClusterShiftX = -26.0;
    const starClusterShiftZ = 26.0;

    for (const inst of layout.instances) {
      const srcNode = packMap.get(inst.asset);
      if (!srcNode) continue;

      const t = inst.t || [0, 0, 0];
      const r = inst.r || [0, 0, 0, 1];
      const s = inst.s || [1, 1, 1];

      let shiftX = 0;
      let shiftY = 0;
      let shiftZ = 0;

      const isMainGround =
        inst.name === 'Platform_003.001' ||
        inst.name.startsWith('PlatformSmall_001.00') ||
        inst.name.startsWith('PlatformSmall_002.00') ||
        inst.name.startsWith('PlatformSmall_003.00') ||
        inst.name.startsWith('PlatformSmall_004.00');

      if (starClusterNames.has(inst.name)) {
        shiftX = starClusterShiftX;
        shiftZ = starClusterShiftZ;
      } else if (!isMainGround) {
        // Check if this prop/rock/column encroaches inside `minClearanceRadius` of the chessboard
        const b = boundsMap[inst.asset] || { min: [-2, 0, -2], max: [2, 2, 2] };
        const halfExtentXZ =
          Math.max(
            Math.abs(b.max[0] - b.min[0]) * Math.abs(s[0]),
            Math.abs(b.max[2] - b.min[2]) * Math.abs(s[2])
          ) *
          0.5 *
          sceneScale;

        const cx = (t[0] - px) * sceneScale;
        const cz = (t[2] - pz) * sceneScale;
        const cDist = Math.hypot(cx, cz);
        const closestEdge = cDist - halfExtentXZ;

        if (closestEdge < minClearanceRadius) {
          const pushDist = minClearanceRadius - closestEdge + 0.85;
          const dirX = cDist > 0.1 ? cx / cDist : 0.0;
          const dirZ = cDist > 0.1 ? cz / cDist : -1.0;
          shiftX = (dirX * pushDist) / sceneScale;
          shiftZ = (dirZ * pushDist) / sceneScale;
        }
      }

      const cloned = srcNode.clone(true);
      cloned.name = inst.name;
      cloned.position.set(
        (t[0] - px + shiftX) * sceneScale,
        (t[1] - py + shiftY) * sceneScale + yOffset,
        (t[2] - pz + shiftZ) * sceneScale
      );
      cloned.quaternion.set(r[0], r[1], r[2], r[3]);
      cloned.scale.set(s[0] * sceneScale, s[1] * sceneScale, s[2] * sceneScale);

      // Keep main ground strictly below y = 0 so it never Z-fights with the board base
      if (inst.name === 'Platform_003.001') {
        cloned.position.y = (t[1] - py) * sceneScale - 0.14;
      }

      sceneRoot.add(cloned);

      if (
        animatedGearsOut &&
        (inst.asset === 'Gear_001' || inst.asset === 'Gear_002')
      ) {
        animatedGearsOut.push({
          mesh: cloned,
          speed: inst.asset === 'Gear_001' ? 0.45 : -0.68
        });
      }
    }

    if (typeof onLoaded === 'function') {
      onLoaded(sceneRoot);
    }
  });

  return sceneRoot;
}

/**
 * Preloads the Inferno World Free 3D asset pack and scene layout in the background.
 */
export function preloadInfernoWorld3DAssets() {
  loadInfernoWorldPack();
  loadInfernoSceneLayout();
}

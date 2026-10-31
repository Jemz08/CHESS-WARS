import * as THREE from 'three';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * 3D OBJ/MTL Asset Loader for Dragon's Peak Scenery (`dragon_sky_citadel`)
 * - Dragon / Wyvern: https://poly.pizza/m/WIOTISRjeX (`/assets/dragon_peak/wyvern.obj` + `wyvern.mtl`)
 * - Floating Islands: https://sketchfab.com/3d-models/interdimensional-floating-islands-0742e636aa9a40b5865436511e3595cf
 *   (`/assets/dragon_peak/floating_islands.obj` + `floating_islands.mtl`)
 */

let wyvernTemplateCache = null;
let wyvernLoadingPromise = null;

const islandMeshCache = new Map();
let islandsLoadingPromise = null;

/**
 * Converts a loaded OBJ/MTL material into a clean, stylized low-poly MeshStandardMaterial
 * without noisy procedural PBR textures.
 */
function toStylizedStandardMaterial(srcMat, fallbackHex = 0x94a3b8) {
  const matName = (srcMat?.name || '').toLowerCase();
  const baseColor = srcMat?.color ? srcMat.color.clone() : new THREE.Color(fallbackHex);

  let roughness = 0.65;
  let metalness = 0.08;
  let emissive = new THREE.Color(0x000000);
  let emissiveIntensity = 0.0;

  if (matName.includes('island_grass') || matName.includes('leaf') || matName.includes('bush')) {
    roughness = 0.72;
    metalness = 0.04;
  } else if (matName.includes('island_path') || matName.includes('wood')) {
    roughness = 0.68;
    metalness = 0.06;
  } else if (matName.includes('island_dirt') || matName.includes('rock') || matName.includes('stone')) {
    roughness = 0.78;
    metalness = 0.10;
  } else if (matName.includes('windows') || matName.includes('bell')) {
    roughness = 0.25;
    metalness = 0.65;
    emissive = baseColor.clone();
    emissiveIntensity = matName.includes('windows') ? 0.65 : 0.25;
  } else if (matName.includes('cloud')) {
    baseColor.setHex(0xfff5e6);
    roughness = 0.85;
    metalness = 0.02;
    emissive.setHex(0xfbbf24);
    emissiveIntensity = 0.12;
  }

  return new THREE.MeshStandardMaterial({
    name: srcMat?.name || 'dragon_peak_mat',
    color: baseColor,
    roughness,
    metalness,
    emissive,
    emissiveIntensity,
    flatShading: true,
    side: THREE.DoubleSide
  });
}

/**
 * Welds duplicate OBJ vertices into a compact indexed BufferGeometry so real-time
 * skeletal/vertex wave deformation runs fast and never splits facet seams.
 */
function weldWyvernGeometry(srcGeo) {
  const geo = srcGeo.clone();
  geo.deleteAttribute('normal');
  geo.deleteAttribute('uv');
  const merged = BufferGeometryUtils.mergeVertices(geo, 1e-4);
  merged.computeVertexNormals();
  return merged;
}

/**
 * Loads `/assets/dragon_peak/wyvern.mtl` + `/assets/dragon_peak/wyvern.obj`
 */
export function preloadDragonPeakWyvern() {
  if (wyvernTemplateCache) return Promise.resolve(wyvernTemplateCache);
  if (wyvernLoadingPromise) return wyvernLoadingPromise;

  wyvernLoadingPromise = new Promise((resolve) => {
    const mtlLoader = new MTLLoader();
    mtlLoader.setPath('/assets/dragon_peak/');
    mtlLoader.load(
      'wyvern.mtl',
      (materials) => {
        materials.preload();
        const objLoader = new OBJLoader();
        objLoader.setMaterials(materials);
        objLoader.setPath('/assets/dragon_peak/');
        objLoader.load(
          'wyvern.obj',
          (objRoot) => {
            const parts = {
              body: [],
              horns: [],
              eyes: [],
              wingLeft: [],
              wingRight: []
            };

            objRoot.traverse((child) => {
              if (!child.isMesh) return;
              child.geometry = weldWyvernGeometry(child.geometry);
              const name = (child.name || '').toLowerCase();
              if (name.includes('wing_left')) {
                parts.wingLeft.push(child);
              } else if (name.includes('wing_right')) {
                parts.wingRight.push(child);
              } else if (name.includes('eyes')) {
                parts.eyes.push(child);
              } else if (name.includes('horns') || name.includes('spikes')) {
                parts.horns.push(child);
              } else {
                parts.body.push(child);
              }
            });

            wyvernTemplateCache = parts;
            resolve(parts);
          },
          undefined,
          (err) => {
            console.warn('[DragonPeakAssetLoader] Failed to load wyvern.obj:', err);
            resolve(null);
          }
        );
      },
      undefined,
      (err) => {
        console.warn('[DragonPeakAssetLoader] Failed to load wyvern.mtl:', err);
        resolve(null);
      }
    );
  });

  return wyvernLoadingPromise;
}

/**
 * Smoothly levels the upper grass/path surface of a floating island mesh to `y <= 0`
 * using a continuous function of `y` so shared edges between `island_path`, `island_grass`,
 * and `island_dirt` stay 100% seamless and never poke up through the chess board or buildings.
 */
function createFlattenedIslandGroup(templateGroup) {
  const flatGroup = templateGroup.clone(true);
  flatGroup.traverse((node) => {
    if (!node.isMesh || !node.geometry) return;
    const geo = node.geometry.clone();
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      let y = pos.getY(i);
      if (y > -0.36) {
        const lift = Math.min(1.0, Math.max(0.0, (y + 0.36) / 0.25));
        y = Math.min(0.0, y + 0.18 * lift);
        pos.setY(i, y);
      }
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    geo.computeBoundingBox();
    geo.computeBoundingSphere();
    node.geometry = geo;
  });
  return flatGroup;
}

/**
 * Loads `/assets/dragon_peak/floating_islands.mtl` + `/assets/dragon_peak/floating_islands.obj`
 */
export function preloadDragonPeakFloatingIslands() {
  if (islandMeshCache.size > 0) return Promise.resolve(islandMeshCache);
  if (islandsLoadingPromise) return islandsLoadingPromise;

  islandsLoadingPromise = new Promise((resolve) => {
    const mtlLoader = new MTLLoader();
    mtlLoader.setPath('/assets/dragon_peak/');
    mtlLoader.load(
      'floating_islands.mtl',
      (materials) => {
        materials.preload();
        const objLoader = new OBJLoader();
        objLoader.setMaterials(materials);
        objLoader.setPath('/assets/dragon_peak/');
        objLoader.load(
          'floating_islands.obj',
          (objRoot) => {
            const convertedMaterials = new Map();
            const convertMat = (m) => {
              if (!m) return toStylizedStandardMaterial(null);
              if (!convertedMaterials.has(m.name)) {
                convertedMaterials.set(m.name, toStylizedStandardMaterial(m));
              }
              return convertedMaterials.get(m.name);
            };

            for (const child of objRoot.children) {
              const key = child.name;
              if (!key) continue;
              const templateGroup = child.clone(true);
              templateGroup.traverse((node) => {
                if (node.isMesh) {
                  if (Array.isArray(node.material)) {
                    node.material = node.material.map(convertMat);
                  } else {
                    node.material = convertMat(node.material);
                  }
                  node.castShadow = true;
                  node.receiveShadow = true;
                }
              });
              islandMeshCache.set(key, templateGroup);
              if (key.startsWith('island')) {
                islandMeshCache.set(`${key}__flat`, createFlattenedIslandGroup(templateGroup));
              }
            }

            resolve(islandMeshCache);
          },
          undefined,
          (err) => {
            console.warn('[DragonPeakAssetLoader] Failed to load floating_islands.obj:', err);
            resolve(islandMeshCache);
          }
        );
      },
      undefined,
      (err) => {
        console.warn('[DragonPeakAssetLoader] Failed to load floating_islands.mtl:', err);
        resolve(islandMeshCache);
      }
    );
  });

  return islandsLoadingPromise;
}

/**
 * Preloads both the Poly Pizza Wyvern OBJ and the Sketchfab Interdimensional Floating Islands OBJ
 */
export function preloadDragonPeak3DAssets() {
  return Promise.all([
    preloadDragonPeakWyvern(),
    preloadDragonPeakFloatingIslands()
  ]);
}

/**
 * Prepares a cloned mesh for real-time continuous skeletal wave deformation by storing its rest-pose vertices.
 */
function prepareDeformableMesh(srcMesh, material, pivotOffset = null) {
  const m = srcMesh.clone();
  const geo = srcMesh.geometry.clone();
  const posAttr = geo.attributes.position;

  if (pivotOffset) {
    for (let i = 0; i < posAttr.count; i++) {
      posAttr.setXYZ(
        i,
        posAttr.getX(i) - pivotOffset.x,
        posAttr.getY(i) - pivotOffset.y,
        posAttr.getZ(i) - pivotOffset.z
      );
    }
    posAttr.needsUpdate = true;
    geo.computeBoundingBox();
    geo.computeBoundingSphere();
  }

  posAttr.setUsage(THREE.DynamicDrawUsage);
  m.geometry = geo;
  m.material = material;
  m.castShadow = true;
  m.receiveShadow = true;
  m.userData.restPositions = new Float32Array(posAttr.array);
  return m;
}

/**
 * Builds an articulated, deformable 3D Wyvern instance from `/assets/dragon_peak/wyvern.obj`
 * (`https://poly.pizza/m/WIOTISRjeX`) with full spine/neck/head/tail undulation and multi-joint wings.
 */
export function createPolyPizzaWyvern(
  scale = 1.0,
  primaryColor = 0x1e293b,
  wingColor = 0xd97706,
  accentColor = 0xffd166
) {
  const dragon = new THREE.Group();
  dragon.name = 'PolyPizza_Wyvern_WIOTISRjeX';
  const worldScale = scale * 2.85;
  dragon.scale.setScalar(worldScale);

  const leftWing = new THREE.Group();
  const rightWing = new THREE.Group();
  // Shoulder hinge pivots in wyvern.obj local space
  const leftPivot = new THREE.Vector3(0.12, 1.02, 0.04);
  const rightPivot = new THREE.Vector3(-0.12, 1.02, 0.04);

  leftWing.position.copy(leftPivot);
  rightWing.position.copy(rightPivot);

  const coreGroup = new THREE.Group();
  coreGroup.position.set(0, -0.85, 0);
  coreGroup.add(leftWing, rightWing);
  dragon.add(coreGroup);

  const spineMeshes = [];
  const leftWingMeshes = [];
  const rightWingMeshes = [];

  dragon.userData = {
    coreGroup,
    leftWing,
    rightWing,
    spineMeshes,
    leftWingMeshes,
    rightWingMeshes
  };

  const bodyMat = new THREE.MeshStandardMaterial({
    color: primaryColor,
    roughness: 0.45,
    metalness: 0.22,
    flatShading: true,
    side: THREE.DoubleSide
  });
  const wingMat = new THREE.MeshStandardMaterial({
    color: wingColor,
    roughness: 0.48,
    metalness: 0.15,
    emissive: wingColor,
    emissiveIntensity: 0.22,
    flatShading: true,
    side: THREE.DoubleSide
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: accentColor,
    roughness: 0.28,
    metalness: 0.65,
    emissive: accentColor,
    emissiveIntensity: 0.28,
    flatShading: true,
    side: THREE.DoubleSide
  });
  const eyeMat = new THREE.MeshStandardMaterial({
    color: 0xfffbeb,
    emissive: accentColor,
    emissiveIntensity: 1.35,
    roughness: 0.15,
    metalness: 0.2,
    flatShading: true
  });

  preloadDragonPeakWyvern().then((parts) => {
    if (!parts) return;

    for (const srcMesh of parts.body) {
      const m = prepareDeformableMesh(srcMesh, bodyMat, null);
      coreGroup.add(m);
      spineMeshes.push(m);
    }

    for (const srcMesh of parts.horns) {
      const m = prepareDeformableMesh(srcMesh, accentMat, null);
      coreGroup.add(m);
      spineMeshes.push(m);
    }

    for (const srcMesh of parts.eyes) {
      const m = prepareDeformableMesh(srcMesh, eyeMat, null);
      coreGroup.add(m);
      spineMeshes.push(m);
    }

    for (const srcMesh of parts.wingLeft) {
      const m = prepareDeformableMesh(srcMesh, wingMat, leftPivot);
      leftWing.add(m);
      leftWingMeshes.push(m);
    }

    for (const srcMesh of parts.wingRight) {
      const m = prepareDeformableMesh(srcMesh, wingMat, rightPivot);
      rightWing.add(m);
      rightWingMeshes.push(m);
    }
  });

  return dragon;
}

/**
 * Animates the Poly Pizza Wyvern (`wyvern.obj`) with:
 * 1. Whole-body flight recoil heave, pitch oscillation, and banking roll (`coreGroup`).
 * 2. Continuous serpentine spine, craning neck/head scan, swinging hind legs, and 3D whip-tail wave.
 * 3. Multi-joint shoulder + elbow + wingtip whip articulation and membrane camber billow.
 */
export function animatePolyPizzaWyvern(dragon, elapsed, phase = 0) {
  if (!dragon || !dragon.userData) return;
  const {
    coreGroup,
    leftWing,
    rightWing,
    spineMeshes,
    leftWingMeshes,
    rightWingMeshes
  } = dragon.userData;

  const cycle = elapsed * 4.2 + phase;
  const sinC = Math.sin(cycle);
  const cosC = Math.cos(cycle);

  // 1. Whole-body flight heave, pitch & aerodynamic banking
  if (coreGroup) {
    coreGroup.position.y = -0.85 - cosC * 0.14;
    coreGroup.rotation.x = Math.sin(cycle - 0.55) * 0.13;
    coreGroup.rotation.z = Math.sin(cycle * 0.5) * 0.14;
    coreGroup.rotation.y = Math.cos(cycle * 0.5) * 0.08;
  }

  // 2. Shoulder 3-axis wing stroke (power downstroke + swept recovery upstroke + angle of attack)
  const flapAngle = sinC * 0.48 + Math.sin(cycle * 2.0) * 0.07;
  const sweepAngle = cosC * 0.16;
  const pitchAngle = cosC * 0.12;

  if (leftWing) {
    leftWing.rotation.z = flapAngle;
    leftWing.rotation.y = -sweepAngle;
    leftWing.rotation.x = pitchAngle;
  }
  if (rightWing) {
    rightWing.rotation.z = -flapAngle;
    rightWing.rotation.y = sweepAngle;
    rightWing.rotation.x = pitchAngle;
  }

  // 3. Multi-joint elbow & wingtip whip + trailing membrane camber billow
  const deformWingList = (meshList, sideSign) => {
    if (!meshList) return;
    for (let mIdx = 0; mIdx < meshList.length; mIdx++) {
      const mesh = meshList[mIdx];
      const rest = mesh.userData.restPositions;
      if (!rest) continue;
      const posAttr = mesh.geometry.attributes.position;
      const arr = posAttr.array;
      const len = arr.length;

      for (let i = 0; i < len; i += 3) {
        const x0 = rest[i];
        const y0 = rest[i + 1];
        const z0 = rest[i + 2];

        const span = Math.abs(x0);
        // Phase-delayed outer wingtip whip (inner wing leads, wingtip trails and whips at stroke extremes)
        const whipPhase = cycle - 1.15 - span * 0.85;
        const whipY = Math.sin(whipPhase) * (0.20 * span * span);
        // Trailing-edge membrane camber twist along Z
        const trailing = Math.max(0, 0.08 - z0);
        const camberY = trailing * Math.cos(cycle - span * 0.65) * (0.22 * span);
        // Upstroke wing-tuck inward along X and sweep along Z
        const tuckX = -sideSign * Math.max(0, Math.cos(cycle - 0.35)) * (0.11 * span * span);
        const flexZ = Math.cos(whipPhase) * (0.07 * span);

        arr[i] = x0 + tuckX;
        arr[i + 1] = y0 + whipY + camberY;
        arr[i + 2] = z0 + flexZ;
      }
      posAttr.needsUpdate = true;
    }
  };

  deformWingList(leftWingMeshes, 1);
  deformWingList(rightWingMeshes, -1);

  // 4. Continuous serpentine spine, neck, head, hind legs & tail wave
  if (spineMeshes) {
    for (let mIdx = 0; mIdx < spineMeshes.length; mIdx++) {
      const mesh = spineMeshes[mIdx];
      const rest = mesh.userData.restPositions;
      if (!rest) continue;
      const posAttr = mesh.geometry.attributes.position;
      const arr = posAttr.array;
      const len = arr.length;

      for (let i = 0; i < len; i += 3) {
        const x0 = rest[i];
        const y0 = rest[i + 1];
        const z0 = rest[i + 2];

        let dx = 0;
        let dy = 0;
        let dz = 0;

        if (z0 > 0.12) {
          // Neck, head, horns, snout & eyes (z0 in [0.12, 0.66])
          const neckDist = (z0 - 0.12) * 1.85;
          const neckWave = Math.sin(cycle - 1.05 - neckDist * 1.35);
          dy = neckWave * (0.14 * neckDist);
          dx = Math.sin(elapsed * 2.2 + phase - neckDist * 1.1) * (0.12 * neckDist);
          dz = Math.cos(cycle - neckDist) * (0.035 * neckDist);
        } else {
          // Lower spine, hind legs & long tapering tail (z0 <= 0.12, y0 down to 0.0)
          const backZ = Math.max(0, 0.12 - z0);
          const dropY = Math.max(0, 0.96 - y0);
          const spineDist = Math.hypot(backZ, dropY);

          const tailPhaseY = cycle - 0.65 - spineDist * 2.55;
          const tailPhaseX = elapsed * 3.1 + phase - spineDist * 2.75;
          const amp = 0.11 * spineDist + 0.13 * spineDist * spineDist;

          dy = Math.sin(tailPhaseY) * amp;
          dx = Math.sin(tailPhaseX) * amp * 0.95;
          dz = Math.cos(tailPhaseY) * (0.055 * spineDist * spineDist);
        }

        arr[i] = x0 + dx;
        arr[i + 1] = y0 + dy;
        arr[i + 2] = z0 + dz;
      }
      posAttr.needsUpdate = true;
    }
  }
}

/**
 * Mounts an OBJ mesh from `floating_islands.obj` (`island`, `island_002`, `island_003`, `island_004`, `island_006`,
 * `bell_tower`, `house_1`, `house_2`, `mill`, `inn`, `tree_pine_lod0`, `tree_generic_lod0`, `curved_tree_lod0`,
 * `rock_pillar_1`, `rock_1`, `rock_2`, `cloud`, `cloud_001`, `cloud_002`) onto `targetParent`.
 */
export function mountDragonPeakObjAsset(targetParent, assetKey, options = {}) {
  const {
    scale = 1.0,
    scaleXYZ = null,
    position = [0, 0, 0],
    rotationY = 0,
    rotation = null,
    flattenTopPlateau = false
  } = options;

  const holder = new THREE.Group();
  holder.name = `DragonPeakObj_${assetKey}`;
  holder.position.set(position[0], position[1], position[2]);
  if (rotation) {
    holder.rotation.set(rotation[0], rotation[1], rotation[2]);
  } else {
    holder.rotation.y = rotationY;
  }
  if (scaleXYZ) {
    holder.scale.set(scaleXYZ[0], scaleXYZ[1], scaleXYZ[2]);
  } else {
    holder.scale.setScalar(scale);
  }

  targetParent.add(holder);

  preloadDragonPeakFloatingIslands().then((cache) => {
    const lookupKey = flattenTopPlateau && assetKey.startsWith('island') ? `${assetKey}__flat` : assetKey;
    const tpl = cache.get(lookupKey) || cache.get(assetKey) || cache.get('island');
    if (!tpl) return;
    const instance = tpl.clone(true);
    holder.add(instance);
  });

  return holder;
}


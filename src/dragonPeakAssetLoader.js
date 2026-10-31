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
  let polygonOffset = false;
  let polygonOffsetFactor = 0;
  let polygonOffsetUnits = 0;

  const isFoliage =
    matName.includes('leaf') ||
    matName.includes('bush') ||
    matName.includes('vegetation');

  if (matName.includes('island_grass') || isFoliage) {
    roughness = 0.72;
    metalness = 0.04;
  } else if (matName.includes('island_path') || matName.includes('wood')) {
    roughness = 0.68;
    metalness = 0.06;
    if (matName.includes('island_path')) {
      polygonOffset = true;
      polygonOffsetFactor = -2;
      polygonOffsetUnits = -2;
    }
  } else if (matName.includes('island_dirt') || matName.includes('rock') || matName.includes('stone')) {
    roughness = 0.78;
    metalness = 0.10;
    if (matName.includes('island_dirt')) {
      polygonOffset = true;
      polygonOffsetFactor = 2;
      polygonOffsetUnits = 2;
    }
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
    side: isFoliage ? THREE.DoubleSide : THREE.FrontSide,
    polygonOffset,
    polygonOffsetFactor,
    polygonOffsetUnits
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

function pointInTriXZ(px, pz, ax, ay, az, bx, by, bz, cx, cy, cz) {
  const v0x = cx - ax;
  const v0z = cz - az;
  const v1x = bx - ax;
  const v1z = bz - az;
  const v2x = px - ax;
  const v2z = pz - az;
  const dot00 = v0x * v0x + v0z * v0z;
  const dot01 = v0x * v1x + v0z * v1z;
  const dot02 = v0x * v2x + v0z * v2z;
  const dot11 = v1x * v1x + v1z * v1z;
  const dot12 = v1x * v2x + v1z * v2z;
  const denom = dot00 * dot11 - dot01 * dot01;
  if (Math.abs(denom) < 1e-10) return null;
  const u = (dot11 * dot02 - dot01 * dot12) / denom;
  const v = (dot00 * dot12 - dot01 * dot02) / denom;
  if (u >= -1e-4 && v >= -1e-4 && u + v <= 1 + 1e-4) {
    return ay + u * (cy - ay) + v * (by - ay);
  }
  return null;
}

/**
 * Eliminates Z-fighting between `island_grass`, `island_path`, and `island_dirt` by:
 * 1. Stripping internal downward-facing underside triangles of `island_grass` and `island_path`.
 * 2. Stripping underground `island_path` triangles that are buried beneath `island_grass` hills,
 *    and cleanly separating visible `island_path` surfaces above `island_grass`.
 * 3. Pushing internal upward-facing `island_dirt` core vertices well below the grass/path crust.
 * 4. When `flattenTopPlateau` is true, applying a strictly monotonic (never clamping!) vertical
 *    compression so relative layer heights are 100% preserved and never squashed to the same plane.
 */
function sanitizeIslandGroupGeometry(templateGroup, flattenTopPlateau = false) {
  const outGroup = templateGroup.clone(true);
  outGroup.traverse((node) => {
    if (!node.isMesh || !node.geometry) return;
    const geo = node.geometry.clone();
    const pos = geo.attributes.position;
    const mats = Array.isArray(node.material) ? node.material : [node.material];
    const groups =
      geo.groups && geo.groups.length > 0
        ? geo.groups
        : [{ start: 0, count: pos.count, materialIndex: 0 }];

    let maxRawY = -Infinity;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      if (y > maxRawY) maxRawY = y;
    }

    // Collect upward-facing `island_grass` triangles in raw coordinates
    const grassTris = [];
    for (const g of groups) {
      const mName = (mats[g.materialIndex]?.name || '').toLowerCase();
      if (!mName.includes('island_grass')) continue;
      const end = g.start + g.count;
      for (let i = g.start; i < end; i += 3) {
        const ax = pos.getX(i), ay = pos.getY(i), az = pos.getZ(i);
        const bx = pos.getX(i + 1), by = pos.getY(i + 1), bz = pos.getZ(i + 1);
        const cx = pos.getX(i + 2), cy = pos.getY(i + 2), cz = pos.getZ(i + 2);
        const ux = bx - ax, uy = by - ay, uz = bz - az;
        const vx = cx - ax, vy = cy - ay, vz = cz - az;
        const nx = uy * vz - uz * vy;
        const ny = uz * vx - ux * vz;
        const nz = ux * vy - uy * vx;
        const nY = ny / (Math.hypot(nx, ny, nz) || 1);
        if (nY > 0.1) {
          grassTris.push([ax, ay, az, bx, by, bz, cx, cy, cz]);
        }
      }
    }

    const getRawGrassHeight = (x, z) => {
      let best = null;
      for (let t = 0; t < grassTris.length; t++) {
        const tr = grassTris[t];
        const h = pointInTriXZ(
          x, z,
          tr[0], tr[1], tr[2],
          tr[3], tr[4], tr[5],
          tr[6], tr[7], tr[8]
        );
        if (h !== null && (best === null || h > best)) best = h;
      }
      return best;
    };

    for (const g of groups) {
      const mName = (mats[g.materialIndex]?.name || '').toLowerCase();
      const end = g.start + g.count;

      for (let i = g.start; i < end; i += 3) {
        const ax = pos.getX(i), ay = pos.getY(i), az = pos.getZ(i);
        const bx = pos.getX(i + 1), by = pos.getY(i + 1), bz = pos.getZ(i + 1);
        const cx = pos.getX(i + 2), cy = pos.getY(i + 2), cz = pos.getZ(i + 2);
        const ux = bx - ax, uy = by - ay, uz = bz - az;
        const vx = cx - ax, vy = cy - ay, vz = cz - az;
        const nx = uy * vz - uz * vy;
        const ny = uz * vx - ux * vz;
        const nz = ux * vy - uy * vx;
        const nY = ny / (Math.hypot(nx, ny, nz) || 1);

        // 1. Strip hidden downward-facing underside faces of grass & path shells
        if ((mName.includes('island_grass') || mName.includes('island_path')) && nY < -0.22) {
          pos.setXYZ(i, 0, -0.55, 0);
          pos.setXYZ(i + 1, 0, -0.55, 0);
          pos.setXYZ(i + 2, 0, -0.55, 0);
          continue;
        }

        // 2. Push internal upward-facing dirt core faces well below the grass/path crust
        if (mName.includes('island_dirt') && nY > 0.12) {
          for (let k = 0; k < 3; k++) {
            const vx0 = pos.getX(i + k);
            const vy0 = pos.getY(i + k);
            const vz0 = pos.getZ(i + k);
            if (Math.hypot(vx0, vz0) < 0.86 && vy0 > -0.45) {
              pos.setY(i + k, vy0 - 0.14);
            }
          }
          continue;
        }

        // 3. Separate `island_path` from `island_grass` so buried path faces never shimmer through grass
        if (mName.includes('island_path') && grassTris.length > 0) {
          const g0 = getRawGrassHeight(ax, az);
          const g1 = getRawGrassHeight(bx, bz);
          const g2 = getRawGrassHeight(cx, cz);
          const b0 = g0 !== null && ay < g0 - 0.005;
          const b1 = g1 !== null && by < g1 - 0.005;
          const b2 = g2 !== null && cy < g2 - 0.005;
          if (b0 && b1 && b2) {
            pos.setXYZ(i, 0, -0.55, 0);
            pos.setXYZ(i + 1, 0, -0.55, 0);
            pos.setXYZ(i + 2, 0, -0.55, 0);
            continue;
          }
          const ys = [ay, by, cy];
          const gs = [g0, g1, g2];
          for (let k = 0; k < 3; k++) {
            const yk = ys[k];
            const gk = gs[k];
            const diff = gk !== null ? Math.min(0, yk - gk) : 0;
            pos.setY(i + k, yk + 0.015 + diff * 1.85);
          }
        }
      }
    }

    // 4. Strictly monotonic plateau leveling (never clamping multiple heights to the same plane)
    if (flattenTopPlateau) {
      const topCeil = Math.max(0.15, maxRawY + 0.025);
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i);
        if (y > -0.16) {
          const v = (y - -0.16) / (topCeil - -0.16);
          pos.setY(i, -0.075 + v * 0.073);
        } else if (y > -0.48) {
          const u = (y - -0.48) / (-0.16 - -0.48);
          pos.setY(i, -0.48 + u * 0.405);
        }
      }
    }

    pos.needsUpdate = true;
    geo.computeVertexNormals();
    geo.computeBoundingBox();
    geo.computeBoundingSphere();
    node.geometry = geo;
  });
  return outGroup;
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
              if (key.startsWith('island')) {
                islandMeshCache.set(key, sanitizeIslandGroupGeometry(templateGroup, false));
                islandMeshCache.set(`${key}__flat`, sanitizeIslandGroupGeometry(templateGroup, true));
              } else {
                islandMeshCache.set(key, templateGroup);
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
 * (`https://poly.pizza/m/WIOTISRjeX`) with horizontal serpentine left-right spine undulation and multi-joint wings.
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
    leftPivot,
    rightPivot,
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
 * 1. Continuous horizontal serpentine S-wave ("snake wave left and right") traveling from snout
 *    to tail tip along the lateral X axis, with zero vertical up-and-down bobbing.
 * 2. Shoulder pivots locked to the slithering chest + multi-joint wing articulation.
 */
export function animatePolyPizzaWyvern(dragon, elapsed, phase = 0) {
  if (!dragon || !dragon.userData) return;
  const {
    coreGroup,
    leftWing,
    rightWing,
    leftPivot,
    rightPivot,
    spineMeshes,
    leftWingMeshes,
    rightWingMeshes
  } = dragon.userData;

  const wingCycle = elapsed * 4.0 + phase;
  const sinW = Math.sin(wingCycle);
  const cosW = Math.cos(wingCycle);

  // Horizontal snake-wave frequency & traveling S-curve wavenumber along the dragon's spine
  const snakeTime = elapsed * 4.6 + phase;
  const snakeWaveNum = 3.9;

  // Evaluates the horizontal left-right snake displacement (dx) and local XZ yaw tangent slope
  // at any spine coordinate (y0, z0), with zero vertical (dy = 0) bobbing.
  const evalSnakeWave = (y0, z0) => {
    const s = (0.66 - z0) + Math.max(0, 0.96 - y0) * 0.38;
    const waveArg = snakeTime - s * snakeWaveNum;
    const amp = 0.14 + 0.08 * s + 0.075 * s * s;
    const dx = Math.sin(waveArg) * amp;
    const slope = -Math.cos(waveArg) * snakeWaveNum * amp * 0.55;
    return { dx, slope };
  };

  // 1. Keep vertical height steady (no up-and-down bobbing); gentle horizontal sway & banking
  if (coreGroup) {
    coreGroup.position.y = -0.85;
    coreGroup.position.x = Math.sin(snakeTime) * 0.08;
    coreGroup.rotation.x = 0;
    coreGroup.rotation.y = Math.cos(snakeTime) * 0.12;
    coreGroup.rotation.z = -Math.cos(snakeTime) * 0.10;
  }

  // 2. Anchor wing shoulders to the chest's horizontal snake wave so wings follow the slithering torso
  const chestWave = evalSnakeWave(1.02, 0.04);
  const flapAngle = sinW * 0.46 + Math.sin(wingCycle * 2.0) * 0.06;
  const sweepAngle = cosW * 0.16;
  const pitchAngle = cosW * 0.10;

  if (leftWing) {
    if (leftPivot) {
      leftWing.position.set(
        leftPivot.x + chestWave.dx,
        leftPivot.y,
        leftPivot.z - leftPivot.x * chestWave.slope * 0.35
      );
    }
    leftWing.rotation.z = flapAngle;
    leftWing.rotation.y = -sweepAngle + chestWave.slope * 0.28;
    leftWing.rotation.x = pitchAngle;
  }
  if (rightWing) {
    if (rightPivot) {
      rightWing.position.set(
        rightPivot.x + chestWave.dx,
        rightPivot.y,
        rightPivot.z - rightPivot.x * chestWave.slope * 0.35
      );
    }
    rightWing.rotation.z = -flapAngle;
    rightWing.rotation.y = sweepAngle + chestWave.slope * 0.28;
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
        const whipPhase = wingCycle - 1.15 - span * 0.85;
        const whipY = Math.sin(whipPhase) * (0.20 * span * span);
        const trailing = Math.max(0, 0.08 - z0);
        const camberY = trailing * Math.cos(wingCycle - span * 0.65) * (0.22 * span);
        const tuckX = -sideSign * Math.max(0, Math.cos(wingCycle - 0.35)) * (0.11 * span * span);
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

  // 4. Pure horizontal left-right serpentine S-wave across head, neck, torso, hind legs & tail (dy = 0)
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

        const s = (0.66 - z0) + Math.max(0, 0.96 - y0) * 0.38;
        const waveArg = snakeTime - s * snakeWaveNum;
        const amp = 0.14 + 0.08 * s + 0.075 * s * s;

        const dx = Math.sin(waveArg) * amp;
        const slope = -Math.cos(waveArg) * snakeWaveNum * amp * 0.55;
        const dz = -x0 * slope * 0.42;

        arr[i] = x0 + dx;
        arr[i + 1] = y0;
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


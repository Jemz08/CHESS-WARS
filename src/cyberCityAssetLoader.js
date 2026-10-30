import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

/**
 * Loader & Cache for Niko's Low-Poly Futuristic City 3D Assets
 * Source: https://niko-3d-models.itch.io/low-poly-futuristic-city-assets
 * File: /public/assets/cyber/futuristic_city.fbx
 *
 * Provides normalized, bottom-anchored 3D templates for individual buildings,
 * skyscrapers, ribbed reactor spire towers, futuristic hover-ships/vehicles,
 * holographic forcefield gates, neon cyber tables, and hourglass pedestals,
 * as well as the full 81-mesh Futuristic City metropolis scene.
 */

const fbxLoader = new FBXLoader();

let rawFbxScene = null;
let rawFbxPromise = null;
const templateCache = new Map();

export const CYBER_CITY_ASSET_DEFS = {
  // Pedestals & Stools
  cyber_pedestal: { meshes: ['Circle001'], norm: 'height', rotY: 0 },
  cyber_pedestal_alt: { meshes: ['Circle015'], norm: 'height', rotY: 0 },
  cyber_disc_base: { meshes: ['Circle009'], norm: 'max', rotY: 0 },

  // 5 Futuristic Hover-Ships / Flying Vehicles (rotated so nose points along +Z)
  hover_cruiser: { meshes: ['Cube016'], norm: 'max', rotY: -Math.PI / 2 },
  hover_interceptor: { meshes: ['Cube067'], norm: 'max', rotY: -Math.PI / 2 },
  hover_shuttle: { meshes: ['Cube033'], norm: 'max', rotY: -Math.PI / 2 },
  hover_gunship: { meshes: ['Cube011'], norm: 'max', rotY: -Math.PI / 2 },
  hover_recon: { meshes: ['Cube017'], norm: 'max', rotY: Math.PI / 2 },

  // Spire Towers & Beacons
  reactor_spire_twin: { meshes: ['Cube065'], norm: 'height', rotY: 0 },
  neon_beacon_spire: { meshes: ['Cube009'], norm: 'height', rotY: 0 },
  skyscraper_citadel_tall: { meshes: ['Cube032'], norm: 'height', rotY: 0 },
  skyscraper_monolith: { meshes: ['Cube028'], norm: 'height', rotY: 0 },

  // Hero Neon Skyscrapers & Cyber Complexes
  skyscraper_neon_stripes: { meshes: ['Cube006'], norm: 'height', rotY: 0 },
  skyscraper_hex_hq: { meshes: ['Cube005'], norm: 'height', rotY: 0 },
  skyscraper_balcony_tower: { meshes: ['Cube014'], norm: 'height', rotY: 0 },
  skyscraper_corp_tower: { meshes: ['Cube010'], norm: 'height', rotY: 0 },
  cyber_bastion_block: { meshes: ['Cube002'], norm: 'height', rotY: 0 },
  cyber_bunker_hub: { meshes: ['Cube024'], norm: 'height', rotY: 0 },
  cyber_vista_tower: { meshes: ['Cube047'], norm: 'height', rotY: 0 },
  cyber_command_complex: { meshes: ['Cube023'], norm: 'height', rotY: 0 },
  cyber_arch_building: { meshes: ['Cube013'], norm: 'height', rotY: 0 },
  cyber_sector_block: { meshes: ['Cube003'], norm: 'height', rotY: 0 },

  // Forcefield Gate & Street Props
  forcefield_gate: { meshes: ['Cube018', 'Cube046'], norm: 'height', rotY: Math.PI / 2 },
  forcefield_arch_frame: { meshes: ['Cube018'], norm: 'height', rotY: Math.PI / 2 },
  neon_cyber_table: { meshes: ['Cube037'], norm: 'max', rotY: 0 },
  neon_cyber_console: { meshes: ['Cube038'], norm: 'max', rotY: 0 },
  neon_cyber_desk: { meshes: ['Cube039'], norm: 'max', rotY: 0 },
  copper_reactor_rack: { meshes: ['Cylinder017'], norm: 'max', rotY: 0 },
  copper_cell_cyl: { meshes: ['Cylinder006'], norm: 'height', rotY: 0 }
};

let sharedCyberCityMaterials = null;

/**
 * Returns the authentic PBR material palette matching Niko's Low-Poly Futuristic City
 * Blender Cycles renders (titanium gray, dark gunmetal, glowing cyan window lights,
 * blue/green vehicle thrusters, translucent cyan forcefield barrier, and copper).
 */
export function getCyberCityMaterials() {
  if (sharedCyberCityMaterials) return sharedCyberCityMaterials;

  sharedCyberCityMaterials = {
    'metalic light gray': new THREE.MeshStandardMaterial({
      name: 'metalic light gray',
      color: 0x5c6975,
      roughness: 0.34,
      metalness: 0.68,
      emissive: 0x0b131b,
      emissiveIntensity: 0.25
    }),
    'metalic dark gray': new THREE.MeshStandardMaterial({
      name: 'metalic dark gray',
      color: 0x1e242c,
      roughness: 0.36,
      metalness: 0.78,
      emissive: 0x060a10,
      emissiveIntensity: 0.2
    }),
    gray: new THREE.MeshStandardMaterial({
      name: 'gray',
      color: 0x2b323b,
      roughness: 0.52,
      metalness: 0.35
    }),
    lights: new THREE.MeshStandardMaterial({
      name: 'lights',
      color: 0x80f8ff,
      roughness: 0.12,
      metalness: 0.2,
      emissive: 0x00f0ff,
      emissiveIntensity: 2.15
    }),
    blue: new THREE.MeshStandardMaterial({
      name: 'blue',
      color: 0x60efff,
      roughness: 0.14,
      metalness: 0.25,
      emissive: 0x00d8ff,
      emissiveIntensity: 1.95
    }),
    green: new THREE.MeshStandardMaterial({
      name: 'green',
      color: 0x69ff97,
      roughness: 0.14,
      metalness: 0.25,
      emissive: 0x00ff66,
      emissiveIntensity: 2.05
    }),
    energy: new THREE.MeshStandardMaterial({
      name: 'energy',
      color: 0x80ffea,
      roughness: 0.12,
      metalness: 0.3,
      emissive: 0x00f5d4,
      emissiveIntensity: 2.25
    }),
    barrier: new THREE.MeshStandardMaterial({
      name: 'barrier',
      color: 0x00e5ff,
      roughness: 0.1,
      metalness: 0.15,
      emissive: 0x00b4d8,
      emissiveIntensity: 1.25,
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
      side: THREE.DoubleSide
    }),
    copper: new THREE.MeshStandardMaterial({
      name: 'copper',
      color: 0xc87d3b,
      roughness: 0.26,
      metalness: 0.86,
      emissive: 0x2b1404,
      emissiveIntensity: 0.22
    })
  };

  return sharedCyberCityMaterials;
}

/**
 * Remaps legacy FBX Phong materials to the proper Futuristic City PBR materials,
 * or to a chess piece's White/Black team skin materials when `teamMats` is supplied.
 */
function applyCyberMaterialsToNode(rootObj, teamMats = null, castShadow = true, receiveShadow = true) {
  const palette = getCyberCityMaterials();

  rootObj.traverse((node) => {
    if (!node.isMesh) return;
    node.castShadow = castShadow;
    node.receiveShadow = receiveShadow;

    if (node.geometry && !node.geometry.attributes.normal) {
      node.geometry.computeVertexNormals();
    }

    const remapSingleMat = (origMat) => {
      const matName = (origMat?.name || '').toLowerCase().trim();

      if (teamMats) {
        const { primaryMat, trimMat, bladeMat, greenAccentMat } = teamMats;
        if (matName === 'lights' || matName === 'blue' || matName === 'energy') {
          return bladeMat || palette.lights;
        }
        if (matName === 'green') {
          return greenAccentMat || bladeMat || palette.green;
        }
        if (matName === 'barrier') {
          return palette.barrier;
        }
        if (matName === 'metalic dark gray' || matName === 'copper') {
          return trimMat || palette['metalic dark gray'];
        }
        return primaryMat || palette['metalic light gray'];
      }

      return palette[matName] || palette['metalic light gray'];
    };

    if (Array.isArray(node.material)) {
      node.material = node.material.map(remapSingleMat);
    } else {
      node.material = remapSingleMat(node.material);
    }
  });
}

/**
 * Loads `/assets/cyber/futuristic_city.fbx` once and returns the parsed Group.
 */
export function loadRawCyberCityFBX() {
  if (rawFbxScene) {
    return Promise.resolve(rawFbxScene);
  }
  if (rawFbxPromise) {
    return rawFbxPromise;
  }

  rawFbxPromise = new Promise((resolve, reject) => {
    fbxLoader.load(
      '/assets/cyber/futuristic_city.fbx',
      (group) => {
        applyCyberMaterialsToNode(group, null, true, true);
        rawFbxScene = group;
        resolve(group);
      },
      undefined,
      (err) => {
        console.warn('[CyberCityAssetLoader] Failed to load futuristic_city.fbx:', err);
        rawFbxPromise = null;
        reject(err);
      }
    );
  });

  return rawFbxPromise;
}

/**
 * Builds and caches a normalized, bottom-anchored (`min.y = 0`), XZ-centered (`0, 0`)
 * 3D template from `futuristic_city.fbx` for a named asset in `CYBER_CITY_ASSET_DEFS`.
 */
export function loadCyberCityTemplate(modelName) {
  if (templateCache.has(modelName)) {
    return Promise.resolve(templateCache.get(modelName));
  }

  return loadRawCyberCityFBX().then((fbxGroup) => {
    if (templateCache.has(modelName)) {
      return templateCache.get(modelName);
    }

    const def = CYBER_CITY_ASSET_DEFS[modelName];
    const meshNames = def ? def.meshes : [modelName];
    const normMode = def ? def.norm : 'height';
    const rotY = def?.rotY || 0;

    const rawHolder = new THREE.Group();
    for (const mName of meshNames) {
      const found = fbxGroup.children.find((c) => c.name === mName);
      if (found) {
        rawHolder.add(found.clone());
      }
    }

    rawHolder.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(rawHolder);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    const denom =
      normMode === 'height'
        ? Math.max(1e-4, size.y)
        : Math.max(1e-4, size.x, size.y, size.z);
    const normScale = 1.0 / denom;

    // Shift rawHolder so its horizontal center is (0, 0) and its bottom is y = 0
    const offsetGroup = new THREE.Group();
    rawHolder.position.set(-center.x * normScale, -box.min.y * normScale, -center.z * normScale);
    rawHolder.scale.setScalar(normScale);
    offsetGroup.add(rawHolder);

    const orientedTemplate = new THREE.Group();
    orientedTemplate.name = `CyberTemplate_${modelName}`;
    if (rotY !== 0) {
      offsetGroup.rotation.y = rotY;
    }
    orientedTemplate.add(offsetGroup);

    templateCache.set(modelName, orientedTemplate);
    return orientedTemplate;
  });
}

/**
 * Mounts a cloned instance of a normalized Futuristic City 3D model into `targetParent`.
 */
export function mountCyberCityModel(targetParent, modelName, options = {}) {
  const {
    scale = 1.0,
    position = [0, 0, 0],
    rotation = [0, 0, 0],
    rotationY = null,
    teamMats = null,
    castShadow = true,
    receiveShadow = true,
    excludeFromBounds = false,
    onLoaded = null
  } = options;

  const container = new THREE.Group();
  container.name = `CyberAsset_${modelName}`;
  container.position.set(position[0] || 0, position[1] || 0, position[2] || 0);
  container.rotation.set(
    rotation[0] || 0,
    rotationY !== null ? rotationY : rotation[1] || 0,
    rotation[2] || 0
  );

  if (typeof scale === 'number') {
    container.scale.setScalar(scale);
  } else if (Array.isArray(scale)) {
    container.scale.set(scale[0], scale[1], scale[2]);
  }

  if (excludeFromBounds) {
    container.userData.excludeFromBounds = true;
  }

  targetParent.add(container);

  loadCyberCityTemplate(modelName)
    .then((template) => {
      const instance = template.clone(true);
      applyCyberMaterialsToNode(instance, teamMats, castShadow, receiveShadow);

      let pRef = container;
      let foundPiece = null;
      while (pRef) {
        if (pRef.userData && pRef.userData.piece) {
          foundPiece = pRef.userData.piece;
          break;
        }
        pRef = pRef.parent;
      }

      instance.traverse((ch) => {
        if (excludeFromBounds) {
          ch.userData.excludeFromBounds = true;
        }
        if (foundPiece) {
          ch.userData.piece = foundPiece;
        }
      });

      container.add(instance);
      if (typeof onLoaded === 'function') {
        onLoaded(instance, container);
      }
    })
    .catch(() => {
      // Silently ignore load errors
    });

  return container;
}

/**
 * Mounts the complete 81-mesh Low-Poly Futuristic City scene from `futuristic_city.fbx`
 * into `targetParent`, centered on the main landing-pad plaza and clearing a radial
 * sanctuary around the chessboard at `(0, 0, 0)` so no buildings clip the board.
 */
export function mountFullCyberCityScene(targetParent, options = {}) {
  const {
    cityScale = 0.0042,
    plazaCenterFBX = [-576, 79, 4332],
    yOffset = -0.58,
    minClearanceRadius = 11.4,
    onLoaded = null
  } = options;

  const cityRoot = new THREE.Group();
  cityRoot.name = 'CyberCityFullScene';
  targetParent.add(cityRoot);

  loadRawCyberCityFBX()
    .then((fbxGroup) => {
      const [px, py, pz] = plazaCenterFBX;

      fbxGroup.children.forEach((srcMesh) => {
        const cloned = srcMesh.clone(true);
        applyCyberMaterialsToNode(cloned, null, true, true);

        // Compute original FBX world bounds
        const rawBox = new THREE.Box3().setFromObject(cloned);
        const rawCenter = new THREE.Vector3();
        rawBox.getCenter(rawCenter);

        // Convert to scaled arena coordinates centered on plazaCenterFBX
        let shiftX = 0;
        let shiftZ = 0;

        // Keep the base ground/road/overpass mesh (`Cube`) aligned, and push any
        // building/prop whose bounding box encroaches inside `minClearanceRadius`
        // radially outward so the central chessboard courtyard stays 100% clear!
        if (srcMesh.name !== 'Cube') {
          const minX = (rawBox.min.x - px) * cityScale;
          const maxX = (rawBox.max.x - px) * cityScale;
          const minZ = (rawBox.min.z - pz) * cityScale;
          const maxZ = (rawBox.max.z - pz) * cityScale;

          const dx = Math.max(minX, 0, -maxX);
          const dz = Math.max(minZ, 0, -maxZ);
          const closestDist = Math.hypot(dx, dz);

          if (closestDist < minClearanceRadius) {
            const cx = (rawCenter.x - px) * cityScale;
            const cz = (rawCenter.z - pz) * cityScale;
            const cDist = Math.hypot(cx, cz);
            const pushDist = minClearanceRadius - closestDist + 0.8;
            const dirX = cDist > 0.1 ? cx / cDist : 1.0;
            const dirZ = cDist > 0.1 ? cz / cDist : 0.0;
            shiftX = (dirX * pushDist) / cityScale;
            shiftZ = (dirZ * pushDist) / cityScale;
          }
        }

        cloned.position.set(
          (srcMesh.position.x - px + shiftX) * cityScale,
          (srcMesh.position.y - py) * cityScale + yOffset,
          (srcMesh.position.z - pz + shiftZ) * cityScale
        );
        cloned.scale.multiplyScalar(cityScale);
        cityRoot.add(cloned);
      });

      if (typeof onLoaded === 'function') {
        onLoaded(cityRoot);
      }
    })
    .catch(() => {
      // Silently ignore load errors
    });

  return cityRoot;
}

/**
 * Preloads the Futuristic City FBX and key templates in the background.
 */
export function preloadCyberCity3DAssets() {
  loadRawCyberCityFBX().then(() => {
    const priorityAssets = [
      'cyber_pedestal',
      'hover_cruiser',
      'hover_interceptor',
      'hover_shuttle',
      'hover_gunship',
      'hover_recon',
      'reactor_spire_twin',
      'neon_beacon_spire',
      'skyscraper_neon_stripes',
      'skyscraper_hex_hq',
      'skyscraper_balcony_tower',
      'skyscraper_citadel_tall',
      'forcefield_gate',
      'neon_cyber_table',
      'neon_cyber_console'
    ];
    for (const name of priorityAssets) {
      loadCyberCityTemplate(name);
    }
  });
}

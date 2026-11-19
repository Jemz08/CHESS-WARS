import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * Low Poly Winter Nature Pack 3D Asset Loader (Cenji - 100 FREE Assets)
 * Loads, normalizes, and caches real 3D .glb models from /public/assets/winter/
 */

THREE.Cache.enabled = true;

const gltfLoader = new GLTFLoader();
const modelTemplateCache = new Map();
const modelPromiseCache = new Map();

export function resolveWinterModelUrl(modelName) {
  if (modelName.endsWith('.glb') || modelName.endsWith('.gltf')) {
    return modelName.startsWith('/') ? modelName : `/assets/winter/${modelName}`;
  }
  return `/assets/winter/${modelName}.glb`;
}

export function loadWinterModelTemplate(modelName) {
  if (modelTemplateCache.has(modelName)) {
    return Promise.resolve(modelTemplateCache.get(modelName));
  }
  if (modelPromiseCache.has(modelName)) {
    return modelPromiseCache.get(modelName);
  }
  if (typeof window === 'undefined') {
    return Promise.resolve(null);
  }

  const url = resolveWinterModelUrl(modelName);

  const promise = new Promise((resolve) => {
    gltfLoader.load(
      url,
      (gltf) => {
        const root = gltf.scene || (gltf.scenes && gltf.scenes[0]);
        if (!root) {
          resolve(null);
          return;
        }
        root.traverse((child) => {
          if (!child.isMesh) return;
          child.castShadow = true;
          child.receiveShadow = true;
          if (child.material) {
            const mats = Array.isArray(child.material) ? child.material : [child.material];
            for (const m of mats) {
              if (!m) continue;
              m.userData = {
                ...m.userData,
                isSharedPoliigonTex: true,
                isSharedWinterMat: true
              };
              if (m.map) {
                m.map.colorSpace = THREE.SRGBColorSpace;
                m.map.userData = {
                  ...m.map.userData,
                  isSharedPoliigonTex: true,
                  isSharedWinterTex: true
                };
              }
              if (typeof m.roughness === 'number' && m.roughness < 0.35) {
                m.roughness = 0.55;
              }
            }
          }
        });
        modelTemplateCache.set(modelName, root);
        resolve(root);
      },
      undefined,
      () => {
        resolve(null);
      }
    );
  }).finally(() => {
    modelPromiseCache.delete(modelName);
  });

  modelPromiseCache.set(modelName, promise);
  return promise;
}

/**
 * Mounts a cloned instance of a downloaded Winter Nature Pack .glb model into `targetContainer`.
 */
export function mountWinterModel(targetContainer, modelName, options = {}) {
  if (!targetContainer) return;
  const {
    scale = 1.0,
    position = null,
    rotation = null,
    rotationY = null,
    castShadow = true,
    receiveShadow = true,
    replaceChildren = false,
    overrideMaterial = null,
    excludeFromBounds = false,
    onLoaded = null
  } = options;

  const applyClone = (template) => {
    if (!template) return;
    if (replaceChildren) {
      while (targetContainer.children.length > 0) {
        const ch = targetContainer.children.pop();
        if (ch) targetContainer.remove(ch);
      }
    }
    const instance = template.clone(true);
    if (typeof scale === 'number') {
      instance.scale.setScalar(scale);
    } else if (Array.isArray(scale)) {
      instance.scale.set(scale[0], scale[1], scale[2]);
    }
    if (position) {
      if (Array.isArray(position)) {
        instance.position.set(position[0], position[1], position[2]);
      } else if (position.isVector3) {
        instance.position.copy(position);
      }
    }
    if (rotation) {
      if (Array.isArray(rotation)) {
        instance.rotation.set(rotation[0], rotation[1], rotation[2]);
      }
    } else if (typeof rotationY === 'number') {
      instance.rotation.y = rotationY;
    }

    instance.traverse((child) => {
      if (excludeFromBounds) {
        child.userData.excludeFromBounds = true;
      }
      if (child.isMesh) {
        child.castShadow = castShadow;
        child.receiveShadow = receiveShadow;
        if (overrideMaterial) {
          child.material = overrideMaterial;
        }
      }
    });

    targetContainer.add(instance);
    if (typeof onLoaded === 'function') {
      onLoaded(instance);
    }
  };

  const cached = modelTemplateCache.get(modelName);
  if (cached) {
    applyClone(cached);
    return;
  }

  loadWinterModelTemplate(modelName).then((tpl) => {
    if (tpl) applyClone(tpl);
  });
}

const CORE_WINTER_MODELS = [
  'HERO_02_FrozenWaterfall',
  'HERO_03_FrozenCaveEntrance',
  'HERO_04_LargeIceArch',
  'TREE_03_PineSmallSnowy',
  'TREE_07_PineSparse',
  'TREE_08_PineYoung',
  'TREE_13_BareLarge',
  'TREE_16_TwistedWinter',
  'TREE_17_DeadSnowy',
  'ROCK_06_FrostedBoulder',
  'ROCK_09_SnowyFormation',
  'ROCK_11_CliffMedium',
  'ROCK_12_CliffLarge',
  'ROCK_14_FrozenRockArch',
  'ROCK_15_IcyCliffFormation',
  'ICE_01_PondSmall',
  'ICE_12_BrokenIceCluster',
  'FROST_01_ClusterSmall',
  'FROST_03_ClusterLarge',
  'LOG_01_SnowyStump',
  'LOG_02_FallenLogSnowy',
  'PLANT_08_FrostedShrub',
  'SNOW_12_SnowbankLarge',
  'SNOW_14_WindSweptDrift',
  'SNOW_16_HillMedium',
  'PROP_01_FenceStraightSnowy',
  'PROP_04_WinterSignpost',
  'PROP_06_WoodFootbridgeSnowy',
  'PROP_08_WinterBench',
  'PROP_09_CampfireRingSnowy',
  'PROP_10_LanternPost',
  'PROP_11_FirewoodStackSnowy',
  'PROP_12_WoodShelterSnowy'
];

let preloaded = false;
export function preloadWinter3DAssets() {
  if (preloaded || typeof window === 'undefined') return;
  preloaded = true;
  for (const name of CORE_WINTER_MODELS) {
    loadWinterModelTemplate(name);
  }
}

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * Halloween 3D Asset Pack & Texture Loader
 * Loads and caches actual 3D .gltf and .glb models and .png/.jpg textures from /public/assets/halloween/
 */

const gltfLoader = new GLTFLoader();
const textureLoader = new THREE.TextureLoader();

const modelTemplateCache = new Map();
const modelPromiseCache = new Map();
const textureCache = new Map();

let sharedHalloweenAtlasTex = null;
let sharedHalloweenAtlasMat = null;

export function getSharedHalloweenAtlasTexture() {
  if (sharedHalloweenAtlasTex) return sharedHalloweenAtlasTex;
  if (typeof window === 'undefined') return null;
  const tex = textureLoader.load('/assets/halloween/halloweenbits_texture.png');
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.flipY = false; // GLTF UV convention
  tex.userData = { isSharedPoliigonTex: true, isSharedHalloweenTex: true };
  sharedHalloweenAtlasTex = tex;
  return tex;
}

export function getSharedHalloweenAtlasMaterial() {
  if (sharedHalloweenAtlasMat) return sharedHalloweenAtlasMat;
  const map = getSharedHalloweenAtlasTexture();
  sharedHalloweenAtlasMat = new THREE.MeshStandardMaterial({
    map,
    roughness: 0.58,
    metalness: 0.08
  });
  sharedHalloweenAtlasMat.userData = {
    isSharedPoliigonTex: true,
    isSharedHalloweenMat: true
  };
  return sharedHalloweenAtlasMat;
}

export function loadHalloweenTextureAsset(filename) {
  if (textureCache.has(filename)) return textureCache.get(filename);
  if (typeof window === 'undefined') return null;
  const url = filename.startsWith('/') ? filename : `/assets/halloween/${filename}`;
  const tex = textureLoader.load(url);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.userData = { isSharedPoliigonTex: true, isSharedHalloweenTex: true };
  textureCache.set(filename, tex);
  return tex;
}

export function resolveHalloweenModelUrl(modelName) {
  if (modelName === 'cauldron') {
    return '/assets/halloween/cauldron.glb';
  }
  if (modelName.endsWith('.glb') || modelName.endsWith('.gltf')) {
    return modelName.startsWith('/') ? modelName : `/assets/halloween/${modelName}`;
  }
  return `/assets/halloween/${modelName}.gltf`;
}

export function loadHalloweenModelTemplate(modelName) {
  if (modelTemplateCache.has(modelName)) {
    return Promise.resolve(modelTemplateCache.get(modelName));
  }
  if (modelPromiseCache.has(modelName)) {
    return modelPromiseCache.get(modelName);
  }
  if (typeof window === 'undefined') {
    return Promise.resolve(null);
  }

  const url = resolveHalloweenModelUrl(modelName);
  const sharedAtlasMat = getSharedHalloweenAtlasMaterial();

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
            if (child.material.name === 'HalloweenBits' && sharedAtlasMat) {
              child.material = sharedAtlasMat;
            } else {
              const mats = Array.isArray(child.material) ? child.material : [child.material];
              for (const m of mats) {
                if (!m) continue;
                m.userData = { ...m.userData, isSharedPoliigonTex: true, isSharedHalloweenMat: true };
                if (m.map) {
                  m.map.colorSpace = THREE.SRGBColorSpace;
                  m.map.userData = { ...m.map.userData, isSharedPoliigonTex: true, isSharedHalloweenTex: true };
                }
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
 * Mounts a cloned instance of an actual 3D Halloween GLTF/GLB asset into `targetContainer`.
 */
export function mountHalloweenModel(targetContainer, modelName, options = {}) {
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

  loadHalloweenModelTemplate(modelName).then((tpl) => {
    if (tpl) applyClone(tpl);
  });
}

const CORE_HALLOWEEN_MODELS = [
  'pumpkin_orange_jackolantern',
  'pumpkin_yellow_jackolantern',
  'pumpkin_orange',
  'pumpkin_orange_small',
  'cauldron',
  'crypt',
  'tree_dead_large_decorated',
  'tree_dead_large',
  'tree_dead_medium',
  'tree_dead_small',
  'tree_pine_orange_large',
  'tree_pine_yellow_large',
  'arch_gate',
  'fence',
  'fence_broken',
  'fence_pillar',
  'coffin_decorated',
  'coffin',
  'gravestone',
  'grave_A',
  'grave_A_destroyed',
  'grave_B',
  'gravemarker_A',
  'gravemarker_B',
  'skull_candle',
  'skull',
  'post_skull',
  'post_lantern',
  'lantern_standing',
  'lantern_hanging',
  'shrine_candles',
  'shrine',
  'plaque_candles',
  'candle_triple',
  'candle_melted',
  'bench_decorated',
  'ribcage',
  'character_skeleton_minion'
];

let preloaded = false;
export function preloadHalloween3DAssets() {
  if (preloaded || typeof window === 'undefined') return;
  preloaded = true;
  getSharedHalloweenAtlasMaterial();
  loadHalloweenTextureAsset('vfx_bat_sprite.png');
  loadHalloweenTextureAsset('vfx_ghost_sprite.png');
  loadHalloweenTextureAsset('cozy_halloween_atlas_1.png');
  for (const name of CORE_HALLOWEEN_MODELS) {
    loadHalloweenModelTemplate(name);
  }
}

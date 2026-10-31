import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type {
  PieceArchetype,
  PieceSkin,
  BoardSkin,
  WorldScenery
} from './skinCatalog';
import {
  buildProceduralPieceGroup,
  updateProceduralPieceAnimation,
  rebuildBoardArchitectureGroup
} from './customBoardAndPieceModels.js';
import {
  applyPoliigonPbrToMaterial,
  resolvePiecePoliigonPresets,
  resolveBoardPoliigonPresets
} from './poliigonPbrTextures.js';
import {
  createUnitySlashRibbonShaderMaterial,
  createUnityFresnelDissolveSphereMaterial,
  createUnityMagicCircleShaderMaterial,
  createUnityFireBreathShaderMaterial,
  createUnityPlasmaBeamShaderMaterial,
  getUnityStarFlareTexture,
  getUnityFireFlameTexture,
  getHalloweenBatTexture,
  getHalloweenGhostTexture
} from './soundAndVfxEngine.js';
import {
  mountHalloweenModel,
  preloadHalloween3DAssets
} from './halloweenAssetLoader.js';
import {
  createPolyPizzaWyvern,
  animatePolyPizzaWyvern,
  mountDragonPeakObjAsset,
  preloadDragonPeak3DAssets
} from './dragonPeakAssetLoader.js';

interface SkinShowcaseCanvasProps {
  activeTab: 'types' | 'sceneries' | 'boards' | 'pieces';
  archetype: PieceArchetype;
  pieceSkin: PieceSkin;
  boardSkin: BoardSkin;
  scenery: WorldScenery;
  attackPreviewNonce?: number;
  poliigonOverrideNonce?: number;
  paused?: boolean;
}

/**
 * Generates an equirectangular sky & nebula canvas texture for the 360° Scenery Showcase Sky Dome
 */
function createScenerySkyDomeTexture(scenery: WorldScenery): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    if (scenery.id === 'celestial_observatory') {
      grad.addColorStop(0.0, '#04020d');
      grad.addColorStop(0.42, '#150b36');
      grad.addColorStop(0.75, '#1b2c5c');
      grad.addColorStop(1.0, '#070412');
    } else if (scenery.id === 'dragon_sky_citadel') {
      grad.addColorStop(0.0, '#130712');
      grad.addColorStop(0.38, '#4a1828');
      grad.addColorStop(0.7, '#b54d1f');
      grad.addColorStop(0.88, '#f5a642');
      grad.addColorStop(1.0, '#2a0f15');
    } else if (scenery.id === 'volcanic_titan_forge') {
      grad.addColorStop(0.0, '#070202');
      grad.addColorStop(0.45, '#290704');
      grad.addColorStop(0.78, '#7a1905');
      grad.addColorStop(0.92, '#d9480f');
      grad.addColorStop(1.0, '#1a0402');
    } else if (scenery.id === 'haunted_blood_graveyard') {
      grad.addColorStop(0.0, '#06020c');
      grad.addColorStop(0.38, '#1d082b');
      grad.addColorStop(0.72, '#5c1124');
      grad.addColorStop(0.90, '#c2410c');
      grad.addColorStop(1.0, '#0f0517');
    } else {
      grad.addColorStop(0.0, '#04060c');
      grad.addColorStop(0.45, '#10182b');
      grad.addColorStop(0.78, '#261d17');
      grad.addColorStop(1.0, '#06080f');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const starCount = scenery.id === 'celestial_observatory' ? 240 : 120;
    for (let i = 0; i < starCount; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * (canvas.height * 0.82);
      const r = 0.5 + Math.random() * 1.6;
      ctx.fillStyle =
        scenery.id === 'volcanic_titan_forge' || scenery.id === 'haunted_blood_graveyard'
          ? `rgba(255, 145, 35, ${0.4 + Math.random() * 0.6})`
          : scenery.id === 'celestial_observatory'
            ? `rgba(180, 255, 245, ${0.35 + Math.random() * 0.65})`
            : `rgba(255, 244, 214, ${0.2 + Math.random() * 0.5})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function sanitizeCrossContextMaterials(root: THREE.Object3D, _fallbackColorHex = 0xff6a00) {
  const shaderUniformList: Array<Record<string, any>> = [];
  const clonedTexMap = new Map<any, THREE.CanvasTexture>();
  root.traverse((child: any) => {
    if (child.isSprite && child.material) {
      const clonedSpriteMat = child.material.clone();
      if (child.material.map && child.material.map.image) {
        let ctxTex = clonedTexMap.get(child.material.map.image);
        if (!ctxTex) {
          ctxTex = new THREE.CanvasTexture(child.material.map.image);
          ctxTex.needsUpdate = true;
          clonedTexMap.set(child.material.map.image, ctxTex);
        }
        clonedSpriteMat.map = ctxTex;
      }
      child.material = clonedSpriteMat;
      return;
    }
    if (!child.isMesh) return;
    if (
      child.userData?.isDragonFire ||
      child.material?.isShaderMaterial ||
      child.material?.type === 'ShaderMaterial'
    ) {
      child.castShadow = false;
      child.receiveShadow = false;
      if (child.material && typeof child.material.clone === 'function') {
        const clonedShaderMat = child.material.clone();
        if (child.material.uniforms) {
          clonedShaderMat.uniforms = THREE.UniformsUtils.clone(child.material.uniforms);
          shaderUniformList.push(clonedShaderMat.uniforms);
        }
        child.material = clonedShaderMat;
      }
    } else {
      child.castShadow = false;
      child.receiveShadow = false;
    }
  });
  if (root.userData?.proceduralAnim) {
    root.userData.proceduralAnim.showcaseShaderUniforms = shaderUniformList;
  }
}

function disposeHierarchy(root: THREE.Object3D) {
  root.traverse((child: any) => {
    if (child.material) {
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      for (const m of mats) {
        if (!m) continue;
        if (m.map && !m.map.userData?.isSharedPoliigonTex && typeof m.map.dispose === 'function') {
          m.map.dispose();
        }
        if (!m.userData?.isSharedPoliigonTex && typeof m.dispose === 'function') {
          m.dispose();
        }
      }
    }
  });
}

export default function SkinShowcaseCanvas({
  activeTab,
  archetype,
  pieceSkin,
  boardSkin,
  scenery,
  attackPreviewNonce = 0,
  poliigonOverrideNonce = 0,
  paused = false
}: SkinShowcaseCanvasProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [previewColor, setPreviewColor] = useState<'w' | 'b'>('w');
  const [autoRotate, setAutoRotate] = useState(true);
  const [isAttackingPreview, setIsAttackingPreview] = useState(false);
  const autoRotateRef = useRef(autoRotate);
  autoRotateRef.current = autoRotate;
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  const stageRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    pedestalGroup: THREE.Group;
    subjectGroup: THREE.Group;
    vfxGroup: THREE.Group;
    baseMesh: THREE.Mesh;
    ringMesh: THREE.Mesh;
    rimLight: THREE.PointLight;
    lookTarget: THREE.Vector3;
    dynamicOrbitRings: THREE.Object3D[];
    floatingNodes: Array<{ mesh: THREE.Object3D; baseY: number; phase: number }>;
    weatherPoints: THREE.Points | null;
    weatherVelocities: Float32Array | null;
    heroPieceRoot: THREE.Object3D | null;
    heroProceduralAnim: any | null;
    heroMixer: THREE.AnimationMixer | null;
    heroActions: Record<string, THREE.AnimationAction>;
    activeVfxUpdaters: Array<(dt: number) => boolean>;
  } | null>(null);

  // 1. Mount-only WebGLRenderer initialization (reused across all Armory clicks so we never exhaust WebGL contexts)
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 360;
    const height = container.clientHeight || 250;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x07090f);

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    const lookTarget = new THREE.Vector3(0, 0.65, 0);
    camera.position.set(0, 1.35, 3.25);
    camera.lookAt(lookTarget);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'default'
    });
    if (renderer.debug) {
      renderer.debug.checkShaderErrors = false;
    }
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.shadowMap.enabled = false;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.HemisphereLight(0xf6efe2, 0x161925, 1.05);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfff4d8, 2.5);
    keyLight.position.set(2.8, 4.8, 3.2);
    scene.add(keyLight);

    const rimLight = new THREE.PointLight(0xd4af37, 2.2, 12);
    rimLight.position.set(-2.4, 2.2, -2.2);
    scene.add(rimLight);

    const fillLight = new THREE.PointLight(0x68a8ff, 1.15, 10);
    fillLight.position.set(2.2, 0.9, -2.0);
    scene.add(fillLight);

    // Self-contained Studio PMREM Environment for realistic Poliigon PBR reflections
    try {
      const pmremGen = new THREE.PMREMGenerator(renderer);
      pmremGen.compileEquirectangularShader();
      const envScene = new THREE.Scene();
      envScene.background = new THREE.Color(0x14161f);
      const boxGeo = new THREE.BoxGeometry(1, 1, 1);
      const addLightPanel = (hex: number, intensity: number, pos: [number, number, number], scl: [number, number, number]) => {
        const m = new THREE.Mesh(
          boxGeo,
          new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(intensity) })
        );
        m.position.set(pos[0], pos[1], pos[2]);
        m.scale.set(scl[0], scl[1], scl[2]);
        envScene.add(m);
      };
      addLightPanel(0xfff0d4, 2.6, [3, 6, 4], [5, 2, 2]);
      addLightPanel(0xd4e4ff, 2.0, [-4, 5, -3], [4, 3, 4]);
      addLightPanel(0xff9f38, 2.8, [-3, 1.5, 2], [2, 2, 3]);
      scene.environment = pmremGen.fromScene(envScene, 0.04).texture;
      boxGeo.dispose();
      pmremGen.dispose();
    } catch {
      // Ignore PMREM fallback
    }

    const pedestalGroup = new THREE.Group();
    scene.add(pedestalGroup);

    const baseGeo = new THREE.CylinderGeometry(1.15, 1.28, 0.16, 48);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x12151e,
      roughness: 0.28,
      metalness: 0.62
    });
    applyPoliigonPbrToMaterial(baseMat, 'marble_nero_marquina', {
      contextId: 'showcase',
      repeatX: 2,
      repeatY: 2,
      normalScale: 0.75,
      envMapIntensity: 1.25
    });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.y = -0.08;
    pedestalGroup.add(baseMesh);

    const ringGeo = new THREE.TorusGeometry(1.17, 0.032, 16, 56);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      metalness: 0.9,
      roughness: 0.22,
      emissive: 0x5a4208,
      emissiveIntensity: 0.4
    });
    applyPoliigonPbrToMaterial(ringMat, 'metal_gold_hammered', {
      contextId: 'showcase',
      repeatX: 3,
      repeatY: 1,
      normalScale: 0.65,
      envMapIntensity: 1.5
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 2;
    ringMesh.position.y = 0.0;
    pedestalGroup.add(ringMesh);

    const subjectGroup = new THREE.Group();
    pedestalGroup.add(subjectGroup);

    const vfxGroup = new THREE.Group();
    pedestalGroup.add(vfxGroup);

    const state = {
      scene,
      camera,
      renderer,
      pedestalGroup,
      subjectGroup,
      vfxGroup,
      baseMesh,
      ringMesh,
      rimLight,
      lookTarget,
      dynamicOrbitRings: [] as THREE.Object3D[],
      floatingNodes: [] as Array<{ mesh: THREE.Object3D; baseY: number; phase: number }>,
      weatherPoints: null as THREE.Points | null,
      weatherVelocities: null as Float32Array | null,
      heroPieceRoot: null as THREE.Object3D | null,
      heroProceduralAnim: null as any | null,
      heroMixer: null as THREE.AnimationMixer | null,
      heroActions: {} as Record<string, THREE.AnimationAction>,
      activeVfxUpdaters: [] as Array<(dt: number) => boolean>
    };
    stageRef.current = state;

    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - prevMouseX;
      const deltaY = e.clientY - prevMouseY;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
      pedestalGroup.rotation.y += deltaX * 0.014;
      pedestalGroup.rotation.x = Math.max(
        -0.35,
        Math.min(0.45, pedestalGroup.rotation.x + deltaY * 0.008)
      );
    };

    const onPointerUp = () => {
      isDragging = false;
    };

    const onWheel = (e: WheelEvent) => {
      // Only intercept wheel for 3D camera zoom when holding Ctrl/Alt/Shift so normal vertical wheel scrolls the Armory skin list smoothly
      if (!e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
        return;
      }
      e.preventDefault();
      const dir = new THREE.Vector3().subVectors(camera.position, state.lookTarget);
      const dist = dir.length();
      const nextDist = Math.max(1.8, Math.min(5.2, dist + e.deltaY * 0.0025));
      dir.normalize().multiplyScalar(nextDist);
      camera.position.copy(state.lookTarget).add(dir);
      camera.lookAt(state.lookTarget);
    };

    const canvasEl = renderer.domElement;
    canvasEl.addEventListener('pointerdown', onPointerDown);
    canvasEl.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      if (pausedRef.current) {
        clock.getDelta();
        return;
      }
      const delta = Math.min(clock.getDelta(), 0.1);
      const elapsed = clock.getElapsedTime();

      if (autoRotateRef.current && !isDragging) {
        pedestalGroup.rotation.y += delta * 0.55;
      }

      for (let i = 0; i < state.dynamicOrbitRings.length; i++) {
        const ring = state.dynamicOrbitRings[i];
        ring.rotation.z += delta * (0.45 + i * 0.18);
        ring.rotation.x += delta * 0.22 * (i % 2 === 0 ? 1 : -1);
      }

      for (let i = 0; i < state.floatingNodes.length; i++) {
        const node = state.floatingNodes[i];
        node.mesh.position.y = node.baseY + Math.sin(elapsed * 2.4 + node.phase) * 0.055;
        if (node.mesh.name === 'PolyPizza_Wyvern_WIOTISRjeX') {
          animatePolyPizzaWyvern(node.mesh, elapsed, node.phase);
        } else {
          node.mesh.rotation.y += delta * 0.9;
        }
      }

      if (state.weatherPoints && state.weatherVelocities) {
        const posAttr = state.weatherPoints.geometry.getAttribute(
          'position'
        ) as THREE.BufferAttribute;
        for (let i = 0; i < state.weatherVelocities.length; i++) {
          let py = posAttr.getY(i) + state.weatherVelocities[i] * delta;
          if (py > 1.8) py = -0.6;
          posAttr.setY(i, py);
        }
        posAttr.needsUpdate = true;
      }

      if (state.heroMixer) {
        state.heroMixer.update(delta);
      }
      if (state.heroProceduralAnim) {
        updateProceduralPieceAnimation(
          {
            type: state.heroProceduralAnim.pieceType || 'king',
            archetype: state.heroProceduralAnim.archetype || 'classic_staunton',
            proceduralAnim: state.heroProceduralAnim
          },
          delta,
          elapsed
        );
      }

      for (let i = state.activeVfxUpdaters.length - 1; i >= 0; i--) {
        const alive = state.activeVfxUpdaters[i](delta);
        if (!alive) {
          state.activeVfxUpdaters.splice(i, 1);
        }
      }

      camera.lookAt(state.lookTarget);
      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!mountRef.current) return;
      const w = Math.max(200, mountRef.current.clientWidth || 360);
      const h = Math.max(140, mountRef.current.clientHeight || 240);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      camera.lookAt(state.lookTarget);
      renderer.setSize(w, h);
    };

    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            handleResize();
          })
        : null;
    if (resizeObserver && mountRef.current) {
      resizeObserver.observe(mountRef.current);
    }

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver?.disconnect();
      canvasEl.removeEventListener('pointerdown', onPointerDown);
      canvasEl.removeEventListener('wheel', onWheel);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('resize', handleResize);
      disposeHierarchy(scene);
      renderer.dispose();
      stageRef.current = null;
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // 2. Rebuild only the showcase subject when selected skin/tab changes
  useEffect(() => {
    const st = stageRef.current;
    if (!st) return;

    const {
      scene,
      camera,
      pedestalGroup,
      subjectGroup,
      baseMesh,
      ringMesh,
      rimLight,
      lookTarget
    } = st;

    // Clear previous subject meshes cleanly
    while (subjectGroup.children.length > 0) {
      const child = subjectGroup.children[0];
      subjectGroup.remove(child);
      disposeHierarchy(child);
    }
    while (st.vfxGroup.children.length > 0) {
      const child = st.vfxGroup.children[0];
      st.vfxGroup.remove(child);
      disposeHierarchy(child);
    }
    st.dynamicOrbitRings = [];
    st.floatingNodes = [];
    st.weatherPoints = null;
    st.weatherVelocities = null;
    st.heroPieceRoot = null;
    st.heroProceduralAnim = null;
    st.heroMixer = null;
    st.heroActions = {};
    st.activeVfxUpdaters = [];
    setIsAttackingPreview(false);
    pedestalGroup.rotation.x = 0;

    const isWhite = previewColor === 'w';
    const trimHex = parseInt(pieceSkin.trimHex.replace('#', ''), 16);
    const bladeHex = parseInt(pieceSkin.bladeHex.replace('#', ''), 16);
    const piecePbrPresets = resolvePiecePoliigonPresets(pieceSkin.id, archetype.id);

    const trimMat = new THREE.MeshStandardMaterial({
      color: trimHex,
      roughness: pieceSkin.trimRoughness,
      metalness: pieceSkin.trimMetalness
    });
    applyPoliigonPbrToMaterial(trimMat, piecePbrPresets.trimPreset, {
      contextId: 'showcase',
      repeatX: 2,
      repeatY: 2,
      normalScale: piecePbrPresets.normalScaleVal * 0.78,
      envMapIntensity: 1.5
    });

    const bladeMat = new THREE.MeshStandardMaterial({
      color: bladeHex,
      roughness: pieceSkin.bladeRoughness,
      metalness: pieceSkin.bladeMetalness,
      emissive: parseInt(pieceSkin.bladeEmissiveHex.replace('#', ''), 16),
      emissiveIntensity: pieceSkin.bladeEmissiveIntensity || 0.3
    });
    applyPoliigonPbrToMaterial(bladeMat, piecePbrPresets.bladePreset, {
      contextId: 'showcase',
      repeatX: 2,
      repeatY: 2,
      normalScale: piecePbrPresets.normalScaleVal * 0.82,
      envMapIntensity: 1.55
    });

    const buildKingPiece = (archId: string, colorCode: 'w' | 'b', targetHeight: number) => {
      const cIsWhite = colorCode === 'w';
      const localPresets = resolvePiecePoliigonPresets(pieceSkin.id, archId);
      const cMainHex = parseInt(
        (cIsWhite ? pieceSkin.whiteHex : pieceSkin.blackHex).replace('#', ''),
        16
      );
      const cEmissiveHex = parseInt(
        (cIsWhite ? pieceSkin.whiteEmissiveHex : pieceSkin.blackEmissiveHex).replace('#', ''),
        16
      );
      const cMat = new THREE.MeshStandardMaterial({
        color: cMainHex,
        roughness: cIsWhite ? pieceSkin.whiteRoughness : pieceSkin.blackRoughness,
        metalness: cIsWhite ? pieceSkin.whiteMetalness : pieceSkin.blackMetalness,
        emissive: cEmissiveHex,
        emissiveIntensity: cIsWhite
          ? pieceSkin.whiteEmissiveIntensity || 0.2
          : pieceSkin.blackEmissiveIntensity || 0.2
      });
      applyPoliigonPbrToMaterial(
        cMat,
        cIsWhite ? localPresets.whitePreset : localPresets.blackPreset,
        {
          contextId: 'showcase',
          repeatX: 2,
          repeatY: 2,
          normalScale: localPresets.normalScaleVal,
          envMapIntensity: 1.4
        }
      );

      const customMats = {
        primaryMat: cMat,
        whitePieceMat: cMat,
        blackPieceMat: cMat,
        goldTrimMat: trimMat,
        forgedSteelMat: bladeMat
      };

      let pieceModel: THREE.Object3D | null = null;
      if (typeof (window as any).wizardChess?.getShowcasePiece === 'function') {
        pieceModel = (window as any).wizardChess.getShowcasePiece(
          archId,
          colorCode,
          'king',
          customMats
        );
      }
      if (!pieceModel) {
        const fallbackArch = archId === 'gothic_warriors' ? 'classic_staunton' : archId;
        const built = buildProceduralPieceGroup(fallbackArch, 'king', colorCode, customMats);
        if (built?.root) {
          built.root.userData.proceduralAnim = {
            animRig: built.animRig,
            animParts: built.animParts,
            archetype: fallbackArch,
            pieceType: 'king',
            mode: 'idle',
            clipTime: 0
          };
          pieceModel = built.root;
        }
      }
      if (!pieceModel) return null;

      sanitizeCrossContextMaterials(pieceModel, trimHex);

      const wrapper = new THREE.Group();
      wrapper.add(pieceModel);
      const hiddenForBounds: Array<{ obj: THREE.Object3D; vis: boolean }> = [];
      pieceModel.traverse((child: any) => {
        if (child.userData?.excludeFromBounds) {
          hiddenForBounds.push({ obj: child, vis: child.visible });
          child.visible = false;
        }
      });
      wrapper.updateMatrixWorld(true);
      const box = new THREE.Box3();
      pieceModel.traverse((child: any) => {
        if (!child.isMesh || !child.visible) return;
        let p: any = child;
        let excluded = false;
        while (p) {
          if (p.userData?.excludeFromBounds || p.visible === false) {
            excluded = true;
            break;
          }
          p = p.parent;
        }
        if (!excluded && child.geometry) {
          child.geometry.computeBoundingBox();
          if (child.geometry.boundingBox) {
            const childBox = child.geometry.boundingBox.clone();
            childBox.applyMatrix4(child.matrixWorld);
            box.union(childBox);
          }
        }
      });
      for (const item of hiddenForBounds) {
        item.obj.visible = item.vis;
      }
      if (box.isEmpty()) {
        box.setFromObject(pieceModel);
      }
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(center);

      const rawHeight = Math.max(size.y, 0.25);
      const normScale = targetHeight / rawHeight;
      pieceModel.scale.setScalar(normScale);
      pieceModel.position.set(
        -center.x * normScale,
        -box.min.y * normScale,
        -center.z * normScale
      );
      wrapper.userData.pieceModel = pieceModel;
      return wrapper;
    };

    if (activeTab === 'types' || activeTab === 'pieces') {
      baseMesh.visible = true;
      ringMesh.visible = true;
      scene.background = new THREE.Color(0x07090f);
      rimLight.color.setHex(trimHex);

      const heroPiece = buildKingPiece(archetype.id, previewColor, 1.38);
      if (heroPiece) {
        heroPiece.position.set(0, 0.0, 0);
        subjectGroup.add(heroPiece);
        const innerModel = heroPiece.userData.pieceModel as THREE.Object3D | undefined;
        if (innerModel) {
          st.heroPieceRoot = innerModel;
          if (innerModel.userData?.proceduralAnim) {
            st.heroProceduralAnim = innerModel.userData.proceduralAnim;
          } else if (Array.isArray(innerModel.userData?.gltfAnimations) && innerModel.userData.gltfAnimations.length > 0) {
            const mixer = new THREE.AnimationMixer(innerModel);
            const actions: Record<string, THREE.AnimationAction> = {};
            for (const clip of innerModel.userData.gltfAnimations) {
              actions[clip.name] = mixer.clipAction(clip);
            }
            st.heroMixer = mixer;
            st.heroActions = actions;
            if (actions.Idle) {
              actions.Idle.reset().fadeIn(0.15).play();
            }
          }
        }
      }

      camera.position.set(0, 1.22, 3.05);
      lookTarget.set(0, 0.66, 0);
      camera.lookAt(lookTarget);
    } else if (activeTab === 'boards') {
      baseMesh.visible = false;
      ringMesh.visible = false;
      scene.background = new THREE.Color(0x07090f);

      const boardPreviewGroup = new THREE.Group();
      const sqSize = 0.22;
      const surfaceY = 0.0;
      const lightHex = parseInt(boardSkin.lightSqHex.replace('#', ''), 16);
      const darkHex = parseInt(boardSkin.darkSqHex.replace('#', ''), 16);
      const borderHex = parseInt(boardSkin.borderHex.replace('#', ''), 16);
      rimLight.color.setHex(borderHex);

      const bPresets = resolveBoardPoliigonPresets(boardSkin.id, boardSkin.archType);
      const lightMat = new THREE.MeshStandardMaterial({
        color: lightHex,
        roughness: boardSkin.lightRoughness,
        metalness: boardSkin.lightMetalness
      });
      applyPoliigonPbrToMaterial(lightMat, bPresets.lightPreset, {
        contextId: 'showcase',
        repeatX: bPresets.repeatSq,
        repeatY: bPresets.repeatSq,
        normalScale: bPresets.normalScaleVal,
        envMapIntensity: 1.35
      });

      const darkMat = new THREE.MeshStandardMaterial({
        color: darkHex,
        roughness: boardSkin.darkRoughness,
        metalness: boardSkin.darkMetalness
      });
      applyPoliigonPbrToMaterial(darkMat, bPresets.darkPreset, {
        contextId: 'showcase',
        repeatX: bPresets.repeatSq,
        repeatY: bPresets.repeatSq,
        normalScale: bPresets.normalScaleVal,
        envMapIntensity: 1.45
      });

      const borderMat = new THREE.MeshStandardMaterial({
        color: borderHex,
        roughness: 0.25,
        metalness: 0.82
      });
      applyPoliigonPbrToMaterial(borderMat, bPresets.borderPreset, {
        contextId: 'showcase',
        repeatX: bPresets.repeatBorder,
        repeatY: bPresets.repeatBorder,
        normalScale: bPresets.normalScaleVal,
        envMapIntensity: 1.5
      });

      const sqGeo = new THREE.BoxGeometry(sqSize * 0.96, 0.036, sqSize * 0.96);
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const isLight = (r + c) % 2 === 0;
          const sq = new THREE.Mesh(sqGeo, isLight ? lightMat : darkMat);
          sq.position.set((c - 3.5) * sqSize, surfaceY + 0.018, (r - 3.5) * sqSize);
          boardPreviewGroup.add(sq);
        }
      }

      const archGroup = new THREE.Group();
      rebuildBoardArchitectureGroup(archGroup, boardSkin, sqSize, surfaceY, borderMat, 'showcase');
      boardPreviewGroup.add(archGroup);

      const whiteKing = buildKingPiece(archetype.id, 'w', 0.48);
      if (whiteKing) {
        whiteKing.position.set(-0.5 * sqSize, surfaceY + 0.036, 1.5 * sqSize);
        boardPreviewGroup.add(whiteKing);
      }

      const blackKing = buildKingPiece(archetype.id, 'b', 0.48);
      if (blackKing) {
        blackKing.position.set(0.5 * sqSize, surfaceY + 0.036, -1.5 * sqSize);
        blackKing.rotation.y = Math.PI;
        boardPreviewGroup.add(blackKing);
      }

      boardPreviewGroup.position.set(0, 0.12, 0);
      subjectGroup.add(boardPreviewGroup);

      camera.position.set(0, 1.72, 3.05);
      lookTarget.set(0, 0.16, 0);
      camera.lookAt(lookTarget);
    } else if (activeTab === 'sceneries') {
      baseMesh.visible = false;
      ringMesh.visible = false;

      const accentHex = parseInt((scenery.previewAccentHex || '#d4af37').replace('#', ''), 16);
      const fogHex = parseInt((scenery.fogHex || '#080b14').replace('#', ''), 16);
      scene.background = new THREE.Color(fogHex);
      rimLight.color.setHex(accentHex);

      // 1. Immersive 360° Sky & Nebula Dome
      const skyDomeTexture = createScenerySkyDomeTexture(scenery);
      const skyGeo = new THREE.SphereGeometry(9.5, 36, 24);
      const skyMat = new THREE.MeshBasicMaterial({
        map: skyDomeTexture,
        side: THREE.BackSide,
        depthWrite: false
      });
      const skyDome = new THREE.Mesh(skyGeo, skyMat);
      subjectGroup.add(skyDome);

      // 2. Sculpted Floating Sanctum Island & Mini Chessboard Altar at the Center
      const islandGroup = new THREE.Group();
      islandGroup.position.set(0, 0.18, 0);
      subjectGroup.add(islandGroup);

      const cragMat = new THREE.MeshStandardMaterial({
        color:
          scenery.id === 'volcanic_titan_forge'
            ? 0x1c0d0a
            : scenery.id === 'celestial_observatory'
              ? 0x15182e
              : scenery.id === 'dragon_sky_citadel'
                ? 0x2d2420
                : 0x181c26,
        roughness: 0.72,
        metalness: 0.25
      });
      if (scenery.id === 'dragon_sky_citadel') {
        preloadDragonPeak3DAssets();
        mountDragonPeakObjAsset(islandGroup, 'island_006', {
          scale: 1.32,
          position: [0, -0.01, 0],
          rotationY: 0.35,
          flattenTopPlateau: true
        });
      } else {
        const islandSpire = new THREE.Mesh(new THREE.ConeGeometry(1.18, 0.85, 8), cragMat);
        islandSpire.rotation.x = Math.PI;
        islandSpire.position.y = -0.45;
        islandGroup.add(islandSpire);
      }

      const plinthRadius = scenery.id === 'dragon_sky_citadel' ? 0.68 : 1.12;
      const altarPlinth = new THREE.Mesh(
        new THREE.CylinderGeometry(plinthRadius, plinthRadius + 0.05, 0.08, 32),
        new THREE.MeshStandardMaterial({
          color: 0x10131c,
          roughness: 0.32,
          metalness: 0.65
        })
      );
      altarPlinth.position.y = -0.03;
      islandGroup.add(altarPlinth);

      const rimTorus = new THREE.Mesh(
        new THREE.TorusGeometry(plinthRadius + 0.02, 0.024, 16, 48),
        new THREE.MeshStandardMaterial({
          color: accentHex,
          emissive: accentHex,
          emissiveIntensity: 0.65,
          roughness: 0.2,
          metalness: 0.88
        })
      );
      rimTorus.rotation.x = Math.PI / 2;
      rimTorus.position.y = 0.01;
      islandGroup.add(rimTorus);

      const miniSq = 0.14;
      const miniTileGeo = new THREE.BoxGeometry(miniSq * 0.95, 0.02, miniSq * 0.95);
      const miniLightMat = new THREE.MeshStandardMaterial({ color: 0xe2d9c8, roughness: 0.3 });
      const miniDarkMat = new THREE.MeshStandardMaterial({ color: 0x181d28, roughness: 0.35 });
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const tile = new THREE.Mesh(
            miniTileGeo,
            (r + c) % 2 === 0 ? miniLightMat : miniDarkMat
          );
          tile.position.set((c - 3.5) * miniSq, 0.015, (r - 3.5) * miniSq);
          islandGroup.add(tile);
        }
      }

      const altarKing = buildKingPiece(archetype.id, 'w', 0.42);
      if (altarKing) {
        altarKing.position.set(0, 0.025, 0);
        islandGroup.add(altarKing);
      }

      const accentGlowMat = new THREE.MeshStandardMaterial({
        color: accentHex,
        emissive: accentHex,
        emissiveIntensity: 0.8,
        roughness: 0.2,
        metalness: 0.8
      });

      if (scenery.id === 'celestial_observatory') {
        for (let i = 0; i < 3; i++) {
          const armillaryRing = new THREE.Mesh(
            new THREE.TorusGeometry(1.55 + i * 0.22, 0.022, 16, 64),
            accentGlowMat
          );
          armillaryRing.rotation.x = Math.PI * (0.25 + i * 0.22);
          armillaryRing.rotation.y = i * 0.6;
          armillaryRing.position.y = 0.25;
          subjectGroup.add(armillaryRing);
          st.dynamicOrbitRings.push(armillaryRing);
        }

        for (let i = 0; i < 6; i++) {
          const ang = (i / 6) * Math.PI * 2;
          const monolith = new THREE.Mesh(new THREE.OctahedronGeometry(0.11, 0), accentGlowMat);
          const baseY = 0.35 + (i % 2) * 0.18;
          monolith.position.set(Math.cos(ang) * 1.42, baseY, Math.sin(ang) * 1.42);
          subjectGroup.add(monolith);
          st.floatingNodes.push({ mesh: monolith, baseY, phase: i * 1.1 });
        }
      } else if (scenery.id === 'dragon_sky_citadel') {
        // Mount 3D OBJ Interdimensional Floating Islands, Bell Tower, Pine Trees, Clouds & Poly Pizza Wyvern
        mountDragonPeakObjAsset(islandGroup, 'bell_tower', {
          scale: 0.42,
          position: [0, 0, -0.82],
          rotationY: 0
        });
        mountDragonPeakObjAsset(islandGroup, 'tree_pine_lod0', {
          scale: 0.38,
          position: [-0.82, 0, -0.45],
          rotationY: 0.4
        });
        mountDragonPeakObjAsset(islandGroup, 'curved_tree_lod0', {
          scale: 0.36,
          position: [0.82, 0, -0.45],
          rotationY: -0.4
        });

        const miniIslandVariants = ['island_002', 'island_003', 'island_004', 'island_006'];
        for (let i = 0; i < 4; i++) {
          const ang = (i / 4) * Math.PI * 2 + 0.45;
          const rad = 1.52;
          const baseY = -0.05 + (i % 2) * 0.16;
          const satHolder = mountDragonPeakObjAsset(
            subjectGroup,
            miniIslandVariants[i % miniIslandVariants.length],
            {
              scale: 0.38,
              position: [Math.cos(ang) * rad, baseY, Math.sin(ang) * rad],
              rotationY: i * 1.2,
              flattenTopPlateau: true
            }
          );
          mountDragonPeakObjAsset(satHolder, i % 2 === 0 ? 'tree_pine_lod0' : 'mill', {
            scale: 0.45,
            position: [0, 0, 0]
          });
          st.floatingNodes.push({ mesh: satHolder, baseY, phase: i * 0.9 });
        }

        // Soaring Poly Pizza Wyvern (`wyvern.obj`) gliding above the floating island
        const wyvernMesh = createPolyPizzaWyvern(0.22, 0x1e293b, 0xd97706, 0xffd166);
        const wyvernBaseY = 0.88;
        wyvernMesh.position.set(0, wyvernBaseY, -0.35);
        wyvernMesh.rotation.y = Math.PI * 0.22;
        subjectGroup.add(wyvernMesh);
        st.floatingNodes.push({ mesh: wyvernMesh, baseY: wyvernBaseY, phase: 0.5 });
      } else if (scenery.id === 'volcanic_titan_forge') {
        const lavaRing = new THREE.Mesh(
          new THREE.TorusGeometry(1.48, 0.09, 16, 48),
          accentGlowMat
        );
        lavaRing.rotation.x = Math.PI / 2;
        lavaRing.position.y = -0.32;
        subjectGroup.add(lavaRing);

        const basaltSpireGeo = new THREE.ConeGeometry(0.16, 0.85, 5);
        for (let i = 0; i < 6; i++) {
          const ang = (i / 6) * Math.PI * 2 + 0.4;
          const spire = new THREE.Mesh(basaltSpireGeo, cragMat);
          spire.position.set(Math.cos(ang) * 1.48, 0.12, Math.sin(ang) * 1.48);
          subjectGroup.add(spire);

          const emberTip = new THREE.Mesh(new THREE.OctahedronGeometry(0.08, 0), accentGlowMat);
          const baseY = 0.65;
          emberTip.position.set(Math.cos(ang) * 1.48, baseY, Math.sin(ang) * 1.48);
          subjectGroup.add(emberTip);
          st.floatingNodes.push({ mesh: emberTip, baseY, phase: i });
        }
      } else if (scenery.id === 'haunted_blood_graveyard') {
        preloadHalloween3DAssets();
        if (typeof (window as any).wizardChess?.playHalloweenWhisperSfx === 'function') {
          (window as any).wizardChess.playHalloweenWhisperSfx('scenery_preview');
        }
        // Colossal Blood Moon Halo behind the Graveyard Island + Actual 3D GLTF/GLB Halloween Asset Pack Models:
        // Haunted Crypt Mausoleum, Decorated Dead Trees, Wrought-Iron Arch Gate, Bubbling Witch Cauldron,
        // Gravestones, Decorated Coffins, Skeleton Minions & Carved Jack-o'-Lanterns
        const bloodMoonMesh = new THREE.Mesh(
          new THREE.SphereGeometry(0.55, 24, 18),
          new THREE.MeshBasicMaterial({ color: 0xff5500 })
        );
        bloodMoonMesh.position.set(0, 0.92, -1.55);
        subjectGroup.add(bloodMoonMesh);

        const ectoMat = new THREE.MeshStandardMaterial({
          color: 0x00e676,
          emissive: 0x00e676,
          emissiveIntensity: 1.15,
          roughness: 0.2
        });
        const ectoRing = new THREE.Mesh(new THREE.TorusGeometry(1.45, 0.035, 12, 48), ectoMat);
        ectoRing.rotation.x = Math.PI / 2;
        ectoRing.position.y = -0.18;
        subjectGroup.add(ectoRing);

        // Actual 3D GLTF Crypt Mausoleum (`crypt.gltf`) on rear rim of the floating island
        mountHalloweenModel(islandGroup, 'crypt', {
          position: [-0.62, 0.0, -0.62],
          rotation: [0, 0.68, 0],
          scale: 0.14
        });

        // Actual 3D GLTF Decorated Dead Tree (`tree_dead_large_decorated.gltf`) on right rear rim
        mountHalloweenModel(islandGroup, 'tree_dead_large_decorated', {
          position: [0.66, 0.0, -0.58],
          rotation: [0, -0.55, 0],
          scale: 0.16
        });

        // Actual 3D GLTF Wrought-Iron Arch Gate (`arch_gate.gltf`) on front rim
        mountHalloweenModel(islandGroup, 'arch_gate', {
          position: [0.0, 0.0, 0.86],
          rotation: [0, 0, 0],
          scale: 0.13
        });

        // Actual 3D GLB Witch Cauldron (`cauldron.glb`) + Triple Candles (`candle_triple.gltf`) on right front rim
        const cauldronGroup = new THREE.Group();
        cauldronGroup.position.set(0.66, 0.0, 0.56);
        mountHalloweenModel(cauldronGroup, 'cauldron', {
          scale: 0.24
        });
        mountHalloweenModel(cauldronGroup, 'candle_triple', {
          position: [-0.18, 0, 0.08],
          scale: 0.20
        });
        const cLiquid = new THREE.Mesh(new THREE.CircleGeometry(0.11, 16), ectoMat);
        cLiquid.rotation.x = -Math.PI / 2;
        cLiquid.position.y = 0.20;
        cauldronGroup.add(cLiquid);
        islandGroup.add(cauldronGroup);

        // Actual 3D GLTF Decorated Coffin (`coffin_decorated.gltf`) & Skeleton Minion (`character_skeleton_minion.gltf`) on left front rim
        mountHalloweenModel(islandGroup, 'coffin_decorated', {
          position: [-0.68, 0.0, 0.52],
          rotation: [0, 0.85, 0],
          scale: 0.18
        });
        mountHalloweenModel(islandGroup, 'character_skeleton_minion', {
          position: [-0.48, 0.0, 0.68],
          rotation: [0, 0.45, 0],
          scale: 0.17
        });

        const tombAssets = [
          'gravestone',
          'gravemarker_A',
          'grave_A',
          'gravemarker_B',
          'shrine_candles',
          'grave_B'
        ];
        const floatingAssets = [
          'pumpkin_orange_jackolantern',
          'skull_candle',
          'pumpkin_yellow_jackolantern',
          'lantern_hanging',
          'pumpkin_orange_jackolantern',
          'skull_candle'
        ];
        for (let i = 0; i < 6; i++) {
          const ang = (i / 6) * Math.PI * 2 + 0.25;
          mountHalloweenModel(islandGroup, tombAssets[i % tombAssets.length], {
            position: [Math.cos(ang) * 0.92, 0.0, Math.sin(ang) * 0.92],
            rotation: [0, -ang + Math.PI / 2, 0],
            scale: 0.16
          });

          const floatNode = new THREE.Group();
          const floatKey = floatingAssets[i % floatingAssets.length];
          mountHalloweenModel(floatNode, floatKey, {
            scale: floatKey === 'skull_candle' ? 0.24 : 0.22
          });
          const baseY = 0.38 + (i % 2) * 0.16;
          floatNode.position.set(Math.cos(ang) * 1.42, baseY, Math.sin(ang) * 1.42);
          subjectGroup.add(floatNode);
          st.floatingNodes.push({ mesh: floatNode, baseY, phase: i * 1.05 });
        }
      } else {
        const pillarGeo = new THREE.CylinderGeometry(0.065, 0.08, 0.72, 16);
        for (const sx of [-1, 1]) {
          for (const sz of [-1, 1]) {
            const pillar = new THREE.Mesh(pillarGeo, cragMat);
            pillar.position.set(sx * 0.78, 0.36, sz * 0.78);
            islandGroup.add(pillar);

            const brazierFlame = new THREE.Mesh(
              new THREE.OctahedronGeometry(0.085, 1),
              accentGlowMat
            );
            const baseY = 0.78;
            brazierFlame.position.set(sx * 0.78, baseY, sz * 0.78);
            islandGroup.add(brazierFlame);
            st.floatingNodes.push({ mesh: brazierFlame, baseY, phase: sx + sz * 2 });
          }
        }

        const roseHalo = new THREE.Mesh(
          new THREE.TorusGeometry(1.38, 0.025, 16, 48),
          accentGlowMat
        );
        roseHalo.position.set(0, 0.42, -0.95);
        islandGroup.add(roseHalo);
      }

      const pCount = 140;
      const positions = new Float32Array(pCount * 3);
      const velocities = new Float32Array(pCount);
      for (let i = 0; i < pCount; i++) {
        const r = 0.4 + Math.random() * 2.2;
        const theta = Math.random() * Math.PI * 2;
        positions[i * 3] = Math.cos(theta) * r;
        positions[i * 3 + 1] = -0.6 + Math.random() * 2.4;
        positions[i * 3 + 2] = Math.sin(theta) * r;
        velocities[i] = 0.18 + Math.random() * 0.35;
      }
      const pGeo = new THREE.BufferGeometry();
      pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const pMat = new THREE.PointsMaterial({
        color: accentHex,
        size: 0.055,
        transparent: true,
        opacity: 0.85
      });
      st.weatherPoints = new THREE.Points(pGeo, pMat);
      st.weatherVelocities = velocities;
      subjectGroup.add(st.weatherPoints);

      camera.position.set(0, 1.15, 3.45);
      lookTarget.set(0, 0.25, 0);
      camera.lookAt(lookTarget);
    }
  }, [activeTab, archetype, pieceSkin, boardSkin, scenery, previewColor, poliigonOverrideNonce]);

  // Trigger set-specific 3D Attack choreography + 3D VFX burst in the Showcase
  const triggerShowcaseAttackAndVfx = () => {
    const st = stageRef.current;
    if (!st) return;

    setIsAttackingPreview(true);
    if (typeof (window as any).wizardChess?.playShowcaseAttackSfx === 'function') {
      (window as any).wizardChess.playShowcaseAttackSfx(archetype.id, 'king');
    }

    // 1. Trigger 3D Piece Attack Animation
    if (st.heroProceduralAnim) {
      st.heroProceduralAnim.mode = 'attack';
      st.heroProceduralAnim.clipTime = 0;
      setTimeout(() => {
        if (st.heroProceduralAnim) {
          st.heroProceduralAnim.mode = 'idle';
          st.heroProceduralAnim.clipTime = 0;
        }
        setIsAttackingPreview(false);
      }, 1250);
    } else if (st.heroMixer && st.heroActions.Attack) {
      const atk = st.heroActions.Attack;
      if (st.heroActions.Idle) st.heroActions.Idle.fadeOut(0.08);
      atk.reset();
      atk.setLoop(THREE.LoopOnce, 1);
      atk.clampWhenFinished = true;
      atk.fadeIn(0.08).play();
      setTimeout(() => {
        if (st.heroActions.Idle) {
          atk.fadeOut(0.2);
          st.heroActions.Idle.reset().fadeIn(0.2).play();
        }
        setIsAttackingPreview(false);
      }, 1250);
    } else {
      setTimeout(() => setIsAttackingPreview(false), 1100);
    }

    // 2. Spawn Set-Specific 3D Weapon Contact & Signature Kill VFX on the Pedestal
    const vfxGroup = st.vfxGroup;
    while (vfxGroup.children.length > 0) {
      const c = vfxGroup.children[0];
      vfxGroup.remove(c);
      disposeHierarchy(c);
    }
    st.activeVfxUpdaters = [];

    const archId = archetype.id;
    const styleIdx =
      archId === 'classic_staunton'
        ? 1
        : archId === 'arcane_cyber'
          ? 2
          : archId === 'dragon_elemental' || archId === 'hollow_reapers'
            ? 3
            : 0;
    const primaryHex =
      archId === 'classic_staunton'
        ? 0xffd166
        : archId === 'arcane_cyber'
          ? 0x00f5d4
          : archId === 'dragon_elemental'
            ? 0xff2a55
            : archId === 'hollow_reapers'
              ? 0xff6d00
              : 0xff6b35;
    const secondaryHex =
      archId === 'classic_staunton'
        ? 0xe09f3e
        : archId === 'arcane_cyber'
          ? 0x9d4edd
          : archId === 'dragon_elemental'
            ? 0xff9e00
            : archId === 'hollow_reapers'
              ? 0x00e676
              : 0xd4af37;
    const coreHex = archId === 'hollow_reapers' ? 0xffe066 : 0xffffff;

    // Shared Unity URP / ShaderGraph Shader VFX Layers on the Showcase Pedestal:
    // A. Unity Procedural Magic Circle / Voronoi Ground Crack Shader Decal
    const magicCircleMat = createUnityMagicCircleShaderMaterial(primaryHex, secondaryHex, coreHex, styleIdx);
    const magicCirclePlane = new THREE.Mesh(new THREE.PlaneGeometry(2.15, 2.15), magicCircleMat);
    magicCirclePlane.rotation.x = -Math.PI / 2;
    magicCirclePlane.position.y = 0.024;
    vfxGroup.add(magicCirclePlane);

    // B. Unity URP Fresnel & Noise-Dissolve Energy Sphere
    const fresnelMat = createUnityFresnelDissolveSphereMaterial(primaryHex, secondaryHex, coreHex);
    const fresnelSphere = new THREE.Mesh(new THREE.SphereGeometry(0.65, 24, 18), fresnelMat);
    fresnelSphere.position.y = 0.65;
    vfxGroup.add(fresnelSphere);

    // C. Unity Shuriken Scrolling Noise Slash Ribbon Shader (for melee Gothic Warriors & Hollow Reapers Scythe)
    const slashRibbonMat = createUnitySlashRibbonShaderMaterial(primaryHex, secondaryHex, coreHex);
    const slashRibbonMesh = new THREE.Mesh(
      new THREE.RingGeometry(0.45, 0.85, 32, 2, -Math.PI * 0.55, Math.PI * 1.1),
      slashRibbonMat
    );
    slashRibbonMesh.position.set(0, 0.72, 0.35);
    slashRibbonMesh.rotation.set(0.38, 0, 0.32);
    slashRibbonMesh.visible = archId === 'gothic_warriors' || archId === 'hollow_reapers';
    vfxGroup.add(slashRibbonMesh);

    // D. Unity Soft-Particle Star-Flare Billboards
    const starTex = getUnityStarFlareTexture();
    const starSprites: Array<{ sprite: THREE.Sprite; mat: THREE.SpriteMaterial; ang: number; vy: number }> = [];
    for (let i = 0; i < 8; i++) {
      const spMat = new THREE.SpriteMaterial({
        map: starTex,
        color: i % 2 === 0 ? coreHex : primaryHex,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const sp = new THREE.Sprite(spMat);
      const ang = (i / 8) * Math.PI * 2;
      sp.position.set(Math.cos(ang) * 0.45, 0.25 + (i % 3) * 0.18, Math.sin(ang) * 0.45);
      sp.scale.setScalar(0.32);
      vfxGroup.add(sp);
      starSprites.push({ sprite: sp, mat: spMat, ang, vy: 0.65 + (i % 3) * 0.3 });
    }

    let uElapsed = 0;
    st.activeVfxUpdaters.push((dt) => {
      uElapsed += dt;
      const p = Math.min(1, uElapsed / 1.2);
      const ease = 1 - Math.pow(1 - p, 3);

      magicCircleMat.uniforms.uTime.value = uElapsed;
      magicCircleMat.uniforms.uProgress.value = p;
      magicCirclePlane.scale.setScalar(0.45 + ease * 0.75);
      magicCirclePlane.rotation.z += dt * 1.6;

      fresnelMat.uniforms.uTime.value = uElapsed;
      fresnelMat.uniforms.uDissolve.value = Math.min(1, p * 1.1);
      fresnelSphere.scale.setScalar(0.4 + ease * 0.85);
      fresnelSphere.rotation.y += dt * 3.0;

      slashRibbonMat.uniforms.uTime.value = uElapsed;
      slashRibbonMat.uniforms.uProgress.value = Math.min(1, p * 1.35);
      slashRibbonMesh.scale.setScalar(0.75 + ease * 0.65);
      slashRibbonMesh.rotation.z += dt * 9.5;

      for (const stSp of starSprites) {
        const rad = 0.45 + ease * 0.55;
        stSp.sprite.position.x = Math.cos(stSp.ang + uElapsed * 2.4) * rad;
        stSp.sprite.position.z = Math.sin(stSp.ang + uElapsed * 2.4) * rad;
        stSp.sprite.position.y += stSp.vy * dt;
        stSp.sprite.scale.setScalar(0.34 * Math.max(0.02, 1 - p));
        stSp.mat.opacity = 0.95 * (1 - p);
      }
      return p < 1;
    });

    if (archId === 'gothic_warriors') {
      // EDGEFLUX Triple Staggered GLSL Sword-Wave Slash Ribbons + Cathedral Rose Sigil + 28 Forged Anvil Sparks + Reliquary Crosses
      const slashWaves: Array<{ mesh: THREE.Mesh; mat: THREE.ShaderMaterial; speed: number; scaleMul: number }> = [];
      const waveCfgs = [
        { tiltX: 0.36, tiltZ: 0.48, scaleMul: 1.08, speed: 12.0, pHex: 0xff6b35, sHex: 0xffd166 },
        { tiltX: 0.36, tiltZ: -0.48, scaleMul: 1.0, speed: -13.0, pHex: 0xff2a55, sHex: 0xffb703 },
        { tiltX: 1.35, tiltZ: 0.0, scaleMul: 1.22, speed: 15.0, pHex: 0xffd166, sHex: 0xffffff }
      ];
      for (const wc of waveCfgs) {
        const wMat = createUnitySlashRibbonShaderMaterial(wc.pHex, wc.sHex, 0xffffff);
        const wMesh = new THREE.Mesh(
          new THREE.RingGeometry(0.42, 0.88, 32, 2, -Math.PI * 0.55, Math.PI * 1.1),
          wMat
        );
        wMesh.position.set(0, 0.72, 0.42);
        wMesh.rotation.set(wc.tiltX, 0, wc.tiltZ);
        vfxGroup.add(wMesh);
        slashWaves.push({ mesh: wMesh, mat: wMat, speed: wc.speed, scaleMul: wc.scaleMul });
      }

      const roseRing = new THREE.Mesh(
        new THREE.RingGeometry(0.35, 1.08, 12),
        new THREE.MeshBasicMaterial({
          color: 0xffb703,
          transparent: true,
          opacity: 0.9,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        })
      );
      roseRing.rotation.x = -Math.PI / 2;
      roseRing.position.y = 0.03;
      vfxGroup.add(roseRing);

      // 28 High-Velocity Forged-Steel Anvil Sparks
      const anvilSparks: Array<{ mesh: THREE.Mesh; vx: number; vy: number; vz: number }> = [];
      const sparkGeo = new THREE.OctahedronGeometry(0.028, 0);
      sparkGeo.scale(0.6, 2.3, 0.6);
      const sparkMat = new THREE.MeshBasicMaterial({
        color: 0xffe8a3,
        transparent: true,
        opacity: 0.98,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      for (let i = 0; i < 28; i++) {
        const sm = new THREE.Mesh(sparkGeo, sparkMat);
        sm.position.set(0, 0.72, 0.42);
        const ang = (i / 28) * Math.PI * 2;
        anvilSparks.push({
          mesh: sm,
          vx: Math.cos(ang) * (1.1 + Math.random() * 1.2),
          vy: 0.65 + Math.random() * 1.4,
          vz: Math.sin(ang) * (1.1 + Math.random() * 1.2) + 0.6
        });
        vfxGroup.add(sm);
      }

      const crosses: THREE.Group[] = [];
      for (let i = 0; i < 6; i++) {
        const cg = new THREE.Group();
        const cMat = new THREE.MeshBasicMaterial({
          color: i % 2 === 0 ? 0xffea9f : 0xffb703,
          transparent: true,
          opacity: 0.95,
          blending: THREE.AdditiveBlending
        });
        cg.add(new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.24, 0.04), cMat));
        const hBar = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.04, 0.04), cMat);
        hBar.position.y = 0.04;
        cg.add(hBar);
        const ang = (i / 6) * Math.PI * 2;
        cg.position.set(Math.cos(ang) * 0.72, 0.22, Math.sin(ang) * 0.72);
        vfxGroup.add(cg);
        crosses.push(cg);
      }

      let t = 0;
      st.activeVfxUpdaters.push((dt) => {
        t += dt;
        const p = Math.min(1, t / 1.15);
        for (const sw of slashWaves) {
          sw.mat.uniforms.uTime.value = t;
          sw.mat.uniforms.uProgress.value = Math.min(1, p * 1.25);
          sw.mesh.scale.setScalar((0.75 + p * 1.15) * sw.scaleMul);
          sw.mesh.rotation.z += dt * sw.speed;
        }
        roseRing.scale.setScalar(0.5 + p * 1.15);
        roseRing.rotation.z += dt * 1.8;
        (roseRing.material as THREE.MeshBasicMaterial).opacity = Math.max(0, (1 - p) * 0.9);
        sparkMat.opacity = Math.max(0, (1 - p) * 0.98);
        for (const sp of anvilSparks) {
          sp.mesh.position.x += sp.vx * dt;
          sp.mesh.position.y += sp.vy * dt;
          sp.mesh.position.z += sp.vz * dt;
          sp.vy -= 4.8 * dt;
          sp.mesh.scale.setScalar(Math.max(0.02, 1 - p));
        }
        crosses.forEach((c, idx) => {
          c.position.y = 0.22 + p * 0.95;
          c.rotation.y += dt * (3.2 + idx * 0.4);
          c.scale.setScalar(Math.max(0.01, 1 - p * 0.75));
        });
        if (p >= 1) {
          disposeHierarchy(vfxGroup);
          vfxGroup.clear();
          return false;
        }
        return true;
      });
    } else if (archId === 'classic_staunton') {
      // Grandmaster 6-Comet Telekinetic Barrage + 8-Point Compass Star + Gyroscopic Brass Astrolabe Rings
      const starGroup = new THREE.Group();
      starGroup.position.y = 0.03;
      const starMatA = new THREE.MeshBasicMaterial({
        color: 0xffe082,
        transparent: true,
        opacity: 0.92,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const starMatB = new THREE.MeshBasicMaterial({
        color: 0xffb300,
        transparent: true,
        opacity: 0.88,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const sqA = new THREE.Mesh(new THREE.RingGeometry(0.28, 0.98, 4), starMatA);
      sqA.rotation.x = -Math.PI / 2;
      const sqB = new THREE.Mesh(new THREE.RingGeometry(0.28, 0.98, 4), starMatB);
      sqB.rotation.x = -Math.PI / 2;
      sqB.rotation.z = Math.PI / 4;
      starGroup.add(sqA, sqB);
      vfxGroup.add(starGroup);

      const chronoRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.75, 0.025, 12, 48),
        new THREE.MeshBasicMaterial({
          color: 0xfff8e1,
          transparent: true,
          opacity: 0.92,
          blending: THREE.AdditiveBlending
        })
      );
      chronoRing.position.y = 0.65;
      vfxGroup.add(chronoRing);

      // 6 Streaking Golden Arcane Comet Projectiles diving onto the pedestal
      const comets: Array<{
        pivot: THREE.Group;
        mat: THREE.SpriteMaterial;
        startPos: THREE.Vector3;
        endPos: THREE.Vector3;
        delay: number;
      }> = [];
      const tailGeo = new THREE.ConeGeometry(0.065, 0.45, 8);
      tailGeo.translate(0, 0.225, 0);
      tailGeo.rotateX(-Math.PI / 2);

      for (let i = 0; i < 6; i++) {
        const cPivot = new THREE.Group();
        const cMat = new THREE.SpriteMaterial({
          map: starTex,
          color: i % 2 === 0 ? 0xffffff : 0xffd166,
          transparent: true,
          opacity: 1.0,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        });
        const headSp = new THREE.Sprite(cMat);
        headSp.scale.setScalar(0.38);
        cPivot.add(headSp);

        const tailM = new THREE.Mesh(tailGeo, i % 2 === 0 ? starMatA : starMatB);
        cPivot.add(tailM);

        const ang = (i / 6) * Math.PI * 2;
        const startPos = new THREE.Vector3(Math.cos(ang) * 0.85, 1.55 + (i % 2) * 0.25, Math.sin(ang) * 0.85);
        const endPos = new THREE.Vector3(Math.cos(ang + 0.6) * 0.35, 0.08, Math.sin(ang + 0.6) * 0.35 + 0.32);
        cPivot.position.copy(startPos);
        cPivot.lookAt(endPos);
        vfxGroup.add(cPivot);
        comets.push({ pivot: cPivot, mat: cMat, startPos, endPos, delay: i * 0.05 });
      }

      let t = 0;
      st.activeVfxUpdaters.push((dt) => {
        t += dt;
        const p = Math.min(1, t / 1.2);
        starGroup.scale.setScalar(0.45 + p * 1.2);
        starGroup.rotation.y += dt * 2.5;
        starMatA.opacity = Math.max(0, (1 - p) * 0.92);
        starMatB.opacity = Math.max(0, (1 - p) * 0.88);
        chronoRing.rotation.x += dt * 4.2;
        chronoRing.rotation.y += dt * 3.1;
        (chronoRing.material as THREE.MeshBasicMaterial).opacity = Math.max(0, (1 - p) * 0.92);

        for (const cm of comets) {
          const localU = Math.max(0, Math.min(1, (p - cm.delay) / Math.max(0.25, 0.78 - cm.delay)));
          const ease = localU * localU * (3 - 2 * localU);
          cm.pivot.position.lerpVectors(cm.startPos, cm.endPos, ease);
          const s = Math.sin(localU * Math.PI) * 1.25;
          cm.pivot.scale.setScalar(Math.max(0.01, s));
          cm.mat.opacity = Math.sin(localU * Math.PI);
        }

        if (p >= 1) {
          disposeHierarchy(vfxGroup);
          vfxGroup.clear();
          return false;
        }
        return true;
      });
    } else if (archId === 'arcane_cyber') {
      // Hex Holo-Grids + EMP Dome on the pedestal (coherent laser beams fire directly from the Mech's integrated cannons & chest emitter)
      const hexGrids: THREE.Mesh[] = [];
      for (let i = 0; i < 3; i++) {
        const hex = new THREE.Mesh(
          new THREE.RingGeometry(0.32 + i * 0.14, 0.42 + i * 0.14, 6),
          new THREE.MeshBasicMaterial({
            color: i % 2 === 0 ? 0x00f5d4 : 0x7209b7,
            transparent: true,
            opacity: 0.92,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false
          })
        );
        hex.rotation.x = -Math.PI / 2;
        hex.position.y = 0.08 + i * 0.25;
        vfxGroup.add(hex);
        hexGrids.push(hex);
      }

      const empDome = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.55, 1),
        new THREE.MeshBasicMaterial({
          color: 0x00f5d4,
          wireframe: true,
          transparent: true,
          opacity: 0.75,
          blending: THREE.AdditiveBlending
        })
      );
      empDome.position.y = 0.62;
      vfxGroup.add(empDome);

      let t = 0;
      st.activeVfxUpdaters.push((dt) => {
        t += dt;
        const p = Math.min(1, t / 1.2);

        hexGrids.forEach((h, idx) => {
          h.position.y = 0.08 + idx * 0.24 + p * 0.85;
          h.rotation.z += dt * (idx % 2 === 0 ? 3.8 : -3.8);
          h.scale.setScalar(0.65 + p * 1.1);
          (h.material as THREE.MeshBasicMaterial).opacity = Math.max(0, (1 - p) * 0.92);
        });
        empDome.scale.setScalar(0.5 + p * 1.45);
        empDome.rotation.y += dt * 3.2;
        (empDome.material as THREE.MeshBasicMaterial).opacity = Math.max(0, (1 - p) * 0.75);
        if (p >= 1) {
          disposeHierarchy(vfxGroup);
          vfxGroup.clear();
          return false;
        }
        return true;
      });
    } else if (archId === 'hollow_reapers') {
      // HOLLOW JACK & WRAITH REAPERS:
      // Samhain Reaper Scythe Slash Ribbons + Actual 3D GLTF Gravestones & Jack-o'-Lanterns + Bat & Ghost Sprites
      preloadHalloween3DAssets();
      if (typeof (window as any).wizardChess?.playHalloweenWhisperSfx === 'function') {
        (window as any).wizardChess.playHalloweenWhisperSfx('whisper');
      }
      const reaperWaves: Array<{ mesh: THREE.Mesh; mat: THREE.ShaderMaterial; speed: number; scaleMul: number }> = [];
      const waveCfgs = [
        { tiltX: 0.36, tiltZ: 0.48, scaleMul: 1.12, speed: 13.0, pHex: 0xff6d00, sHex: 0x00e676 },
        { tiltX: 0.36, tiltZ: -0.48, scaleMul: 1.04, speed: -14.0, pHex: 0x00e676, sHex: 0x9d4edd }
      ];
      for (const wc of waveCfgs) {
        const wMat = createUnitySlashRibbonShaderMaterial(wc.pHex, wc.sHex, 0xffe066);
        const wMesh = new THREE.Mesh(
          new THREE.RingGeometry(0.42, 0.88, 32, 2, -Math.PI * 0.55, Math.PI * 1.1),
          wMat
        );
        wMesh.position.set(0, 0.72, 0.38);
        wMesh.rotation.set(wc.tiltX, 0, wc.tiltZ);
        vfxGroup.add(wMesh);
        reaperWaves.push({ mesh: wMesh, mat: wMat, speed: wc.speed, scaleMul: wc.scaleMul });
      }

      const eruptingProps: Array<{ group: THREE.Group; peakY: number }> = [];
      const propKeys = [
        'gravestone',
        'pumpkin_orange_jackolantern',
        'gravemarker_A',
        'skull_candle',
        'gravemarker_B',
        'pumpkin_yellow_jackolantern'
      ];
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2;
        const propHolder = new THREE.Group();
        propHolder.position.set(Math.cos(ang) * 0.52, -0.15, Math.sin(ang) * 0.52);
        propHolder.rotation.y = -ang + Math.PI / 2;
        const key = propKeys[i % propKeys.length];
        mountHalloweenModel(propHolder, key, {
          scale: key.startsWith('pumpkin') || key === 'skull_candle' ? 0.24 : 0.16,
          castShadow: false,
          receiveShadow: false
        });
        vfxGroup.add(propHolder);
        eruptingProps.push({ group: propHolder, peakY: 0.08 + (i % 2) * 0.06 });
      }

      const batTex = getHalloweenBatTexture();
      const ghostTex = getHalloweenGhostTexture();
      const halloweenSprites: Array<{
        sprite: THREE.Sprite;
        mat: THREE.SpriteMaterial;
        ang: number;
        vy: number;
        isGhost: boolean;
        baseScale: number;
      }> = [];
      for (let i = 0; i < 12; i++) {
        const isGhost = i % 3 === 0;
        const spMat = new THREE.SpriteMaterial({
          map: isGhost ? ghostTex : batTex,
          color: 0xffffff,
          transparent: true,
          opacity: 0.96,
          depthWrite: false
        });
        const sp = new THREE.Sprite(spMat);
        const ang = (i / 12) * Math.PI * 2;
        const baseScale = isGhost ? 0.36 : 0.28;
        sp.scale.setScalar(baseScale);
        sp.position.set(Math.cos(ang) * 0.45, 0.22 + (i % 3) * 0.16, Math.sin(ang) * 0.45);
        vfxGroup.add(sp);
        halloweenSprites.push({
          sprite: sp,
          mat: spMat,
          ang,
          vy: isGhost ? 0.72 : 1.05,
          isGhost,
          baseScale
        });
      }

      let t = 0;
      st.activeVfxUpdaters.push((dt) => {
        t += dt;
        const p = Math.min(1, t / 1.25);
        const cragEnv = p < 0.28 ? p / 0.28 : Math.max(0, 1 - (p - 0.28) / 0.72);
        for (const ep of eruptingProps) {
          ep.group.position.y = -0.15 + cragEnv * ep.peakY;
          ep.group.scale.setScalar(Math.max(0.01, cragEnv));
        }
        for (const rw of reaperWaves) {
          rw.mat.uniforms.uTime.value = t;
          rw.mat.uniforms.uProgress.value = Math.min(1, p * 1.25);
          rw.mesh.scale.setScalar((0.75 + p * 1.15) * rw.scaleMul);
          rw.mesh.rotation.z += dt * rw.speed;
        }
        for (const hs of halloweenSprites) {
          const curAng = hs.ang + t * (hs.isGhost ? 2.4 : 5.2);
          const rad = 0.45 + p * (hs.isGhost ? 0.45 : 0.75);
          hs.sprite.position.x = Math.cos(curAng) * rad;
          hs.sprite.position.z = Math.sin(curAng) * rad;
          hs.sprite.position.y += hs.vy * dt;
          const fade = Math.max(0.02, 1 - p);
          const flap = hs.isGhost ? 1.0 : 1.0 + Math.sin(t * 25.0 + hs.ang) * 0.22;
          hs.sprite.scale.set(hs.baseScale * flap * fade, hs.baseScale * fade, 1);
          hs.mat.opacity = 0.96 * fade;
        }
        if (p >= 1) {
          disposeHierarchy(vfxGroup);
          vfxGroup.clear();
          return false;
        }
        return true;
      });
    } else {
      // DRAGON & ELEMENTAL GUARDIANS:
      // The real PYROLUX Volumetric Fire-Breathing Stream + 44 Billowing Flame/Ember/Smoke Particles
      // pours directly from the Dragon's moving fanged jaws (`dragonBreathJet` attached to `head`).
      // On the pedestal floor we erupt the 8 Obsidian Magma Crags scorched by the Dragon's breath!
      const crags: Array<{ mesh: THREE.Mesh; maxH: number }> = [];
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2;
        const rad = 0.55 + (i % 2) * 0.22;
        const maxH = 0.42 + (i % 3) * 0.14;
        const crag = new THREE.Mesh(
          new THREE.ConeGeometry(0.085, maxH, 5),
          new THREE.MeshBasicMaterial({
            color: i % 2 === 0 ? 0xff4d00 : 0xffbe0b,
            transparent: true,
            opacity: 0.95,
            blending: THREE.AdditiveBlending
          })
        );
        crag.position.set(Math.cos(ang) * rad, 0.02, Math.sin(ang) * rad);
        crag.rotation.z = -Math.cos(ang) * 0.28;
        crag.rotation.x = Math.sin(ang) * 0.28;
        vfxGroup.add(crag);
        crags.push({ mesh: crag, maxH });
      }

      let t = 0;
      st.activeVfxUpdaters.push((dt) => {
        t += dt;
        const p = Math.min(1, t / 1.25);
        const erupt = p < 0.35 ? p / 0.35 : Math.max(0, 1 - (p - 0.35) / 0.65);
        crags.forEach((c) => {
          c.mesh.scale.set(1, Math.max(0.01, erupt), 1);
          c.mesh.position.y = (c.maxH * erupt) * 0.45;
          (c.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, (1 - p * 0.85) * 0.95);
        });
        if (p >= 1) {
          disposeHierarchy(vfxGroup);
          vfxGroup.clear();
          return false;
        }
        return true;
      });
    }
  };

  useEffect(() => {
    if (attackPreviewNonce > 0 && (activeTab === 'types' || activeTab === 'pieces')) {
      triggerShowcaseAttackAndVfx();
    }
  }, [attackPreviewNonce]);

  const handleZoomShowcase = (delta: number) => {
    const st = stageRef.current;
    if (!st) return;
    const dir = new THREE.Vector3().subVectors(st.camera.position, st.lookTarget);
    const dist = dir.length();
    const nextDist = Math.max(1.8, Math.min(5.2, dist + delta));
    dir.normalize().multiplyScalar(nextDist);
    st.camera.position.copy(st.lookTarget).add(dir);
    st.camera.lookAt(st.lookTarget);
  };

  return (
    <div className="showcase-studio-widget">
      <div className="showcase-viewport-container">
        <div className="showcase-3d-mount" ref={mountRef}></div>

        {/* Discreet Top-Left Floating Status Badge */}
        <div className="showcase-overlay-bar">
          <div className="showcase-badge-title">
            <span className="showcase-pulse-dot" aria-hidden="true"></span>
            <span className="showcase-label-text">
              {activeTab === 'types'
                ? `PIECE SET · ${archetype.name}`
                : activeTab === 'boards'
                  ? `ALTAR BOARD · ${boardSkin.name}`
                  : activeTab === 'sceneries'
                    ? `WORLD SCENERY · ${scenery.name}`
                    : `FINISH · ${pieceSkin.name}`}
            </span>
          </div>
        </div>

        <div className="showcase-drag-hint">
          <span>
            {activeTab === 'types'
              ? `${archetype.strikeStyle} · ${archetype.shatterStyle}`
              : 'Drag 360° to orbit · Ctrl + Scroll to zoom'}
          </span>
        </div>
      </div>

      {/* Dedicated Non-Overlapping Interactive Control Toolbar */}
      <div className="showcase-control-strip" role="toolbar" aria-label="3D Preview Controls">
        {(activeTab === 'types' || activeTab === 'pieces') && (
          <>
            <button
              type="button"
              className={`showcase-toggle-btn showcase-attack-btn ${isAttackingPreview ? 'active' : ''}`}
              onClick={triggerShowcaseAttackAndVfx}
              title={`Preview ${archetype.name} Unique Attack & 3D Effect`}
            >
              ⚔ Attack &amp; VFX
            </button>

            <div className="showcase-army-tabs" role="tablist" aria-label="Preview Army Color">
              <button
                type="button"
                role="tab"
                aria-selected={previewColor === 'w'}
                className={`showcase-toggle-btn ${previewColor === 'w' ? 'active' : ''}`}
                onClick={() => setPreviewColor('w')}
                title="Preview White Army"
              >
                ♔ White
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={previewColor === 'b'}
                className={`showcase-toggle-btn ${previewColor === 'b' ? 'active' : ''}`}
                onClick={() => setPreviewColor('b')}
                title="Preview Black Army"
              >
                ♚ Black
              </button>
            </div>
          </>
        )}

        <div className="showcase-cam-group">
          <button
            type="button"
            className="showcase-toggle-btn"
            onClick={() => handleZoomShowcase(-0.35)}
            title="Zoom In 3D Preview"
            aria-label="Zoom In 3D Preview"
          >
            Zoom ＋
          </button>
          <button
            type="button"
            className="showcase-toggle-btn"
            onClick={() => handleZoomShowcase(0.35)}
            title="Zoom Out 3D Preview"
            aria-label="Zoom Out 3D Preview"
          >
            Zoom －
          </button>
          <button
            type="button"
            className={`showcase-toggle-btn ${autoRotate ? 'active' : ''}`}
            onClick={() => setAutoRotate((prev) => !prev)}
            title="Toggle 360° showcase spin"
          >
            {autoRotate ? '↻ Spin: ON' : '↻ Spin: OFF'}
          </button>
        </div>
      </div>
    </div>
  );
}

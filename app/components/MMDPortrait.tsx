"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
// @ts-ignore
import { MMDLoader } from "three/examples/jsm/loaders/MMDLoader.js";
import {
  PORTRAIT_CONFIGS,
  type PortraitCharacterKey,
  type PortraitMood,
} from "@/app/lib/mmd/portraitConfig";
import {
  applyMoodToModel,
  applyPoseToModel,
  captureBasePose,
  disposeObject3D,
} from "@/app/lib/mmd/helpers";

type MMDPortraitProps = {
  className?: string;
  character: PortraitCharacterKey;
  mood?: PortraitMood;
  debugMorphs?: boolean;
  debugBones?: boolean;
};

export default function MMDPortrait({
  className,
  character,
  mood = "neutral",
  debugMorphs = false,
  debugBones = false,
}: MMDPortraitProps) {
  const [isModelLoading, setIsModelLoading] = useState(true);

  const mountRef = useRef<HTMLDivElement | null>(null);
  const modelRef = useRef<THREE.Object3D | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const actionsRef = useRef<Partial<Record<PortraitMood, THREE.AnimationAction>>>(
    {}
  );
  const currentMoodRef = useRef<PortraitMood>("neutral");

  const frameIdRef = useRef<number>(0);
  const clockRef = useRef(new THREE.Clock());

  const bgPlaneRef = useRef<THREE.Mesh | null>(null);
  const bgMaterialRef = useRef<THREE.ShaderMaterial | null>(null);

  const basePoseRef = useRef<
    Map<
      string,
      {
        rotation: THREE.Euler;
        position: THREE.Vector3;
        quaternion: THREE.Quaternion;
      }
    > | null
  >(null);

  const activeVmdMoodSet = useMemo(() => {
    const config = PORTRAIT_CONFIGS[character];
    return config.moodMotions ?? {};
  }, [character]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let disposed = false;
    const loader = new MMDLoader();

    const getSize = () => ({
      width: mount.clientWidth || 320,
      height: mount.clientHeight || 420,
    });

    const ensureScene = () => {
      if (!sceneRef.current) {
        sceneRef.current = new THREE.Scene();
      }
      return sceneRef.current;
    };

    const ensureRenderer = (isMobile: boolean, width: number, height: number) => {
      if (!rendererRef.current) {
        rendererRef.current = new THREE.WebGLRenderer({
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
        });

        rendererRef.current.outputColorSpace = THREE.SRGBColorSpace;
        rendererRef.current.toneMapping = THREE.ACESFilmicToneMapping;

        mount.appendChild(rendererRef.current.domElement);
      }

      rendererRef.current.setPixelRatio(
        Math.min(window.devicePixelRatio, isMobile ? 1 : 1.25)
      );
      rendererRef.current.setSize(width, height);

      return rendererRef.current;
    };

    const ensureCamera = (width: number, height: number, isMobile: boolean) => {
      const config = PORTRAIT_CONFIGS[character];
      const cameraConfig = isMobile ? config.mobileCamera : config.desktopCamera;

      if (!cameraRef.current) {
        cameraRef.current = new THREE.PerspectiveCamera(
          cameraConfig.fov,
          width / height,
          0.1,
          1000
        );
      }

      cameraRef.current.aspect = width / height;
      cameraRef.current.fov = cameraConfig.fov;
      cameraRef.current.position.set(...cameraConfig.position);
      cameraRef.current.lookAt(...cameraConfig.lookAt);
      cameraRef.current.updateProjectionMatrix();

      return cameraRef.current;
    };

    const clearScene = (scene: THREE.Scene) => {
      while (scene.children.length > 0) {
        scene.remove(scene.children[0]);
      }
    };

    const buildBackground = (scene: THREE.Scene, isMobile: boolean) => {
      const config = PORTRAIT_CONFIGS[character];

      bgPlaneRef.current?.geometry.dispose();
      bgMaterialRef.current?.dispose();
      bgPlaneRef.current = null;
      bgMaterialRef.current = null;

      const glowCenterY = isMobile
        ? (config.background.glowCenterYMobile ?? 0.56)
        : (config.background.glowCenterYDesktop ?? 0.66);

      const glowRadius = isMobile
        ? (config.background.glowRadiusMobile ?? 0.3)
        : (config.background.glowRadiusDesktop ?? 0.24);

      const glowStrength = isMobile
        ? (config.background.glowStrengthMobile ?? 1.0)
        : (config.background.glowStrengthDesktop ?? 0.9);

      const vignetteStrength = config.background.vignetteStrength ?? 0.18;

      const bgMaterial = new THREE.ShaderMaterial({
        uniforms: {
          uColorTop: { value: new THREE.Color(config.background.top) },
          uColorBottom: { value: new THREE.Color(config.background.bottom) },
          uGlowColor: { value: new THREE.Color(config.background.glow) },
          uGlowCenter: { value: new THREE.Vector2(0.5, glowCenterY) },
          uGlowRadius: { value: glowRadius },
          uGlowStrength: { value: glowStrength },
          uVignetteStrength: { value: vignetteStrength },
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 uColorTop;
          uniform vec3 uColorBottom;
          uniform vec3 uGlowColor;
          uniform vec2 uGlowCenter;
          uniform float uGlowRadius;
          uniform float uGlowStrength;
          uniform float uVignetteStrength;
          varying vec2 vUv;

          void main() {
            vec3 base = mix(uColorBottom, uColorTop, smoothstep(0.0, 1.0, vUv.y));

            float d = distance(vUv, uGlowCenter);
            float glow = smoothstep(uGlowRadius, 0.0, d) * uGlowStrength;

            float edge = distance(vUv, vec2(0.5, 0.5));
            float vignette = smoothstep(0.45, 0.92, edge) * uVignetteStrength;

            vec3 color = base;
            color += uGlowColor * glow * 0.34;
            color -= vignette;

            gl_FragColor = vec4(color, 1.0);
          }
        `,
      });

      const bgPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(isMobile ? 18 : 24, isMobile ? 24 : 32),
        bgMaterial
      );

      bgPlane.position.set(0, isMobile ? 15.6 : 16, -8);

      bgMaterialRef.current = bgMaterial;
      bgPlaneRef.current = bgPlane;
      scene.add(bgPlane);
    };

    const buildLights = (scene: THREE.Scene, isMobile: boolean) => {
      const config = PORTRAIT_CONFIGS[character];
      const l = config.lighting;

      const ambient = new THREE.AmbientLight(l.ambientColor ?? 0xffffff, l.ambient);
      const keyLight = new THREE.DirectionalLight(l.keyColor ?? 0xfff3ea, l.key);
      const fillLight = new THREE.DirectionalLight(l.fillColor ?? 0xdeebff, l.fill);
      const faceLight = new THREE.SpotLight(
        l.faceColor ?? 0xfffcf8,
        l.face,
        50,
        Math.PI / 7,
        0.5,
        1.05
      );
      const rimLight = new THREE.DirectionalLight(l.rimColor ?? 0xdbe7ff, l.rim);
      const haloLight = new THREE.PointLight(l.haloColor ?? 0xffffff, l.halo, 18);

      keyLight.position.set(4.5, 18, 12);
      fillLight.position.set(-6, 13, 8);
      faceLight.position.set(0, 17.2, 10);
      faceLight.target.position.set(0, isMobile ? 15.4 : 15.8, 0);
      rimLight.position.set(0, 14, -10);
      haloLight.position.set(0, isMobile ? 16.1 : 17, -5.8);

      scene.add(ambient);
      scene.add(keyLight);
      scene.add(fillLight);
      scene.add(faceLight);
      scene.add(faceLight.target);
      scene.add(rimLight);
      scene.add(haloLight);
    };

    const buildSceneForCurrentCharacter = () => {
      const scene = ensureScene();
      const { width, height } = getSize();
      const isMobile = width < 500;
      const renderer = ensureRenderer(isMobile, width, height);
      const camera = ensureCamera(width, height, isMobile);
      const config = PORTRAIT_CONFIGS[character];

      renderer.toneMappingExposure = isMobile ? 0.88 : 0.92;

      clearScene(scene);
      buildBackground(scene, isMobile);
      buildLights(scene, isMobile);

      camera.position.set(
        ...(isMobile ? config.mobileCamera.position : config.desktopCamera.position)
      );
      camera.lookAt(
        ...(isMobile ? config.mobileCamera.lookAt : config.desktopCamera.lookAt)
      );
      camera.updateProjectionMatrix();
    };

    const loadCombinedClip = async (
      mesh: THREE.SkinnedMesh,
      vmdPaths: string[]
    ): Promise<THREE.AnimationClip | null> => {
      if (!vmdPaths.length) return null;

      return await new Promise<THREE.AnimationClip | null>((resolve) => {
        (loader as any).loadAnimation(
          vmdPaths,
          mesh,
          (clip: THREE.AnimationClip) => resolve(clip),
          undefined,
          (error: unknown) => {
            console.error("Failed to load mood VMDs:", vmdPaths, error);
            resolve(null);
          }
        );
      });
    };

    const preloadMoodActions = async (mesh: THREE.SkinnedMesh) => {
      const config = PORTRAIT_CONFIGS[character];
      const mixer = new THREE.AnimationMixer(mesh);

      mixerRef.current = mixer;
      actionsRef.current = {};

      const moodEntries = Object.entries(config.moodMotions ?? {}) as Array<
        [PortraitMood, { modelVmdPaths?: string[] }]
      >;

      for (const [moodKey, motionSet] of moodEntries) {
        if (disposed) return;

        const vmdPaths = Array.isArray(motionSet?.modelVmdPaths)
          ? motionSet.modelVmdPaths.filter(Boolean)
          : [];

        if (!vmdPaths.length) continue;

        const clip = await loadCombinedClip(mesh, vmdPaths);
        if (!clip || !mixerRef.current) continue;

        const action = mixerRef.current.clipAction(clip);
        action.enabled = true;
        action.clampWhenFinished = false;
        action.loop = THREE.LoopRepeat;

        actionsRef.current[moodKey] = action;
      }
    };

    const applyCurrentMoodState = (nextMood: PortraitMood) => {
      const model = modelRef.current;
      if (!model) return;

      const config = PORTRAIT_CONFIGS[character];

      applyMoodToModel(model, nextMood, config);

      const hasMoodVmd =
        !!config.moodMotions?.[nextMood]?.modelVmdPaths?.filter(Boolean).length;

      if (!hasMoodVmd && basePoseRef.current) {
        applyPoseToModel(model, nextMood, config, basePoseRef.current);
      }
    };

    const playMoodAction = (nextMood: PortraitMood, immediate = false) => {
      const nextAction = actionsRef.current[nextMood];
      const prevMood = currentMoodRef.current;
      const prevAction = actionsRef.current[prevMood];

      if (prevMood === nextMood && nextAction?.isRunning()) {
        return;
      }

      const fade = immediate ? 0 : 0.28;

      if (prevAction && prevAction !== nextAction) {
        prevAction.fadeOut(fade);
      }

      if (nextAction) {
        nextAction.reset();
        nextAction.setEffectiveTimeScale(1);
        nextAction.setEffectiveWeight(1);
        nextAction.fadeIn(fade);
        nextAction.play();
      }

      currentMoodRef.current = nextMood;
    };

    const loadCharacterModel = async () => {
      const scene = sceneRef.current;
      if (!scene) return;

      const config = PORTRAIT_CONFIGS[character];
      setIsModelLoading(true);

      loader.load(
        config.modelPath,
        async (loadedModel: THREE.Object3D) => {
          if (disposed || !sceneRef.current) {
            disposeObject3D(loadedModel);
            return;
          }

          loadedModel.position.set(0, config.baseY, 0);
          loadedModel.rotation.y = config.rotationY ?? 0;
          loadedModel.scale.setScalar(config.scale ?? 1);

        loadedModel.traverse((obj: any) => {
  if (!obj.isMesh) return;

  const materials = Array.isArray(obj.material) ? obj.material : [obj.material];

  for (const mat of materials) {
    if (!mat) continue;

    // keep texture colors intact
    if (mat.map) {
      mat.map.colorSpace = THREE.SRGBColorSpace;
      mat.map.needsUpdate = true;
    }

    // THIS is the big fix for washed-out anime/MMD colors
    mat.toneMapped = false;

    // kill glow/lift that can whiten the whole model
    if (mat.emissive && typeof mat.emissive.setRGB === "function") {
      mat.emissive.setRGB(0, 0, 0);
    }
    mat.emissiveIntensity = 0;

    // reduce shiny / physically-based look
    if ("metalness" in mat) mat.metalness = 0;
    if ("roughness" in mat) mat.roughness = 1;

    // avoid extra brightness from env light
    if ("envMapIntensity" in mat) mat.envMapIntensity = 0;

    // keep alpha edges cleaner
    if ("alphaTest" in mat) mat.alphaTest = 0.03;

    mat.needsUpdate = true;
  }
});

          const oldModel = modelRef.current;

          loadedModel.visible = false;
          sceneRef.current.add(loadedModel);
          modelRef.current = loadedModel;

          basePoseRef.current = captureBasePose(loadedModel);

          const mesh = loadedModel as THREE.SkinnedMesh;
          await preloadMoodActions(mesh);

          applyCurrentMoodState(mood);
          playMoodAction(mood, true);

          let warmupFrames = 0;

          const revealWhenReady = () => {
            if (
              disposed ||
              !rendererRef.current ||
              !sceneRef.current ||
              !cameraRef.current
            ) {
              return;
            }

            rendererRef.current.render(sceneRef.current, cameraRef.current);
            warmupFrames += 1;

            if (warmupFrames >= 5) {
              loadedModel.visible = true;

              if (oldModel) {
                sceneRef.current.remove(oldModel);
                disposeObject3D(oldModel);
              }

              setIsModelLoading(false);
              return;
            }

            requestAnimationFrame(revealWhenReady);
          };

          requestAnimationFrame(revealWhenReady);
        },
        undefined,
        (error: unknown) => {
          console.error(`Failed to load model for ${character}:`, error);
          setIsModelLoading(false);
        }
      );
    };

    const renderCurrentFrame = () => {
      const scene = sceneRef.current;
      const camera = cameraRef.current;
      const renderer = rendererRef.current;
      const model = modelRef.current;
      const config = PORTRAIT_CONFIGS[character];
      const motion = config.motion;

      const delta = clockRef.current.getDelta();
      const elapsed = clockRef.current.getElapsedTime();

      if (mixerRef.current) {
        mixerRef.current.update(delta);
      }

      if (model) {
        const hasMoodVmd =
          !!config.moodMotions?.[currentMoodRef.current]?.modelVmdPaths?.filter(Boolean)
            .length;

        const floatAmp = hasMoodVmd
          ? (motion?.floatAmpWithVmd ?? 0.008)
          : (motion?.floatAmp ?? 0.02);

        const swayAmp = hasMoodVmd
          ? (motion?.swayAmpWithVmd ?? 0.003)
          : (motion?.swayAmp ?? 0.012);

        model.position.y =
          config.baseY +
          Math.sin(elapsed * (motion?.floatSpeed ?? 1.15)) * floatAmp;

        model.rotation.y =
          (config.rotationY ?? 0) +
          Math.sin(elapsed * (motion?.swaySpeed ?? 0.5)) * swayAmp;
      }

      if (renderer && scene && camera) {
        renderer.render(scene, camera);
      }
    };

    const animate = () => {
      frameIdRef.current = requestAnimationFrame(animate);
      renderCurrentFrame();
    };

    const onResize = () => {
      const mountEl = mountRef.current;
      const renderer = rendererRef.current;
      const camera = cameraRef.current;
      if (!mountEl || !renderer || !camera) return;

      const config = PORTRAIT_CONFIGS[character];
      const width = mountEl.clientWidth || 320;
      const height = mountEl.clientHeight || 420;
      const isMobile = width < 500;
      const cameraConfig = isMobile ? config.mobileCamera : config.desktopCamera;

      camera.aspect = width / height;
      camera.fov = cameraConfig.fov;
      camera.position.set(...cameraConfig.position);
      camera.lookAt(...cameraConfig.lookAt);
      camera.updateProjectionMatrix();

      renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1 : 1.25));
      renderer.setSize(width, height);

      const bgPlane = bgPlaneRef.current;
      const bgMaterial = bgMaterialRef.current;

      if (bgPlane && bgMaterial) {
        bgPlane.geometry.dispose();
        bgPlane.geometry = new THREE.PlaneGeometry(
          isMobile ? 18 : 24,
          isMobile ? 24 : 32
        );
        bgPlane.position.set(0, isMobile ? 15.6 : 16, -8);

        bgMaterial.uniforms.uGlowCenter.value.set(
          0.5,
          isMobile
            ? (config.background.glowCenterYMobile ?? 0.56)
            : (config.background.glowCenterYDesktop ?? 0.66)
        );

        bgMaterial.uniforms.uGlowRadius.value = isMobile
          ? (config.background.glowRadiusMobile ?? 0.3)
          : (config.background.glowRadiusDesktop ?? 0.24);

        bgMaterial.uniforms.uGlowStrength.value = isMobile
          ? (config.background.glowStrengthMobile ?? 1.0)
          : (config.background.glowStrengthDesktop ?? 0.9);
      }
    };

    clockRef.current = new THREE.Clock();

    buildSceneForCurrentCharacter();
    loadCharacterModel();
    animate();

    window.addEventListener("resize", onResize);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameIdRef.current);
      window.removeEventListener("resize", onResize);

      Object.values(actionsRef.current).forEach((action) => action?.stop());
      actionsRef.current = {};
      mixerRef.current?.stopAllAction();
      mixerRef.current = null;

      if (modelRef.current && sceneRef.current) {
        sceneRef.current.remove(modelRef.current);
      }

      disposeObject3D(modelRef.current);
      modelRef.current = null;
      basePoseRef.current = null;

      bgPlaneRef.current?.geometry.dispose();
      bgMaterialRef.current?.dispose();
      bgPlaneRef.current = null;
      bgMaterialRef.current = null;

      rendererRef.current?.dispose();

      if (
        mount &&
        rendererRef.current?.domElement &&
        mount.contains(rendererRef.current.domElement)
      ) {
        mount.removeChild(rendererRef.current.domElement);
      }

      rendererRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
    };
  }, [character, debugBones]);

  useEffect(() => {
    const model = modelRef.current;
    if (!model) return;

    const config = PORTRAIT_CONFIGS[character];

    applyMoodToModel(model, mood, config);

    const hasMoodVmd =
      !!config.moodMotions?.[mood]?.modelVmdPaths?.filter(Boolean).length;

    if (!hasMoodVmd && basePoseRef.current) {
      applyPoseToModel(model, mood, config, basePoseRef.current);
    }

    const nextAction = actionsRef.current[mood];
    const prevMood = currentMoodRef.current;
    const prevAction = actionsRef.current[prevMood];

    if (prevMood !== mood) {
      if (prevAction && prevAction !== nextAction) {
        prevAction.fadeOut(0.28);
      }

      if (nextAction) {
        nextAction.reset();
        nextAction.setEffectiveTimeScale(1);
        nextAction.setEffectiveWeight(1);
        nextAction.fadeIn(0.28);
        nextAction.play();
      }

      currentMoodRef.current = mood;
    }
  }, [character, mood]);

  return (
    <div
      ref={mountRef}
      className={className}
      style={{
        width: "100%",
        height: "100%",
        minHeight: 0,
        background: "transparent",
        overflow: "hidden",
        borderRadius: "18px",
        position: "relative",
      }}
    >
      {isModelLoading && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(10, 12, 18, 0.22)",
            color: "rgba(255,255,255,0.78)",
            fontSize: 12,
            letterSpacing: "0.04em",
            zIndex: 2,
            backdropFilter: "blur(2px)",
          }}
        >
          loading model...
        </div>
      )}
    </div>
  );
}
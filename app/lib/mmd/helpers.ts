import * as THREE from "three";
import type {
  PortraitCharacterConfig,
  PortraitMood,
  BonePoseRule,
} from "./portraitConfig";

export function findMorphIndex(mesh: THREE.Mesh, names: string[]) {
  const dict = (mesh as any).morphTargetDictionary as
    | Record<string, number>
    | undefined;

  if (!dict) return -1;

  const entries = Object.entries(dict);

  for (const target of names) {
    const loweredTarget = target.toLowerCase();

    for (const [key, value] of entries) {
      if (key.toLowerCase().includes(loweredTarget)) {
        return value;
      }
    }
  }

  return -1;
}

export function setMorph(mesh: THREE.Mesh, names: string[], value: number) {
  const influences = (mesh as any).morphTargetInfluences as number[] | undefined;
  if (!influences) return;

  const idx = findMorphIndex(mesh, names);
  if (idx >= 0) influences[idx] = value;
}

export function resetAllMorphs(root: THREE.Object3D) {
  root.traverse((obj: THREE.Object3D) => {
    const mesh = obj as THREE.Mesh;
    const influences = (mesh as any).morphTargetInfluences as number[] | undefined;
    if (!influences) return;

    for (let i = 0; i < influences.length; i++) {
      influences[i] = 0;
    }
  });
}

export function applyMoodToModel(
  root: THREE.Object3D,
  mood: PortraitMood,
  config: PortraitCharacterConfig
) {
  resetAllMorphs(root);

  const morphs = config.moods[mood] ?? [];

  root.traverse((obj: THREE.Object3D) => {
    const mesh = obj as THREE.Mesh;
    if (!(mesh as any).morphTargetInfluences) return;

    for (const morph of morphs) {
      setMorph(mesh, morph.names, morph.value);
    }
  });
}

export function tuneMeshMaterial(mesh: THREE.Mesh, config: PortraitCharacterConfig) {
  const materialConfig = config.material;

  const tuneMaterial = (mat: any) => {
    if (!mat) return;

    mat.transparent = true;
    mat.depthWrite = true;

    if ("roughness" in mat && materialConfig?.roughness != null) {
      mat.roughness = materialConfig.roughness;
    }

    if ("metalness" in mat && materialConfig?.metalness != null) {
      mat.metalness = materialConfig.metalness;
    }

    if ("envMapIntensity" in mat && materialConfig?.envMapIntensity != null) {
      mat.envMapIntensity = materialConfig.envMapIntensity;
    }

    if ("alphaTest" in mat && materialConfig?.alphaTest != null) {
      mat.alphaTest = materialConfig.alphaTest;
    }

    if (mat.color && materialConfig?.colorMultiply != null) {
      mat.color.multiplyScalar(materialConfig.colorMultiply);
    }

    if ("emissive" in mat && mat.emissive?.setRGB && materialConfig?.emissive) {
      mat.emissive.setRGB(
        materialConfig.emissive[0],
        materialConfig.emissive[1],
        materialConfig.emissive[2]
      );
    }

    mat.needsUpdate = true;
  };

  if (Array.isArray(mesh.material)) {
    mesh.material.forEach(tuneMaterial);
  } else {
    tuneMaterial(mesh.material);
  }
}



function disposeMaterialTextures(material: any) {
  const textureKeys = [
    "map",
    "alphaMap",
    "aoMap",
    "bumpMap",
    "displacementMap",
    "emissiveMap",
    "envMap",
    "lightMap",
    "metalnessMap",
    "normalMap",
    "roughnessMap",
    "specularMap",
    "gradientMap",
  ];

  for (const key of textureKeys) {
    const tex = material?.[key];
    if (tex && typeof tex.dispose === "function") {
      tex.dispose();
    }
  }
}

export function disposeObject3D(root: THREE.Object3D | null) {
  if (!root) return;

  root.traverse((obj: THREE.Object3D) => {
    const mesh = obj as THREE.Mesh;

    if ((mesh as any).geometry) {
      (mesh as any).geometry.dispose?.();
    }

    const material = (mesh as any).material;

    if (Array.isArray(material)) {
      material.forEach((m) => {
        disposeMaterialTextures(m);
        m?.dispose?.();
      });
    } else if (material) {
      disposeMaterialTextures(material);
      material.dispose?.();
    }
  });
}

export function findBone(
  root: THREE.Object3D,
  names: string[]
): THREE.Bone | null {
  let found: THREE.Bone | null = null;

  root.traverse((obj) => {
    if (found) return;

    const bone = obj as THREE.Bone;
    if (!(bone as any).isBone) return;

    const boneName = (bone.name || "").toLowerCase();
    for (const n of names) {
      if (boneName.includes(n.toLowerCase())) {
        found = bone;
        return;
      }
    }
  });

  return found;
}

export function captureBasePose(root: THREE.Object3D) {
  const base = new Map<
    string,
    {
      rotation: THREE.Euler;
      position: THREE.Vector3;
      quaternion: THREE.Quaternion;
    }
  >();

  root.traverse((obj) => {
    const bone = obj as THREE.Bone;
    if (!(bone as any).isBone) return;

    base.set(bone.uuid, {
      rotation: bone.rotation.clone(),
      position: bone.position.clone(),
      quaternion: bone.quaternion.clone(),
    });
  });

  return base;
}

export function resetPoseToBase(
  root: THREE.Object3D,
  basePose: Map<
    string,
    {
      rotation: THREE.Euler;
      position: THREE.Vector3;
      quaternion: THREE.Quaternion;
    }
  >
) {
  root.traverse((obj) => {
    const bone = obj as THREE.Bone;
    if (!(bone as any).isBone) return;

    const saved = basePose.get(bone.uuid);
    if (!saved) return;

    bone.position.copy(saved.position);
    bone.quaternion.copy(saved.quaternion);
    bone.rotation.copy(saved.rotation);
  });
}
export function applyBonePoseRules(
  root: THREE.Object3D,
  rules: BonePoseRule[]
) {
  for (const rule of rules) {
    const bone = findBone(root, rule.boneNames);
    if (!bone) continue;

    if (rule.rotation) {
      const [rx, ry, rz] = rule.rotation;
      bone.rotation.x += rx;
      bone.rotation.y += ry;
      bone.rotation.z += rz;
    }

    if (rule.position) {
      const [px, py, pz] = rule.position;
      bone.position.x += px;
      bone.position.y += py;
      bone.position.z += pz;
    }
  }
}
export function applyPoseToModel(
  root: THREE.Object3D,
  mood: PortraitMood,
  config: PortraitCharacterConfig,
  basePose: Map<
    string,
    {
      rotation: THREE.Euler;
      position: THREE.Vector3;
      quaternion: THREE.Quaternion;
    }
  >
) {
  resetPoseToBase(root, basePose);

  const idleRules: BonePoseRule[] = config.idlePose ?? [];
  const moodRules: BonePoseRule[] = config.poses?.[mood] ?? [];

  applyBonePoseRules(root, idleRules);
  applyBonePoseRules(root, moodRules);
}

export function findMorphIndexExact(mesh: THREE.Mesh, names: string[]) {
  const dict = (mesh as any).morphTargetDictionary as
    | Record<string, number>
    | undefined;

  if (!dict) return -1;

  for (const target of names) {
    if (target in dict) {
      return dict[target];
    }
  }

  return -1;
}
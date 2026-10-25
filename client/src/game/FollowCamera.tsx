import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../store/gameStore';

const CAMERA_OFFSET = new THREE.Vector3(0, 8, -14);
const CAMERA_LOOK_AHEAD = new THREE.Vector3(0, 0, 6);

/** Third-person follow camera that trails the bowl */
export function FollowCamera() {
  const { camera } = useThree();
  const { bowl } = useGameStore();
  const targetPos = useRef(new THREE.Vector3());
  const targetLook = useRef(new THREE.Vector3());

  useFrame((_state, delta) => {
    // Compute desired camera position in world space
    const bowlPos = new THREE.Vector3(bowl.posX, bowl.bobY, bowl.posZ);

    const q = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      -bowl.angle
    );

    const worldOffset = CAMERA_OFFSET.clone().applyQuaternion(q);
    const desiredPos = bowlPos.clone().add(worldOffset);

    const lookAhead = CAMERA_LOOK_AHEAD.clone().applyQuaternion(q);
    const desiredLook = bowlPos.clone().add(lookAhead);

    // Smooth lerp (snap immediately on reset / large delta)
    if (targetPos.current.distanceTo(desiredPos) > 6.0) {
      targetPos.current.copy(desiredPos);
      targetLook.current.copy(desiredLook);
    } else {
      const lerpFactor = 1 - Math.pow(0.001, delta);
      targetPos.current.lerp(desiredPos, lerpFactor * 0.85);
      targetLook.current.lerp(desiredLook, lerpFactor * 0.85);
    }

    camera.position.copy(targetPos.current);
    camera.lookAt(targetLook.current);
  });

  return null;
}

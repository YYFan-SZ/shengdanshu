import React, { useRef, useMemo, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getScatterPosition, getTreePosition } from '../utils/math';
import { PositionData } from '../types';

interface OrnamentsProps {
  count: number;
  type: 'SPHERE' | 'BOX' | 'DIAMOND';
  color: string;
  metalness: number;
  roughness: number;
  scaleBase: number;
  animationProgress: React.MutableRefObject<number>;
  emissive?: string;
  emissiveIntensity?: number;
}

const tempObject = new THREE.Object3D();
const tempVec3 = new THREE.Vector3();

const Ornaments: React.FC<OrnamentsProps> = ({ 
  count, 
  type, 
  color, 
  metalness, 
  roughness, 
  scaleBase,
  animationProgress,
  emissive = "#000000",
  emissiveIntensity = 0
}) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  // Pre-calculate dual positions
  const data = useMemo(() => {
    const items: PositionData[] = [];
    for (let i = 0; i < count; i++) {
      // Tree position: More randomized within the cone volume than foliage
      // We use a subset of the tree shape logic but perhaps slightly offset or sparser
      const treePos = getTreePosition(11, 4.5, 6, i, count);
      // Add slight noise to tree pos so ornaments aren't perfectly aligned on the spiral
      treePos[0] += (Math.random() - 0.5) * 0.5;
      treePos[1] += (Math.random() - 0.5) * 0.5;
      treePos[2] += (Math.random() - 0.5) * 0.5;

      const scatterPos = getScatterPosition(12);
      
      items.push({
        treePosition: treePos,
        scatterPosition: scatterPos,
        rotation: [Math.random() * Math.PI, Math.random() * Math.PI, 0],
        scale: scaleBase * (0.8 + Math.random() * 0.4),
        speed: 0.2 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2
      });
    }
    return items;
  }, [count, scaleBase]);

  useLayoutEffect(() => {
    // Initial paint to avoid flicker
    if(meshRef.current) {
        data.forEach((item, i) => {
            tempObject.position.set(...item.scatterPosition);
            tempObject.rotation.set(...item.rotation);
            tempObject.scale.setScalar(item.scale);
            tempObject.updateMatrix();
            meshRef.current!.setMatrixAt(i, tempObject.matrix);
        });
        meshRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [data]);

  useFrame((state) => {
    if (!meshRef.current) return;

    const progress = animationProgress.current;
    const time = state.clock.elapsedTime;
    
    // Smoothstep interpolation for nicer ease
    const t = progress * progress * (3 - 2 * progress); 

    data.forEach((item, i) => {
        // Interpolate Position
        const x = THREE.MathUtils.lerp(item.scatterPosition[0], item.treePosition[0], t);
        const y = THREE.MathUtils.lerp(item.scatterPosition[1], item.treePosition[1], t);
        const z = THREE.MathUtils.lerp(item.scatterPosition[2], item.treePosition[2], t);

        // Add floaty motion when scattered
        const floatFactor = 1.0 - t; // 1 when scattered, 0 when tree
        const floatY = Math.sin(time * item.speed + item.phase) * floatFactor * 0.5;
        const floatRot = time * item.speed * 0.2 * floatFactor;

        tempObject.position.set(x, y + floatY, z);
        
        // Rotate: Spin freely when scattered, settle when tree
        tempObject.rotation.set(
            item.rotation[0] + floatRot, 
            item.rotation[1] + floatRot, 
            item.rotation[2]
        );

        // Scale: pop in effect slightly? No, keep constant for solidity.
        tempObject.scale.setScalar(item.scale);

        tempObject.updateMatrix();
        meshRef.current!.setMatrixAt(i, tempObject.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  // Select geometry based on type
  const geometry = useMemo(() => {
      switch(type) {
          case 'BOX': return new THREE.BoxGeometry(1, 1, 1);
          case 'DIAMOND': return new THREE.OctahedronGeometry(1);
          case 'SPHERE': 
          default: return new THREE.SphereGeometry(1, 16, 16);
      }
  }, [type]);

  return (
    <instancedMesh ref={meshRef} args={[geometry, undefined, count]} castShadow receiveShadow>
      <meshStandardMaterial 
        color={color} 
        roughness={roughness} 
        metalness={metalness}
        emissive={emissive}
        emissiveIntensity={emissiveIntensity}
        envMapIntensity={1.5}
      />
    </instancedMesh>
  );
};

export default Ornaments;

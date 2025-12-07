import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getScatterPosition } from '../utils/math';

interface StarTopperProps {
  animationProgress: React.MutableRefObject<number>;
}

const StarTopper: React.FC<StarTopperProps> = ({ animationProgress }) => {
  const groupRef = useRef<THREE.Group>(null);
  
  // Pre-calculate positions
  const { posScatter, posTree } = useMemo(() => {
    // Tree top is roughly at y=6 based on Foliage settings.
    // Adjusted height for smaller scale to sit nicely on tip.
    return {
      posTree: new THREE.Vector3(0, 6.8, 0),
      posScatter: new THREE.Vector3(...getScatterPosition(20))
    };
  }, []);

  useFrame((state) => {
    if (!groupRef.current) return;
    
    const progress = animationProgress.current;
    // Easing: easeInOutCubic
    const t = progress < 0.5 
        ? 4 * progress * progress * progress 
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

    // Interpolate Position
    groupRef.current.position.lerpVectors(posScatter, posTree, t);

    // Rotation Animation
    const time = state.clock.elapsedTime;
    // Spin fast when scattered, slow and majestic when on tree
    const spinSpeed = THREE.MathUtils.lerp(2.0, 0.5, t);
    groupRef.current.rotation.y = time * spinSpeed;
    groupRef.current.rotation.z = Math.sin(time * 0.5) * 0.1 * (1 - t); // Wobbly when scattered

    // Scale Animation (Pop effect on arrival)
    // Simple pulse
    const pulse = 1 + Math.sin(time * 2) * 0.05;
    // Reduced max scale from 1.2 to 0.65 to fit better
    const baseScale = THREE.MathUtils.lerp(0.2, 0.65, t);
    groupRef.current.scale.setScalar(baseScale * pulse);
  });

  const goldMaterial = (
    <meshStandardMaterial 
      color="#FFD700" 
      emissive="#FFD700"
      emissiveIntensity={2.5}
      toneMapped={false}
      roughness={0.1}
      metalness={1}
    />
  );

  return (
    <group ref={groupRef}>
      {/* Central Light Source */}
      <pointLight intensity={10} distance={15} decay={2} color="#ffebb8" />

      {/* Composite Geometry for a 3D "North Star" shape */}
      
      {/* 1. Vertical Spike */}
      <mesh scale={[0.3, 2.5, 0.3]}>
        <octahedronGeometry args={[1, 0]} />
        {goldMaterial}
      </mesh>

      {/* 2. Horizontal X Spike */}
      <mesh scale={[2.5, 0.3, 0.3]}>
        <octahedronGeometry args={[1, 0]} />
        {goldMaterial}
      </mesh>

      {/* 3. Horizontal Z Spike */}
      <mesh scale={[0.3, 0.3, 2.5]}>
        <octahedronGeometry args={[1, 0]} />
        {goldMaterial}
      </mesh>

      {/* 4. Central Core Mass */}
      <mesh scale={[0.8, 0.8, 0.8]}>
        <octahedronGeometry args={[1, 0]} />
        {goldMaterial}
      </mesh>

      {/* 5. Diagonal Rays (Smaller) */}
      <group rotation={[0, Math.PI / 4, 0]}>
         <mesh scale={[1.5, 0.2, 0.2]}>
            <octahedronGeometry args={[1, 0]} />
            <meshStandardMaterial 
              color="#FFFDD0" 
              emissive="#FFFDD0" 
              emissiveIntensity={2} 
              toneMapped={false} 
            />
         </mesh>
         <mesh scale={[0.2, 0.2, 1.5]}>
            <octahedronGeometry args={[1, 0]} />
            <meshStandardMaterial 
              color="#FFFDD0" 
              emissive="#FFFDD0" 
              emissiveIntensity={2} 
              toneMapped={false} 
            />
         </mesh>
      </group>
    </group>
  );
};

export default StarTopper;
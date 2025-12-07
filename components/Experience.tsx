import React, { useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, OrbitControls, PerspectiveCamera, Stars } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import Foliage from './Foliage';
import Ornaments from './Ornaments';
import Ribbons from './Ribbons';
import StarTopper from './StarTopper';
import { TreeState } from '../types';

interface ExperienceProps {
  treeState: TreeState;
}

const SceneContent: React.FC<ExperienceProps> = ({ treeState }) => {
  const animationProgress = useRef(0);
  const targetProgress = treeState === TreeState.TREE_SHAPE ? 1 : 0;
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    // Smoothly interpolate current progress towards target
    // Using a simple dampening logic: value += (target - value) * speed
    const speed = 2.0 * delta; 
    const diff = targetProgress - animationProgress.current;
    
    if (Math.abs(diff) > 0.001) {
        animationProgress.current += diff * speed;
    } else {
        animationProgress.current = targetProgress;
    }

    // Slowly rotate the entire tree group for presentation
    if (groupRef.current && treeState === TreeState.TREE_SHAPE) {
        groupRef.current.rotation.y += delta * 0.1;
    }
  });

  return (
    <>
      <group ref={groupRef}>
        {/* The Foliage: Thousands of glowing particles */}
        <Foliage count={6000} treeState={treeState} animationProgress={animationProgress} />
        
        {/* Luxury Ribbons System - Wrapping the tree */}
        <Ribbons animationProgress={animationProgress} />

        {/* Red Metallic Balls */}
        <Ornaments 
          count={150} 
          type="SPHERE" 
          color="#C41E3A" 
          metalness={0.9} 
          roughness={0.1} 
          scaleBase={0.35} 
          animationProgress={animationProgress} 
        />
        
        {/* Gold Balls */}
        <Ornaments 
          count={150} 
          type="SPHERE" 
          color="#FFD700" 
          metalness={1.0} 
          roughness={0.15} 
          scaleBase={0.25} 
          animationProgress={animationProgress} 
        />

        {/* Gift Boxes (Emerald/Gold) */}
        <Ornaments 
          count={40} 
          type="BOX" 
          color="#046307" 
          metalness={0.4} 
          roughness={0.4} 
          scaleBase={0.45} 
          animationProgress={animationProgress} 
        />

        {/* Glowing Lights (Diamonds) */}
        <Ornaments 
          count={200} 
          type="DIAMOND" 
          color="#FFFDD0" 
          metalness={0.1} 
          roughness={0.1} 
          scaleBase={0.15} 
          animationProgress={animationProgress} 
          emissive="#FFD700"
          emissiveIntensity={4}
        />
        
        {/* Star Topper */}
        <StarTopper animationProgress={animationProgress} />
      </group>
    </>
  );
};

const Experience: React.FC<ExperienceProps> = ({ treeState }) => {
  return (
    <Canvas 
      dpr={[1, 2]} 
      gl={{ antialias: false, toneMapping: THREE.ReinhardToneMapping, toneMappingExposure: 1.5 }}
    >
      <PerspectiveCamera makeDefault position={[0, 2, 25]} fov={45} />
      <OrbitControls 
        enablePan={false} 
        minPolarAngle={Math.PI / 4} 
        maxPolarAngle={Math.PI / 1.8}
        maxDistance={40}
        minDistance={10}
        autoRotate={treeState === TreeState.SCATTERED}
        autoRotateSpeed={0.5}
      />
      
      {/* Lighting */}
      <ambientLight intensity={0.2} color="#001100" />
      <spotLight position={[10, 20, 10]} angle={0.3} penumbra={1} intensity={20} color="#fffaed" castShadow />
      <pointLight position={[-10, 5, -10]} intensity={10} color="#C41E3A" />
      <pointLight position={[10, -5, 10]} intensity={10} color="#FFD700" />
      
      {/* Background Ambience */}
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      <Environment preset="city" />

      <SceneContent treeState={treeState} />

      {/* Post Processing for Cinematic Bloom */}
      <EffectComposer disableNormalPass>
        <Bloom luminanceThreshold={1.2} mipmapBlur intensity={1.5} radius={0.6} />
        <Vignette eskil={false} offset={0.1} darkness={1.1} />
      </EffectComposer>
    </Canvas>
  );
};

export default Experience;

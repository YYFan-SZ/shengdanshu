import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TreeState } from '../types';
import { getScatterPosition, getTreePosition } from '../utils/math';

interface FoliageProps {
  count: number;
  treeState: TreeState;
  animationProgress: React.MutableRefObject<number>;
}

// Custom Shader for high-performance interpolation on GPU
const FoliageShaderMaterial = {
  uniforms: {
    uTime: { value: 0 },
    uProgress: { value: 0 },
    uColorHigh: { value: new THREE.Color('#2e8b57') }, // Sea Green
    uColorLow: { value: new THREE.Color('#013220') },  // Dark Green
    uColorGold: { value: new THREE.Color('#FFD700') }, // Gold
  },
  vertexShader: `
    uniform float uTime;
    uniform float uProgress;
    attribute vec3 aScatterPos;
    attribute vec3 aTreePos;
    attribute float aRandom;
    
    varying float vAlpha;
    varying vec3 vColor;
    
    // Simplex noise function (simplified)
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
    float snoise(vec3 v) {
      const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
      const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
      vec3 i  = floor(v + dot(v, C.yyy) );
      vec3 x0 = v - i + dot(i, C.xxx) ;
      vec3 g = step(x0.yzx, x0.xyz);
      vec3 l = 1.0 - g;
      vec3 i1 = min( g.xyz, l.zxy );
      vec3 i2 = max( g.xyz, l.zxy );
      vec3 x1 = x0 - i1 + C.xxx;
      vec3 x2 = x0 - i2 + C.yyy;
      vec3 x3 = x0 - D.yyy;
      i = mod289(i);
      vec4 p = permute( permute( permute(
                i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
              + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
              + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
      float n_ = 0.142857142857;
      vec3  ns = n_ * D.wyz - D.xzx;
      vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
      vec4 x_ = floor(j * ns.z);
      vec4 y_ = floor(j - 7.0 * x_ );
      vec4 x = x_ *ns.x + ns.yyyy;
      vec4 y = y_ *ns.x + ns.yyyy;
      vec4 h = 1.0 - abs(x) - abs(y);
      vec4 b0 = vec4( x.xy, y.xy );
      vec4 b1 = vec4( x.zw, y.zw );
      vec4 s0 = floor(b0)*2.0 + 1.0;
      vec4 s1 = floor(b1)*2.0 + 1.0;
      vec4 sh = -step(h, vec4(0.0));
      vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
      vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
      vec3 p0 = vec3(a0.xy,h.x);
      vec3 p1 = vec3(a0.zw,h.y);
      vec3 p2 = vec3(a1.xy,h.z);
      vec3 p3 = vec3(a1.zw,h.w);
      vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
      p0 *= norm.x;
      p1 *= norm.y;
      p2 *= norm.z;
      p3 *= norm.w;
      vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
      m = m * m;
      return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                                    dot(p2,x2), dot(p3,x3) ) );
    }

    void main() {
      // Interpolate position
      vec3 pos = mix(aScatterPos, aTreePos, uProgress);
      
      // Add floating noise when scattered (uProgress is 0)
      // When uProgress is 1 (Tree), noise is minimized but adds subtle breathing
      float floatIntensity = mix(2.0, 0.1, uProgress);
      float noiseVal = snoise(pos * 0.5 + uTime * 0.5);
      
      pos += vec3(0.0, noiseVal * floatIntensity * 0.5, 0.0);
      
      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      
      // Dynamic size: larger when scattered to fill space, smaller and sharper when in tree
      float size = mix(15.0, 8.0, uProgress);
      gl_PointSize = size * (10.0 / -mvPosition.z);
      gl_Position = projectionMatrix * mvPosition;
      
      // Color interpolation
      vColor = mix(uColorLow, uColorHigh, aRandom);
      // Add gold sparkle based on noise
      if (noiseVal > 0.6) {
          vColor = mix(vColor, uColorGold, 0.8);
      }
      
      vAlpha = mix(0.6, 0.9, uProgress); // More solid when tree
    }
  `,
  fragmentShader: `
    varying float vAlpha;
    varying vec3 vColor;
    
    void main() {
      // Circular particle
      vec2 coord = gl_PointCoord - vec2(0.5);
      float r = length(coord);
      if (r > 0.5) discard;
      
      // Soft glow edge
      float glow = 1.0 - (r * 2.0);
      glow = pow(glow, 1.5);
      
      gl_FragColor = vec4(vColor, vAlpha * glow);
    }
  `
};

const Foliage: React.FC<FoliageProps> = ({ count, animationProgress }) => {
  const shaderRef = useRef<THREE.ShaderMaterial>(null);
  
  const { positionsScatter, positionsTree, randoms } = useMemo(() => {
    const pScatter = new Float32Array(count * 3);
    const pTree = new Float32Array(count * 3);
    const rands = new Float32Array(count);
    
    for (let i = 0; i < count; i++) {
      const scatter = getScatterPosition(15);
      const tree = getTreePosition(12, 5, 6, i, count);
      
      pScatter.set(scatter, i * 3);
      pTree.set(tree, i * 3);
      rands[i] = Math.random();
    }
    
    return {
      positionsScatter: pScatter,
      positionsTree: pTree,
      randoms: rands
    };
  }, [count]);

  useFrame((state) => {
    if (shaderRef.current) {
      shaderRef.current.uniforms.uTime.value = state.clock.elapsedTime;
      shaderRef.current.uniforms.uProgress.value = animationProgress.current;
      // Add a slight rotation to the whole system for grandeur
      // We can do this via group rotation or in shader. 
    }
  });

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position" // Required for Threejs internals even if we override in shader
          count={count}
          array={positionsTree} // Just to provide bounding box roughly
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aScatterPos"
          count={count}
          array={positionsScatter}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aTreePos"
          count={count}
          array={positionsTree}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aRandom"
          count={count}
          array={randoms}
          itemSize={1}
        />
      </bufferGeometry>
      <shaderMaterial
        ref={shaderRef}
        attach="material"
        args={[FoliageShaderMaterial]}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

export default Foliage;

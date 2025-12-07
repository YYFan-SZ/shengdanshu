import React, { useMemo, useRef, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TreeState } from '../types';

interface RibbonProps {
  color: string;
  width: number;
  length: number; // Number of segments
  radius: number;
  turns: number;
  yStart: number;
  yEnd: number;
  animationProgress: React.MutableRefObject<number>;
  phaseOffset: number;
  scatterRadius: number;
}

const Ribbon: React.FC<RibbonProps> = ({ 
  color, 
  width, 
  length: segments, 
  radius, 
  turns, 
  yStart, 
  yEnd, 
  animationProgress,
  phaseOffset,
  scatterRadius 
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // 1. Generate Paths (Tree Spiral & Scattered Curve)
  const paths = useMemo(() => {
    const treePath: THREE.Vector3[] = [];
    const scatterPath: THREE.Vector3[] = [];
    
    // --- Generate Tree Spiral Path ---
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const y = THREE.MathUtils.lerp(yStart, yEnd, t);
      
      // Cone radius at height y (assuming tree height ~12, base ~5)
      // We map y from roughly -6 to 6 in world space
      // Normalized height 0 (bottom) to 1 (top)
      const hNorm = (y - yStart) / (yEnd - yStart);
      
      // Taper radius: wider at bottom, narrow at top
      const currentRadius = THREE.MathUtils.lerp(radius, 0.5, hNorm);
      
      const angle = t * Math.PI * 2 * turns + phaseOffset;
      
      const x = Math.cos(angle) * currentRadius;
      const z = Math.sin(angle) * currentRadius;
      
      treePath.push(new THREE.Vector3(x, y, z));
    }

    // --- Generate Scatter Chaotic Path ---
    // Create a random CatmullRom curve inside a sphere
    const controlPoints = [];
    const numControlPoints = 5;
    for(let i=0; i<numControlPoints; i++) {
        // Random point in sphere
        const r = scatterRadius * Math.cbrt(Math.random());
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        
        controlPoints.push(new THREE.Vector3(
            r * Math.sin(phi) * Math.cos(theta),
            r * Math.sin(phi) * Math.sin(theta),
            r * Math.cos(phi)
        ));
    }
    const curve = new THREE.CatmullRomCurve3(controlPoints);
    // Sample points
    for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        scatterPath.push(curve.getPoint(t));
    }

    return { treePath, scatterPath };
  }, [radius, turns, yStart, yEnd, segments, phaseOffset, scatterRadius]);

  // 2. Initial Geometry Setup
  useLayoutEffect(() => {
    if (!meshRef.current) return;
    
    // We construct a strip of triangles (Plane-like topology)
    // Vertices count: (segments + 1) * 2 (Left and Right side of ribbon)
    const vertexCount = (segments + 1) * 2;
    const positions = new Float32Array(vertexCount * 3);
    const indices = [];
    const uvs = new Float32Array(vertexCount * 2);

    for (let i = 0; i <= segments; i++) {
        // Two vertices per segment step (Left and Right)
        // We just init with 0, animation loop handles actual position
        
        // UVs
        const v = i / segments;
        uvs[i * 4 + 0] = 0; // Left u
        uvs[i * 4 + 1] = v; // Left v
        uvs[i * 4 + 2] = 1; // Right u
        uvs[i * 4 + 3] = v; // Right v

        // Indices (Two triangles per segment square)
        if (i < segments) {
            const base = i * 2;
            // Triangle 1
            indices.push(base, base + 1, base + 2);
            // Triangle 2
            indices.push(base + 1, base + 3, base + 2);
        }
    }

    const geometry = meshRef.current.geometry;
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geometry.setIndex(indices);

  }, [segments]);

  // 3. Animation Loop
  useFrame((state) => {
    if (!meshRef.current) return;
    
    const geo = meshRef.current.geometry;
    const posAttr = geo.attributes.position;
    const progress = animationProgress.current;
    
    // Easing
    const t = progress * progress * (3 - 2 * progress);
    const time = state.clock.elapsedTime;

    const { treePath, scatterPath } = paths;
    const tempVec = new THREE.Vector3();
    const binormal = new THREE.Vector3(0, 1, 0); // Up vector approx
    const tangent = new THREE.Vector3();
    const normal = new THREE.Vector3();
    const sideOffset = new THREE.Vector3();

    for (let i = 0; i <= segments; i++) {
        // A. Interpolate Center Point
        const pScatter = scatterPath[i];
        const pTree = treePath[i];

        // Add "Floating" noise to scatter position
        const floatFactor = 1.0 - t;
        const noiseX = Math.sin(time * 0.5 + i * 0.1 + phaseOffset) * floatFactor * 1.5;
        const noiseY = Math.cos(time * 0.3 + i * 0.1) * floatFactor * 1.5;
        const noiseZ = Math.sin(time * 0.4 + i * 0.05) * floatFactor * 1.5;

        const cx = THREE.MathUtils.lerp(pScatter.x + noiseX, pTree.x, t);
        const cy = THREE.MathUtils.lerp(pScatter.y + noiseY, pTree.y, t);
        const cz = THREE.MathUtils.lerp(pScatter.z + noiseZ, pTree.z, t);

        // B. Calculate Orientation (Ribbon Facing)
        // We approximate tangent by looking at next point (or prev)
        const iNext = Math.min(i + 1, segments);
        const iPrev = Math.max(i - 1, 0);
        
        // Simple tangent calc
        // Note: For perfect ribbons we'd interpolate the tangent too, but recalculating 
        // from the interpolated curve is more physically consistent.
        
        // However, calculating tangent from the noisy interpolated points can be jittery.
        // Smoother approach: Interpolate the tangent vectors of the source curves? 
        // Let's stick to simple finite difference on the calculated points for now.
        
        // Actually, let's use the tree tangent as the 'target' and a random tangent for scatter?
        // No, finite difference on the result `cx,cy,cz` is robust enough if resolution is high.
        
        // We need the next point's position to get tangent
        let nScatter = scatterPath[iNext];
        let nTree = treePath[iNext];
        // Add same noise to next point for consistency
        let nNoiseX = Math.sin(time * 0.5 + iNext * 0.1 + phaseOffset) * floatFactor * 1.5;
        let nNoiseY = Math.cos(time * 0.3 + iNext * 0.1) * floatFactor * 1.5;
        let nNoiseZ = Math.sin(time * 0.4 + iNext * 0.05) * floatFactor * 1.5;
        
        let nx = THREE.MathUtils.lerp(nScatter.x + nNoiseX, nTree.x, t);
        let ny = THREE.MathUtils.lerp(nScatter.y + nNoiseY, nTree.y, t);
        let nz = THREE.MathUtils.lerp(nScatter.z + nNoiseZ, nTree.z, t);
        
        if (i === segments) {
            // For last point, look backward
            // (We can just reuse previous tangent or handle properly, simple hack: use previous calc)
            // But let's just reverse the vector from prev point
             const pPrevScatter = scatterPath[iPrev];
             const pPrevTree = treePath[iPrev];
             // ... calc prev pos ...
             // Optimization: Just don't crash, let tangent be same as prev segment.
             // We'll update tangent based on i and iNext, unless i=segments.
             tangent.set(0,1,0); // Fallback
        } else {
             tangent.set(nx - cx, ny - cy, nz - cz).normalize();
        }

        // C. Calculate Side Vector (Perpendicular to Tangent and Up)
        // For a ribbon on a tree, we want it facing "outward" or "upward"?
        // Usually ribbons lie flat against the cone. The cone normal is roughly (x, 0, z) normalized + some Y tilt.
        // Let's try: Cross Tangent with Up(0,1,0) -> Horizontal Normal.
        // Then Cross Tangent with Horizontal -> Surface Normal.
        
        // Binormal ~ Right vector
        normal.crossVectors(tangent, binormal).normalize(); // Points roughly horizontal
        
        // Twist logic: Rotate the normal around the tangent? 
        // Add some twist based on t
        const twistAngle = i * 0.1 * (1-t) * 5; // Twist more when scattered
        if (twistAngle !== 0) {
             normal.applyAxisAngle(tangent, twistAngle);
        }

        sideOffset.copy(normal).multiplyScalar(width * 0.5);

        // D. Set Vertices
        // Vertex 1 (Left)
        posAttr.setXYZ(i * 2, cx + sideOffset.x, cy + sideOffset.y, cz + sideOffset.z);
        // Vertex 2 (Right)
        posAttr.setXYZ(i * 2 + 1, cx - sideOffset.x, cy - sideOffset.y, cz - sideOffset.z);
    }
    
    posAttr.needsUpdate = true;
    geo.computeVertexNormals();
  });

  return (
    <mesh ref={meshRef}>
      <bufferGeometry />
      <meshStandardMaterial 
        color={color} 
        side={THREE.DoubleSide} 
        metalness={1.0}
        roughness={0.25}
        emissive={color}
        emissiveIntensity={0.2}
      />
    </mesh>
  );
};

interface RibbonsProps {
    animationProgress: React.MutableRefObject<number>;
}

const Ribbons: React.FC<RibbonsProps> = ({ animationProgress }) => {
  return (
    <group>
      {/* Gold Ribbons - Wider, Main spiral */}
      <Ribbon 
        color="#FFD700" 
        width={0.6} 
        length={120} 
        radius={6} 
        turns={3.5} 
        yStart={-5} 
        yEnd={7} 
        animationProgress={animationProgress}
        phaseOffset={0}
        scatterRadius={15}
      />
      <Ribbon 
        color="#F0C000" 
        width={0.5} 
        length={120} 
        radius={5.5} 
        turns={3.5} 
        yStart={-5} 
        yEnd={7} 
        animationProgress={animationProgress}
        phaseOffset={Math.PI} // Opposite side
        scatterRadius={15}
      />
       <Ribbon 
        color="#D4AF37" 
        width={0.4} 
        length={100} 
        radius={6.5} 
        turns={2.5} 
        yStart={-6} 
        yEnd={4} 
        animationProgress={animationProgress}
        phaseOffset={Math.PI * 0.5}
        scatterRadius={18}
      />

      {/* Red Ribbons - Thinner, Accent */}
      <Ribbon 
        color="#C41E3A" 
        width={0.25} 
        length={150} 
        radius={6.2} 
        turns={4.5} 
        yStart={-6} 
        yEnd={8} 
        animationProgress={animationProgress}
        phaseOffset={Math.PI * 0.25}
        scatterRadius={12}
      />
      <Ribbon 
        color="#8B0000" 
        width={0.3} 
        length={150} 
        radius={5.8} 
        turns={4.5} 
        yStart={-5.5} 
        yEnd={8} 
        animationProgress={animationProgress}
        phaseOffset={Math.PI * 1.25}
        scatterRadius={12}
      />
    </group>
  );
};

export default Ribbons;

import * as THREE from 'three';

// Helper to generate a random point on a sphere surface or volume
export const getScatterPosition = (radius: number): [number, number, number] => {
  const u = Math.random();
  const v = Math.random();
  const theta = 2 * Math.PI * u;
  const phi = Math.acos(2 * v - 1);
  const r = Math.cbrt(Math.random()) * radius; // Volume distribution
  
  const x = r * Math.sin(phi) * Math.cos(theta);
  const y = r * Math.sin(phi) * Math.sin(theta);
  const z = r * Math.cos(phi);
  return [x, y, z];
};

// Helper to generate a point within a cone volume (Christmas Tree shape)
export const getTreePosition = (
  height: number, 
  baseRadius: number, 
  yOffset: number,
  index: number,
  total: number
): [number, number, number] => {
  // Use Golden Angle for spiral distribution to prevent visible lines
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const y = (index / total) * height; // Linear vertical distribution
  const radiusAtHeight = (1 - y / height) * baseRadius;
  
  // Add some thickness variance so it's not a perfect hollow shell
  const r = radiusAtHeight * Math.sqrt(Math.random()); 
  const theta = index * goldenAngle;

  const x = r * Math.cos(theta);
  const z = r * Math.sin(theta);
  
  return [x, y - yOffset, z];
};

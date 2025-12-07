export enum TreeState {
  SCATTERED = 'SCATTERED',
  TREE_SHAPE = 'TREE_SHAPE'
}

export interface PositionData {
  treePosition: [number, number, number];
  scatterPosition: [number, number, number];
  rotation: [number, number, number];
  scale: number;
  speed: number; // For floating animation
  phase: number; // For floating offset
}

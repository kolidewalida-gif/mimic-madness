// Type declarations for @react-three/fiber and @react-three/drei
// These are declared to suppress TypeScript errors for JSX elements
declare module '@react-three/fiber' {
  export const Canvas: React.FC<any>;
  export function useFrame(callback: (state: any, delta: number) => void): void;
  export function useThree(): any;
}

declare module '@react-three/drei' {
  export const OrbitControls: React.FC<any>;
  export const Text: React.FC<any>;
  export const RoundedBox: React.FC<any>;
  export const PerspectiveCamera: React.FC<any>;
  export const Float: React.FC<any>;
  export const MeshWobbleMaterial: React.FC<any>;
  export const Environment: React.FC<any>;
}

declare namespace JSX {
  interface IntrinsicElements {
    group: any;
    mesh: any;
    boxGeometry: any;
    meshStandardMaterial: any;
    cylinderGeometry: any;
    sphereGeometry: any;
    planeGeometry: any;
    pointLight: any;
    ambientLight: any;
    directionalLight: any;
    spotLight: any;
    fog: any;
  }
}

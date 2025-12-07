import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, Ring, Stars } from '@react-three/drei';
import * as THREE from 'three';

// Sun with glow effect
const Sun = () => {
  const sunRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (sunRef.current) {
      sunRef.current.rotation.y = state.clock.elapsedTime * 0.1;
    }
  });

  return (
    <group position={[0, 0, 0]}>
      <Sphere ref={sunRef} args={[2.5, 64, 64]}>
        <meshBasicMaterial color="#FDB813" />
      </Sphere>
      <Sphere args={[2.8, 32, 32]}>
        <meshBasicMaterial color="#FFA500" transparent opacity={0.4} />
      </Sphere>
      <Sphere args={[3.2, 32, 32]}>
        <meshBasicMaterial color="#FF8C00" transparent opacity={0.2} />
      </Sphere>
      <Sphere args={[4, 32, 32]}>
        <meshBasicMaterial color="#FF6600" transparent opacity={0.1} />
      </Sphere>
      <pointLight color="#FFA500" intensity={2} distance={100} />
    </group>
  );
};

// Planet component
interface PlanetProps {
  orbitRadius: number;
  size: number;
  speed: number;
  color: string;
  emissiveColor?: string;
  hasRing?: boolean;
  ringColor?: string;
  initialAngle: number;
}

const Planet = ({ orbitRadius, size, speed, color, emissiveColor, hasRing, ringColor, initialAngle }: PlanetProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const planetRef = useRef<THREE.Mesh>(null);
  const angleRef = useRef(initialAngle);

  useFrame((state, delta) => {
    angleRef.current += speed * delta;
    
    if (groupRef.current) {
      groupRef.current.position.x = Math.cos(angleRef.current) * orbitRadius;
      groupRef.current.position.z = Math.sin(angleRef.current) * orbitRadius;
    }
    
    if (planetRef.current) {
      planetRef.current.rotation.y += delta * 0.5;
    }
  });

  return (
    <group ref={groupRef}>
      <Sphere ref={planetRef} args={[size, 32, 32]}>
        <meshStandardMaterial 
          color={color} 
          emissive={emissiveColor || color}
          emissiveIntensity={0.1}
          roughness={0.8}
          metalness={0.2}
        />
      </Sphere>
      {hasRing && (
        <Ring args={[size * 1.4, size * 2.2, 64]} rotation={[Math.PI / 2.5, 0, 0]}>
          <meshBasicMaterial color={ringColor || '#C9A86C'} transparent opacity={0.7} side={THREE.DoubleSide} />
        </Ring>
      )}
    </group>
  );
};

// Orbit ring using Ring geometry instead of Line
const OrbitRing = ({ radius }: { radius: number }) => {
  return (
    <Ring args={[radius - 0.02, radius + 0.02, 128]} rotation={[-Math.PI / 2, 0, 0]}>
      <meshBasicMaterial color="#ffffff" transparent opacity={0.1} side={THREE.DoubleSide} />
    </Ring>
  );
};

// Main solar system scene
const SolarSystemScene = () => {
  const sceneRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (sceneRef.current) {
      sceneRef.current.rotation.y = state.clock.elapsedTime * 0.02;
    }
  });

  const planets = [
    { orbitRadius: 4, size: 0.2, speed: 0.8, color: '#A0522D', initialAngle: 0 },
    { orbitRadius: 5.5, size: 0.35, speed: 0.6, color: '#DEB887', initialAngle: 2.1 },
    { orbitRadius: 7, size: 0.4, speed: 0.45, color: '#4169E1', emissiveColor: '#1E90FF', initialAngle: 4.2 },
    { orbitRadius: 9, size: 0.3, speed: 0.35, color: '#CD5C5C', initialAngle: 1.5 },
    { orbitRadius: 12, size: 0.9, speed: 0.2, color: '#D2691E', initialAngle: 3.7 },
    { orbitRadius: 16, size: 0.8, speed: 0.12, color: '#F4A460', hasRing: true, ringColor: '#C9A86C', initialAngle: 5.2 },
    { orbitRadius: 20, size: 0.5, speed: 0.08, color: '#87CEEB', initialAngle: 0.8 },
    { orbitRadius: 24, size: 0.45, speed: 0.05, color: '#4682B4', initialAngle: 2.9 },
  ];

  return (
    <group ref={sceneRef} rotation={[0.4, 0, 0.1]}>
      <Sun />
      
      {planets.map((planet, i) => (
        <OrbitRing key={`orbit-${i}`} radius={planet.orbitRadius} />
      ))}
      
      {planets.map((planet, i) => (
        <Planet key={`planet-${i}`} {...planet} />
      ))}
    </group>
  );
};

export const SpaceBackground = () => {
  return (
    <div className="fixed inset-0 -z-10 bg-[#0a0a12]">
      <Canvas
        camera={{ position: [0, 15, 35], fov: 50 }}
        gl={{ antialias: true }}
        dpr={[1, 2]}
      >
        <color attach="background" args={['#0a0a12']} />
        <ambientLight intensity={0.1} />
        <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />
        <SolarSystemScene />
      </Canvas>
    </div>
  );
};

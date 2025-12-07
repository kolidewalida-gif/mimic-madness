import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, Ring, Stars } from '@react-three/drei';
import * as THREE from 'three';

// Sun with intense glow and light rays
const Sun = () => {
  const sunRef = useRef<THREE.Mesh>(null);
  const raysRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (sunRef.current) {
      sunRef.current.rotation.y = state.clock.elapsedTime * 0.1;
    }
    if (raysRef.current) {
      raysRef.current.rotation.z = state.clock.elapsedTime * 0.05;
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* Core sun */}
      <Sphere ref={sunRef} args={[3, 64, 64]}>
        <meshBasicMaterial color="#FFEE00" />
      </Sphere>
      
      {/* Inner glow layers */}
      <Sphere args={[3.5, 48, 48]}>
        <meshBasicMaterial color="#FFCC00" transparent opacity={0.6} />
      </Sphere>
      <Sphere args={[4.2, 48, 48]}>
        <meshBasicMaterial color="#FF9900" transparent opacity={0.4} />
      </Sphere>
      <Sphere args={[5.5, 48, 48]}>
        <meshBasicMaterial color="#FF6600" transparent opacity={0.25} />
      </Sphere>
      <Sphere args={[8, 32, 32]}>
        <meshBasicMaterial color="#FF4400" transparent opacity={0.12} />
      </Sphere>
      <Sphere args={[12, 32, 32]}>
        <meshBasicMaterial color="#FF2200" transparent opacity={0.06} />
      </Sphere>
      
      {/* Light rays */}
      <group ref={raysRef}>
        {[...Array(12)].map((_, i) => (
          <mesh key={i} rotation={[0, 0, (i * Math.PI) / 6]} position={[0, 0, -0.1]}>
            <planeGeometry args={[0.8, 50]} />
            <meshBasicMaterial color="#FFAA44" transparent opacity={0.06} side={THREE.DoubleSide} />
          </mesh>
        ))}
      </group>
      
      {/* Main light */}
      <pointLight color="#FF9944" intensity={3} distance={200} decay={1} />
      <pointLight color="#FFCC88" intensity={1.5} distance={100} decay={2} />
    </group>
  );
};

// Lens flare effect
const LensFlares = () => {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (groupRef.current) {
      const t = state.clock.elapsedTime;
      groupRef.current.children.forEach((child, i) => {
        if (child instanceof THREE.Mesh) {
          const scale = 1 + Math.sin(t * 2 + i * 0.5) * 0.3;
          child.scale.setScalar(scale);
        }
      });
    }
  });

  const flares = [
    { pos: [5, 3, -5], size: 2, color: '#FF8844', opacity: 0.15 },
    { pos: [-8, -4, -8], size: 3, color: '#FFAA66', opacity: 0.1 },
    { pos: [12, -6, -12], size: 1.5, color: '#FFCC88', opacity: 0.12 },
    { pos: [-15, 8, -10], size: 2.5, color: '#FF6633', opacity: 0.08 },
    { pos: [20, 5, -15], size: 1, color: '#FFFFFF', opacity: 0.2 },
  ];

  return (
    <group ref={groupRef}>
      {flares.map((flare, i) => (
        <Sphere key={i} args={[flare.size, 16, 16]} position={flare.pos as [number, number, number]}>
          <meshBasicMaterial color={flare.color} transparent opacity={flare.opacity} />
        </Sphere>
      ))}
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

  useFrame((_, delta) => {
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
          emissiveIntensity={0.15}
          roughness={0.7}
          metalness={0.3}
        />
      </Sphere>
      {/* Planet glow */}
      <Sphere args={[size * 1.15, 16, 16]}>
        <meshBasicMaterial color={emissiveColor || color} transparent opacity={0.1} />
      </Sphere>
      {hasRing && (
        <>
          <Ring args={[size * 1.4, size * 2.2, 64]} rotation={[Math.PI / 2.5, 0, 0]}>
            <meshBasicMaterial color={ringColor || '#C9A86C'} transparent opacity={0.7} side={THREE.DoubleSide} />
          </Ring>
          <Ring args={[size * 1.2, size * 1.4, 64]} rotation={[Math.PI / 2.5, 0, 0]}>
            <meshBasicMaterial color="#DDBB88" transparent opacity={0.4} side={THREE.DoubleSide} />
          </Ring>
        </>
      )}
    </group>
  );
};

// Orbit ring
const OrbitRing = ({ radius }: { radius: number }) => {
  return (
    <Ring args={[radius - 0.03, radius + 0.03, 128]} rotation={[-Math.PI / 2, 0, 0]}>
      <meshBasicMaterial color="#FFAA66" transparent opacity={0.08} side={THREE.DoubleSide} />
    </Ring>
  );
};

// Main solar system scene
const SolarSystemScene = () => {
  const sceneRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (sceneRef.current) {
      sceneRef.current.rotation.y = state.clock.elapsedTime * 0.015;
    }
  });

  const planets = [
    { orbitRadius: 5, size: 0.25, speed: 0.7, color: '#8899AA', emissiveColor: '#667788', initialAngle: 0 },
    { orbitRadius: 7, size: 0.4, speed: 0.5, color: '#DDBB77', emissiveColor: '#CCAA66', initialAngle: 2.1 },
    { orbitRadius: 9, size: 0.45, speed: 0.4, color: '#4488CC', emissiveColor: '#3377BB', initialAngle: 4.2 },
    { orbitRadius: 12, size: 0.35, speed: 0.3, color: '#CC6644', emissiveColor: '#BB5533', initialAngle: 1.5 },
    { orbitRadius: 16, size: 1.1, speed: 0.18, color: '#DDAA66', emissiveColor: '#CC9955', initialAngle: 3.7 },
    { orbitRadius: 22, size: 0.95, speed: 0.1, color: '#EEDD88', emissiveColor: '#DDCC77', hasRing: true, ringColor: '#D4B896', initialAngle: 5.2 },
    { orbitRadius: 28, size: 0.6, speed: 0.07, color: '#88DDDD', emissiveColor: '#77CCCC', initialAngle: 0.8 },
    { orbitRadius: 34, size: 0.55, speed: 0.04, color: '#5577DD', emissiveColor: '#4466CC', initialAngle: 2.9 },
  ];

  return (
    <group ref={sceneRef} rotation={[0.35, 0.1, 0.05]}>
      <Sun />
      <LensFlares />
      
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
    <div className="fixed inset-0 -z-10">
      {/* Warm gradient overlay for atmosphere */}
      <div 
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 120% 100% at 50% 40%, rgba(255, 100, 30, 0.15) 0%, transparent 50%),
            radial-gradient(ellipse 80% 60% at 50% 50%, rgba(255, 150, 50, 0.1) 0%, transparent 40%),
            radial-gradient(ellipse 60% 40% at 45% 45%, rgba(255, 200, 100, 0.08) 0%, transparent 30%)
          `
        }}
      />
      
      <Canvas
        camera={{ position: [0, 12, 50], fov: 75 }}
        gl={{ antialias: true }}
        dpr={[1, 2]}
      >
        <color attach="background" args={['#060610']} />
        <fog attach="fog" args={['#0a0815', 60, 150]} />
        <ambientLight intensity={0.08} color="#FFAA88" />
        <Stars radius={150} depth={80} count={5000} factor={5} saturation={0.2} fade speed={0.5} />
        <SolarSystemScene />
      </Canvas>
    </div>
  );
};

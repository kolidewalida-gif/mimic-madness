import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sphere } from '@react-three/drei';
import * as THREE from 'three';

interface PlanetProps {
  radius: number;
  orbitRadius: number;
  speed: number;
  color: string;
  emissive?: string;
  size: number;
  hasRing?: boolean;
}

const Planet = ({ radius, orbitRadius, speed, color, emissive, size, hasRing }: PlanetProps) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const angle = useRef(Math.random() * Math.PI * 2);

  useFrame((_, delta) => {
    angle.current += speed * delta;
    if (meshRef.current) {
      meshRef.current.position.x = Math.cos(angle.current) * orbitRadius;
      meshRef.current.position.z = Math.sin(angle.current) * orbitRadius;
      meshRef.current.rotation.y += delta * 0.5;
    }
    if (ringRef.current) {
      ringRef.current.position.x = Math.cos(angle.current) * orbitRadius;
      ringRef.current.position.z = Math.sin(angle.current) * orbitRadius;
    }
  });

  return (
    <>
      <mesh ref={meshRef}>
        <sphereGeometry args={[size, 32, 32]} />
        <meshStandardMaterial 
          color={color} 
          emissive={emissive || color}
          emissiveIntensity={0.3}
        />
      </mesh>
      {hasRing && (
        <mesh ref={ringRef} rotation={[Math.PI / 2.5, 0, 0]}>
          <ringGeometry args={[size * 1.4, size * 2, 32]} />
          <meshStandardMaterial 
            color={color} 
            transparent 
            opacity={0.5} 
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </>
  );
};

const OrbitPath = ({ radius }: { radius: number }) => {
  const points = useMemo(() => {
    const pts = [];
    for (let i = 0; i <= 64; i++) {
      const angle = (i / 64) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
    }
    return pts;
  }, [radius]);

  const geometry = useMemo(() => {
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [points]);

  return (
    <primitive object={new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: '#00d4ff', opacity: 0.15, transparent: true }))} />
  );
};

const Sun = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.1;
    }
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[0.8, 32, 32]} />
      <meshStandardMaterial 
        color="#ffaa00" 
        emissive="#ff6600"
        emissiveIntensity={1}
      />
      <pointLight intensity={2} distance={50} decay={2} />
    </mesh>
  );
};

const SolarSystemScene = () => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.02;
    }
  });

  const planets = [
    { orbitRadius: 1.8, speed: 0.8, color: '#a0a0a0', size: 0.15 }, // Mercury
    { orbitRadius: 2.5, speed: 0.6, color: '#e6c87a', size: 0.2 }, // Venus
    { orbitRadius: 3.3, speed: 0.4, color: '#4a90d9', size: 0.22, emissive: '#1a4a7a' }, // Earth
    { orbitRadius: 4.2, speed: 0.3, color: '#d45d5d', size: 0.18 }, // Mars
    { orbitRadius: 5.5, speed: 0.15, color: '#d4a574', size: 0.45 }, // Jupiter
    { orbitRadius: 7, speed: 0.1, color: '#e8d4a8', size: 0.4, hasRing: true }, // Saturn
    { orbitRadius: 8.5, speed: 0.07, color: '#7dd4d4', size: 0.3 }, // Uranus
    { orbitRadius: 10, speed: 0.05, color: '#4a6dd4', size: 0.28 }, // Neptune
  ];

  return (
    <group ref={groupRef} rotation={[0.3, 0, 0.1]}>
      <Sun />
      {planets.map((planet, index) => (
        <OrbitPath key={`orbit-${index}`} radius={planet.orbitRadius} />
      ))}
      {planets.map((planet, index) => (
        <Planet
          key={`planet-${index}`}
          radius={planet.size}
          orbitRadius={planet.orbitRadius}
          speed={planet.speed}
          color={planet.color}
          emissive={planet.emissive}
          size={planet.size}
          hasRing={planet.hasRing}
        />
      ))}
    </group>
  );
};

export const SolarSystem3D = () => {
  return (
    <div className="absolute top-0 right-0 w-[600px] h-[600px] pointer-events-none" style={{ transform: 'translate(20%, -20%)' }}>
      <Canvas
        camera={{ position: [0, 8, 18], fov: 45 }}
        style={{ background: 'transparent' }}
        gl={{ alpha: true, antialias: true }}
      >
        <ambientLight intensity={0.2} />
        <SolarSystemScene />
      </Canvas>
    </div>
  );
};

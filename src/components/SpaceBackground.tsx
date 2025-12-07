import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// Twinkling stars
const Stars = ({ count = 500 }) => {
  const mesh = useRef<THREE.Points>(null);
  
  const [positions, sizes] = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const radius = 20 + Math.random() * 80;
      
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
      
      sizes[i] = Math.random() * 2 + 0.5;
    }
    
    return [positions, sizes];
  }, [count]);

  useFrame(({ clock }) => {
    if (mesh.current) {
      const time = clock.getElapsedTime();
      const geometry = mesh.current.geometry;
      const sizeAttr = geometry.getAttribute('size') as THREE.BufferAttribute;
      
      for (let i = 0; i < count; i++) {
        sizeAttr.array[i] = sizes[i] * (0.8 + 0.4 * Math.sin(time * 2 + i * 0.1));
      }
      sizeAttr.needsUpdate = true;
    }
  });

  return (
    <points ref={mesh}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={count}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.15}
        color="#ffcc66"
        transparent
        opacity={0.9}
        sizeAttenuation
      />
    </points>
  );
};

// Glowing sun
const Sun = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  
  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = clock.getElapsedTime() * 0.05;
    }
    if (glowRef.current) {
      const scale = 1 + Math.sin(clock.getElapsedTime() * 2) * 0.05;
      glowRef.current.scale.setScalar(scale);
    }
  });

  return (
    <group position={[0, 0, -10]}>
      {/* Core sun */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[3, 64, 64]} />
        <meshBasicMaterial color="#ffcc00" />
      </mesh>
      
      {/* Inner glow */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[3.5, 32, 32]} />
        <meshBasicMaterial 
          color="#ff9900" 
          transparent 
          opacity={0.4}
        />
      </mesh>
      
      {/* Outer glow */}
      <mesh>
        <sphereGeometry args={[5, 32, 32]} />
        <meshBasicMaterial 
          color="#ff6600" 
          transparent 
          opacity={0.15}
        />
      </mesh>
      
      {/* Largest glow */}
      <mesh>
        <sphereGeometry args={[8, 32, 32]} />
        <meshBasicMaterial 
          color="#ff4400" 
          transparent 
          opacity={0.05}
        />
      </mesh>
      
      <pointLight color="#ff9944" intensity={3} distance={100} decay={1} />
    </group>
  );
};

// Orbiting planet
interface PlanetProps {
  orbitRadius: number;
  size: number;
  speed: number;
  color: string;
  hasRing?: boolean;
  initialAngle?: number;
}

const Planet = ({ orbitRadius, size, speed, color, hasRing, initialAngle = 0 }: PlanetProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const angle = useRef(initialAngle);

  useFrame((_, delta) => {
    angle.current += speed * delta;
    if (groupRef.current) {
      groupRef.current.position.x = Math.cos(angle.current) * orbitRadius;
      groupRef.current.position.z = Math.sin(angle.current) * orbitRadius - 10;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh>
        <sphereGeometry args={[size, 32, 32]} />
        <meshStandardMaterial 
          color={color}
          emissive={color}
          emissiveIntensity={0.2}
        />
      </mesh>
      {hasRing && (
        <mesh rotation={[Math.PI / 2.5, 0, 0]}>
          <ringGeometry args={[size * 1.4, size * 2.2, 64]} />
          <meshBasicMaterial 
            color="#d4a574" 
            transparent 
            opacity={0.6} 
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
};

// Nebula dust particles
const NebulaDust = () => {
  const mesh = useRef<THREE.Points>(null);
  
  const positions = useMemo(() => {
    const positions = new Float32Array(2000 * 3);
    for (let i = 0; i < 2000; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 100;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 60;
      positions[i * 3 + 2] = -20 - Math.random() * 60;
    }
    return positions;
  }, []);

  useFrame(({ clock }) => {
    if (mesh.current) {
      mesh.current.rotation.z = clock.getElapsedTime() * 0.01;
    }
  });

  return (
    <points ref={mesh}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={2000}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.3}
        color="#ff6633"
        transparent
        opacity={0.3}
        sizeAttenuation
      />
    </points>
  );
};

// Camera animation
const CameraAnimation = () => {
  const { camera } = useThree();
  
  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    camera.position.x = Math.sin(time * 0.1) * 2;
    camera.position.y = Math.cos(time * 0.15) * 1;
  });

  return null;
};

// Main scene
const SpaceScene = () => {
  const planets = [
    { orbitRadius: 6, size: 0.3, speed: 0.4, color: '#8899aa', initialAngle: 0 },
    { orbitRadius: 8, size: 0.5, speed: 0.3, color: '#ddbb77', initialAngle: 1.5 },
    { orbitRadius: 10, size: 0.55, speed: 0.25, color: '#4488cc', initialAngle: 3 },
    { orbitRadius: 12, size: 0.4, speed: 0.2, color: '#cc6644', initialAngle: 4.5 },
    { orbitRadius: 15, size: 1.2, speed: 0.12, color: '#ddaa77', initialAngle: 2 },
    { orbitRadius: 19, size: 1, speed: 0.08, color: '#eedd99', hasRing: true, initialAngle: 5 },
    { orbitRadius: 23, size: 0.7, speed: 0.06, color: '#88cccc', initialAngle: 1 },
    { orbitRadius: 27, size: 0.65, speed: 0.04, color: '#5566cc', initialAngle: 3.5 },
  ];

  return (
    <>
      <color attach="background" args={['#0a0505']} />
      <fog attach="fog" args={['#1a0a00', 30, 100]} />
      
      <ambientLight intensity={0.1} />
      
      <NebulaDust />
      <Stars count={600} />
      <Sun />
      
      {planets.map((planet, i) => (
        <Planet key={i} {...planet} />
      ))}
      
      <CameraAnimation />
    </>
  );
};

export const SpaceBackground = () => {
  return (
    <div className="fixed inset-0 -z-10">
      {/* Gradient overlay for warmth */}
      <div 
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 80% 60% at 60% 30%, rgba(255, 120, 50, 0.15) 0%, transparent 60%),
            radial-gradient(ellipse 60% 40% at 70% 40%, rgba(255, 80, 0, 0.1) 0%, transparent 50%),
            linear-gradient(to bottom, transparent 0%, rgba(10, 5, 5, 0.5) 100%)
          `
        }}
      />
      
      <Canvas
        camera={{ position: [0, 0, 20], fov: 60 }}
        gl={{ antialias: true, alpha: false }}
      >
        <SpaceScene />
      </Canvas>
    </div>
  );
};

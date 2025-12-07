import { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// Bright twinkling stars with multiple colors
const Stars = ({ count = 800 }) => {
  const mesh = useRef<THREE.Points>(null);
  
  const [positions, colors, sizes] = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    
    const starColors = [
      new THREE.Color('#ffffff'),
      new THREE.Color('#ffffcc'),
      new THREE.Color('#ffcc66'),
      new THREE.Color('#ff9944'),
      new THREE.Color('#aaccff'),
    ];
    
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const radius = 15 + Math.random() * 85;
      
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
      
      const color = starColors[Math.floor(Math.random() * starColors.length)];
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
      
      sizes[i] = Math.random() * 3 + 1;
    }
    
    return [positions, colors, sizes];
  }, [count]);

  useFrame(({ clock }) => {
    if (mesh.current) {
      const time = clock.getElapsedTime();
      const geometry = mesh.current.geometry;
      const sizeAttr = geometry.getAttribute('size') as THREE.BufferAttribute;
      
      for (let i = 0; i < count; i++) {
        const baseSize = sizes[i];
        sizeAttr.array[i] = baseSize * (0.6 + 0.6 * Math.sin(time * 3 + i * 0.5));
      }
      sizeAttr.needsUpdate = true;
    }
  });

  return (
    <points ref={mesh}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={count} array={colors} itemSize={3} />
        <bufferAttribute attach="attributes-size" count={count} array={sizes} itemSize={1} />
      </bufferGeometry>
      <pointsMaterial size={0.2} vertexColors transparent opacity={1} sizeAttenuation />
    </points>
  );
};

// Lens flare effect
const LensFlare = () => {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame(({ clock }) => {
    if (groupRef.current) {
      const time = clock.getElapsedTime();
      groupRef.current.children.forEach((child, i) => {
        if (child instanceof THREE.Mesh) {
          const scale = 1 + Math.sin(time * 2 + i) * 0.2;
          child.scale.setScalar(scale);
        }
      });
    }
  });

  const flares = [
    { size: 12, opacity: 0.08, color: '#ff6600', pos: [0, 0, -8] },
    { size: 8, opacity: 0.1, color: '#ff9933', pos: [2, -1, -6] },
    { size: 5, opacity: 0.15, color: '#ffcc00', pos: [-3, 2, -10] },
    { size: 3, opacity: 0.2, color: '#ffffff', pos: [4, 3, -12] },
    { size: 6, opacity: 0.1, color: '#ff4400', pos: [-5, -2, -9] },
  ];

  return (
    <group ref={groupRef} position={[8, 5, -15]}>
      {flares.map((flare, i) => (
        <mesh key={i} position={flare.pos as [number, number, number]}>
          <circleGeometry args={[flare.size, 32]} />
          <meshBasicMaterial color={flare.color} transparent opacity={flare.opacity} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
};

// Glowing sun with corona
const Sun = () => {
  const coreRef = useRef<THREE.Mesh>(null);
  const coronaRef = useRef<THREE.Group>(null);
  
  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    if (coreRef.current) {
      coreRef.current.rotation.y = time * 0.03;
    }
    if (coronaRef.current) {
      coronaRef.current.rotation.z = time * 0.02;
      coronaRef.current.children.forEach((child, i) => {
        if (child instanceof THREE.Mesh) {
          const scale = 1 + Math.sin(time * 1.5 + i * 0.8) * 0.15;
          child.scale.setScalar(scale);
        }
      });
    }
  });

  return (
    <group position={[10, 6, -25]}>
      {/* Core */}
      <mesh ref={coreRef}>
        <sphereGeometry args={[4, 64, 64]} />
        <meshBasicMaterial color="#ffee00" />
      </mesh>
      
      {/* Corona layers */}
      <group ref={coronaRef}>
        <mesh>
          <sphereGeometry args={[5, 48, 48]} />
          <meshBasicMaterial color="#ffcc00" transparent opacity={0.6} />
        </mesh>
        <mesh>
          <sphereGeometry args={[6.5, 48, 48]} />
          <meshBasicMaterial color="#ff9900" transparent opacity={0.4} />
        </mesh>
        <mesh>
          <sphereGeometry args={[8.5, 48, 48]} />
          <meshBasicMaterial color="#ff6600" transparent opacity={0.25} />
        </mesh>
        <mesh>
          <sphereGeometry args={[12, 48, 48]} />
          <meshBasicMaterial color="#ff4400" transparent opacity={0.12} />
        </mesh>
        <mesh>
          <sphereGeometry args={[18, 32, 32]} />
          <meshBasicMaterial color="#ff2200" transparent opacity={0.05} />
        </mesh>
      </group>
      
      {/* Light rays */}
      {[...Array(8)].map((_, i) => (
        <mesh key={i} rotation={[0, 0, (i * Math.PI) / 4]}>
          <planeGeometry args={[1.5, 40]} />
          <meshBasicMaterial color="#ffaa33" transparent opacity={0.08} side={THREE.DoubleSide} />
        </mesh>
      ))}
      
      <pointLight color="#ff9944" intensity={5} distance={150} decay={1} />
    </group>
  );
};

// Detailed planet with atmosphere
interface PlanetProps {
  orbitRadius: number;
  size: number;
  speed: number;
  color: string;
  atmosphere?: string;
  hasRing?: boolean;
  ringColor?: string;
  initialAngle?: number;
  orbitCenter?: [number, number, number];
}

const Planet = ({ 
  orbitRadius, size, speed, color, atmosphere, hasRing, ringColor = '#ddaa77', initialAngle = 0, 
  orbitCenter = [10, 6, -25] 
}: PlanetProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const angle = useRef(initialAngle);

  useFrame((_, delta) => {
    angle.current += speed * delta;
    if (groupRef.current) {
      groupRef.current.position.x = orbitCenter[0] + Math.cos(angle.current) * orbitRadius;
      groupRef.current.position.y = orbitCenter[1] + Math.sin(angle.current * 0.3) * 2;
      groupRef.current.position.z = orbitCenter[2] + Math.sin(angle.current) * orbitRadius;
      groupRef.current.rotation.y += delta * 0.5;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Planet surface */}
      <mesh>
        <sphereGeometry args={[size, 48, 48]} />
        <meshStandardMaterial 
          color={color}
          emissive={color}
          emissiveIntensity={0.15}
          roughness={0.7}
          metalness={0.2}
        />
      </mesh>
      
      {/* Atmosphere glow */}
      {atmosphere && (
        <>
          <mesh>
            <sphereGeometry args={[size * 1.08, 32, 32]} />
            <meshBasicMaterial color={atmosphere} transparent opacity={0.25} />
          </mesh>
          <mesh>
            <sphereGeometry args={[size * 1.15, 32, 32]} />
            <meshBasicMaterial color={atmosphere} transparent opacity={0.1} />
          </mesh>
        </>
      )}
      
      {/* Rings */}
      {hasRing && (
        <group rotation={[Math.PI / 2.2, 0.2, 0]}>
          <mesh>
            <ringGeometry args={[size * 1.5, size * 2.5, 128]} />
            <meshBasicMaterial color={ringColor} transparent opacity={0.7} side={THREE.DoubleSide} />
          </mesh>
          <mesh>
            <ringGeometry args={[size * 1.3, size * 1.5, 128]} />
            <meshBasicMaterial color="#ffddaa" transparent opacity={0.4} side={THREE.DoubleSide} />
          </mesh>
        </group>
      )}
    </group>
  );
};

// Orbit paths with glow
const OrbitPath = ({ radius, center = [10, 6, -25] }: { radius: number; center?: [number, number, number] }) => {
  const points = useMemo(() => {
    const pts = [];
    for (let i = 0; i <= 128; i++) {
      const angle = (i / 128) * Math.PI * 2;
      pts.push(new THREE.Vector3(
        center[0] + Math.cos(angle) * radius,
        center[1],
        center[2] + Math.sin(angle) * radius
      ));
    }
    return pts;
  }, [radius, center]);

  const geometry = useMemo(() => new THREE.BufferGeometry().setFromPoints(points), [points]);

  return (
    <primitive object={new THREE.Line(geometry, new THREE.LineBasicMaterial({ 
      color: '#ff9944', 
      opacity: 0.15, 
      transparent: true 
    }))} />
  );
};

// Nebula clouds with vibrant colors
const NebulaClouds = () => {
  const groupRef = useRef<THREE.Group>(null);
  
  const clouds = useMemo(() => {
    const result = [];
    for (let i = 0; i < 30; i++) {
      result.push({
        position: [
          (Math.random() - 0.5) * 120,
          (Math.random() - 0.5) * 80,
          -30 - Math.random() * 50
        ] as [number, number, number],
        scale: 5 + Math.random() * 20,
        color: ['#ff6600', '#ff3300', '#ff9933', '#cc4400', '#ffaa00'][Math.floor(Math.random() * 5)],
        opacity: 0.03 + Math.random() * 0.08,
      });
    }
    return result;
  }, []);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.z = Math.sin(clock.getElapsedTime() * 0.05) * 0.1;
    }
  });

  return (
    <group ref={groupRef}>
      {clouds.map((cloud, i) => (
        <mesh key={i} position={cloud.position}>
          <sphereGeometry args={[cloud.scale, 16, 16]} />
          <meshBasicMaterial color={cloud.color} transparent opacity={cloud.opacity} />
        </mesh>
      ))}
    </group>
  );
};

// Dust particles
const DustParticles = ({ count = 3000 }) => {
  const mesh = useRef<THREE.Points>(null);
  
  const [positions, colors] = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 150;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 100;
      positions[i * 3 + 2] = -10 - Math.random() * 80;
      
      const brightness = 0.3 + Math.random() * 0.7;
      colors[i * 3] = brightness;
      colors[i * 3 + 1] = brightness * 0.6;
      colors[i * 3 + 2] = brightness * 0.3;
    }
    return [positions, colors];
  }, [count]);

  useFrame(({ clock }) => {
    if (mesh.current) {
      mesh.current.rotation.y = clock.getElapsedTime() * 0.008;
      mesh.current.rotation.x = Math.sin(clock.getElapsedTime() * 0.01) * 0.05;
    }
  });

  return (
    <points ref={mesh}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={count} array={colors} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.15} vertexColors transparent opacity={0.6} sizeAttenuation />
    </points>
  );
};

// Camera subtle movement
const CameraAnimation = () => {
  const { camera } = useThree();
  
  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    camera.position.x = Math.sin(time * 0.08) * 3;
    camera.position.y = Math.cos(time * 0.1) * 2;
    camera.lookAt(10, 5, -25);
  });

  return null;
};

// Main scene
const SpaceScene = () => {
  const planets = [
    { orbitRadius: 8, size: 0.4, speed: 0.5, color: '#aabbcc', initialAngle: 0 },
    { orbitRadius: 11, size: 0.7, speed: 0.35, color: '#eebb66', atmosphere: '#ffcc88', initialAngle: 1.8 },
    { orbitRadius: 14, size: 0.8, speed: 0.28, color: '#4499dd', atmosphere: '#66bbff', initialAngle: 3.2 },
    { orbitRadius: 18, size: 0.55, speed: 0.22, color: '#dd6644', atmosphere: '#ff8866', initialAngle: 5 },
    { orbitRadius: 24, size: 1.8, speed: 0.12, color: '#ddaa66', atmosphere: '#ffcc99', initialAngle: 2.2 },
    { orbitRadius: 32, size: 1.5, speed: 0.08, color: '#eedd88', hasRing: true, ringColor: '#ddbb77', initialAngle: 4.5 },
    { orbitRadius: 40, size: 1, speed: 0.05, color: '#88dddd', atmosphere: '#aaffff', initialAngle: 1.2 },
    { orbitRadius: 48, size: 0.9, speed: 0.035, color: '#5577dd', atmosphere: '#7799ff', initialAngle: 3.8 },
  ];

  return (
    <>
      <color attach="background" args={['#050208']} />
      <fog attach="fog" args={['#150505', 40, 120]} />
      
      <ambientLight intensity={0.15} color="#ffaa88" />
      
      <NebulaClouds />
      <DustParticles count={4000} />
      <Stars count={1000} />
      <LensFlare />
      <Sun />
      
      {planets.map((planet, i) => (
        <OrbitPath key={`orbit-${i}`} radius={planet.orbitRadius} />
      ))}
      
      {planets.map((planet, i) => (
        <Planet key={`planet-${i}`} {...planet} />
      ))}
      
      <CameraAnimation />
    </>
  );
};

export const SpaceBackground = () => {
  return (
    <div className="fixed inset-0 -z-10">
      {/* Vivid gradient overlays */}
      <div 
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 100% 80% at 70% 25%, rgba(255, 100, 20, 0.25) 0%, transparent 50%),
            radial-gradient(ellipse 60% 50% at 75% 35%, rgba(255, 150, 50, 0.2) 0%, transparent 40%),
            radial-gradient(ellipse 40% 30% at 80% 30%, rgba(255, 200, 100, 0.15) 0%, transparent 35%),
            radial-gradient(ellipse 80% 60% at 20% 70%, rgba(100, 50, 150, 0.1) 0%, transparent 50%),
            radial-gradient(ellipse 50% 40% at 10% 80%, rgba(80, 40, 120, 0.08) 0%, transparent 40%)
          `
        }}
      />
      
      {/* Light reflection streaks */}
      <div 
        className="absolute inset-0 z-10 pointer-events-none opacity-30"
        style={{
          background: `
            linear-gradient(135deg, transparent 40%, rgba(255, 180, 100, 0.1) 45%, transparent 50%),
            linear-gradient(145deg, transparent 50%, rgba(255, 200, 150, 0.08) 55%, transparent 60%),
            linear-gradient(125deg, transparent 60%, rgba(255, 220, 180, 0.05) 65%, transparent 70%)
          `
        }}
      />
      
      <Canvas
        camera={{ position: [0, 0, 25], fov: 55 }}
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 2]}
      >
        <SpaceScene />
      </Canvas>
    </div>
  );
};

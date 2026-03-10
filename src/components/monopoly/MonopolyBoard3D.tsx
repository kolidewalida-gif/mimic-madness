import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, RoundedBox, Environment, Float, MeshWobbleMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { BOARD_SPACES, getBoardPosition, TOKEN_COLORS, type TokenType, type PropertyGroup, GROUP_COLORS } from '@/lib/monopolyBoard';

interface MonopolyPlayer3D {
  player_id: string;
  player_name: string;
  token_type: string;
  position: number;
  money: number;
  is_bankrupt: boolean;
  in_jail: boolean;
}

interface Property3D {
  property_index: number;
  owner_id: string | null;
  houses: number;
  is_mortgaged: boolean;
}

interface MonopolyBoard3DProps {
  players: MonopolyPlayer3D[];
  properties: Property3D[];
  lastDice1: number | null;
  lastDice2: number | null;
  animatingTo: number | null;
  currentPlayerId: string;
}

// Individual board tile
function BoardTile({ index, ownerColor, houses }: { index: number; ownerColor?: string; houses: number }) {
  const space = BOARD_SPACES[index];
  const pos = getBoardPosition(index);
  const isCorner = [0, 10, 20, 30].includes(index);
  const tileWidth = isCorner ? 2.2 : 1.6;
  const tileDepth = isCorner ? 2.2 : 2.2;

  const colorHex = space.color || '#e8e8e8';
  const isProperty = space.type === 'property';

  return (
    <group position={[pos.x, 0, pos.z]} rotation={[0, pos.rotation, 0]}>
      {/* Base tile */}
      <RoundedBox args={[tileWidth, 0.15, tileDepth]} radius={0.05} position={[0, 0, 0]}>
        <meshStandardMaterial color="#f5f0e1" metalness={0.1} roughness={0.8} />
      </RoundedBox>

      {/* Property color strip */}
      {isProperty && (
        <RoundedBox args={[tileWidth - 0.05, 0.18, 0.5]} radius={0.03} position={[0, 0.02, -0.85]}>
          <meshStandardMaterial color={colorHex} metalness={0.3} roughness={0.4} />
        </RoundedBox>
      )}

      {/* Owner indicator */}
      {ownerColor && (
        <mesh position={[0, 0.15, 0]}>
          <cylinderGeometry args={[0.15, 0.15, 0.05, 16]} />
          <meshStandardMaterial color={ownerColor} emissive={ownerColor} emissiveIntensity={0.3} />
        </mesh>
      )}

      {/* Houses */}
      {houses > 0 && houses < 5 && Array.from({ length: houses }).map((_, i) => (
        <group key={i} position={[-0.5 + i * 0.35, 0.2, -0.5]}>
          <mesh>
            <boxGeometry args={[0.2, 0.2, 0.2]} />
            <meshStandardMaterial color="#22c55e" />
          </mesh>
          {/* Roof */}
          <mesh position={[0, 0.15, 0]} rotation={[0, 0, Math.PI / 4]}>
            <boxGeometry args={[0.17, 0.17, 0.22]} />
            <meshStandardMaterial color="#16a34a" />
          </mesh>
        </group>
      ))}

      {/* Hotel */}
      {houses === 5 && (
        <group position={[0, 0.25, -0.5]}>
          <mesh>
            <boxGeometry args={[0.4, 0.35, 0.3]} />
            <meshStandardMaterial color="#ef4444" />
          </mesh>
          <mesh position={[0, 0.22, 0]} rotation={[0, 0, Math.PI / 4]}>
            <boxGeometry args={[0.3, 0.3, 0.32]} />
            <meshStandardMaterial color="#dc2626" />
          </mesh>
        </group>
      )}

      {/* Space name */}
      <Text
        position={[0, 0.1, 0.3]}
        fontSize={0.14}
        color="#333"
        anchorX="center"
        anchorY="middle"
        maxWidth={tileWidth - 0.2}
        textAlign="center"
      >
        {space.nameFr.substring(0, 15)}
      </Text>

      {/* Price */}
      {space.price && (
        <Text
          position={[0, 0.1, 0.7]}
          fontSize={0.12}
          color="#666"
          anchorX="center"
          anchorY="middle"
        >
          {`${space.price}$`}
        </Text>
      )}

      {/* Special space icons */}
      {space.type === 'go' && (
        <Text position={[0, 0.2, 0]} fontSize={0.4} anchorX="center" anchorY="middle">
          ➡️
        </Text>
      )}
      {space.type === 'jail' && (
        <Text position={[0, 0.2, 0]} fontSize={0.35} anchorX="center" anchorY="middle">
          🔒
        </Text>
      )}
      {space.type === 'free_parking' && (
        <Text position={[0, 0.2, 0]} fontSize={0.35} anchorX="center" anchorY="middle">
          🅿️
        </Text>
      )}
      {space.type === 'go_to_jail' && (
        <Text position={[0, 0.2, 0]} fontSize={0.35} anchorX="center" anchorY="middle">
          👮
        </Text>
      )}
      {space.type === 'chance' && (
        <Text position={[0, 0.2, 0]} fontSize={0.35} anchorX="center" anchorY="middle">
          ❓
        </Text>
      )}
      {space.type === 'community' && (
        <Text position={[0, 0.2, 0]} fontSize={0.35} anchorX="center" anchorY="middle">
          📦
        </Text>
      )}
      {space.type === 'tax' && (
        <Text position={[0, 0.2, 0]} fontSize={0.35} anchorX="center" anchorY="middle">
          💰
        </Text>
      )}
      {space.type === 'railroad' && (
        <Text position={[0, 0.2, 0]} fontSize={0.35} anchorX="center" anchorY="middle">
          🚂
        </Text>
      )}
      {space.type === 'utility' && (
        <Text position={[0, 0.2, 0]} fontSize={0.3} anchorX="center" anchorY="middle">
          {index === 12 ? '💡' : '💧'}
        </Text>
      )}
    </group>
  );
}

// Player token
function PlayerToken({ player, index, isCurrentPlayer }: { player: MonopolyPlayer3D; index: number; isCurrentPlayer: boolean }) {
  const ref = useRef<THREE.Group>(null);
  const pos = getBoardPosition(player.position);
  const tokenColor = TOKEN_COLORS[player.token_type as TokenType] || '#FF4444';
  
  // Offset tokens so they don't stack
  const offset = index * 0.3 - 0.3;

  useFrame((state) => {
    if (ref.current) {
      const targetY = isCurrentPlayer ? 0.5 + Math.sin(state.clock.elapsedTime * 2) * 0.1 : 0.35;
      ref.current.position.y = THREE.MathUtils.lerp(ref.current.position.y, targetY, 0.05);
      
      // Smooth position transition
      ref.current.position.x = THREE.MathUtils.lerp(ref.current.position.x, pos.x + offset, 0.08);
      ref.current.position.z = THREE.MathUtils.lerp(ref.current.position.z, pos.z + offset, 0.08);
    }
  });

  if (player.is_bankrupt) return null;

  const tokenShape = player.token_type;

  return (
    <group ref={ref} position={[pos.x + offset, 0.35, pos.z + offset]}>
      {/* Token body */}
      {tokenShape === 'car' && (
        <group>
          <mesh>
            <boxGeometry args={[0.35, 0.15, 0.2]} />
            <meshStandardMaterial color={tokenColor} metalness={0.6} roughness={0.2} />
          </mesh>
          <mesh position={[0.05, 0.1, 0]}>
            <boxGeometry args={[0.2, 0.1, 0.18]} />
            <meshStandardMaterial color={tokenColor} metalness={0.6} roughness={0.2} />
          </mesh>
        </group>
      )}
      {tokenShape === 'hat' && (
        <group>
          <mesh>
            <cylinderGeometry args={[0.2, 0.2, 0.05, 16]} />
            <meshStandardMaterial color={tokenColor} metalness={0.5} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.15, 0]}>
            <cylinderGeometry args={[0.12, 0.14, 0.25, 16]} />
            <meshStandardMaterial color={tokenColor} metalness={0.5} roughness={0.3} />
          </mesh>
        </group>
      )}
      {tokenShape === 'shoe' && (
        <mesh>
          <boxGeometry args={[0.3, 0.15, 0.15]} />
          <meshStandardMaterial color={tokenColor} metalness={0.5} roughness={0.3} />
        </mesh>
      )}
      {tokenShape === 'dog' && (
        <group>
          <mesh>
            <sphereGeometry args={[0.12, 16, 16]} />
            <meshStandardMaterial color={tokenColor} metalness={0.4} roughness={0.4} />
          </mesh>
          <mesh position={[0.15, -0.05, 0]}>
            <sphereGeometry args={[0.08, 16, 16]} />
            <meshStandardMaterial color={tokenColor} metalness={0.4} roughness={0.4} />
          </mesh>
        </group>
      )}
      {!['car', 'hat', 'shoe', 'dog'].includes(tokenShape) && (
        <mesh>
          <sphereGeometry args={[0.15, 16, 16]} />
          <meshStandardMaterial color={tokenColor} metalness={0.6} roughness={0.2} />
        </mesh>
      )}

      {/* Name label */}
      <Text
        position={[0, 0.35, 0]}
        fontSize={0.15}
        color={tokenColor}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#000000"
      >
        {player.player_name}
      </Text>

      {/* Current player glow */}
      {isCurrentPlayer && (
        <pointLight color={tokenColor} intensity={2} distance={2} />
      )}
    </group>
  );
}

// Dice
function Dice({ value, position }: { value: number; position: [number, number, number] }) {
  const ref = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
      ref.current.rotation.z = Math.cos(state.clock.elapsedTime * 0.3) * 0.1;
    }
  });

  return (
    <group position={position}>
      <Float speed={2} floatIntensity={0.3}>
        <RoundedBox ref={ref} args={[0.6, 0.6, 0.6]} radius={0.08}>
          <meshStandardMaterial color="#ffffff" metalness={0.1} roughness={0.3} />
        </RoundedBox>
        <Text
          position={[0, 0, 0.32]}
          fontSize={0.35}
          color="#333"
          anchorX="center"
          anchorY="middle"
          fontWeight="bold"
        >
          {value.toString()}
        </Text>
      </Float>
    </group>
  );
}

// Board center
function BoardCenter() {
  return (
    <group position={[0, 0.05, 0]}>
      {/* Center platform */}
      <RoundedBox args={[8, 0.1, 8]} radius={0.1} position={[0, 0, 0]}>
        <meshStandardMaterial color="#c8e6c9" metalness={0.05} roughness={0.9} />
      </RoundedBox>
      
      {/* MONOPOLY text */}
      <Text
        position={[0, 0.15, 0]}
        fontSize={1.2}
        color="#b71c1c"
        anchorX="center"
        anchorY="middle"
        fontWeight="bold"
      >
        MONOPOLY
      </Text>
      
      <Text
        position={[0, 0.15, 1.2]}
        fontSize={0.4}
        color="#555"
        anchorX="center"
        anchorY="middle"
      >
        Mimic Master Edition
      </Text>
    </group>
  );
}

function Scene({ players, properties, lastDice1, lastDice2, currentPlayerId }: MonopolyBoard3DProps) {
  const playerColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    players.forEach(p => {
      map[p.player_id] = TOKEN_COLORS[p.token_type as TokenType] || '#FF4444';
    });
    return map;
  }, [players]);

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 15, 10]} intensity={1} castShadow />
      <directionalLight position={[-5, 10, -5]} intensity={0.3} />
      <pointLight position={[0, 8, 0]} intensity={0.5} color="#fff5e1" />

      {/* Board base */}
      <RoundedBox args={[22, 0.3, 22]} radius={0.2} position={[0, -0.2, 0]}>
        <meshStandardMaterial color="#2d5a27" metalness={0.1} roughness={0.8} />
      </RoundedBox>

      {/* Board tiles */}
      {BOARD_SPACES.map((space, i) => {
        const prop = properties.find(p => p.property_index === i);
        const ownerColor = prop?.owner_id ? playerColorMap[prop.owner_id] : undefined;
        return (
          <BoardTile
            key={i}
            index={i}
            ownerColor={ownerColor}
            houses={prop?.houses || 0}
          />
        );
      })}

      <BoardCenter />

      {/* Player tokens */}
      {players.map((player, i) => (
        <PlayerToken
          key={player.player_id}
          player={player}
          index={i}
          isCurrentPlayer={player.player_id === currentPlayerId}
        />
      ))}

      {/* Dice */}
      {lastDice1 && lastDice2 && (
        <>
          <Dice value={lastDice1} position={[-1, 1, 0]} />
          <Dice value={lastDice2} position={[1, 1, 0]} />
        </>
      )}

      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={8}
        maxDistance={35}
        minPolarAngle={0.3}
        maxPolarAngle={Math.PI / 2.2}
        target={[0, 0, 0]}
      />
    </>
  );
}

export function MonopolyBoard3DCanvas(props: MonopolyBoard3DProps) {
  return (
    <div className="w-full h-[600px] rounded-2xl overflow-hidden border-2 border-border/50 bg-gradient-to-b from-emerald-900 to-emerald-950">
      <Canvas
        camera={{ position: [0, 20, 15], fov: 50 }}
        shadows
        gl={{ antialias: true, alpha: false }}
      >
        <Scene {...props} />
        <fog attach="fog" args={['#1a3a1a', 25, 50]} />
      </Canvas>
    </div>
  );
}

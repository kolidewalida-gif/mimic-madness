import { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import {
  OrbitControls,
  Text,
  RoundedBox,
  Float,
} from '@react-three/drei';
import * as THREE from 'three';

// Local fallback for drei's Sphere (removed in newer versions)
const Sphere = ({ args, position, rotation, children }: any) => (
  <mesh position={position} rotation={rotation}>
    <sphereGeometry args={args} />
    {children}
  </mesh>
);

// Local no-op stub for drei's Sparkles (removed in newer versions)
const Sparkles = (_props: any) => null;
import {
  BOARD_SPACES,
  getBoardPosition,
  TOKEN_COLORS,
  type TokenType,
} from '@/lib/monopolyBoard';

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

/* ============================================================
   BOARD TILE — cartoon ink with thick "marker" border
============================================================ */
function BoardTile({
  index,
  ownerColor,
  houses,
  isMortgaged,
  isLanded,
}: {
  index: number;
  ownerColor?: string;
  houses: number;
  isMortgaged: boolean;
  isLanded: boolean;
}) {
  const space = BOARD_SPACES[index];
  const pos = getBoardPosition(index);
  const isCorner = [0, 10, 20, 30].includes(index);
  const tileWidth = isCorner ? 2.2 : 1.6;
  const tileDepth = isCorner ? 2.2 : 2.2;

  const colorHex = space.color || '#fff8e7';
  const isProperty = space.type === 'property';
  const groupRef = useRef<THREE.Group>(null);

  // Subtle hover pulse when landed
  useFrame((state) => {
    if (groupRef.current && isLanded) {
      const pulse = 0.05 + Math.sin(state.clock.elapsedTime * 4) * 0.05;
      groupRef.current.position.y = pulse;
    } else if (groupRef.current) {
      groupRef.current.position.y = THREE.MathUtils.lerp(
        groupRef.current.position.y,
        0,
        0.1,
      );
    }
  });

  return (
    <group position={[pos.x, 0, pos.z]} rotation={[0, pos.rotation, 0]}>
      {/* Bottom black "ink shadow" plate */}
      <mesh position={[0, -0.05, 0]}>
        <boxGeometry args={[tileWidth + 0.1, 0.1, tileDepth + 0.1]} />
        <meshStandardMaterial color="#0a0810" roughness={1} />
      </mesh>

      <group ref={groupRef}>
        {/* Base tile — warm paper */}
        <RoundedBox
          args={[tileWidth, 0.18, tileDepth]}
          radius={0.06}
          smoothness={4}
          position={[0, 0, 0]}
        >
          <meshStandardMaterial
            color={isLanded ? '#fffce0' : '#fff5d8'}
            metalness={0.05}
            roughness={0.85}
            emissive={isLanded ? new THREE.Color('#fbbf24') : new THREE.Color('#000')}
            emissiveIntensity={isLanded ? 0.25 : 0}
          />
        </RoundedBox>

        {/* Property color stripe — fat cartoon color band */}
        {isProperty && (
          <RoundedBox
            args={[tileWidth - 0.05, 0.22, 0.55]}
            radius={0.05}
            smoothness={3}
            position={[0, 0.02, -0.78]}
          >
            <meshStandardMaterial
              color={colorHex}
              metalness={0.35}
              roughness={0.4}
              emissive={new THREE.Color(colorHex)}
              emissiveIntensity={0.18}
            />
          </RoundedBox>
        )}

        {/* Owner indicator — fat ring */}
        {ownerColor && (
          <group position={[0, 0.13, 0.35]}>
            <mesh>
              <torusGeometry args={[0.2, 0.04, 12, 24]} />
              <meshStandardMaterial
                color={ownerColor}
                emissive={new THREE.Color(ownerColor)}
                emissiveIntensity={0.55}
              />
            </mesh>
            <mesh position={[0, 0, 0]}>
              <cylinderGeometry args={[0.16, 0.16, 0.05, 18]} />
              <meshStandardMaterial
                color={ownerColor}
                emissive={new THREE.Color(ownerColor)}
                emissiveIntensity={0.4}
              />
            </mesh>
          </group>
        )}

        {/* Mortgage cross indicator */}
        {isMortgaged && (
          <group position={[0, 0.15, 0]}>
            <Text fontSize={0.5} color="#ef4444" outlineWidth={0.04} outlineColor="#0a0810">
              ⛓
            </Text>
          </group>
        )}

        {/* Houses — drop-bounce */}
        {houses > 0 &&
          houses < 5 &&
          Array.from({ length: houses }).map((_, i) => (
            <Float
              key={i}
              speed={1.5}
              floatIntensity={0.15}
              rotationIntensity={0.1}
            >
              <group position={[-0.5 + i * 0.35, 0.25, -0.4]}>
                {/* House body */}
                <mesh>
                  <boxGeometry args={[0.22, 0.22, 0.22]} />
                  <meshStandardMaterial
                    color="#22c55e"
                    metalness={0.2}
                    roughness={0.5}
                    emissive={new THREE.Color('#22c55e')}
                    emissiveIntensity={0.25}
                  />
                </mesh>
                {/* Black border */}
                <mesh>
                  <boxGeometry args={[0.24, 0.24, 0.24]} />
                  <meshBasicMaterial color="#0a0810" wireframe />
                </mesh>
                {/* Roof */}
                <mesh position={[0, 0.16, 0]} rotation={[0, 0, Math.PI / 4]}>
                  <boxGeometry args={[0.18, 0.18, 0.24]} />
                  <meshStandardMaterial color="#16a34a" />
                </mesh>
              </group>
            </Float>
          ))}

        {/* Hotel — fat cartoon red */}
        {houses === 5 && (
          <Float speed={1.2} floatIntensity={0.2} rotationIntensity={0.15}>
            <group position={[0, 0.32, -0.4]}>
              <mesh>
                <boxGeometry args={[0.45, 0.4, 0.35]} />
                <meshStandardMaterial
                  color="#ef4444"
                  metalness={0.2}
                  roughness={0.4}
                  emissive={new THREE.Color('#ef4444')}
                  emissiveIntensity={0.3}
                />
              </mesh>
              <mesh position={[0, 0.27, 0]} rotation={[0, 0, Math.PI / 4]}>
                <boxGeometry args={[0.32, 0.32, 0.37]} />
                <meshStandardMaterial color="#dc2626" />
              </mesh>
              {/* Door */}
              <mesh position={[0, -0.05, 0.18]}>
                <boxGeometry args={[0.1, 0.16, 0.02]} />
                <meshStandardMaterial color="#fbbf24" />
              </mesh>
            </group>
          </Float>
        )}

        {/* Space name — black graffiti outline */}
        <Text
          position={[0, 0.13, 0.35]}
          fontSize={0.13}
          color="#0a0810"
          anchorX="center"
          anchorY="middle"
          maxWidth={tileWidth - 0.2}
          textAlign="center"
          outlineWidth={0.005}
          outlineColor="#0a0810"
          fontWeight="bold"
        >
          {space.nameFr.length > 14
            ? space.nameFr.substring(0, 13) + '…'
            : space.nameFr}
        </Text>

        {/* Price */}
        {space.price && (
          <Text
            position={[0, 0.13, 0.7]}
            fontSize={0.11}
            color="#7e22ce"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.004}
            outlineColor="#0a0810"
            fontWeight="bold"
          >
            {`${space.price}$`}
          </Text>
        )}

        {/* Special icons */}
        {space.type === 'go' && (
          <group position={[0, 0.18, -0.3]}>
            <Float speed={2} floatIntensity={0.4}>
              <Text fontSize={0.45} anchorX="center" anchorY="middle">
                ➡️
              </Text>
            </Float>
          </group>
        )}
        {space.type === 'jail' && (
          <Text position={[0, 0.18, -0.3]} fontSize={0.4} anchorX="center" anchorY="middle">
            🔒
          </Text>
        )}
        {space.type === 'free_parking' && (
          <Float speed={1.4} floatIntensity={0.3}>
            <Text position={[0, 0.18, -0.3]} fontSize={0.4} anchorX="center" anchorY="middle">
              🅿️
            </Text>
          </Float>
        )}
        {space.type === 'go_to_jail' && (
          <Text position={[0, 0.18, -0.3]} fontSize={0.4} anchorX="center" anchorY="middle">
            👮
          </Text>
        )}
        {space.type === 'chance' && (
          <Float speed={2} rotationIntensity={0.6} floatIntensity={0.3}>
            <Text position={[0, 0.18, -0.3]} fontSize={0.4} anchorX="center" anchorY="middle">
              ❓
            </Text>
          </Float>
        )}
        {space.type === 'community' && (
          <Float speed={1.8} floatIntensity={0.3}>
            <Text position={[0, 0.18, -0.3]} fontSize={0.4} anchorX="center" anchorY="middle">
              📦
            </Text>
          </Float>
        )}
        {space.type === 'tax' && (
          <Text position={[0, 0.18, -0.3]} fontSize={0.4} anchorX="center" anchorY="middle">
            💰
          </Text>
        )}
        {space.type === 'railroad' && (
          <Float speed={1.5} floatIntensity={0.2}>
            <Text position={[0, 0.18, -0.3]} fontSize={0.4} anchorX="center" anchorY="middle">
              🚂
            </Text>
          </Float>
        )}
        {space.type === 'utility' && (
          <Float speed={1.6} floatIntensity={0.25}>
            <Text position={[0, 0.18, -0.3]} fontSize={0.36} anchorX="center" anchorY="middle">
              {index === 12 ? '💡' : '💧'}
            </Text>
          </Float>
        )}

        {/* Landed sparkles */}
        {isLanded && (
          <Sparkles
            count={20}
            scale={[tileWidth, 0.6, tileDepth]}
            size={3}
            speed={0.6}
            color="#fbbf24"
            position={[0, 0.3, 0]}
          />
        )}
      </group>
    </group>
  );
}

/* ============================================================
   PLAYER TOKEN — cartoon 3D with bounce animation
============================================================ */
function PlayerToken({
  player,
  index,
  isCurrentPlayer,
  isMoving,
}: {
  player: MonopolyPlayer3D;
  index: number;
  isCurrentPlayer: boolean;
  isMoving: boolean;
}) {
  const ref = useRef<THREE.Group>(null);
  const pos = getBoardPosition(player.position);
  const tokenColor = TOKEN_COLORS[player.token_type as TokenType] || '#FF4444';

  // Offset tokens so they don't stack
  const offsetX = (index % 4) * 0.3 - 0.45;
  const offsetZ = Math.floor(index / 4) * 0.3 - 0.15;

  useFrame((state) => {
    if (!ref.current) return;

    const t = state.clock.elapsedTime;
    const targetX = pos.x + offsetX;
    const targetZ = pos.z + offsetZ;
    const baseY = 0.4;

    // Hop/bounce when current player
    let targetY = baseY;
    if (isCurrentPlayer) {
      targetY = baseY + Math.abs(Math.sin(t * 4)) * 0.18;
    }
    // Stronger hop while moving
    if (isMoving) {
      targetY = baseY + Math.abs(Math.sin(t * 8)) * 0.4;
    }

    ref.current.position.x = THREE.MathUtils.lerp(
      ref.current.position.x,
      targetX,
      isMoving ? 0.15 : 0.1,
    );
    ref.current.position.z = THREE.MathUtils.lerp(
      ref.current.position.z,
      targetZ,
      isMoving ? 0.15 : 0.1,
    );
    ref.current.position.y = THREE.MathUtils.lerp(
      ref.current.position.y,
      targetY,
      0.18,
    );

    // Tilt while moving
    if (isMoving) {
      ref.current.rotation.z = Math.sin(t * 8) * 0.15;
      ref.current.rotation.x = Math.cos(t * 8) * 0.1;
    } else {
      ref.current.rotation.z = THREE.MathUtils.lerp(ref.current.rotation.z, 0, 0.15);
      ref.current.rotation.x = THREE.MathUtils.lerp(ref.current.rotation.x, 0, 0.15);
    }
  });

  if (player.is_bankrupt) return null;

  const renderToken = () => {
    const tokenShape = player.token_type;

    // Common cartoon body wrapper
    const Body = ({ children }: { children: React.ReactNode }) => (
      <group>{children}</group>
    );

    if (tokenShape === 'car') {
      return (
        <Body>
          <RoundedBox args={[0.4, 0.18, 0.22]} radius={0.04} smoothness={3}>
            <meshStandardMaterial
              color={tokenColor}
              metalness={0.6}
              roughness={0.25}
              emissive={new THREE.Color(tokenColor)}
              emissiveIntensity={0.15}
            />
          </RoundedBox>
          <RoundedBox
            args={[0.22, 0.13, 0.2]}
            radius={0.04}
            smoothness={3}
            position={[0.05, 0.13, 0]}
          >
            <meshStandardMaterial color={tokenColor} metalness={0.6} roughness={0.25} />
          </RoundedBox>
          {/* Wheels */}
          {[
            [-0.13, -0.1, 0.11],
            [0.13, -0.1, 0.11],
            [-0.13, -0.1, -0.11],
            [0.13, -0.1, -0.11],
          ].map(([x, y, z], i) => (
            <mesh key={i} position={[x, y, z]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.05, 0.05, 0.04, 12]} />
              <meshStandardMaterial color="#0a0810" />
            </mesh>
          ))}
        </Body>
      );
    }
    if (tokenShape === 'hat') {
      return (
        <Body>
          <mesh>
            <cylinderGeometry args={[0.22, 0.22, 0.05, 18]} />
            <meshStandardMaterial color={tokenColor} metalness={0.55} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.16, 0]}>
            <cylinderGeometry args={[0.13, 0.15, 0.27, 18]} />
            <meshStandardMaterial color={tokenColor} metalness={0.55} roughness={0.3} />
          </mesh>
          {/* Band */}
          <mesh position={[0, 0.05, 0]}>
            <cylinderGeometry args={[0.155, 0.155, 0.04, 18]} />
            <meshStandardMaterial color="#0a0810" />
          </mesh>
        </Body>
      );
    }
    if (tokenShape === 'shoe') {
      return (
        <Body>
          <RoundedBox args={[0.34, 0.18, 0.18]} radius={0.06} smoothness={3}>
            <meshStandardMaterial color={tokenColor} metalness={0.5} roughness={0.35} />
          </RoundedBox>
          <RoundedBox
            args={[0.18, 0.16, 0.16]}
            radius={0.05}
            smoothness={3}
            position={[0.1, 0.15, 0]}
          >
            <meshStandardMaterial color={tokenColor} metalness={0.5} roughness={0.35} />
          </RoundedBox>
        </Body>
      );
    }
    if (tokenShape === 'dog') {
      return (
        <Body>
          {/* Body */}
          <Sphere args={[0.13, 18, 18]}>
            <meshStandardMaterial color={tokenColor} metalness={0.4} roughness={0.4} />
          </Sphere>
          {/* Head */}
          <Sphere args={[0.1, 18, 18]} position={[0.16, 0.05, 0]}>
            <meshStandardMaterial color={tokenColor} metalness={0.4} roughness={0.4} />
          </Sphere>
          {/* Tail */}
          <mesh position={[-0.13, 0.08, 0]} rotation={[0, 0, Math.PI / 4]}>
            <cylinderGeometry args={[0.025, 0.025, 0.18, 8]} />
            <meshStandardMaterial color={tokenColor} />
          </mesh>
          {/* Ears */}
          <Sphere args={[0.04, 12, 12]} position={[0.18, 0.16, 0.07]}>
            <meshStandardMaterial color="#0a0810" />
          </Sphere>
          <Sphere args={[0.04, 12, 12]} position={[0.18, 0.16, -0.07]}>
            <meshStandardMaterial color="#0a0810" />
          </Sphere>
        </Body>
      );
    }
    if (tokenShape === 'ship') {
      return (
        <Body>
          <RoundedBox args={[0.4, 0.13, 0.18]} radius={0.04} smoothness={3}>
            <meshStandardMaterial color={tokenColor} metalness={0.5} roughness={0.4} />
          </RoundedBox>
          <mesh position={[0, 0.18, 0]}>
            <boxGeometry args={[0.04, 0.32, 0.04]} />
            <meshStandardMaterial color="#0a0810" />
          </mesh>
          <mesh position={[0.05, 0.2, 0]}>
            <boxGeometry args={[0.18, 0.18, 0.005]} />
            <meshStandardMaterial color="#fff" />
          </mesh>
        </Body>
      );
    }
    if (tokenShape === 'cannon') {
      return (
        <Body>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.07, 0.09, 0.32, 16]} />
            <meshStandardMaterial color={tokenColor} metalness={0.7} roughness={0.25} />
          </mesh>
          {/* Wheels */}
          <mesh position={[0, -0.1, 0.1]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.08, 0.08, 0.04, 14]} />
            <meshStandardMaterial color="#0a0810" />
          </mesh>
          <mesh position={[0, -0.1, -0.1]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.08, 0.08, 0.04, 14]} />
            <meshStandardMaterial color="#0a0810" />
          </mesh>
        </Body>
      );
    }
    if (tokenShape === 'iron') {
      return (
        <Body>
          <RoundedBox args={[0.32, 0.16, 0.22]} radius={0.05} smoothness={3}>
            <meshStandardMaterial color={tokenColor} metalness={0.7} roughness={0.25} />
          </RoundedBox>
          <mesh position={[0, 0.13, 0]}>
            <torusGeometry args={[0.08, 0.025, 10, 18]} />
            <meshStandardMaterial color="#0a0810" />
          </mesh>
        </Body>
      );
    }
    if (tokenShape === 'thimble') {
      return (
        <Body>
          <mesh>
            <cylinderGeometry args={[0.13, 0.1, 0.22, 18]} />
            <meshStandardMaterial color={tokenColor} metalness={0.65} roughness={0.3} />
          </mesh>
        </Body>
      );
    }
    // default sphere
    return (
      <Sphere args={[0.16, 18, 18]}>
        <meshStandardMaterial
          color={tokenColor}
          metalness={0.6}
          roughness={0.25}
          emissive={new THREE.Color(tokenColor)}
          emissiveIntensity={0.2}
        />
      </Sphere>
    );
  };

  return (
    <group ref={ref} position={[pos.x + offsetX, 0.4, pos.z + offsetZ]}>
      {/* Shadow disc on ground */}
      <mesh position={[0, -0.32, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.22, 18]} />
        <meshBasicMaterial color="#0a0810" transparent opacity={0.35} />
      </mesh>

      {renderToken()}

      {/* Name label */}
      <Text
        position={[0, 0.45, 0]}
        fontSize={0.16}
        color={tokenColor}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.025}
        outlineColor="#0a0810"
        fontWeight="bold"
      >
        {player.player_name.length > 10
          ? player.player_name.substring(0, 9) + '…'
          : player.player_name}
      </Text>

      {/* Current player highlight */}
      {isCurrentPlayer && (
        <>
          <pointLight color={tokenColor} intensity={2.5} distance={2.2} />
          <Sparkles
            count={15}
            scale={[0.6, 0.7, 0.6]}
            size={2.5}
            speed={0.7}
            color={tokenColor}
          />
        </>
      )}

      {/* Jail bars */}
      {player.in_jail && (
        <group position={[0, 0.2, 0]}>
          <Text fontSize={0.25} anchorX="center" anchorY="middle">
            🔒
          </Text>
        </group>
      )}
    </group>
  );
}

/* ============================================================
   DICE — bouncy cartoon
============================================================ */
function CartoonDice({
  value,
  position,
  rolling,
}: {
  value: number;
  position: [number, number, number];
  rolling: boolean;
}) {
  const ref = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!ref.current) return;
    if (rolling) {
      ref.current.rotation.x += 0.4;
      ref.current.rotation.y += 0.5;
      ref.current.rotation.z += 0.3;
      ref.current.position.y =
        position[1] + Math.abs(Math.sin(state.clock.elapsedTime * 8)) * 0.4;
    } else {
      // Gentle settle
      ref.current.rotation.x = THREE.MathUtils.lerp(ref.current.rotation.x, 0, 0.15);
      ref.current.rotation.y = THREE.MathUtils.lerp(ref.current.rotation.y, 0, 0.15);
      ref.current.rotation.z = THREE.MathUtils.lerp(ref.current.rotation.z, 0, 0.15);
      ref.current.position.y = THREE.MathUtils.lerp(
        ref.current.position.y,
        position[1] + Math.sin(state.clock.elapsedTime * 1.5) * 0.05,
        0.1,
      );
    }
  });

  return (
    <group ref={ref} position={position}>
      <RoundedBox args={[0.7, 0.7, 0.7]} radius={0.1} smoothness={4}>
        <meshStandardMaterial
          color="#ffffff"
          metalness={0.15}
          roughness={0.35}
          emissive={new THREE.Color('#fff8e7')}
          emissiveIntensity={0.1}
        />
      </RoundedBox>
      {/* Black border lines via wireframe overlay */}
      <mesh>
        <boxGeometry args={[0.74, 0.74, 0.74]} />
        <meshBasicMaterial color="#0a0810" wireframe />
      </mesh>
      {!rolling && (
        <Text
          position={[0, 0, 0.37]}
          fontSize={0.42}
          color="#0a0810"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.012}
          outlineColor="#0a0810"
          fontWeight="bold"
        >
          {value.toString()}
        </Text>
      )}
    </group>
  );
}

/* ============================================================
   BOARD CENTER — cartoon graffiti logo
============================================================ */
function BoardCenter() {
  return (
    <group position={[0, 0.05, 0]}>
      {/* Center platform — purple velvet */}
      <RoundedBox args={[8.5, 0.12, 8.5]} radius={0.15} smoothness={4} position={[0, 0, 0]}>
        <meshStandardMaterial
          color="#1a0d2e"
          metalness={0.1}
          roughness={0.85}
          emissive={new THREE.Color('#a855f7')}
          emissiveIntensity={0.08}
        />
      </RoundedBox>

      {/* Inner glow ring */}
      <mesh position={[0, 0.07, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.8, 3, 36]} />
        <meshStandardMaterial
          color="#fbbf24"
          emissive={new THREE.Color('#fbbf24')}
          emissiveIntensity={0.6}
          transparent
          opacity={0.7}
        />
      </mesh>

      {/* MIMICPOLY title */}
      <Float speed={1.2} floatIntensity={0.2} rotationIntensity={0.05}>
        <Text
          position={[0, 0.6, 0]}
          fontSize={1.1}
          color="#fbbf24"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.07}
          outlineColor="#0a0810"
          fontWeight="bold"
          rotation={[-Math.PI / 2, 0, 0]}
        >
          MIMICPOLY
        </Text>
      </Float>

      <Text
        position={[0, 0.13, 1.5]}
        fontSize={0.32}
        color="#a855f7"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.018}
        outlineColor="#0a0810"
        fontWeight="bold"
      >
        Mimic Master Edition
      </Text>

      {/* Center sparkles */}
      <Sparkles count={40} scale={[5, 1, 5]} size={3} speed={0.4} color="#fbbf24" />
    </group>
  );
}

/* ============================================================
   SCENE
============================================================ */
function Scene({
  players,
  properties,
  lastDice1,
  lastDice2,
  animatingTo,
  currentPlayerId,
}: MonopolyBoard3DProps) {
  const playerColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    players.forEach((p) => {
      map[p.player_id] = TOKEN_COLORS[p.token_type as TokenType] || '#FF4444';
    });
    return map;
  }, [players]);

  // Track dice rolling state synchronized w/ value changes
  const [diceRolling, setDiceRolling] = useState(false);
  const lastDiceRef = useRef<{ d1: number | null; d2: number | null }>({ d1: null, d2: null });
  useEffect(() => {
    if (
      lastDice1 != null &&
      lastDice2 != null &&
      (lastDice1 !== lastDiceRef.current.d1 || lastDice2 !== lastDiceRef.current.d2)
    ) {
      setDiceRolling(true);
      const t = setTimeout(() => setDiceRolling(false), 900);
      lastDiceRef.current = { d1: lastDice1, d2: lastDice2 };
      return () => clearTimeout(t);
    }
  }, [lastDice1, lastDice2]);

  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight
        position={[10, 18, 10]}
        intensity={1.2}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight position={[-8, 12, -6]} intensity={0.4} color="#a855f7" />
      <pointLight position={[0, 9, 0]} intensity={0.8} color="#fbbf24" />
      <pointLight position={[8, 4, 8]} intensity={0.5} color="#06b6d4" />
      <pointLight position={[-8, 4, -8]} intensity={0.5} color="#ec4899" />

      {/* Board base — fat cartoon green */}
      <RoundedBox args={[22.5, 0.4, 22.5]} radius={0.3} smoothness={4} position={[0, -0.25, 0]}>
        <meshStandardMaterial
          color="#3f6f33"
          metalness={0.05}
          roughness={0.85}
          emissive={new THREE.Color('#22c55e')}
          emissiveIntensity={0.05}
        />
      </RoundedBox>

      {/* Black base shadow underneath */}
      <RoundedBox
        args={[23, 0.15, 23]}
        radius={0.35}
        smoothness={4}
        position={[0, -0.5, 0]}
      >
        <meshBasicMaterial color="#0a0810" />
      </RoundedBox>

      {/* Tiles */}
      {BOARD_SPACES.map((space, i) => {
        const prop = properties.find((p) => p.property_index === i);
        const ownerColor = prop?.owner_id ? playerColorMap[prop.owner_id] : undefined;
        const isLanded = i === animatingTo;
        return (
          <BoardTile
            key={i}
            index={i}
            ownerColor={ownerColor}
            houses={prop?.houses || 0}
            isMortgaged={prop?.is_mortgaged || false}
            isLanded={isLanded}
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
          isMoving={
            player.player_id === currentPlayerId &&
            animatingTo != null
          }
        />
      ))}

      {/* Dice */}
      {lastDice1 != null && lastDice2 != null && (
        <>
          <CartoonDice value={lastDice1} position={[-1, 1.2, 0]} rolling={diceRolling} />
          <CartoonDice value={lastDice2} position={[1, 1.2, 0]} rolling={diceRolling} />
        </>
      )}

      <OrbitControls
        enablePan={false}
        enableZoom={true}
        enableRotate={true}
        minDistance={10}
        maxDistance={32}
        minPolarAngle={0.25}
        maxPolarAngle={Math.PI / 2.1}
        target={[0, 0, 0]}
        autoRotate={false}
        rotateSpeed={0.6}
        zoomSpeed={0.8}
      />
    </>
  );
}

/* ============================================================
   CANVAS WRAPPER
============================================================ */
export function MonopolyBoard3DCanvas(props: MonopolyBoard3DProps) {
  return (
    <div
      className="relative w-full h-[560px] md:h-[620px] rounded-3xl overflow-hidden"
      style={{
        background:
          'linear-gradient(180deg, #1a0d2e 0%, #160a26 50%, #0a0510 100%)',
        border: '4px solid #0a0810',
        boxShadow: '0 8px 0 #0a0810, 0 14px 32px rgba(168,85,247,0.35), inset 0 2px 0 rgba(255,255,255,0.05)',
      }}
    >
      {/* corner flourishes */}
      <div
        className="absolute top-3 right-3 z-10 pointer-events-none px-2.5 py-1 rounded-lg"
        style={{
          background: 'linear-gradient(180deg, #a855f7, #7e22ce)',
          border: '2.5px solid #0a0810',
          boxShadow: '0 3px 0 #0a0810',
          transform: 'rotate(4deg)',
        }}
      >
        <span
          className="text-xs font-black text-white uppercase tracking-wider"
          style={{
            fontFamily: "'Caveat', cursive",
            textShadow:
              '1.5px 1.5px 0 #0a0810, -1px -1px 0 #0a0810, 1px -1px 0 #0a0810, -1px 1px 0 #0a0810, 1px 1px 0 #0a0810',
          }}
        >
          🎲 3D BOARD
        </span>
      </div>

      <Canvas
        camera={{ position: [0, 22, 16], fov: 45 }}
        shadows
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]}
      >
        <Scene {...props} />
        <fog attach="fog" args={['#0f0820', 28, 55]} />
      </Canvas>
    </div>
  );
}

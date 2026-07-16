"use client";

interface InteractableProps {
  position: [number, number, number];
}

export function Interactable({ position }: InteractableProps) {
  return (
    <group position={position}>
      <mesh castShadow position={[0, 0.68, 0]} scale={[1.35, 0.11, 0.78]}>
        <boxGeometry />
        <meshStandardMaterial color="#b7965f" roughness={0.88} />
      </mesh>
      {[-0.53, 0.53].flatMap((x) =>
        [-0.27, 0.27].map((z) => (
          <mesh key={`${x}-${z}`} position={[x, 0.32, z]} scale={[0.1, 0.64, 0.1]}>
            <boxGeometry />
            <meshStandardMaterial color="#4e4032" roughness={0.95} />
          </mesh>
        )),
      )}
      <mesh
        position={[0, 0.82, 0]}
        rotation={[-0.06, 0.18, 0]}
        scale={[0.64, 0.025, 0.42]}
      >
        <boxGeometry />
        <meshStandardMaterial color="#e7d5a9" emissive="#463710" emissiveIntensity={0.08} />
      </mesh>
    </group>
  );
}

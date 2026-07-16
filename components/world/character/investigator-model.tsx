"use client";

export function InvestigatorModel() {
  return (
    <group position={[0, -0.72, 0]}>
      <mesh castShadow position={[0, 1.52, 0]}>
        <sphereGeometry args={[0.24, 18, 18]} />
        <meshStandardMaterial color="#bfa184" roughness={0.9} />
      </mesh>
      <mesh castShadow position={[0, 0.88, 0]} scale={[0.52, 0.88, 0.34]}>
        <capsuleGeometry args={[0.5, 1, 8, 16]} />
        <meshStandardMaterial color="#304d57" roughness={0.92} />
      </mesh>
      <mesh castShadow position={[0, 1.74, 0]} scale={[0.42, 0.08, 0.42]}>
        <cylinderGeometry args={[1, 1.2, 1, 20]} />
        <meshStandardMaterial color="#42372d" roughness={0.95} />
      </mesh>
      <mesh castShadow position={[0, 1.83, 0]} scale={[0.27, 0.22, 0.27]}>
        <cylinderGeometry args={[1, 1, 1, 20]} />
        <meshStandardMaterial color="#42372d" roughness={0.95} />
      </mesh>
    </group>
  );
}

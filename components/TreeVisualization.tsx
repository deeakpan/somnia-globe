'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useRouter } from 'next/navigation';

interface TreeNode {
  id: string;
  name: string;
  type: 'user' | 'app';
  children?: TreeNode[];
  value?: number;
}

interface Branch {
  start: THREE.Vector3;
  end: THREE.Vector3;
  thickness: number;
  nodes: TreeNode[];
}

export default function TreeVisualization() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
  } | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const router = useRouter();

  // Example data structure - will be replaced with Somnia data streams
  const exampleData: TreeNode = {
    id: 'root',
    name: 'Somnia Network',
    type: 'user',
    children: [
      {
        id: 'user1',
        name: 'User 1',
        type: 'user',
        value: 10,
        children: [
          { id: 'app1', name: 'App 1', type: 'app', value: 5 },
          { id: 'app2', name: 'App 2', type: 'app', value: 3 },
        ],
      },
      {
        id: 'user2',
        name: 'User 2',
        type: 'user',
        value: 8,
        children: [
          { id: 'app3', name: 'App 3', type: 'app', value: 4 },
          { id: 'app4', name: 'App 4', type: 'app', value: 2 },
        ],
      },
      {
        id: 'user3',
        name: 'User 3',
        type: 'user',
        value: 6,
        children: [
          { id: 'app5', name: 'App 5', type: 'app', value: 3 },
        ],
      },
    ],
  };

  // Generate organic tree structure
  function generateTree(data: TreeNode): Branch[] {
    const branches: Branch[] = [];
    const trunkHeight = 8;
    const trunkStart = new THREE.Vector3(0, -15, 0);
    const trunkEnd = new THREE.Vector3(0, -15 + trunkHeight, 0);

    // Create trunk
    branches.push({
      start: trunkStart,
      end: trunkEnd,
      thickness: 1.5,
      nodes: [],
    });

    // Generate branches from trunk
    if (data.children) {
      data.children.forEach((child, index) => {
        const angle = (index / data.children!.length) * Math.PI * 2;
        const branchLength = 6 + Math.random() * 2;
        const branchStart = trunkEnd.clone();
        
        // Create curved branch
        const midPoint = new THREE.Vector3(
          Math.cos(angle) * branchLength * 0.5,
          -15 + trunkHeight + branchLength * 0.3,
          Math.sin(angle) * branchLength * 0.5
        );
        
        const branchEnd = new THREE.Vector3(
          Math.cos(angle) * branchLength,
          -15 + trunkHeight + branchLength * 0.6,
          Math.sin(angle) * branchLength
        );

        branches.push({
          start: branchStart,
          end: branchEnd,
          thickness: 0.8,
          nodes: [child],
        });

        // Generate sub-branches
        if (child.children) {
          child.children.forEach((app, appIndex) => {
            const subAngle = angle + (appIndex - child.children!.length / 2) * 0.4;
            const subLength = 3 + Math.random() * 1.5;
            const subStart = branchEnd.clone();
            const subEnd = new THREE.Vector3(
              branchEnd.x + Math.cos(subAngle) * subLength,
              branchEnd.y + subLength * 0.4,
              branchEnd.z + Math.sin(subAngle) * subLength
            );

            branches.push({
              start: subStart,
              end: subEnd,
              thickness: 0.4,
              nodes: [app],
            });
          });
        }
      });
    }

    return branches;
  }

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight || 800;

    // Create Three.js scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f9ff);

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.set(20, 5, 20);
    camera.lookAt(0, -10, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.left = -30;
    directionalLight.shadow.camera.right = 30;
    directionalLight.shadow.camera.top = 30;
    directionalLight.shadow.camera.bottom = -30;
    scene.add(directionalLight);

    // Generate tree structure
    const branches = generateTree(exampleData);
    const nodeMeshes: THREE.Mesh[] = [];
    const nodeDataMap = new Map<THREE.Mesh, TreeNode>();

    // Create branches (cylinders)
    branches.forEach((branch) => {
      const direction = new THREE.Vector3().subVectors(branch.end, branch.start);
      const length = direction.length();
      const midPoint = new THREE.Vector3().addVectors(branch.start, branch.end).multiplyScalar(0.5);

      const geometry = new THREE.CylinderGeometry(
        branch.thickness,
        branch.thickness * 1.2,
        length,
        8
      );
      const material = new THREE.MeshPhongMaterial({ 
        color: 0x8b4513, // Brown for branches
        flatShading: true,
      });

      const cylinder = new THREE.Mesh(geometry, material);
      cylinder.position.copy(midPoint);
      cylinder.lookAt(branch.end);
      cylinder.rotateX(Math.PI / 2);
      cylinder.castShadow = true;
      cylinder.receiveShadow = true;
      scene.add(cylinder);

      // Add nodes (fruits/leaves) on branches
      branch.nodes.forEach((node) => {
        const nodeSize = (node.value || 1) * 0.3 + 0.5;
        const nodeGeometry = new THREE.SphereGeometry(nodeSize, 16, 16);
        const nodeColor = node.type === 'user' ? 0x4f46e5 : 0x10b981;
        const nodeMaterial = new THREE.MeshPhongMaterial({ 
          color: nodeColor,
          emissive: nodeColor,
          emissiveIntensity: 0.2,
        });

        const nodeMesh = new THREE.Mesh(nodeGeometry, nodeMaterial);
        
        // Position node at the end of the branch with slight offset
        const offset = new THREE.Vector3().subVectors(branch.end, branch.start).normalize().multiplyScalar(nodeSize);
        nodeMesh.position.copy(branch.end).add(offset);
        nodeMesh.castShadow = true;
        nodeMesh.userData = { nodeId: node.id, nodeData: node };
        
        nodeMeshes.push(nodeMesh);
        nodeDataMap.set(nodeMesh, node);
        scene.add(nodeMesh);

        // Add text label (simplified - using sprite would be better)
        // For now, we'll use HTML overlay
      });
    });

    // Add ground plane
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x86efac });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -15;
    ground.receiveShadow = true;
    scene.add(ground);

    // Add fog for depth
    scene.fog = new THREE.Fog(0xf0f9ff, 30, 80);

    // Interactivity
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onMouseMove = (event: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(nodeMeshes);

      container.style.cursor = intersects.length > 0 ? 'pointer' : 'default';

      // Highlight hovered node
      nodeMeshes.forEach((node) => {
        const material = node.material as THREE.MeshPhongMaterial;
        if (intersects.length > 0 && intersects[0].object === node) {
          material.emissiveIntensity = 0.5;
          node.scale.set(1.2, 1.2, 1.2);
        } else {
          material.emissiveIntensity = 0.2;
          node.scale.set(1, 1, 1);
        }
      });
    };

    const onClick = (event: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(nodeMeshes);

      if (intersects.length > 0) {
        const clickedNode = intersects[0].object as THREE.Mesh;
        const nodeId = clickedNode.userData.nodeId;
        setSelectedNode(nodeId);
        router.push(`/detail/${nodeId}`);
      }
    };

    // Camera controls - orbit around tree
    let cameraAngle = 0;
    const animate = () => {
      requestAnimationFrame(animate);

      // Orbit camera around tree
      cameraAngle += 0.003;
      const radius = 25;
      camera.position.x = Math.sin(cameraAngle) * radius;
      camera.position.z = Math.cos(cameraAngle) * radius;
      camera.position.y = 5 + Math.sin(cameraAngle * 0.5) * 2;
      camera.lookAt(0, -10, 0);

      renderer.render(scene, camera);
    };

    container.addEventListener('mousemove', onMouseMove);
    container.addEventListener('click', onClick);
    animate();

    sceneRef.current = { scene, camera, renderer };

    // Cleanup
    return () => {
      container.removeEventListener('mousemove', onMouseMove);
      container.removeEventListener('click', onClick);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [router]);

  return (
    <div className="w-full">
      <div
        ref={containerRef}
        className="w-full bg-gradient-to-b from-sky-50 to-green-50 dark:from-zinc-900 dark:to-zinc-800 rounded-lg shadow-lg overflow-hidden"
        style={{ height: '800px' }}
      />
      {selectedNode && (
        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900 rounded">
          Selected: {selectedNode}
        </div>
      )}
    </div>
  );
}

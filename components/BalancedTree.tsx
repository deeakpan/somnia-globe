'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const ThreeJsTree: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.Fog(0x87ceeb, 10, 50);

    // Camera
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(8, 6, 8);

    // Renderer - optimized settings
    const renderer = new THREE.WebGLRenderer({ 
      antialias: false, // Disable expensive antialiasing
      powerPreference: 'high-performance'
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Cap pixel ratio
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.BasicShadowMap; // Use basic shadows instead of soft
    containerRef.current.appendChild(renderer.domElement);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 5;
    controls.maxDistance = 30;
    controls.maxPolarAngle = Math.PI / 2;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    // Reduced shadow map resolution for performance
    directionalLight.shadow.mapSize.width = 512;
    directionalLight.shadow.mapSize.height = 512;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -10;
    directionalLight.shadow.camera.right = 10;
    directionalLight.shadow.camera.top = 10;
    directionalLight.shadow.camera.bottom = -10;
    scene.add(directionalLight);

    // Ground
    const groundGeometry = new THREE.CircleGeometry(20, 16); // Reduced segments
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x5a7c3a,
      roughness: 0.8,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Bark material - shared across all branches
    const barkMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a3728,
      roughness: 1,
      metalness: 0,
    });

    // Leaf material - shared
    const leafMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x3d6e1f, 
      roughness: 0.9 
    });

    // Shared leaf geometry - reuse instead of creating new ones
    const leafGeometry = new THREE.SphereGeometry(0.08, 6, 6); // Reduced segments

    // Create tree trunk and branches recursively
    interface BranchConfig {
      position: THREE.Vector3;
      direction: THREE.Vector3;
      length: number;
      radius: number;
      depth: number;
    }

    const createBranch = (config: BranchConfig): THREE.Group => {
      const { position, direction, length, radius, depth } = config;
      const branch = new THREE.Group();

      // Create cylinder for branch - reduced segments
      const geometry = new THREE.CylinderGeometry(
        radius,
        radius * 1.2,
        length,
        6, // Reduced from 8
        1
      );
      const mesh = new THREE.Mesh(geometry, barkMaterial);
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      // Position and rotate
      mesh.position.y = length / 2;
      branch.add(mesh);

      // Create sub-branches
      if (depth < 6 && radius > 0.03) {
        const numBranches = depth < 2 ? 3 : 2;
        
        for (let i = 0; i < numBranches; i++) {
          const angle = (Math.PI * 2 * i) / numBranches + Math.random() * 0.5;
          const elevation = 0.3 + Math.random() * 0.3;
          
          const newDirection = new THREE.Vector3(
            Math.sin(angle) * Math.cos(elevation),
            Math.sin(elevation),
            Math.cos(angle) * Math.cos(elevation)
          ).normalize();

          const newLength = length * (0.6 + Math.random() * 0.2);
          const newRadius = radius * 0.7;

          const subBranch = createBranch({
            position: new THREE.Vector3(0, length, 0),
            direction: newDirection,
            length: newLength,
            radius: newRadius,
            depth: depth + 1,
          });

          subBranch.position.y = length * 0.7;
          subBranch.rotation.x = elevation;
          subBranch.rotation.y = angle;

          branch.add(subBranch);
        }
      }

      // Add leaves at branch ends - simplified and reduced
      if (depth >= 5) { // Only add leaves at the very end
        const leafCount = Math.floor(3 + Math.random() * 4); // Much fewer leaves
        
        for (let i = 0; i < leafCount; i++) {
          const spread = 0.3;
          const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
          leaf.position.set(
            (Math.random() - 0.5) * spread,
            length * 0.8 + Math.random() * length * 0.2,
            (Math.random() - 0.5) * spread
          );
          leaf.scale.setScalar(0.8 + Math.random() * 0.3);
          leaf.castShadow = false; // Disable shadows on leaves for performance
          branch.add(leaf);
        }
      }

      return branch;
    };

    // Create main tree
    const tree = createBranch({
      position: new THREE.Vector3(0, 0, 0),
      direction: new THREE.Vector3(0, 1, 0),
      length: 2.5,
      radius: 0.25,
      depth: 0,
    });
    scene.add(tree);

    // Create roots - simplified
    const rootGroup = new THREE.Group();
    const rootCount = 6; // Reduced from 8
    const rootGeometry = new THREE.CylinderGeometry(0.08, 0.04, 1.5, 6); // Shared geometry
    for (let i = 0; i < rootCount; i++) {
      const angle = (Math.PI * 2 * i) / rootCount;
      const root = new THREE.Mesh(rootGeometry, barkMaterial);
      
      root.position.set(
        Math.sin(angle) * 0.3,
        -0.75,
        Math.cos(angle) * 0.3
      );
      
      root.rotation.z = Math.sin(angle) * 0.4;
      root.rotation.x = Math.cos(angle) * 0.4;
      root.castShadow = true;
      
      rootGroup.add(root);
    }
    scene.add(rootGroup);

    // Animation loop - optimized
    let time = 0;
    let frameCount = 0;
    const animate = () => {
      requestAnimationFrame(animate);
      time += 0.01;
      frameCount++;

      // Gentle sway - only update every few frames
      if (frameCount % 2 === 0) {
        tree.rotation.z = Math.sin(time * 0.5) * 0.02;
        tree.rotation.x = Math.cos(time * 0.3) * 0.02;
      }

      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    // Handle resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (containerRef.current && renderer.domElement.parentNode === containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
      // Dispose geometries and materials
      groundGeometry.dispose();
      leafGeometry.dispose();
      rootGeometry.dispose();
      barkMaterial.dispose();
      leafMaterial.dispose();
      groundMaterial.dispose();
    };
  }, []);

  return (
    <div ref={containerRef} className="w-full h-screen">
      <div className="absolute top-4 left-4 text-white bg-black bg-opacity-50 p-3 rounded z-10">
        <p className="text-sm">🖱️ Drag to rotate</p>
        <p className="text-sm">🔍 Scroll to zoom</p>
      </div>
    </div>
  );
};

export default ThreeJsTree;

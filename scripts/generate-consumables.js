const fs = require('fs');
const path = require('path');
const THREE = require('three');
const { GLTFExporter } = require('three/examples/jsm/exporters/GLTFExporter.js');

// Create output directory if it doesn't exist
const outputDir = path.join(__dirname, '../public/models/consumables');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Generate Speed Potion
function generateSpeedPotion() {
  const scene = new THREE.Scene();
  
  // Create the potion body
  const bodyGeometry = new THREE.CylinderGeometry(0.3, 0.4, 0.8, 32);
  const bodyMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x3498db,
    roughness: 0.7,
    metalness: 0.3
  });
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  scene.add(body);
  
  // Create the potion neck
  const neckGeometry = new THREE.CylinderGeometry(0.15, 0.2, 0.2, 32);
  const neckMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x2980b9,
    roughness: 0.7,
    metalness: 0.3
  });
  const neck = new THREE.Mesh(neckGeometry, neckMaterial);
  neck.position.set(0, 0.5, 0);
  scene.add(neck);
  
  // Create the potion cap
  const capGeometry = new THREE.SphereGeometry(0.2, 32, 16);
  const capMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xe74c3c,
    roughness: 0.7,
    metalness: 0.3
  });
  const cap = new THREE.Mesh(capGeometry, capMaterial);
  cap.position.set(0, 0.65, 0);
  cap.scale.set(1, 0.5, 1);
  scene.add(cap);
  
  // Create the potion liquid
  const liquidGeometry = new THREE.CylinderGeometry(0.3, 0.4, 0.8, 32);
  const liquidMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x2ecc71,
    roughness: 0.7,
    metalness: 0.3,
    transparent: true,
    opacity: 0.8
  });
  const liquid = new THREE.Mesh(liquidGeometry, liquidMaterial);
  liquid.position.set(0, -0.05, 0);
  liquid.scale.set(0.9, 0.7, 0.9);
  scene.add(liquid);
  
  // Create bubbles
  const bubbleMaterial = new THREE.MeshBasicMaterial({ 
    color: 0xffffff,
    transparent: true,
    opacity: 0.7
  });
  
  const bubble1Geometry = new THREE.SphereGeometry(0.05, 16, 16);
  const bubble1 = new THREE.Mesh(bubble1Geometry, bubbleMaterial);
  bubble1.position.set(-0.1, 0.1, 0.1);
  scene.add(bubble1);
  
  const bubble2Geometry = new THREE.SphereGeometry(0.03, 16, 16);
  const bubble2 = new THREE.Mesh(bubble2Geometry, bubbleMaterial);
  bubble2.position.set(0.15, 0.2, -0.05);
  scene.add(bubble2);
  
  const bubble3Geometry = new THREE.SphereGeometry(0.04, 16, 16);
  const bubble3 = new THREE.Mesh(bubble3Geometry, bubbleMaterial);
  bubble3.position.set(0.05, 0, -0.15);
  scene.add(bubble3);
  
  // Group all objects
  const group = new THREE.Group();
  scene.children.forEach(child => {
    scene.remove(child);
    group.add(child);
  });
  group.name = "SpeedPotion";
  scene.add(group);
  
  // Export as GLB
  const exporter = new GLTFExporter();
  exporter.parse(
    scene,
    (gltf) => {
      const outputPath = path.join(outputDir, 'speed_potion.glb');
      const buffer = Buffer.from(gltf);
      fs.writeFileSync(outputPath, buffer);
      console.log(`Speed Potion exported to ${outputPath}`);
    },
    (error) => {
      console.error('An error happened during export:', error);
    },
    { binary: true }
  );
}

// Generate Health Potion
function generateHealthPotion() {
  const scene = new THREE.Scene();
  
  // Create the cup outer
  const cupOuterGeometry = new THREE.CylinderGeometry(0.4, 0.3, 0.8, 32);
  const cupOuterMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xffffff,
    roughness: 0.7,
    metalness: 0.3
  });
  const cupOuter = new THREE.Mesh(cupOuterGeometry, cupOuterMaterial);
  scene.add(cupOuter);
  
  // Create the cup inner
  const cupInnerGeometry = new THREE.CylinderGeometry(0.4, 0.3, 0.8, 32);
  const cupInnerMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xf0f0f0,
    roughness: 0.7,
    metalness: 0.3
  });
  const cupInner = new THREE.Mesh(cupInnerGeometry, cupInnerMaterial);
  cupInner.position.set(0, 0.05, 0);
  cupInner.scale.set(0.95, 0.95, 0.95);
  scene.add(cupInner);
  
  // Create the liquid
  const liquidGeometry = new THREE.CylinderGeometry(0.38, 0.28, 0.7, 32);
  const liquidMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xff0000,
    roughness: 0.4,
    metalness: 0.2,
    transparent: true,
    opacity: 0.8
  });
  const liquid = new THREE.Mesh(liquidGeometry, liquidMaterial);
  liquid.position.set(0, 0, 0);
  scene.add(liquid);
  
  // Create the lid
  const lidGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.05, 32);
  const lidMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xdddddd,
    roughness: 0.7,
    metalness: 0.5
  });
  const lid = new THREE.Mesh(lidGeometry, lidMaterial);
  lid.position.set(0, 0.425, 0);
  scene.add(lid);
  
  // Create the lid top
  const lidTopGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.1, 32);
  const lidTopMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xdddddd,
    roughness: 0.7,
    metalness: 0.5
  });
  const lidTop = new THREE.Mesh(lidTopGeometry, lidTopMaterial);
  lidTop.position.set(0, 0.5, 0);
  scene.add(lidTop);
  
  // Create heart symbol
  const heartShape = new THREE.Shape();
  heartShape.moveTo(0, 0.05);
  heartShape.bezierCurveTo(0, 0.09, 0.1, 0.09, 0.1, 0);
  heartShape.bezierCurveTo(0.1, -0.09, 0, -0.09, 0, -0.05);
  heartShape.bezierCurveTo(0, -0.09, -0.1, -0.09, -0.1, 0);
  heartShape.bezierCurveTo(-0.1, 0.09, 0, 0.09, 0, 0.05);
  
  const heartGeometry = new THREE.ExtrudeGeometry(heartShape, {
    depth: 0.02,
    bevelEnabled: false
  });
  const heartMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xff0000,
    roughness: 0.7,
    metalness: 0.3
  });
  const heart = new THREE.Mesh(heartGeometry, heartMaterial);
  heart.position.set(0, 0.1, -0.3);
  heart.rotation.set(Math.PI / 2, 0, 0);
  heart.scale.set(0.5, 0.5, 0.5);
  scene.add(heart);
  
  // Group all objects
  const group = new THREE.Group();
  scene.children.forEach(child => {
    scene.remove(child);
    group.add(child);
  });
  group.name = "HealthPotion";
  scene.add(group);
  
  // Export as GLB
  const exporter = new GLTFExporter();
  exporter.parse(
    scene,
    (gltf) => {
      const outputPath = path.join(outputDir, 'health_potion.glb');
      const buffer = Buffer.from(gltf);
      fs.writeFileSync(outputPath, buffer);
      console.log(`Health Potion exported to ${outputPath}`);
    },
    (error) => {
      console.error('An error happened during export:', error);
    },
    { binary: true }
  );
}

// Generate both potions
generateSpeedPotion();
generateHealthPotion();

console.log('Consumable models generation complete!'); 
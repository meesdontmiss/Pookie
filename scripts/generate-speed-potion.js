const fs = require('fs');
const path = require('path');
const THREE = require('three');
const { GLTFExporter } = require('three/examples/jsm/exporters/GLTFExporter.js');

// Load the speed potion model definition
const modelPath = path.join(__dirname, '../public/models/consumables/speed_potion.json');
const outputPath = path.join(__dirname, '../public/models/consumables/speed_potion.glb');

const modelData = JSON.parse(fs.readFileSync(modelPath, 'utf8'));

// Create a scene
const scene = new THREE.Scene();

// Process each part of the model
modelData.forEach(part => {
  let geometry;
  
  // Create geometry based on type
  switch (part.type) {
    case 'box':
      geometry = new THREE.BoxGeometry(
        part.parameters.width,
        part.parameters.height,
        part.parameters.depth
      );
      break;
    case 'sphere':
      geometry = new THREE.SphereGeometry(
        part.parameters.radius,
        part.parameters.widthSegments,
        part.parameters.heightSegments
      );
      break;
    case 'cylinder':
      geometry = new THREE.CylinderGeometry(
        part.parameters.radiusTop,
        part.parameters.radiusBottom,
        part.parameters.height,
        part.parameters.radialSegments
      );
      break;
    case 'cone':
      geometry = new THREE.ConeGeometry(
        part.parameters.radius,
        part.parameters.height,
        part.parameters.radialSegments
      );
      break;
    case 'plane':
      geometry = new THREE.PlaneGeometry(
        part.parameters.width,
        part.parameters.height,
        part.parameters.widthSegments,
        part.parameters.heightSegments
      );
      break;
    case 'torus':
      geometry = new THREE.TorusGeometry(
        part.parameters.radius,
        part.parameters.tube,
        part.parameters.radialSegments,
        part.parameters.tubularSegments
      );
      break;
    default:
      console.warn(`Unknown shape type: ${part.type}`);
      return;
  }
  
  // Create material
  let material;
  switch (part.materialType) {
    case 'basic':
      material = new THREE.MeshBasicMaterial({ color: part.color });
      break;
    case 'standard':
      material = new THREE.MeshStandardMaterial({ 
        color: part.color,
        roughness: 0.7,
        metalness: 0.3
      });
      break;
    case 'phong':
      material = new THREE.MeshPhongMaterial({ 
        color: part.color,
        shininess: 30
      });
      break;
    case 'wireframe':
      material = new THREE.MeshBasicMaterial({ 
        color: part.color,
        wireframe: true
      });
      break;
    default:
      material = new THREE.MeshStandardMaterial({ color: part.color });
  }
  
  // Create mesh
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...part.position);
  mesh.rotation.set(...part.rotation);
  mesh.scale.set(...part.scale);
  mesh.name = part.name;
  
  // Add to scene
  scene.add(mesh);
});

// Create a group for the entire model
const modelGroup = new THREE.Group();
modelGroup.name = "SpeedPotion";

// Add all scene objects to the group
while (scene.children.length > 0) {
  modelGroup.add(scene.children[0]);
}

// Add the group back to the scene
scene.add(modelGroup);

// Export as GLB
const exporter = new GLTFExporter();
exporter.parse(
  scene,
  (gltf) => {
    const buffer = Buffer.from(gltf);
    fs.writeFileSync(outputPath, buffer);
    console.log(`Speed potion model exported to ${outputPath}`);
  },
  (error) => {
    console.error('An error occurred during export:', error);
  },
  { binary: true }
); 
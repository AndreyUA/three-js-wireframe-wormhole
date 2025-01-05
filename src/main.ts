import "./style.css";

import * as THREE from "three";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { spline } from "./spline";

// Canvas
const canvas = document.querySelector("canvas.webgl") as HTMLCanvasElement;

// Sizes
const sizes = {
  width: globalThis.innerWidth,
  height: globalThis.innerHeight,
};

// Scene
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x000000, 0.3);

// Camera
const camera = new THREE.PerspectiveCamera(
  75,
  sizes.width / sizes.height,
  0.1,
  1_000
);
camera.position.z = 5;
scene.add(camera);

// Mouse crosshair
let mousePosition = new THREE.Vector2(0, 0);
const crosshairGroup = new THREE.Group();
crosshairGroup.position.z = -1;
camera.add(crosshairGroup);
const crosshairMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
const crosshairGeometry = new THREE.BufferGeometry();
const crosshairVertices = new Float32Array([0, 0.05, 0, 0, 0.02, 0]);
crosshairGeometry.setAttribute(
  "position",
  new THREE.BufferAttribute(crosshairVertices, 3)
);
for (let i = 0; i < 4; i++) {
  const line = new THREE.Line(crosshairGeometry, crosshairMaterial);
  line.rotation.z = (i * Math.PI) / 2;
  crosshairGroup.add(line);
}

// Renderer
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
});
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio, 2));
// TODO: read more about these
renderer.toneMapping = THREE.ACESFilmicToneMapping;
// TODO: read more about these
renderer.outputColorSpace = THREE.SRGBColorSpace;

// Post-processing
// TODO: read more about these
// ! https://threejs.org/docs/#manual/en/introduction/How-to-use-post-processing
const renderScene = new RenderPass(scene, camera);
// TODO: read more about these
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(sizes.width, sizes.height),
  1.5,
  0.4,
  100
);
bloomPass.threshold = 0.002;
bloomPass.strength = 3.5;
bloomPass.radius = 0;
// TODO: read more about these
// ! https://threejs.org/docs/?q=EffectComposer#examples/en/postprocessing/EffectComposer
const composer = new EffectComposer(renderer);
composer.addPass(renderScene);
composer.addPass(bloomPass);

// Create a line geometry from the spline
const points = spline.getPoints(100);
const geometry = new THREE.BufferGeometry().setFromPoints(points);
const material = new THREE.LineBasicMaterial({ color: 0xff0000 });
const line = new THREE.Line(geometry, material);
// scene.add(line);

// Create a tube geometry from the spline
const tubeGeo = new THREE.TubeGeometry(spline, 222, 0.65, 16, true);

// Create edges geometry from the spline
const edges = new THREE.EdgesGeometry(tubeGeo, 0.2);
const lineMat = new THREE.LineBasicMaterial({ color: 0xff0000 });
const tubeLines = new THREE.LineSegments(edges, lineMat);
scene.add(tubeLines);

const numBoxes = 55;
const size = 0.075;
const boxGeo = new THREE.BoxGeometry(size, size, size);
for (let i = 0; i < numBoxes; i += 1) {
  const boxMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    wireframe: true,
  });
  const box = new THREE.Mesh(boxGeo, boxMat);
  const p = (i / numBoxes + Math.random() * 0.1) % 1;
  const pos = tubeGeo.parameters.path.getPointAt(p);
  pos.x += Math.random() - 0.4;
  pos.z += Math.random() - 0.4;
  box.position.copy(pos);
  const rote = new THREE.Vector3(
    Math.random() * Math.PI,
    Math.random() * Math.PI,
    Math.random() * Math.PI
  );
  box.rotation.set(rote.x, rote.y, rote.z);
  const edges = new THREE.EdgesGeometry(boxGeo, 0.2);
  const color = new THREE.Color().setHSL(0.7 - p, 1, 0.5);
  const lineMat = new THREE.LineBasicMaterial({ color });
  const boxLines = new THREE.LineSegments(edges, lineMat);
  boxLines.position.copy(pos);
  boxLines.rotation.set(rote.x, rote.y, rote.z);
  // scene.add(box);
  scene.add(boxLines);
}

const updateCameraPosition = (time: number) => {
  const modifiedTime = time * 0.1;
  const looptime = 10 * 1000;
  const p = (modifiedTime % looptime) / looptime;
  const pos = tubeGeo.parameters.path.getPointAt(p);
  const lookAt = tubeGeo.parameters.path.getPointAt((p + 0.03) % 1);
  camera.position.copy(pos);
  camera.lookAt(lookAt);
};

// Animate
const tick: FrameRequestCallback = (time: number) => {
  updateCameraPosition(time);
  composer.render(time);

  // Update crosshair
  crosshairGroup.position.set(mousePosition.x, mousePosition.y, -1);

  // Call tick again on the next frame
  globalThis.requestAnimationFrame(tick);
};

// Resize event listener
const resizeHandler = () => {
  // Update sizes
  sizes.width = globalThis.innerWidth;
  sizes.height = globalThis.innerHeight;

  // Update camera
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();

  // Update renderer
  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio, 2));
};

// Mouse move event listener
const mouseMoveHandler = (event: MouseEvent) => {
  const aspectRatio = sizes.width / sizes.height;
  const fudge = {
    x: aspectRatio * 0.75,
    y: aspectRatio * 0.5,
  };

  mousePosition.x = ((event.clientX / sizes.width) * 2 - 1) * fudge.x;
  mousePosition.y = (-(event.clientY / sizes.height) * 2 + 1) * fudge.y;
};

// Event listeners
globalThis.addEventListener("resize", resizeHandler);
globalThis.addEventListener("mousemove", mouseMoveHandler);

tick(0);

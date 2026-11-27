import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function createMateScene(host, onLost) {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(31, 1, 0.1, 30);
  camera.position.set(0, 2.7, 7.4);
  camera.lookAt(0, 1.05, 0);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, 0.04);
  scene.environment = environment.texture;
  room.dispose();
  pmrem.dispose();
  scene.add(new THREE.HemisphereLight(0xfff4dc, 0x463329, 1.8));
  const key = new THREE.DirectionalLight(0xffe2b6, 2);
  key.position.set(-3, 5, 4);
  scene.add(key);

  const scrollGroup = new THREE.Group();
  scrollGroup.position.y = -0.15;
  const pointerGroup = new THREE.Group();
  scrollGroup.add(pointerGroup);
  scene.add(scrollGroup);
  scrollGroup.rotation.set(0, -0.3, -0.10);
  // Match the original Tierra Mate mark: wood grain, dark curved band,
  // ivory rim and a brown curved bombilla rather than a silver one.
  const woodCanvas = document.createElement('canvas');
  woodCanvas.width = 512; woodCanvas.height = 512;
  const woodContext = woodCanvas.getContext('2d');
  woodContext.fillStyle = '#b8764c';
  woodContext.fillRect(0, 0, 512, 512);
  for (let line = 0; line < 240; line++) {
    woodContext.beginPath();
    woodContext.strokeStyle = line % 3 ? '#7d452537' : '#ecc09255';
    woodContext.lineWidth = line % 4 ? 1 : 2;
    for (let y = 0; y <= 512; y += 4) {
      const x = line * 2.4 + Math.sin(y / 84 + line * 0.2) * 6 + Math.sin(y / 160 + line) * 9;
      if (!y) woodContext.moveTo(x, y); else woodContext.lineTo(x, y);
    }
    woodContext.stroke();
  }
  // The band bends around the rounded body, as in the original illustration.
  for (let y = 0; y < 512; y++) {
    const v = 1 - y / 512;
    const center = (0.09 - 0.23 * (1 - v) ** 2) * 512;
    woodContext.fillStyle = '#512b1b';
    for (const offset of [-512, 0, 512]) woodContext.fillRect(center + offset - 15, y, 30, 1);
  }
  const woodTexture = new THREE.CanvasTexture(woodCanvas);
  woodTexture.colorSpace = THREE.SRGBColorSpace;
  woodTexture.wrapS = THREE.RepeatWrapping;
  const wood = new THREE.MeshStandardMaterial({ map: woodTexture, color: 0xd5b59c, roughness: 0.65 });
  const metal = new THREE.MeshStandardMaterial({ color: 0xffedce, metalness: 0.05, roughness: 0.38 });
  const strawMaterial = new THREE.MeshStandardMaterial({ color: 0x753e24, metalness: 0.18, roughness: 0.42 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x34241b, roughness: 0.9 });
  const profile = new THREE.SplineCurve([
    [0.42, 0], [0.68, 0.08], [0.85, 0.38], [0.91, 0.75], [0.85, 1.08], [0.71, 1.38], [0.70, 1.48],
  ].map(([x, y]) => new THREE.Vector2(x, y)));
  const body = new THREE.Mesh(new THREE.LatheGeometry(profile.getPoints(48), 64), wood);
  pointerGroup.add(body);
  const ring = (radius, tube, height, material = metal) => {
    const mesh = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 12, 80), material);
    mesh.rotation.x = Math.PI / 2;
    mesh.position.y = height;
    pointerGroup.add(mesh);
  };
  ring(0.704, 0.075, 1.46);
  ring(0.73, 0.022, 1.35);
  ring(0.46, 0.055, 0.035, dark);
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.717, 0.75, 0.15, 64, 1, true), metal);
  collar.position.y = 1.4;
  pointerGroup.add(collar);

  const interior = new THREE.Mesh(new THREE.LatheGeometry([
    new THREE.Vector2(0.20, 1.13), new THREE.Vector2(0.48, 1.2), new THREE.Vector2(0.63, 1.43),
  ], 64), new THREE.MeshStandardMaterial({ color: 0x6b371f, roughness: 0.85, side: THREE.DoubleSide }));
  pointerGroup.add(interior);
  const insideBase = new THREE.Mesh(new THREE.CircleGeometry(0.48, 48), dark);
  insideBase.rotation.x = -Math.PI / 2;
  insideBase.position.y = 1.21;
  pointerGroup.add(insideBase);
  const strawPath = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.24, 1.2, 0.08), new THREE.Vector3(0.42, 1.9, 0.04),
    new THREE.Vector3(0.65, 2.65, 0.04), new THREE.Vector3(0.83, 2.8, 0.04),
  ]);
  pointerGroup.add(new THREE.Mesh(new THREE.TubeGeometry(strawPath, 32, 0.055, 12, false), strawMaterial));
  const mouthpiece = new THREE.Mesh(new THREE.SphereGeometry(0.067, 16, 12), strawMaterial);
  mouthpiece.scale.set(1.55, 0.55, 0.8);
  mouthpiece.position.copy(strawPath.getPoint(1));
  pointerGroup.add(mouthpiece);

  let visible = true;
  let lost = false;
  const draw = () => { if (visible && !document.hidden && !lost) renderer.render(scene, camera); };
  const resize = () => {
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    draw();
  };
  const media = gsap.matchMedia();
  media.add({ motion: '(prefers-reduced-motion: no-preference)', pointer: '(hover: hover) and (pointer: fine)' }, ({ conditions }) => {
    if (!conditions.motion) { draw(); return; }
    gsap.to(scrollGroup.rotation, { y: 0.65, z: 0.07, ease: 'none', onUpdate: draw,
      scrollTrigger: { trigger: host.closest('.hero'), start: 'top top', end: 'bottom top', scrub: true } });
    let tween;
    const move = (event) => {
      if (!visible || document.hidden) return;
      const bounds = host.getBoundingClientRect();
      tween?.kill();
      tween = gsap.to(pointerGroup.rotation, { x: (event.clientY - bounds.top - bounds.height / 2) / bounds.height * 0.12,
        y: (event.clientX - bounds.left - bounds.width / 2) / bounds.width * 0.38, duration: 0.8, ease: 'power3.out', onUpdate: draw });
    };
    const leave = () => {
      tween?.kill();
      tween = gsap.to(pointerGroup.rotation, { x: 0, y: 0, duration: 0.8, onUpdate: draw });
    };
    if (conditions.pointer) { host.addEventListener('pointermove', move); host.addEventListener('pointerleave', leave); }
    return () => { tween?.kill(); pointerGroup.rotation.set(0, 0, 0); host.removeEventListener('pointermove', move); host.removeEventListener('pointerleave', leave); };
  });
  const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; draw(); });
  observer.observe(host);
  const resizer = new ResizeObserver(resize);
  resizer.observe(host);
  const contextLost = (event) => { event.preventDefault(); lost = true; onLost(); };
  renderer.domElement.addEventListener('webglcontextlost', contextLost);
  document.addEventListener('visibilitychange', draw);
  host.appendChild(renderer.domElement);
  resize();

  return () => {
    media.revert(); observer.disconnect(); resizer.disconnect();
    document.removeEventListener('visibilitychange', draw);
    renderer.domElement.removeEventListener('webglcontextlost', contextLost);
    const geometries = new Set(); const materials = new Set();
    scene.traverse((object) => { if (object.geometry) geometries.add(object.geometry); if (object.material) materials.add(object.material); });
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
    woodTexture.dispose(); environment.dispose(); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove();
  };
}

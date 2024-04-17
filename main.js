import * as THREE from "three";
import { ARButton } from "three/examples/jsm/webxr/ARButton";

let container;
let camera, scene, renderer;
let controller;
const startScale = new THREE.Vector3(0.01, 0.01, 0.01); // Initial scale value for our model

let reticle;

let hitTestSource = null;
let hitTestSourceRequested = false;

init();
animate();

function init() {
  container = document.createElement("div");

  document.body.appendChild(container);

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.1,
    20
  );

  const light = new THREE.DirectionalLight();
  light.position.set(0, 2, 1, 1); // default

  scene.add(light); // Add soft white light to the scene.
  scene.add(new THREE.HemisphereLight(0xffffff, 0xbbbbff, 0.3)); // Add soft white light to the scene. var geometry = new THREE.PlaneGeometry( 10000, 10000, 1, 1 );
  // change floor color

  const surface = new THREE.Mesh(
    new THREE.PlaneGeometry(100, 100, 1, 1),
    new THREE.ShadowMaterial({
      side: THREE.DoubleSide,
      opacity: 0.5,
    })
  );
  surface.position.set(0, 0, 0);
  surface.rotation.x = (90 * Math.PI) / 180;
  surface.rotateX(-Math.PI / 2);
  surface.receiveShadow = true;
  scene.add(surface);
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  container.appendChild(renderer.domElement);

  camera.position.set(0, 3, 0);

  document.body.appendChild(
    ARButton.createButton(renderer, { requiredFeatures: ["hit-test"] })
  );

  const geometry = new THREE.CylinderGeometry(0.1, 0.1, 0.2, 32).translate(
    0,
    0.1,
    0
  );

  function onSelect() {
    if (reticle.visible) {
      const scale = { ...startScale };
      const material = new THREE.MeshPhongMaterial({
        color: 0xffffff * Math.random(),
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.scale.set(scale.x, scale.y, scale.z);

      reticle.matrix.decompose(mesh.position, mesh.quaternion, mesh.scale);
      mesh.scale.y = Math.random() * 2 + 1;
      scene.add(mesh);
    }
  }

  controller = renderer.xr.getController(0);
  controller.addEventListener("selectstart", onSelect);
  scene.add(controller);

  const geometryR = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const material = new THREE.MeshBasicMaterial({
    side: THREE.DoubleSide,
    transparent: true,
    color: "#FFFFFF",
    opacity: 0.4,
  });
  reticle = new THREE.Mesh(geometryR, material);
  reticle.matrixAutoUpdate = false;
  reticle.visible = false;
  let gridHelper = new THREE.GridHelper(1, 10, "#6EE907", "#6EE907").rotateX(
    -Math.PI / 2
  );
  gridHelper.geometry.rotateX(Math.PI * 0.5);
  reticle.add(gridHelper);

  const cameraOffset = new THREE.Vector3(0.0, 5.0, -5.0); // NOTE Constant offset between the camera and the target

  // NOTE Assuming the camera is direct child of the Scene
  const objectPosition = new THREE.Vector3();
  reticle.getWorldPosition(objectPosition);

  camera.position.copy(objectPosition).add(cameraOffset);
  scene.add(reticle);
  //

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  renderer.setAnimationLoop(render);
}

function render(timestamp, frame) {
  if (frame) {
    const referenceSpace = renderer.xr.getReferenceSpace();
    const session = renderer.xr.getSession();

    if (hitTestSourceRequested === false) {
      session.requestReferenceSpace("viewer").then(function (referenceSpace) {
        session
          .requestHitTestSource({ space: referenceSpace })
          .then(function (source) {
            hitTestSource = source;
          });
      });

      session.addEventListener("end", function () {
        hitTestSourceRequested = false;
        hitTestSource = null;
      });

      hitTestSourceRequested = true;
    }

    if (hitTestSource) {
      const hitTestResults = frame.getHitTestResults(hitTestSource);

      if (hitTestResults.length) {
        const hit = hitTestResults[0];

        reticle.visible = true;
        reticle.matrix.fromArray(hit.getPose(referenceSpace).transform.matrix);
      } else {
        reticle.visible = false;
      }
    }
  }
  renderer.render(scene, camera);
}

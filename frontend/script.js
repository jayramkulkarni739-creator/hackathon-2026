/**
 * NovaSphere 3D Tech Nexus - Frontend Core Logic & 3D Spatial Engine
 * Pure Vanilla JavaScript (No React, No Next.js, No TypeScript, No heavy frameworks)
 * Features:
 *  1. Dual-Host Auto-Fallback API Client (localhost / 127.0.0.1:8000)
 *  2. Interactive 3D Spatial Core (Three.js WebGL with Native Canvas 3D Fallback)
 *  3. Interactive 3D Flippable Holographic Pass with CSS Perspective
 *  4. 3D Parallax Tilt & Cursor Glare on Event Cards
 *  5. 3D Particle Constellation Background
 *  6. Real-Time Search, Category Filtering & Event Bookmarking
 *  7. Web Audio API Tech Synthesizer & Confetti Celebration
 */

// ==========================================================================
// 1. API Configuration & Dual-Host Auto-Fallback
// ==========================================================================
let activeApiHost = window.location.hostname === "localhost" ? "http://localhost:8000" : "http://127.0.0.1:8000";

async function apiFetch(endpoint, options = {}) {
  const t0 = performance.now();
  try {
    const res = await fetch(`${activeApiHost}${endpoint}`, options);
    const duration = Math.round(performance.now() - t0);
    const hudLat = document.getElementById("hud-latency");
    if (hudLat) hudLat.textContent = `${duration}ms`;
    if (window.logDevTelemetry) {
      window.logDevTelemetry("REST_200", `${options.method || "GET"} ${endpoint} (${duration}ms)`);
    }
    return res;
  } catch (err) {
    // If request fails, automatically attempt the alternate host
    const alternateHost = activeApiHost.includes("localhost")
      ? "http://127.0.0.1:8000"
      : "http://localhost:8000";
    try {
      const altRes = await fetch(`${alternateHost}${endpoint}`, options);
      const duration = Math.round(performance.now() - t0);
      const hudLat = document.getElementById("hud-latency");
      if (hudLat) hudLat.textContent = `${duration}ms`;
      if (window.logDevTelemetry) {
        window.logDevTelemetry("REST_FALLBACK", `${options.method || "GET"} ${endpoint} via ${alternateHost} (${duration}ms)`);
      }
      activeApiHost = alternateHost; // Switch to the responsive host
      return altRes;
    } catch {
      if (window.logDevTelemetry) {
        window.logDevTelemetry("REST_ERR", `Failed ${options.method || "GET"} ${endpoint}`);
      }
      throw err;
    }
  }
}

// ==========================================================================
// 2. Application State & Storage
// ==========================================================================
let allEvents = [];
let activeCategory = "all";
let searchQuery = "";
let savedEventIds = JSON.parse(localStorage.getItem("novasphere_saved_events") || "[]");
let soundEnabled = localStorage.getItem("novasphere_sound") === "true";
let countdownInterval = null;

// ==========================================================================
// 3. Web Audio API Tech Synthesizer
// ==========================================================================
let audioCtx = null;

function playTechTone(type = "click") {
  if (!soundEnabled) return;
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    const now = audioCtx.currentTime;

    if (type === "click") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(350, now + 0.05);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.start(now);
      osc.stop(now + 0.05);
    } else if (type === "success") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(523.25, now);         // C5
      osc.frequency.setValueAtTime(659.25, now + 0.08);  // E5
      osc.frequency.setValueAtTime(783.99, now + 0.16);  // G5
      osc.frequency.setValueAtTime(1046.50, now + 0.24); // C6
      gain.gain.setValueAtTime(0.16, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc.start(now);
      osc.stop(now + 0.45);
    } else if (type === "refresh") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.exponentialRampToValueAtTime(950, now + 0.14);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      osc.start(now);
      osc.stop(now + 0.14);
    } else if (type === "pulse") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(60, now + 0.35);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === "flip") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.08);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    }
  } catch (e) {
    // Graceful silent fallback if Web Audio is restricted
  }
}

// ==========================================================================
// 4. Floating Toast Notification System
// ==========================================================================
function showToast(message, type = "info") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;

  const icon = type === "success" ? "✓" : type === "error" ? "✕" : "ℹ";
  toast.innerHTML = `<span style="font-weight: bold; color: var(--neon-cyan);">${icon}</span> <span>${escapeHtml(message)}</span>`;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(40px)";
    toast.style.transition = "all 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ==========================================================================
// 5. Backend Health Polling
// ==========================================================================
async function checkBackendHealth() {
  const pulse = document.getElementById("status-pulse");
  const label = document.getElementById("status-label");
  if (!pulse || !label) return;

  try {
    const res = await apiFetch("/", { method: "GET" });
    if (res.ok) {
      pulse.className = "status-pulse online";
      label.textContent = "FastAPI Online (8000)";
      label.style.color = "var(--neon-green)";
    } else {
      throw new Error("Backend offline");
    }
  } catch (e) {
    pulse.className = "status-pulse offline";
    label.textContent = "Backend Offline (Run uvicorn)";
    label.style.color = "var(--accent-rose)";
  }
}

// ==========================================================================
// 6. Interactive 3D Spatial Core Engine (Three.js with Native 3D Fallback)
// ==========================================================================
let core3DControls = {
  wireframe: true,
  speedMultiplier: 1.0,
  pulseTrigger: null,
  changeColor: null,
  novaBurst: null
};

function initHero3DStage() {
  const canvas = document.getElementById("hero-3d-canvas");
  const container = document.getElementById("canvas-3d-viewport");
  if (!canvas || !container) return;

  // Check if Three.js is available via CDN
  if (typeof THREE !== "undefined") {
    initThreeJsCore(canvas, container);
  } else {
    initFallbackCanvas3D(canvas, container);
  }

  // Setup 3D Control Buttons
  const pulseBtn = document.getElementById("btn-3d-pulse");
  const wireframeBtn = document.getElementById("btn-3d-wireframe");
  const speedBtn = document.getElementById("btn-3d-speed");
  const colorBtn = document.getElementById("btn-3d-color");
  const explodeBtn = document.getElementById("btn-3d-explode");

  if (pulseBtn) {
    pulseBtn.addEventListener("click", () => {
      playTechTone("pulse");
      if (core3DControls.pulseTrigger) core3DControls.pulseTrigger();
      showToast("3D Energy Pulse wave emitted!", "info");
      window.logDevTelemetry?.("3D_PULSE", "Shockwave pulse triggered through spatial core");
    });
  }

  if (wireframeBtn) {
    wireframeBtn.addEventListener("click", () => {
      core3DControls.wireframe = !core3DControls.wireframe;
      wireframeBtn.innerHTML = core3DControls.wireframe
        ? "<span>🌐 Wireframe</span>"
        : "<span>💎 Solid Crystal</span>";
      playTechTone("click");
      window.logDevTelemetry?.("3D_MODE", `Geometry mode set to: ${core3DControls.wireframe ? "Wireframe" : "Solid"}`);
    });
  }

  if (colorBtn) {
    colorBtn.addEventListener("click", () => {
      playTechTone("click");
      if (core3DControls.changeColor) {
        const themeName = core3DControls.changeColor();
        showToast(`3D Core Matrix shifted to: ${themeName}`, "info");
        window.logDevTelemetry?.("3D_CORE", `Color Matrix shifted to: ${themeName}`);
      }
    });
  }

  if (explodeBtn) {
    explodeBtn.addEventListener("click", () => {
      playTechTone("pulse");
      if (core3DControls.novaBurst) {
        core3DControls.novaBurst();
        showToast("Particle Nova Burst triggered!", "success");
        window.logDevTelemetry?.("3D_CORE", "Particle Nova Burst wave emitted");
      }
    });
  }

  if (speedBtn) {
    speedBtn.addEventListener("click", () => {
      if (core3DControls.speedMultiplier === 1.0) {
        core3DControls.speedMultiplier = 2.5;
        speedBtn.innerHTML = "<span>⚡ Hyperdrive</span>";
      } else if (core3DControls.speedMultiplier === 2.5) {
        core3DControls.speedMultiplier = 4.0;
        speedBtn.innerHTML = "<span>🚀 Warp Speed</span>";
      } else {
        core3DControls.speedMultiplier = 1.0;
        speedBtn.innerHTML = "<span>🔄 Normal Speed</span>";
      }
      playTechTone("click");
      window.logDevTelemetry?.("3D_CORE", `Warp multiplier: ${core3DControls.speedMultiplier}x`);
    });
  }
}

// --- Implementation A: Three.js WebGL Spatial Engine ---
function initThreeJsCore(canvas, container) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
  camera.position.z = 4.8;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // Root group that tilts with mouse
  const rootGroup = new THREE.Group();
  scene.add(rootGroup);

  // 1. Central Icosahedron
  const icoGeo = new THREE.IcosahedronGeometry(1.4, 1);
  const icoMat = new THREE.MeshBasicMaterial({
    color: 0x00f0ff,
    wireframe: true,
    transparent: true,
    opacity: 0.85
  });
  const icoMesh = new THREE.Mesh(icoGeo, icoMat);
  rootGroup.add(icoMesh);

  // 2. Inner Glowing Core
  const innerGeo = new THREE.OctahedronGeometry(0.7, 0);
  const innerMat = new THREE.MeshBasicMaterial({
    color: 0xa855f7,
    wireframe: false,
    transparent: true,
    opacity: 0.7
  });
  const innerMesh = new THREE.Mesh(innerGeo, innerMat);
  rootGroup.add(innerMesh);

  // 3. Orbiting Gimbal Ring 1
  const ringGeo1 = new THREE.TorusGeometry(2.0, 0.02, 16, 100);
  const ringMat1 = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.55 });
  const ring1 = new THREE.Mesh(ringGeo1, ringMat1);
  ring1.rotation.x = Math.PI / 3;
  rootGroup.add(ring1);

  // 4. Orbiting Gimbal Ring 2
  const ringGeo2 = new THREE.TorusGeometry(2.3, 0.015, 16, 100);
  const ringMat2 = new THREE.MeshBasicMaterial({ color: 0xa855f7, transparent: true, opacity: 0.45 });
  const ring2 = new THREE.Mesh(ringGeo2, ringMat2);
  ring2.rotation.y = Math.PI / 4;
  rootGroup.add(ring2);

  // 5. Orbiting Satellites
  const satGeo = new THREE.SphereGeometry(0.08, 12, 12);
  const satMat = new THREE.MeshBasicMaterial({ color: 0x39ff14 });
  const satellites = [];
  for (let i = 0; i < 3; i++) {
    const sat = new THREE.Mesh(satGeo, satMat);
    rootGroup.add(sat);
    satellites.push({
      mesh: sat,
      angle: (i * Math.PI * 2) / 3,
      radius: 2.0,
      speed: 0.025 + i * 0.01
    });
  }

  // 6. Expanding 3D Pulse Wave
  const pulseRingGeo = new THREE.RingGeometry(0.1, 0.15, 64);
  const pulseRingMat = new THREE.MeshBasicMaterial({
    color: 0x00f0ff,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0
  });
  const pulseRing = new THREE.Mesh(pulseRingGeo, pulseRingMat);
  rootGroup.add(pulseRing);

  let pulseActive = false;
  let pulseScale = 0.1;
  let pulseOpacity = 0;

  core3DControls.pulseTrigger = () => {
    pulseActive = true;
    pulseScale = 0.1;
    pulseOpacity = 0.95;
    pulseRing.scale.set(1, 1, 1);
  };

  // 7. Ambient Floating Quantum Particles
  const dustGeo = new THREE.BufferGeometry();
  const dustCount = 90;
  const dustPositions = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount * 3; i += 3) {
    dustPositions[i] = (Math.random() - 0.5) * 8;
    dustPositions[i + 1] = (Math.random() - 0.5) * 8;
    dustPositions[i + 2] = (Math.random() - 0.5) * 8;
  }
  dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPositions, 3));
  const dustMat = new THREE.PointsMaterial({
    color: 0x00f0ff,
    size: 0.06,
    transparent: true,
    opacity: 0.75
  });
  const dustPoints = new THREE.Points(dustGeo, dustMat);
  scene.add(dustPoints);

  // 8. 4-Theme Futuristic Color Matrix Palettes
  const PALETTES = [
    { name: "Cyber Cyan", primary: 0x00f0ff, secondary: 0xa855f7, sat: 0x39ff14, ring: 0x00f0ff },
    { name: "Hyper Violet", primary: 0xd946ef, secondary: 0x00f0ff, sat: 0xf59e0b, ring: 0xd946ef },
    { name: "Matrix Emerald", primary: 0x00ff88, secondary: 0x00e5ff, sat: 0xa855f7, ring: 0x00ff88 },
    { name: "Solar Amber", primary: 0xffaa00, secondary: 0xff0055, sat: 0x00f0ff, ring: 0xffaa00 }
  ];

  let currentPaletteIdx = 0;
  core3DControls.changeColor = () => {
    currentPaletteIdx = (currentPaletteIdx + 1) % PALETTES.length;
    const p = PALETTES[currentPaletteIdx];
    icoMat.color.setHex(p.primary);
    innerMat.color.setHex(p.secondary);
    ringMat1.color.setHex(p.ring);
    ringMat2.color.setHex(p.secondary);
    satMat.color.setHex(p.sat);
    pulseRingMat.color.setHex(p.primary);
    dustMat.color.setHex(p.primary);
    return p.name;
  };

  // 9. Particle Nova Shockwave
  core3DControls.novaBurst = () => {
    core3DControls.pulseTrigger();
    satellites.forEach((s) => {
      s.radius = 4.2;
    });
    setTimeout(() => {
      satellites.forEach((s) => { s.radius = 2.0; });
    }, 1100);
  };

  // Interactive Mouse Parallax & Drag
  let targetRotX = 0;
  let targetRotY = 0;
  let isDragging = false;
  let prevMouseX = 0;
  let prevMouseY = 0;

  container.addEventListener("mousedown", (e) => {
    isDragging = true;
    prevMouseX = e.clientX;
    prevMouseY = e.clientY;
  });

  window.addEventListener("mouseup", () => { isDragging = false; });

  window.addEventListener("mousemove", (e) => {
    if (isDragging) {
      const deltaX = e.clientX - prevMouseX;
      const deltaY = e.clientY - prevMouseY;
      targetRotY += deltaX * 0.01;
      targetRotX += deltaY * 0.01;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    } else {
      const rect = container.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dist = Math.hypot(e.clientX - cx, e.clientY - cy);
      if (dist < 600) {
        targetRotY = ((e.clientX - cx) / rect.width) * 0.65;
        targetRotX = ((e.clientY - cy) / rect.height) * 0.65;
      }
    }
  });

  // Handle Resize
  window.addEventListener("resize", () => {
    if (!container.clientWidth) return;
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  });

  // Animation Loop & Live Telemetry
  let clock = 0;
  let frameCount = 0;
  let lastFpsCheck = performance.now();

  function animate() {
    requestAnimationFrame(animate);
    clock += 0.015 * core3DControls.speedMultiplier;

    // Apply wireframe toggle dynamically
    icoMat.wireframe = core3DControls.wireframe;

    // Smooth inertia rotation
    rootGroup.rotation.y += (targetRotY - rootGroup.rotation.y) * 0.06;
    rootGroup.rotation.x += (targetRotX - rootGroup.rotation.x) * 0.06;

    // Autonomous spin
    icoMesh.rotation.x += 0.006 * core3DControls.speedMultiplier;
    icoMesh.rotation.y += 0.008 * core3DControls.speedMultiplier;

    innerMesh.rotation.x -= 0.012 * core3DControls.speedMultiplier;
    innerMesh.rotation.z += 0.01 * core3DControls.speedMultiplier;

    ring1.rotation.z += 0.01 * core3DControls.speedMultiplier;
    ring2.rotation.x -= 0.008 * core3DControls.speedMultiplier;

    dustPoints.rotation.y += 0.001 * core3DControls.speedMultiplier;
    dustPoints.rotation.x -= 0.0006 * core3DControls.speedMultiplier;

    // Update satellites in 3D orbit
    satellites.forEach((sat) => {
      sat.angle += sat.speed * core3DControls.speedMultiplier;
      sat.mesh.position.x = Math.cos(sat.angle) * sat.radius;
      sat.mesh.position.y = Math.sin(sat.angle) * (sat.radius * 0.65);
      sat.mesh.position.z = Math.sin(sat.angle * 1.5) * 0.8;
    });

    // Animate expanding pulse
    if (pulseActive) {
      pulseScale += 0.08;
      pulseOpacity -= 0.018;
      pulseRing.scale.set(pulseScale, pulseScale, pulseScale);
      pulseRingMat.opacity = Math.max(0, pulseOpacity);
      if (pulseOpacity <= 0) {
        pulseActive = false;
      }
    }

    // Live FPS Telemetry
    frameCount++;
    const now = performance.now();
    if (now - lastFpsCheck >= 1000) {
      const fps = Math.round((frameCount * 1000) / (now - lastFpsCheck));
      const fpsEl = document.getElementById("stage-fps");
      if (fpsEl) fpsEl.textContent = `${fps} FPS`;
      const hudFpsEl = document.getElementById("hud-fps-val");
      if (hudFpsEl) hudFpsEl.textContent = `${fps} FPS`;
      frameCount = 0;
      lastFpsCheck = now;
    }

    renderer.render(scene, camera);
  }

  animate();
}

// --- Implementation B: Robust Fallback Canvas 3D Spatial Engine ---
function initFallbackCanvas3D(canvas, container) {
  const ctx = canvas.getContext("2d");
  let W = canvas.width = container.clientWidth;
  let H = canvas.height = container.clientHeight;

  window.addEventListener("resize", () => {
    W = canvas.width = container.clientWidth;
    H = canvas.height = container.clientHeight;
  });

  let rotX = 0.3;
  let rotY = 0;
  let pulseRadius = 0;
  let pulseOpacity = 0;

  core3DControls.pulseTrigger = () => {
    pulseRadius = 10;
    pulseOpacity = 0.9;
  };

  // Generate 3D sphere vertices
  const vertices = [];
  const rings = 8;
  const segments = 16;
  for (let r = 0; r <= rings; r++) {
    const theta = (r * Math.PI) / rings;
    for (let s = 0; s < segments; s++) {
      const phi = (s * 2 * Math.PI) / segments;
      vertices.push({
        x: Math.sin(theta) * Math.cos(phi) * 90,
        y: Math.cos(theta) * 90,
        z: Math.sin(theta) * Math.sin(phi) * 90,
      });
    }
  }

  function project(x, y, z) {
    const fov = 350;
    const scale = fov / (fov + z + 180);
    return {
      px: x * scale + W / 2,
      py: y * scale + H / 2,
      scale,
    };
  }

  function frame() {
    ctx.clearRect(0, 0, W, H);
    rotY += 0.012 * core3DControls.speedMultiplier;

    // Draw rotating wireframe vertices
    ctx.fillStyle = "#00f0ff";
    vertices.forEach((v) => {
      // 3D Rotation matrices
      const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
      const cosX = Math.cos(rotX), sinX = Math.sin(rotX);

      const x1 = v.x * cosY + v.z * sinY;
      const z1 = -v.x * sinY + v.z * cosY;
      const y1 = v.y * cosX - z1 * sinX;
      const z2 = v.y * sinX + z1 * cosX;

      const p = project(x1, y1, z2);
      ctx.beginPath();
      ctx.arc(p.px, p.py, Math.max(1, p.scale * 2.5), 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw Pulse if active
    if (pulseOpacity > 0) {
      pulseRadius += 3.5;
      pulseOpacity -= 0.02;
      ctx.beginPath();
      ctx.arc(W / 2, H / 2, pulseRadius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(0, 240, 255, ${Math.max(0, pulseOpacity)})`;
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }

    requestAnimationFrame(frame);
  }

  frame();
}

// ==========================================================================
// 7. Event Fetching & Rendering Suite
// ==========================================================================
const eventsContainer = document.getElementById("events-container");
const loadEventsBtn = document.getElementById("load-events-btn");
const heroLoadBtn = document.getElementById("hero-load-btn");
const emptyStateLoadBtn = document.getElementById("empty-state-load-btn");
const searchInput = document.getElementById("event-search-input");
const searchClearBtn = document.getElementById("search-clear-btn");
const categoryPills = document.getElementById("category-pills");
const eventSelect = document.getElementById("event-select");
const metricEventsCount = document.getElementById("metric-events-count");

async function fetchEvents(isManual = false) {
  if (isManual) {
    playTechTone("refresh");
    if (loadEventsBtn) {
      loadEventsBtn.classList.add("loading");
      loadEventsBtn.disabled = true;
    }
  }

  renderSkeletonLoader();

  try {
    const response = await apiFetch("/api/events");
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    allEvents = data.events || [];

    if (metricEventsCount) {
      metricEventsCount.textContent = allEvents.length;
    }

    populateEventDropdown(allEvents);
    renderEvents();
    startCountdown(allEvents[0]);

    if (isManual) {
      showToast(`Synchronized ${allEvents.length} live events from FastAPI!`, "success");
    }
  } catch (error) {
    console.warn("Could not reach backend; displaying fallback events:", error);
    allEvents = getFallbackEvents();
    populateEventDropdown(allEvents);
    renderEvents();
    startCountdown(allEvents[0]);
    if (isManual) {
      showToast("FastAPI offline. Showing local sample cache.", "info");
    }
  } finally {
    if (loadEventsBtn) {
      loadEventsBtn.classList.remove("loading");
      loadEventsBtn.disabled = false;
    }
    checkBackendHealth();
  }
}

function renderSkeletonLoader() {
  if (!eventsContainer) return;
  eventsContainer.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:1.25rem;">
      <div class="event-card" style="opacity:0.6; pointer-events:none;">
        <div style="height:24px; width:40%; background:var(--border-color); border-radius:4px; margin-bottom:12px;"></div>
        <div style="height:16px; width:80%; background:var(--border-color); border-radius:4px; margin-bottom:8px;"></div>
        <div style="height:16px; width:60%; background:var(--border-color); border-radius:4px;"></div>
      </div>
      <div class="event-card" style="opacity:0.4; pointer-events:none;">
        <div style="height:24px; width:40%; background:var(--border-color); border-radius:4px; margin-bottom:12px;"></div>
        <div style="height:16px; width:80%; background:var(--border-color); border-radius:4px; margin-bottom:8px;"></div>
      </div>
    </div>
  `;
}

function renderEvents() {
  if (!eventsContainer) return;

  const filtered = allEvents.filter((ev) => {
    // Category match
    let matchCat = false;
    if (activeCategory === "all") matchCat = true;
    else if (activeCategory === "saved") matchCat = savedEventIds.includes(ev.id);
    else matchCat = ev.category.toLowerCase() === activeCategory.toLowerCase();

    // Search query match
    let matchSearch = true;
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      matchSearch =
        ev.title.toLowerCase().includes(q) ||
        ev.description.toLowerCase().includes(q) ||
        ev.category.toLowerCase().includes(q) ||
        (ev.speaker && ev.speaker.toLowerCase().includes(q));
    }

    return matchCat && matchSearch;
  });

  if (filtered.length === 0) {
    eventsContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <h3>No matching events found</h3>
        <p>No workshops match the selected filters or keyword "<strong>${escapeHtml(searchQuery)}</strong>".</p>
        <button id="reset-filter-btn" class="btn btn-outline" type="button">Reset All Filters</button>
      </div>
    `;
    const resetBtn = document.getElementById("reset-filter-btn");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        activeCategory = "all";
        searchQuery = "";
        if (searchInput) searchInput.value = "";
        if (searchClearBtn) searchClearBtn.style.display = "none";
        document.querySelectorAll(".pill").forEach((p) => p.classList.toggle("active", p.dataset.category === "all"));
        renderEvents();
      });
    }
    return;
  }

  eventsContainer.innerHTML = filtered.map((ev) => createEventCardHtml(ev)).join("");

  // Attach card event listeners (3D tilt, star, quick register)
  setupCardInteractions();
}

function createEventCardHtml(ev) {
  const isSaved = savedEventIds.includes(ev.id);
  const seatsClass = ev.seats_left <= 5 ? "seats-badge low" : "seats-badge";

  return `
    <article class="event-card" data-id="${ev.id}">
      <div class="card-glare"></div>

      <div class="card-header-row">
        <div class="card-badges">
          <span class="card-category">${escapeHtml(ev.category)}</span>
          ${ev.badge ? `<span class="card-badge-special">${escapeHtml(ev.badge)}</span>` : ""}
        </div>
        <div class="card-actions-top">
          <button class="star-btn ${isSaved ? "starred" : ""}" data-id="${ev.id}" title="${isSaved ? "Remove bookmark" : "Bookmark workshop"}" type="button">
            ${isSaved ? "★" : "☆"}
          </button>
        </div>
      </div>

      <div class="card-body-row">
        <div class="card-icon-wrap" aria-hidden="true">${ev.icon || "🪐"}</div>
        <div class="card-info">
          <h3 class="event-title">${escapeHtml(ev.title)}</h3>
          <p class="event-desc">${escapeHtml(ev.description)}</p>
          <div class="event-meta-grid">
            <div class="meta-item"><span>📅</span> <strong>${escapeHtml(ev.date)}</strong></div>
            <div class="meta-item"><span>⏰</span> <span>${escapeHtml(ev.time)}</span></div>
            <div class="meta-item"><span>📍</span> <span>${escapeHtml(ev.location)}</span></div>
            <div class="meta-item"><span>👤</span> <span>${escapeHtml(ev.speaker || "Guest Mentor")}</span></div>
          </div>
        </div>
      </div>

      <div class="card-footer-row">
        <span class="${seatsClass}">⚡ ${ev.seats_left || 12} Seats Remaining</span>
        <button class="btn btn-primary btn-micro quick-reg-btn" data-id="${ev.id}" type="button">
          <span>Reserve Spot →</span>
        </button>
      </div>
    </article>
  `;
}

function setupCardInteractions() {
  // 1. Star / Bookmark buttons
  document.querySelectorAll(".star-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const id = parseInt(btn.dataset.id, 10);
      toggleBookmark(id);
    });
  });

  // 2. Quick Reserve Buttons
  document.querySelectorAll(".quick-reg-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      if (eventSelect) {
        eventSelect.value = id;
      }
      const regSection = document.getElementById("registration-section");
      if (regSection) {
        regSection.scrollIntoView({ behavior: "smooth" });
        const nameInput = document.getElementById("student-name");
        if (nameInput) nameInput.focus();
      }
      playTechTone("click");
    });
  });

  // 3. 3D Tilt & Light Glare on Mousemove
  document.querySelectorAll(".event-card").forEach((card) => {
    card.addEventListener("mousemove", (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Update glare position
      card.style.setProperty("--mouse-x", `${(x / rect.width) * 100}%`);
      card.style.setProperty("--mouse-y", `${(y / rect.height) * 100}%`);

      // Calculate 3D tilt angles
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const rx = ((y - cy) / cy) * -12; // vertical tilt
      const ry = ((x - cx) / cx) * 12;  // horizontal tilt

      card.style.transform = `perspective(1000px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) translateY(-6px)`;
    });

    card.addEventListener("mouseleave", () => {
      card.style.transform = "";
    });
  });
}

function toggleBookmark(id) {
  const index = savedEventIds.indexOf(id);
  if (index > -1) {
    savedEventIds.splice(index, 1);
    showToast("Event removed from bookmarks.", "info");
  } else {
    savedEventIds.push(id);
    showToast("Event saved to your bookmarks!", "success");
    playTechTone("click");
  }
  localStorage.setItem("novasphere_saved_events", JSON.stringify(savedEventIds));
  updateSavedCountBadge();
  renderEvents();
}

function updateSavedCountBadge() {
  const badge = document.getElementById("saved-count");
  if (badge) badge.textContent = savedEventIds.length;
}

function populateEventDropdown(events) {
  if (!eventSelect) return;
  const currentVal = eventSelect.value;
  eventSelect.innerHTML = '<option value="">NovaSphere Core Membership</option>';
  events.forEach((ev) => {
    const opt = document.createElement("option");
    opt.value = ev.id;
    opt.textContent = `${ev.title} (${ev.date})`;
    eventSelect.appendChild(opt);
  });
  if (currentVal) eventSelect.value = currentVal;
}

function getFallbackEvents() {
  return [
    {
      id: 1,
      title: "Full-Stack 3D Web Graphics & WebGL",
      category: "3D & Web",
      icon: "🪐",
      badge: "Beginner Friendly",
      seats_left: 22,
      date: "2026-10-06",
      time: "4:00 PM - 6:00 PM",
      location: "Innovation Lab 3 & Spatial VR Stream",
      description: "Master interactive 3D web interfaces, CSS 3D transforms, shaders, and spatial canvas rendering with zero prior experience.",
      speaker: "Elena Vance (Creative Technologist)"
    },
    {
      id: 2,
      title: "Autonomous AI Agents & Neural Architectures",
      category: "Artificial Intelligence",
      icon: "🤖",
      badge: "High Demand",
      seats_left: 7,
      date: "2026-10-12",
      time: "3:00 PM - 5:30 PM",
      location: "Auditorium Hall Alpha",
      description: "Explore practical agentic AI workflows, LLM orchestration, and fine-tuning with hands-on Python and FastAPI integration.",
      speaker: "Dr. Alex Rivera (AI Research Fellow)"
    },
    {
      id: 3,
      title: "NovaHacks 2026: 24h Campus Hackathon",
      category: "Hackathon",
      icon: "⚡",
      badge: "Flagship 24h",
      seats_left: 40,
      date: "2026-10-18",
      time: "9:00 AM - 6:00 PM",
      location: "NovaSphere Main Atrium",
      description: "Collaborate in teams to build innovative full-stack, AI, and spatial apps. Win prizes, build your portfolio, and receive mentor support.",
      speaker: "NovaSphere Dev Council"
    },
    {
      id: 4,
      title: "Cloud-Native DevOps & Container Matrix",
      category: "Cloud & DevOps",
      icon: "☁️",
      badge: "Hands-on Lab",
      seats_left: 15,
      date: "2026-10-24",
      time: "5:00 PM - 7:00 PM",
      location: "Virtual / Live Discord Stage",
      description: "Demystify cloud infrastructure, container orchestration, Docker fundamentals, and automated CI/CD pipelines simplified for beginners.",
      speaker: "Marcus Chen (Principal Cloud Engineer)"
    },
    {
      id: 5,
      title: "Zero-Trust Cybersecurity & Cryptography",
      category: "Security",
      icon: "🛡️",
      badge: "Limited Seats",
      seats_left: 4,
      date: "2026-10-30",
      time: "4:30 PM - 6:30 PM",
      location: "Cybersecurity Sandbox Lab",
      description: "Discover ethical hacking techniques, web vulnerability defense, OWASP guidelines, and cryptographic keys through gamified CTF challenges.",
      speaker: "Tanya Miller (Offensive Security Lead)"
    }
  ];
}

// ==========================================================================
// 8. Next Workshop Countdown Timer
// ==========================================================================
function startCountdown(targetEvent) {
  if (!targetEvent || !targetEvent.date) return;
  if (countdownInterval) clearInterval(countdownInterval);

  const eventNameEl = document.getElementById("countdown-event-name");
  if (eventNameEl) {
    eventNameEl.textContent = `Target: ${targetEvent.title} (${targetEvent.date})`;
  }

  const daysEl = document.getElementById("cd-days");
  const hoursEl = document.getElementById("cd-hours");
  const minsEl = document.getElementById("cd-mins");
  const secsEl = document.getElementById("cd-secs");

  function update() {
    const targetDate = new Date(`${targetEvent.date}T16:00:00`);
    const now = new Date();
    const diff = targetDate - now;

    if (diff <= 0) {
      if (daysEl) daysEl.textContent = "00";
      if (hoursEl) hoursEl.textContent = "00";
      if (minsEl) minsEl.textContent = "00";
      if (secsEl) secsEl.textContent = "00";
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const mins = Math.floor((diff / 1000 / 60) % 60);
    const secs = Math.floor((diff / 1000) % 60);

    if (daysEl) daysEl.textContent = String(days).padStart(2, "0");
    if (hoursEl) hoursEl.textContent = String(hours).padStart(2, "0");
    if (minsEl) minsEl.textContent = String(mins).padStart(2, "0");
    if (secsEl) secsEl.textContent = String(secs).padStart(2, "0");
  }

  update();
  countdownInterval = setInterval(update, 1000);
}

// ==========================================================================
// 9. Student Registration & 3D Flippable Pass
// ==========================================================================
const registrationForm = document.getElementById("registration-form");
const alertBox = document.getElementById("alert-box");
const submitBtn = document.getElementById("submit-btn");
const passWrapper = document.getElementById("tech-pass-wrapper");
const card3dObject = document.getElementById("card-3d-object");
const flipPassBtn = document.getElementById("flip-pass-btn");
const registerAnotherBtn = document.getElementById("register-another-btn");

if (registrationForm) {
  registrationForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nameInput = document.getElementById("student-name");
    const emailInput = document.getElementById("student-email");
    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const eventIdVal = eventSelect.value;
    const eventId = eventIdVal ? parseInt(eventIdVal, 10) : null;

    // Client-side validation
    if (!name) {
      showAlert("Please enter your full name.", "danger");
      nameInput.focus();
      return;
    }
    if (name.length < 2) {
      showAlert("Name must be at least 2 characters.", "danger");
      nameInput.focus();
      return;
    }
    if (!email || !email.includes("@") || !email.includes(".")) {
      showAlert("Please enter a valid email address.", "danger");
      emailInput.focus();
      return;
    }

    // Set loading state
    submitBtn.disabled = true;
    submitBtn.innerHTML = "<span>Transmitting to FastAPI...</span>";

    try {
      const response = await apiFetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, event_id: eventId })
      });

      let resData;
      try {
        resData = await response.json();
      } catch {
        resData = null;
      }

      if (!response.ok) {
        const errorMsg = (resData && resData.detail) || "Registration failed on server.";
        throw new Error(errorMsg);
      }

      // Success!
      playTechTone("success");
      launchConfetti();

      showAlert(
        `✓ <strong>Registration Confirmed!</strong> Welcome to NovaSphere, ${escapeHtml(name)}.`,
        "success"
      );

      // Display 3D Holographic Pass
      const regId = (resData && resData.data && resData.data.id) || Math.floor(Math.random() * 800 + 100);
      reveal3DTechPass(name, email, eventId, regId);

    } catch (err) {
      console.warn("Backend unavailable or failed; using resilient fallback pass:", err);
      playTechTone("success");
      launchConfetti();
      showAlert(
        `✓ <strong>Registration Verified!</strong> (Offline Mode) Welcome, ${escapeHtml(name)}.`,
        "success"
      );
      reveal3DTechPass(name, email, eventId, Math.floor(Math.random() * 900 + 100));
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = "<span>Generate 3D Pass</span> <span class='btn-arrow'>→</span>";
    }
  });
}

function reveal3DTechPass(name, email, eventId, regId) {
  let selectedEventTitle = "NovaSphere Core Membership";
  if (eventId) {
    const matched = allEvents.find((ev) => ev.id === eventId);
    if (matched) selectedEventTitle = matched.title;
  }

  // Populate pass fields
  document.getElementById("pass-name").textContent = name;
  document.getElementById("pass-email").textContent = email;
  document.getElementById("pass-event").textContent = selectedEventTitle;
  document.getElementById("pass-id").textContent = `#NOVA-2026-${String(regId).padStart(4, "0")}`;

  // Generate pseudo-cryptographic hash
  const pseudoHash = "0x" + Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  const hashEl = document.getElementById("pass-hash");
  if (hashEl) hashEl.textContent = pseudoHash;

  // Animate transition: hide form, show 3D pass
  registrationForm.style.display = "none";
  passWrapper.style.display = "block";
  if (card3dObject) card3dObject.classList.remove("flipped");

  // Setup 3D mouse tilt on the pass
  setupPass3DTilt();
}

function setupPass3DTilt() {
  const scene = document.getElementById("card-3d-scene");
  if (!scene || !card3dObject) return;

  scene.addEventListener("mousemove", (e) => {
    const rect = scene.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height / 2;

    const rx = ((y - cy) / cy) * -15;
    const ry = ((x - cx) / cx) * 15;

    const isFlipped = card3dObject.classList.contains("flipped");
    const baseRotY = isFlipped ? 180 : 0;

    card3dObject.style.transform = `rotateY(${baseRotY + ry}deg) rotateX(${rx}deg) translateY(-4px)`;
  });

  scene.addEventListener("mouseleave", () => {
    const isFlipped = card3dObject.classList.contains("flipped");
    card3dObject.style.transform = isFlipped ? "rotateY(180deg)" : "rotateY(0deg)";
  });
}

// Flip button
if (flipPassBtn && card3dObject) {
  flipPassBtn.addEventListener("click", () => {
    playTechTone("flip");
    card3dObject.classList.toggle("flipped");
  });
}

// Card face click to flip
if (card3dObject) {
  card3dObject.addEventListener("click", () => {
    playTechTone("flip");
    card3dObject.classList.toggle("flipped");
  });
}

// Register another student
if (registerAnotherBtn) {
  registerAnotherBtn.addEventListener("click", () => {
    passWrapper.style.display = "none";
    registrationForm.reset();
    registrationForm.style.display = "block";
    alertBox.style.display = "none";
    playTechTone("click");
    const nameInput = document.getElementById("student-name");
    if (nameInput) nameInput.focus();
  });
}

function showAlert(message, type = "success") {
  if (!alertBox) return;
  alertBox.className = `alert alert-${type}`;
  alertBox.innerHTML = message;
  alertBox.style.display = "block";
}

// ==========================================================================
// 10. Search & Filter Listeners
// ==========================================================================
if (searchInput) {
  searchInput.addEventListener("input", (e) => {
    searchQuery = e.target.value;
    if (searchClearBtn) {
      searchClearBtn.style.display = searchQuery ? "block" : "none";
    }
    renderEvents();
  });
}

if (searchClearBtn) {
  searchClearBtn.addEventListener("click", () => {
    searchQuery = "";
    if (searchInput) searchInput.value = "";
    searchClearBtn.style.display = "none";
    renderEvents();
  });
}

if (categoryPills) {
  categoryPills.addEventListener("click", (e) => {
    const pill = e.target.closest(".pill");
    if (!pill) return;
    document.querySelectorAll(".pill").forEach((p) => p.classList.remove("active"));
    pill.classList.add("active");
    activeCategory = pill.dataset.category || "all";
    playTechTone("click");
    renderEvents();
  });
}

// ==========================================================================
// 11. Theme & Sound Controllers
// ==========================================================================
function initTheme() {
  const themeBtn = document.getElementById("theme-toggle-btn");
  const themeIcon = document.getElementById("theme-icon");
  const savedTheme = localStorage.getItem("novasphere_theme") || "dark";

  document.documentElement.setAttribute("data-theme", savedTheme);
  if (themeIcon) themeIcon.textContent = savedTheme === "dark" ? "☀️" : "🌙";

  if (themeBtn) {
    themeBtn.addEventListener("click", () => {
      const current = document.documentElement.getAttribute("data-theme");
      const next = current === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      localStorage.setItem("novasphere_theme", next);
      if (themeIcon) themeIcon.textContent = next === "dark" ? "☀️" : "🌙";
      playTechTone("click");
    });
  }
}

function initSound() {
  const soundBtn = document.getElementById("sound-toggle-btn");
  const soundIcon = document.getElementById("sound-icon");
  if (soundIcon) soundIcon.textContent = soundEnabled ? "🔊" : "🔇";

  if (soundBtn) {
    soundBtn.addEventListener("click", () => {
      soundEnabled = !soundEnabled;
      localStorage.setItem("novasphere_sound", soundEnabled ? "true" : "false");
      if (soundIcon) soundIcon.textContent = soundEnabled ? "🔊" : "🔇";
      if (soundEnabled) playTechTone("click");
    });
  }
}

// ==========================================================================
// 12. 3D Spatial Particle Constellation Canvas
// ==========================================================================
function initParticleCanvas() {
  const canvas = document.getElementById("particle-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  let W = canvas.width = window.innerWidth;
  let H = canvas.height = window.innerHeight;

  window.addEventListener("resize", () => {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  });

  const PARTICLE_COUNT = 65;
  const CONNECTION_DIST = 140;

  // 3D Particles with depth (Z)
  const particles = Array.from({ length: PARTICLE_COUNT }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    z: Math.random() * 600 + 100,
    vx: (Math.random() - 0.5) * 0.45,
    vy: (Math.random() - 0.5) * 0.45,
    vz: (Math.random() - 0.5) * 0.3,
    r: Math.random() * 2 + 1,
  }));

  let mouseX = W / 2;
  let mouseY = H / 2;
  document.addEventListener("mousemove", (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  function project(x, y, z) {
    const fov = 500;
    const scale = fov / (fov + z);
    return {
      px: (x - W / 2) * scale + W / 2,
      py: (y - H / 2) * scale + H / 2,
      scale,
    };
  }

  function frame() {
    ctx.clearRect(0, 0, W, H);
    const isDark = document.documentElement.getAttribute("data-theme") !== "light";
    const neonRgb = isDark ? "0, 240, 255" : "0, 132, 200";

    const dx = (mouseX - W / 2) / W;
    const dy = (mouseY - H / 2) / H;

    particles.forEach((p) => {
      p.x += p.vx + dx * 0.25;
      p.y += p.vy + dy * 0.25;
      p.z += p.vz;

      if (p.x < 0 || p.x > W) p.vx *= -1;
      if (p.y < 0 || p.y > H) p.vy *= -1;
      if (p.z < 50 || p.z > 700) p.vz *= -1;

      const { px, py, scale } = project(p.x, p.y, p.z);
      const alpha = 0.15 + scale * 0.6;
      const radius = p.r * scale * 1.5;

      ctx.beginPath();
      ctx.arc(px, py, radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${neonRgb}, ${alpha})`;
      ctx.fill();
    });

    // 3D Euclidean connection lines
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const a = particles[i];
        const b = particles[j];
        const dist3D = Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);

        if (dist3D < CONNECTION_DIST * 2) {
          const pa = project(a.x, a.y, a.z);
          const pb = project(b.x, b.y, b.z);
          const alpha = (1 - dist3D / (CONNECTION_DIST * 2)) * 0.16;

          ctx.beginPath();
          ctx.moveTo(pa.px, pa.py);
          ctx.lineTo(pb.px, pb.py);
          ctx.strokeStyle = `rgba(${neonRgb}, ${alpha})`;
          ctx.lineWidth = 0.75;
          ctx.stroke();
        }
      }
    }

    requestAnimationFrame(frame);
  }

  frame();
}

// ==========================================================================
// 13. Celebration Confetti Cannon
// ==========================================================================
function launchConfetti() {
  const canvas = document.getElementById("confetti-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const count = 90;
  const colors = ["#00f0ff", "#a855f7", "#10b981", "#f59e0b", "#f43f5e"];
  const particles = [];

  for (let i = 0; i < count; i++) {
    particles.push({
      x: canvas.width / 2 + (Math.random() - 0.5) * 200,
      y: canvas.height * 0.55,
      vx: (Math.random() - 0.5) * 14,
      vy: Math.random() * -12 - 4,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: 1,
      rotation: Math.random() * 360,
    });
  }

  function step() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let anyAlive = false;

    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.38; // gravity
      p.alpha -= 0.014;

      if (p.alpha > 0) {
        anyAlive = true;
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      }
    });

    if (anyAlive) {
      requestAnimationFrame(step);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  requestAnimationFrame(step);
}

// ==========================================================================
// 14. Utility Helpers
// ==========================================================================
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ==========================================================================
// 15. Live Telemetry Logger & Terminal Inspector
// ==========================================================================
window.logDevTelemetry = function(tag, msg, payload = null) {
  const terminal = document.getElementById("terminal-body");
  if (!terminal) return;
  const time = new Date().toTimeString().split(" ")[0];
  const line = document.createElement("div");
  line.className = "t-line";
  if (tag.includes("200") || tag.includes("SUCCESS")) line.classList.add("t-success");
  else if (tag.includes("WARN")) line.classList.add("t-warn");
  else if (tag.includes("ERR") || tag.includes("FAIL")) line.classList.add("t-error");

  let payloadStr = "";
  if (payload) {
    try {
      payloadStr = ` <span style="opacity:0.75">${JSON.stringify(payload).slice(0, 140)}</span>`;
    } catch (_) {}
  }
  line.innerHTML = `<span class="t-time">[${time}]</span> <span class="t-tag">[${tag}]</span> <span>${escapeHtml(msg)}</span>${payloadStr}`;
  terminal.appendChild(line);
  terminal.scrollTop = terminal.scrollHeight;
};

// ==========================================================================
// 16. Initialization on DOM Ready
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initSound();
  checkBackendHealth();
  updateSavedCountBadge();
  fetchEvents();
  initHero3DStage();
  initParticleCanvas();

  const clearBtn = document.getElementById("clear-terminal-btn");
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      const term = document.getElementById("terminal-body");
      if (term) {
        term.innerHTML = '<div class="t-line t-system"><span class="t-time">[' + new Date().toTimeString().split(" ")[0] + ']</span> <span class="t-tag">[CLEARED]</span> Live telemetry console reset by user.</div>';
      }
    });
  }

  if (loadEventsBtn) {
    loadEventsBtn.addEventListener("click", () => fetchEvents(true));
  }

  if (heroLoadBtn) {
    heroLoadBtn.addEventListener("click", () => {
      fetchEvents(true);
      const evSection = document.getElementById("events-section");
      if (evSection) evSection.scrollIntoView({ behavior: "smooth" });
    });
  }

  if (emptyStateLoadBtn) {
    emptyStateLoadBtn.addEventListener("click", () => fetchEvents(true));
  }
});


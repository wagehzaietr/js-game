
// Game variables
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('scoreDisplay');
const healthFill = document.getElementById('healthFill');
const powerupDisplay = document.getElementById('powerupDisplay');
const powerupBar = document.getElementById('powerupBar');
const gameTitle = document.getElementById('gameTitle');
const startButton = document.getElementById('startButton');
const gameOverScreen = document.getElementById('gameOver');
const finalScore = document.getElementById('finalScore');
const restartButton = document.getElementById('restartButton');
const soundToggle = document.getElementById('soundToggle');
// Upgrade modal elements
const upgradeModal = document.getElementById('upgradeModal');
const upgradeOptionsWrap = document.getElementById('upgradeOptions');

let gameRunning = false;
let score = 0;
let playerHealth = 100;
let soundEnabled = true;
let activePowerup = null;
let powerupTimeLeft = 0;
let powerupMaxTime = 0;
// Rounds and Bosses
let round = 1;
let roundInProgress = false;
let enemiesToSpawn = 0; // remaining enemies to spawn this round
let baseEnemiesPerRound = 12;
let nextRoundTimeout = null;
let pausedForUpgrade = false; // pause updates while choosing an upgrade
let isPaused = false; // global pause state (ESC)
// Multiple bosses support
let bosses = [];
const bossActive = () => bosses.length > 0;
// Round HUD/banner
let roundBannerStart = 0;
const ROUND_BANNER_DURATION = 1500; // ms

// Persistent upgradeable stats
const basePlayerSpeed = 5;
let playerSpeedMult = 1.0;
const baseShootCooldown = 200; // ms baseline
let fireRateMult = 1.0; // lower is faster
let bulletSpeed = 10; // px/frame
let playerDamage = 1; // damage per bullet
let multiShotBonus = 0; // additional bullets beyond 1

let player = {
    x: canvas.width / 2,
    y: canvas.height - 100,
    width: 120,
    height: 120,
    speed: 5,
    color: '#5d4037'
};

let bullets = [];
let enemies = [];
let particles = [];
let powerups = [];
let hitEffects = [];
let keys = {};
let lastEnemySpawn = 0;
let enemySpawnRate = 2300; // milliseconds
let lastShot = 0;
let shootCooldown = 200; // milliseconds (effective, derived from baseShootCooldown * fireRateMult)
let lastPowerupSpawn = 0;
let powerupSpawnRate = 15000; // milliseconds
let autoFiring = true; // auto-fire state for autofire powerup
let holdingFire = false; // true while mouse is held down

// Shotgun power-up state
let hasShotgun = false;
let shotgunAmmo = 0;
const SHOTGUN_MAX_AMMO = 12; // 12 shots
const SHOTGUN_PELLETS = 5; // 5 pellets per shot
const SHOTGUN_SPREAD = 0.4; // spread angle in radians

// Energy Ball ability (charged by kills, fire with 'E')
let energyBallCharge = 0;      // 0..100
const ENERGY_BALL_MAX = 100;
let energyBall = null;         // {x,y,vx,vy,radius,damage,life,maxLife}

// Map power-up type to its image (if available)
function getPowerupImage(type) {
    switch (type) {
        case 'health': return heartPowerupImg;
        case 'triple': return triplePowerupImg;
        case 'spread': return spreadPowerupImg;
        case 'rapid': return rapidPowerupImg;
        case 'autofire': return autofirePowerupImg;
        case 'shotgun': return shotgunImg;
        default: return null; // e.g., 'mystery' has no sprite specified
    }
}
const ENERGY_BALL_SPEED = 5.0; // slow
const ENERGY_BALL_RADIUS = 58; // big
const ENERGY_BALL_DAMAGE_ENEMY = 5; // per hit on regular enemy
const ENERGY_BALL_DAMAGE_BOSS = 12; // per hit on boss
const ENERGY_BALL_RANGE = 2200;     // max travel distance in px

// Sprites
const enemyImg = new Image();
enemyImg.src = 'assets/images/enemymalek1.png';
const enemyImg2 = new Image();
enemyImg2.src = 'assets/images/enemymalek2.png';
const enemyImg3 = new Image();
enemyImg3.src = 'assets/images/enemymalek3.png';

// New animated enemy frames
const frameOneImg = new Image();
frameOneImg.src = 'assets/new-images/frame-one-img.png';
const frameTwoImg = new Image();
frameTwoImg.src = 'assets/new-images/frame-two-img.png';
const frameThreeImg = new Image();
frameThreeImg.src = 'assets/new-images/frame-three-img.png';
const frameFourImg = new Image();
frameFourImg.src = 'assets/new-images/frame-four-img.png';
const tankImg = new Image();
tankImg.src = 'assets/images/enemy2.png';
const turretImg = new Image();
turretImg.src = 'assets/images/gun.png';
// Shotgun sprite for player hand
const shotgunImg = new Image();
shotgunImg.src = 'assets/images/shotgun-img.png';
// Bullet sprite
const bulletImg = new Image();
bulletImg.src = 'assets/images/bullet-img.png';
// Hit effect sprite
const hitEffectImg = new Image();
hitEffectImg.src = 'assets/images/hit-effect.png';
// Boss sprites
const bossImg1 = new Image();
bossImg1.src = 'assets/images/boss-img1.png';
const bossImg2 = new Image();
bossImg2.src = 'assets/images/boss-img2.png';
// Arena background
const arenaFloorImg = new Image();
arenaFloorImg.src = 'assets/images/arena.png';

// Power-up sprites
const heartPowerupImg = new Image();
heartPowerupImg.src = 'assets/images/heart-powerup.png';
const triplePowerupImg = new Image();
triplePowerupImg.src = 'assets/images/triple-powerup.png';
const spreadPowerupImg = new Image();
spreadPowerupImg.src = 'assets/images/spread-powerup.png';
const rapidPowerupImg = new Image();
rapidPowerupImg.src = 'assets/images/rapid-powerup.png';
const autofirePowerupImg = new Image();
autofirePowerupImg.src = 'assets/images/autofire-powerup.png';

// Gun placement configuration (tweak these to fine-tune hand alignment)
// Toggle to show/hide the visual gun sprite. When false, bullets will
// originate from the player's hand so it looks like the player shoots without a gun image.
const SHOW_GUN = false;
const GUN_CONFIG = {
    // How large the gun should be relative to player width
    widthScale: 0.6,        // ~90% of player.width
    // Pivot point inside the gun image (where the character grips the gun)
    // expressed as a ratio of the drawn gun width/height (0..1)
    pivotX: 0.28,           // move grip further right on the gun image
    pivotY: 0.52,           // slightly above middle
    // Where the hand is relative to player center (in pixels)
    gripOffsetX: 3,        // shift gun further to the player's right side
    gripOffsetY: -6         // bring gun a bit upward
};
// When the gun is hidden, use this to place the muzzle relative to the player's center/hand
const PLAYER_MUZZLE = {
    forwardScale: 0.48,  // how far from hand along aim (as fraction of player width)
    upBias: -0.02        // slight vertical bias relative to player width
};

// Player base rotation calibration (in radians).
// Adjust this if the sprite's default facing isn't aligned with the aim.
// Common values: 0, Math.PI/2 (90°), -Math.PI/2 (-90°), Math.PI (180°)
const PLAYER_ROT_OFFSET = -Math.PI / 2;

// Audio context for sound effects
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
// Enemy sfx pool (multiple variants) for randomization
const enemySfxUrls = [

    'assets/audio/pop.mp3',
    'assets/audio/enemies4.wav',
    'assets/audio/enemies7.wav',

];
let enemySfxBuffers = []; // Array<AudioBuffer|null>
// HTMLAudioElement fallback for local file:// usage
let enemySfxAudios = []; // Array<HTMLAudioElement>

// Load audio file as AudioBuffer
async function loadAudioBuffer(url) {
    try {
        const res = await fetch(url);
        const arrayBuf = await res.arrayBuffer();
        return await audioContext.decodeAudioData(arrayBuf);
    } catch (e) {
        console.warn('Failed to load sound', url, e);
        return null;
    }
}

// Preload all enemy sfx variants (buffer + HTMLAudio fallback)
(async function preloadEnemySfx() {
    try {
        enemySfxBuffers = await Promise.all(enemySfxUrls.map(u => loadAudioBuffer(u)));
    } catch (_) {
        enemySfxBuffers = new Array(enemySfxUrls.length).fill(null);
    }
    enemySfxAudios = enemySfxUrls.map(u => new Audio(u));
})();

// Boss audio (intro stinger + looping theme)
const bossIntroAudio = new Audio('assets/audio/boss-sound.wav');
const bossThemeAudio = new Audio('assets/audio/boss-theme.mp3');
bossIntroAudio.preload = 'auto';
bossThemeAudio.preload = 'auto';
bossThemeAudio.loop = true;
bossIntroAudio.volume = 0.7;
bossThemeAudio.volume = 0.7;
// Variant 2 intro with slightly higher pitch/volume
const boss2IntroAudio = new Audio('assets/audio/boss-sound.wav');
boss2IntroAudio.preload = 'auto';
try { boss2IntroAudio.playbackRate = 1.2; } catch (_) {}
boss2IntroAudio.volume = 1.0;

// Shooting sound (HTMLAudio) with small pool to avoid stacking
const SHOOT_POOL_SIZE = 6;
const shootPool = Array.from({ length: SHOOT_POOL_SIZE }, () => {
    const a = new Audio('assets/audio/shooting-sound2.mp3');
    a.preload = 'auto';
    a.volume = 0.2; // keep user-adjusted volume
    return a;
});
let shootPoolIdx = 0;

// Energy Ball cast sound
const energyBallCastAudio = new Audio('assets/audio/wave-sound.mp3');
energyBallCastAudio.preload = 'auto';
energyBallCastAudio.volume = .9;

// Shotgun sound
const shotgunAudio = new Audio('assets/audio/shotgun-sound.mp3');
shotgunAudio.preload = 'auto';
shotgunAudio.volume = 0.5;

function stopAllShootSounds() {
    for (const a of shootPool) {
        try { a.pause(); } catch (_) {}
        try { a.currentTime = 0; } catch (_) {}
    }
}

function playEnergyBallCast() {
    if (!soundEnabled) return;
    try { energyBallCastAudio.currentTime = 0; } catch (_) {}
    energyBallCastAudio.play().catch(() => {});
}

function playShotgunSound() {
    if (!soundEnabled) return;
    try { shotgunAudio.currentTime = 0; } catch (_) {}
    shotgunAudio.play().catch(() => {});
}

function playBossIntro() {
    if (!soundEnabled) return;
    try { bossIntroAudio.currentTime = 0; } catch (_) {}
    bossIntroAudio.play().catch(() => {});
}

function startBossTheme() {
    if (!soundEnabled) return;
    try { bossThemeAudio.currentTime = 0; } catch (_) {}
    bossThemeAudio.play().catch(() => {});
}

function stopBossTheme() {
    try { bossThemeAudio.pause(); } catch (_) {}
}

function updateBosses() {
    if (!bossActive()) return;
    for (const boss of bosses) {
        const angle = Math.atan2(player.y - boss.y, player.x - boss.x);
        // Allow variant behavior
        const speed = boss.speed * (boss.variant === 2 ? 1.15 : 1.0);
        boss.x += Math.cos(angle) * speed;
        boss.y += Math.sin(angle) * speed;

        // Animate boss sprite (simple 2-frame toggle)
        if (boss.imgs && boss.imgs.length > 1) {
            boss.frameTime = (boss.frameTime || 0) + 16; // ~60fps tick
            const interval = boss.frameInterval || 200;
            if (boss.frameTime >= interval) {
                boss.frame = ((boss.frame || 0) + 1) % boss.imgs.length;
                boss.frameTime = 0;
            }
        }

        // Collision with player
        const dx = player.x - boss.x;
        const dy = player.y - boss.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < player.width/2 + boss.width/2) {
            playerHealth -= 20; // hurts more
            updateHealth();
            playBossExplosionSound();
            for (let k = 0; k < 30; k++) {
                particles.push({
                    x: player.x,
                    y: player.y,
                    vx: (Math.random() - 0.5) * 12,
                    vy: (Math.random() - 0.5) * 12,
                    life: 45,
                    maxLife: 45
                });
            }
            // knock boss slightly back
            boss.x -= Math.cos(angle) * 20;
            boss.y -= Math.sin(angle) * 20;
            if (playerHealth <= 0) {
                gameOver();
            }
        }
    }
}

// Helper to play an AudioBuffer
function playBuffer(buffer, { volume = 0.9, rate = .9 } = {}) {
    if (!buffer) return;
    const src = audioContext.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = rate;
    const gain = audioContext.createGain();
    gain.gain.value = volume;
    src.connect(gain).connect(audioContext.destination);
    src.start();
}


// Sound effects
function playSound(frequency, duration, type = 'sine', volume = 0.7) {
    if (!soundEnabled) return;
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gainNode.gain.value = volume;
    
    oscillator.start();
    gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + duration/1000);
    
    setTimeout(() => {
        oscillator.stop();
    }, duration);
}

function pickRandomIndex(max) {
    return Math.floor(Math.random() * max);
}

function playRandomEnemySfx({ bossTone = false, overrideVol = null } = {}) {
    if (!soundEnabled) return;
    const idx = pickRandomIndex(enemySfxUrls.length);
    const buf = enemySfxBuffers[idx];
    const rateBase = bossTone ? 1.5 : 1.0;
    const rateJitter = bossTone ? 0.5 : 0.2;
    const volBase = bossTone ? 0.9 : 0.15; // lower regular enemy explosion volume
    const volJitter = bossTone ? 0.2 : 0.1;
    const rate = rateBase + (Math.random() * rateJitter - rateJitter/2);
    const computedVol = Math.min(1, Math.max(0, volBase + (Math.random() * volJitter - volJitter/2)));
    const vol = (overrideVol !== null) ? overrideVol : computedVol;
    if (buf) {
        playBuffer(buf, { volume: vol, rate });
        return;
    }
    const fallback = enemySfxAudios[idx] || new Audio(enemySfxUrls[idx]);
    const node = fallback.cloneNode();
    node.volume = vol;
    try { node.playbackRate = rate; } catch (_) {}
    node.play().catch(() => {});
}

function playExplosionSound() {
    // randomized variant for regular enemy deaths/collisions
    playRandomEnemySfx({ bossTone: false });
}

// Boss-specific higher-pitch explosion
function playBossExplosionSound() {
    // randomized variant with higher pitch/volume for boss
    playRandomEnemySfx({ bossTone: true });
}

// Quieter boss hit feedback (for bullet hits on boss)
function playBossHitSound() {
    // use bossTone timbre but with lower volume
    playRandomEnemySfx({ bossTone: true, overrideVol: 0.2 });
}

function playPowerupSound() {
    if (!soundEnabled) return;
    
    playSound(523.25, 200, 'triangle'); // C5
    setTimeout(() => playSound(659.25, 200, 'triangle'), 100); // E5
    setTimeout(() => playSound(783.99, 300, 'triangle'), 200); // G5
}

function playShootSound() {
    if (!soundEnabled) return;
    const node = shootPool[shootPoolIdx];
    shootPoolIdx = (shootPoolIdx + 1) % SHOOT_POOL_SIZE;
    try { node.pause(); } catch (_) {}
    try { node.currentTime = 0; } catch (_) {}
    node.play().catch(() => {});
}

function playHitSound() {
    if (!soundEnabled) return;
    
    // Further lower volume for enemy hit feedback
    playSound(200, 120, 'sawtooth', 0.20);
}

// Event listeners
window.addEventListener('keydown', (e) => {
    // Toggle pause on ESC
    if (e.key === 'Escape') {
        togglePause();
        return;
    }
    keys[e.key.toLowerCase()] = true;
    // Energy Ball cast on 'E'
    if (e.key.toLowerCase() === 'e') {
        tryCastEnergyBall();
    }
});

window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

// Hold-to-fire: on mousedown, begin holding and fire immediately
canvas.addEventListener('mousedown', (e) => {
    holdingFire = true;
    shoot(e);
});
// Stop holding on mouseup/leave
canvas.addEventListener('mouseup', () => { holdingFire = false; });
canvas.addEventListener('mouseleave', () => { holdingFire = false; });
canvas.addEventListener('mousemove', (e) => {
    mouse.x = e.offsetX;
    mouse.y = e.offsetY;
});

startButton.addEventListener('click', startGame);
restartButton.addEventListener('click', startGame);
soundToggle.addEventListener('click', toggleSound);

let mouse = { x: 0, y: 0 };

// Toggle sound
function toggleSound() {
    soundEnabled = !soundEnabled;
    soundToggle.textContent = soundEnabled ? '🔊 SOUND ON' : '🔇 SOUND OFF';
    // Manage boss theme according to sound state
    if (!soundEnabled) {
        stopBossTheme();
        stopAllShootSounds();
    } else if (bossActive) {
        startBossTheme();
    }
}

// Game functions
function resizeCanvas() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    // Set CSS size
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    // Set drawing buffer size (keep 1:1 for simplicity)
    canvas.width = w;
    canvas.height = h;
    // Clamp player inside new bounds
    if (player) {
        player.x = Math.max(player.width / 2, Math.min(canvas.width - player.width / 2, player.x));
        player.y = Math.max(player.height / 2, Math.min(canvas.height - player.height / 2, player.y));
    }
}

window.addEventListener('resize', resizeCanvas);
function getGunMuzzleWorldPos() {
    // Computes the world position of the firing muzzle based on current aim
    const angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);

    // Base hand/grip position relative to player center (adjust for shotgun)
    let gripX = GUN_CONFIG.gripOffsetX;
    let gripY = GUN_CONFIG.gripOffsetY;
    
    if (hasShotgun) {
        gripX = -2; // Match the adjusted grip position
        gripY = -2;
    }

    if (!SHOW_GUN && !hasShotgun) {
        // No visible gun: place muzzle a bit forward from the hand along the aim,
        // so it looks like the projectile comes from the player's hands.
        const forward = player.width * PLAYER_MUZZLE.forwardScale;
        const up = player.width * PLAYER_MUZZLE.upBias;
        const offX = forward * cosA - up * sinA;
        const offY = forward * sinA + up * cosA;
        return {
            x: player.x + gripX + offX,
            y: player.y + gripY + offY,
            angle
        };
    }

    // Visible gun or shotgun: compute muzzle using the gun sprite geometry
    const gunW = Math.max(36, player.width * (hasShotgun ? 0.7 : GUN_CONFIG.widthScale));
    const aspect = ((hasShotgun ? shotgunImg : turretImg).naturalWidth && (hasShotgun ? shotgunImg : turretImg).naturalHeight)
        ? ((hasShotgun ? shotgunImg : turretImg).naturalHeight / (hasShotgun ? shotgunImg : turretImg).naturalWidth)
        : 0.5;
    const gunH = gunW * aspect;
    
    // Use different pivot points for shotgun
    const pivotX = hasShotgun ? 0.55 : GUN_CONFIG.pivotX;
    const pivotY = hasShotgun ? 0.45 : GUN_CONFIG.pivotY;
    
    const px = gunW * pivotX;
    const py = gunH * pivotY;
    
    // Muzzle position - adjust for shotgun to align with center aim
    let muzzleLocalX, muzzleLocalY;
    if (hasShotgun) {
        // For shotgun: position muzzle more forward and centered
        muzzleLocalX = gunW * 0.85; // Further forward on shotgun
        muzzleLocalY = 0; // Centered vertically
    } else {
        // Original calculation for regular gun
        muzzleLocalX = gunW - px;
        muzzleLocalY = (0.5 * gunH - py) * 0.1; // subtle upward bias
    }
    
    const offX = muzzleLocalX * cosA - muzzleLocalY * sinA;
    const offY = muzzleLocalX * sinA + muzzleLocalY * cosA;
    return {
        x: player.x + gripX + offX,
        y: player.y + gripY + offY,
        angle
    };
}
function fireOnce() {
    if (!gameRunning) return;
    const now = Date.now();
    if (now - lastShot < shootCooldown) return;
    lastShot = now;
    
    // Check if shotgun is equipped and has ammo
    if (hasShotgun && shotgunAmmo > 0) {
        // Fire shotgun
        playShotgunSound();
        shotgunAmmo--;
        
        const muzzle = getGunMuzzleWorldPos();
        
        // Fire multiple pellets in a spread pattern
        for (let i = 0; i < SHOTGUN_PELLETS; i++) {
            let angle = muzzle.angle;
            // Add spread to each pellet
            angle += (Math.random() - 0.5) * SHOTGUN_SPREAD;
            
            bullets.push({
                x: muzzle.x,
                y: muzzle.y,
                vx: Math.cos(angle) * bulletSpeed * 1.2, // Slightly faster
                vy: Math.sin(angle) * bulletSpeed * 1.2,
                radius: 4, // Slightly smaller pellets
                color: '#8d6e63',
                damage: playerDamage * 0.8 // Slightly less damage per pellet
            });
        }
        
        // Check if shotgun is empty
        if (shotgunAmmo <= 0) {
            hasShotgun = false;
            activePowerup = null;
            powerupTimeLeft = 0;
        }
        
        // Create muzzle flash particles for shotgun
        const baseAngle = muzzle.angle;
        for (let i = 0; i < 15; i++) { // More particles for shotgun
            particles.push({
                x: muzzle.x,
                y: muzzle.y,
                vx: Math.cos(baseAngle + (Math.random() - 0.5) * 0.5) * (Math.random() * 6 + 3),
                vy: Math.sin(baseAngle + (Math.random() - 0.5) * 0.5) * (Math.random() * 6 + 3),
                life: 25,
                maxLife: 25
            });
        }
        
    } else {
        // Fire normal weapon
        playShootSound();
        
        // Adjust bullet count based on upgrades and powerups (take the max effect)
        let bulletCount = 1 + multiShotBonus;
        if (activePowerup === 'triple') {
            bulletCount = Math.max(bulletCount, 3);
        } else if (activePowerup === 'spread') {
            bulletCount = Math.max(bulletCount, 5);
        }

        const muzzle = getGunMuzzleWorldPos();
        for (let i = 0; i < bulletCount; i++) {
            let angle = muzzle.angle;
            if (bulletCount > 1) {
                const spread = 0.3; // Radians
                angle += (i - (bulletCount - 1) / 2) * (spread / (bulletCount - 1));
            }
            bullets.push({
                x: muzzle.x,
                y: muzzle.y,
                vx: Math.cos(angle) * bulletSpeed,
                vy: Math.sin(angle) * bulletSpeed,
                radius: 5,
                color: '#5d4037',
                damage: playerDamage
            });
        }
        
        // Create muzzle flash particles for normal weapon
        const baseAngle = muzzle.angle;
        for (let i = 0; i < 10; i++) {
            particles.push({
                x: muzzle.x,
                y: muzzle.y,
                vx: Math.cos(baseAngle) * (Math.random() * 5 + 2),
                vy: Math.sin(baseAngle) * (Math.random() * 5 + 2),
                life: 20,
                maxLife: 20
            });
        }
    }
}
function startGame() {
    // Ensure canvas matches window size
    resizeCanvas();
    // Ensure audio is allowed to play after user gesture
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume().catch(() => {});
    }
    gameRunning = true;
    score = 0;
    playerHealth = 200;
    activePowerup = null;
    powerupTimeLeft = 0;
    powerupMaxTime = 0;
    player.x = canvas.width / 2;
    player.y = canvas.height - 100;
    bullets = [];
    enemies = [];
    particles = [];
    powerups = [];
    hitEffects = [];
    energyBall = null;
    energyBallCharge = 0;
    enemySpawnRate = 1200;
    // reset upgrade stats
    playerSpeedMult = 1.0;
    fireRateMult = 1.0;
    bulletSpeed = 10;
    playerDamage = 1;
    multiShotBonus = 0;
    // apply derived values
    player.speed = basePlayerSpeed * playerSpeedMult;
    shootCooldown = Math.max(60, baseShootCooldown * fireRateMult);
    lastEnemySpawn = 0;
    lastShot = 0;
    lastPowerupSpawn = 0;
    bosses = [];
    round = 1;
    roundInProgress = false;
    enemiesToSpawn = 0;
    autoFiring = false;
    holdingFire = false;
    // Reset shotgun state
    hasShotgun = false;
    shotgunAmmo = 0;
    pausedForUpgrade = false;
    isPaused = false;
    stopBossTheme();
    stopAllShootSounds();
    
    gameTitle.style.display = 'none';
    startButton.style.display = 'none';
    gameOverScreen.style.display = 'none';
    updateScore();
    updateHealth();
    updatePowerupDisplay();
    startRound();
    gameLoop();
}

function startRound() {
    roundInProgress = true;
    // Record banner start for HUD
    roundBannerStart = Date.now();
    // Boss rounds at 3,7,11,... with increasing count: 1,2,3,...
    if (round >= 3 && (round - 3) % 4 === 0) {
        enemiesToSpawn = 0;
        const bossCount = 1 + Math.floor((round - 3) / 4);
        spawnBoss(bossCount);
        return;
    }
    // Calculate enemies to spawn and spawn rate per round
    enemiesToSpawn = baseEnemiesPerRound + Math.floor(round * 4);
    enemySpawnRate = Math.max(350, 1500 - round * 100);
}

function scheduleNextRound() {
    if (!gameRunning || !roundInProgress) return;
    if (nextRoundTimeout) return; // already scheduled
    roundInProgress = false;
    // Open upgrade modal instead of auto-starting next round
    openUpgradeModal();
}

function gameOver() {
    gameRunning = false;
    finalScore.textContent = `FINAL SCORE: ${score}`;
    gameOverScreen.style.display = 'flex';
    stopBossTheme();
    stopAllShootSounds();
    holdingFire = false;
    isPaused = false;
}

function updateScore() {
    scoreDisplay.textContent = `SCORE: ${score}`;
}

function updateHealth() {
    healthFill.style.width = `${playerHealth}%`;
    if (playerHealth <= 30) {
        healthFill.style.background = '#f44336';
    } else if (playerHealth <= 60) {
        healthFill.style.background = '#ffc107';
    } else {
        healthFill.style.background = '#8bc34a';
    }
}

function updatePowerupDisplay() {
    if (activePowerup) {
        if (activePowerup === 'shotgun') {
            powerupBar.style.width = `${(shotgunAmmo / SHOTGUN_MAX_AMMO) * 100}%`;
            powerupDisplay.querySelector('span').textContent = `SHOTGUN: ${shotgunAmmo}/${SHOTGUN_MAX_AMMO}`;
        } else {
            powerupBar.style.width = `${(powerupTimeLeft / powerupMaxTime) * 100}%`;
            powerupDisplay.querySelector('span').textContent = `POWER: ${activePowerup.toUpperCase()}`;
        }
    } else {
        powerupBar.style.width = '0%';
        powerupDisplay.querySelector('span').textContent = 'POWER: NONE';
    }
}

function shoot(e) {
    if (!gameRunning) return;
    // Start autofire on first click if power is active
    if (activePowerup === 'autofire') {
        autoFiring = true;
    }
    fireOnce();
}

// --- Energy Ball ability helpers ---
function addEnergyCharge(amount) {
    energyBallCharge = Math.min(ENERGY_BALL_MAX, energyBallCharge + amount);
}

function tryCastEnergyBall() {
    if (!gameRunning) return;
    if (pausedForUpgrade || isPaused) return;
    if (energyBall) return; // only one at a time
    if (energyBallCharge < ENERGY_BALL_MAX) return;

    const muzzle = getGunMuzzleWorldPos();
    const angle = muzzle.angle;
    energyBall = {
        x: muzzle.x,
        y: muzzle.y,
        vx: Math.cos(angle) * ENERGY_BALL_SPEED,
        vy: Math.sin(angle) * ENERGY_BALL_SPEED,
        radius: ENERGY_BALL_RADIUS,
        damageEnemy: ENERGY_BALL_DAMAGE_ENEMY,
        damageBoss: ENERGY_BALL_DAMAGE_BOSS,
        traveled: 0
    };
    // spend charge
    energyBallCharge = 0;
    // sound
    playEnergyBallCast();
}

function updateEnergyBall() {
    if (!energyBall) return;
    const b = energyBall;
    b.x += b.vx;
    b.y += b.vy;
    b.traveled += Math.hypot(b.vx, b.vy);

    // collide with enemies (continuous pierce)
    for (let j = enemies.length - 1; j >= 0; j--) {
        const e = enemies[j];
        const dx = b.x - e.x;
        const dy = b.y - e.y;
        const dist = Math.hypot(dx, dy);
        if (dist < b.radius + e.width / 2) {
            e.health -= b.damageEnemy;
            // particles
            for (let k = 0; k < 6; k++) {
                particles.push({ x: e.x, y: e.y, vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6, life: 22, maxLife: 22 });
            }
            if (e.health <= 0) {
                score += 100;
                updateScore();
                enemies.splice(j, 1);
                playExplosionSound();
                addEnergyCharge(20);
                if (!bossActive() && enemiesToSpawn <= 0 && enemies.length === 0) {
                    scheduleNextRound();
                }
            }
        }
    }

    // collide with bosses
    if (bossActive()) {
        for (let bidx = bosses.length - 1; bidx >= 0; bidx--) {
            const bo = bosses[bidx];
            const dx = b.x - bo.x;
            const dy = b.y - bo.y;
            const dist = Math.hypot(dx, dy);
            if (dist < b.radius + bo.width / 2) {
                bo.health -= b.damageBoss;
                playBossHitSound();
                for (let k = 0; k < 10; k++) {
                    particles.push({ x: bo.x, y: bo.y, vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8, life: 26, maxLife: 26 });
                }
                if (bo.health <= 0) {
                    score += 2000;
                    updateScore();
                    playBossExplosionSound();
                    bosses.splice(bidx, 1);
                    addEnergyCharge(100);
                    if (!bossActive()) {
                        stopBossTheme();
                        scheduleNextRound();
                    }
                }
            }
        }
    }

    // end if traveled too far or off screen
    if (b.traveled > ENERGY_BALL_RANGE || b.x < -200 || b.x > canvas.width + 200 || b.y < -200 || b.y > canvas.height + 200) {
        energyBall = null;
    }
}

function drawEnergyBall() {
    if (!energyBall) return;
    const b = energyBall;
    const angle = Math.atan2(b.vy, b.vx);
    const w = b.radius * 2 + 20; // larger than radius
    const h = w;
    // glow
    ctx.save();
    ctx.shadowColor = 'rgba(0,200,255,0.7)';
    ctx.shadowBlur = 25;
    ctx.globalCompositeOperation = 'lighter';
    ctx.translate(b.x, b.y);
    ctx.rotate(angle);
    if (bulletImg && bulletImg.complete && bulletImg.naturalWidth) {
        ctx.drawImage(bulletImg, -w / 2, -h / 2, w, h);
    } else {
        ctx.fillStyle = '#00bcd4';
        ctx.beginPath();
        ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

function spawnEnemy() {
    const now = Date.now();
    if (now - lastEnemySpawn > enemySpawnRate) {
        lastEnemySpawn = now;
        // Do not spawn regular enemies during boss fight
        if (bossActive()) return;
        if (!roundInProgress || enemiesToSpawn <= 0) return;

        // Spawn two enemies with randomized sides and sprites
        for (let c = 0; c < 2; c++) {
            if (enemiesToSpawn <= 0) break;
            const side = Math.floor(Math.random() * 4);
            let x, y;
            switch (side) {
                case 0: // top
                    x = Math.random() * canvas.width;
                    y = -30;
                    break;
                case 1: // right
                    x = canvas.width + 30;
                    y = Math.random() * canvas.height;
                    break;
                case 2: // bottom
                    x = Math.random() * canvas.width;
                    y = canvas.height + 30;
                    break;
                case 3: // left
                    x = -30;
                    y = Math.random() * canvas.height;
                    break;
            }

            // Randomize sprite and some stats
            const enemyType = Math.random();
            let img, isAnimated = false, animFrames = null;
            
            if (enemyType < 0.2) {
                // 20% chance for new animated enemy
                isAnimated = true;
                animFrames = [ frameTwoImg,frameThreeImg,frameFourImg];
                img = frameOneImg; // default frame
            } else if (enemyType < 0.5) {
                img = enemyImg;
            } else if (enemyType < 0.75) {
                img = enemyImg2;
            } else {
                img = enemyImg3;
            }
            
            const size = 75 + Math.random() * 50;
            const spd = (1 + Math.random() * 1.5) * (1 + (round - 1) * 0.08);
            const hp = img === enemyImg ? 2 : 1;   // make one type a bit tankier
            const extraHp = Math.floor((round - 1) / 3);

            enemies.push({
                x: x,
                y: y,
                width: size,
                height: size,
                speed: spd,
                color: '#8d6e63',
                health: hp + extraHp,
                maxHealth: hp + extraHp,
                img: img,
                // Animation properties
                isAnimated: isAnimated,
                animFrames: animFrames,
                currentFrame: 0,
                frameTimer: 0,
                frameInterval: isAnimated ? (120 + Math.random() * 160) : 0, // randomized timing 120-280ms
                // Spawn time for health-based pulsing
                spawnTime: Date.now()
            });
            enemiesToSpawn--;
        }
        
        // Increase difficulty over time
        if (enemySpawnRate > 400) {
            enemySpawnRate -= 5;
        }
    }
}

// Spawn the boss when kill threshold is reached
function spawnBoss(count = 1) {
    for (let i = 0; i < count; i++) {
        const side = Math.floor(Math.random() * 4);
        let x, y;
        switch (side) {
            case 0: x = Math.random() * canvas.width; y = -60; break;
            case 1: x = canvas.width + 60; y = Math.random() * canvas.height; break;
            case 2: x = Math.random() * canvas.width; y = canvas.height + 60; break;
            case 3: x = -60; y = Math.random() * canvas.height; break;
        }
        const variant = (i === 1) ? 2 : 1; // second boss is variant 2
        const size = 180 + (variant === 2 ? 10 : 0);
        const hpBase = 120 + Math.floor((round - 1) * 10);
        bosses.push({
            x, y,
            width: size,
            height: size,
            speed: 1.5,
            imgs: variant === 2 ? [bossImg2, bossImg1] : [bossImg1, bossImg2],
            frame: 0,
            frameTime: 0,
            frameInterval: 180,
            health: hpBase,
            maxHealth: hpBase,
            variant
        });
    }
    // Play boss intro(s) and start theme
    playBossIntro();
    setTimeout(() => { try { boss2IntroAudio.currentTime = 0; } catch (_) {} boss2IntroAudio.play().catch(()=>{}); }, 150);
    startBossTheme();
}

function spawnPowerup() {
    const now = Date.now();
    if (now - lastPowerupSpawn > powerupSpawnRate) {
        lastPowerupSpawn = now;
        
        // Random position
        const x = 50 + Math.random() * (canvas.width - 100);
        const y = 50 + Math.random() * (canvas.height - 100);
        
        // Random powerup type
        const types = ['health', 'triple', 'spread', 'rapid', 'autofire', 'shotgun', 'mystery'];
        const type = types[Math.floor(Math.random() * types.length)];
        
        powerups.push({
            x: x,
            y: y,
            radius: 13, // Reduced from 15 to make smaller
            type: type,
            color: type === 'health' ? '#f44336' : 
                   type === 'triple' ? '#2196f3' : 
                   type === 'spread' ? '#9c27b0' : 
                   type === 'rapid' ? '#ff9800' : 
                   type === 'autofire' ? '#00bcd4' : 
                   type === 'shotgun' ? '#8d6e63' : '#ffd54f'
        });
    }
}

// Apply a random good or bad effect for the 'mystery' power-up
function applyMysteryEffect() {
    // 60% good, 40% bad
    const good = Math.random() < 0.6;
    if (good) {
        const roll = Math.floor(Math.random() * 5);
        switch (roll) {
            case 0:
                // Big heal
                playerHealth = Math.min(200, playerHealth + 80);
                updateHealth();
                break;
            case 1:
                // Rapid fire boost
                activePowerup = 'rapid';
                powerupTimeLeft = 14000;
                powerupMaxTime = 14000;
                shootCooldown = Math.max(40, (baseShootCooldown * fireRateMult) * 0.5);
                break;
            case 2:
                // Triple shot
                activePowerup = 'triple';
                powerupTimeLeft = 12000;
                powerupMaxTime = 12000;
                break;
            case 3:
                // Spread shot
                activePowerup = 'spread';
                powerupTimeLeft = 10000;
                powerupMaxTime = 10000;
                break;
            case 4:
                // Full energy charge
                addEnergyCharge(ENERGY_BALL_MAX);
                break;
        }
    } else {
        const roll = Math.floor(Math.random() * 3);
        switch (roll) {
            case 0:
                // Damage player
                playerHealth -= 40;
                updateHealth();
                if (playerHealth <= 0) gameOver();
                break;
            case 1:
                // Gun jam: much slower fire rate temporarily
                activePowerup = 'jam';
                powerupTimeLeft = 8000;
                powerupMaxTime = 8000;
                shootCooldown = Math.max(120, (baseShootCooldown * fireRateMult) * 1.8);
                break;
            case 2:
                // Slow movement temporarily
                activePowerup = 'slow';
                powerupTimeLeft = 6000;
                powerupMaxTime = 6000;
                player.speed = Math.max(2, (basePlayerSpeed * playerSpeedMult) * 0.6);
                break;
        }
    }
}

function updatePlayer() {
    // Movement
    if (keys['w'] || keys['arrowup']) player.y -= player.speed;
    if (keys['s'] || keys['arrowdown']) player.y += player.speed;
    if (keys['a'] || keys['arrowleft']) player.x -= player.speed;
    if (keys['d'] || keys['arrowright']) player.x += player.speed;
    
    // Boundary checking
    player.x = Math.max(player.width/2, Math.min(canvas.width - player.width/2, player.x));
    player.y = Math.max(player.height/2, Math.min(canvas.height - player.height/2, player.y));
}

function updateBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        bullet.x += bullet.vx;
        bullet.y += bullet.vy;
        
        // Remove bullets that go off screen
        if (bullet.x < -20 || bullet.x > canvas.width + 50 || 
            bullet.y < -20 || bullet.y > canvas.height + 50) {
            bullets.splice(i, 1);
            continue;
        }
        
        // Check collision with enemies
        for (let j = enemies.length - 1; j >= 0; j--) {
            const enemy = enemies[j];
            const dx = bullet.x - enemy.x;
            const dy = bullet.y - enemy.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < bullet.radius + enemy.width/2) {
                // Hit enemy
                enemy.health -= (bullet.damage || 1);
                // spawn hit effect
                hitEffects.push({
                    x: enemy.x,
                    y: enemy.y,
                    angle: Math.atan2(bullet.vy, bullet.vx),
                    size: Math.max(42, enemy.width * 0.6),
                    life: 18,
                    maxLife: 18
                });
                bullets.splice(i, 1);
                playHitSound();
                
                // Create hit particles
                for (let k = 0; k < 15; k++) {
                    particles.push({
                        x: enemy.x,
                        y: enemy.y,
                        vx: (Math.random() - 0.5) * 8,
                        vy: (Math.random() - 0.5) * 8,
                        life: 30,
                        maxLife: 30
                    });
                }
                
                if (enemy.health <= 0) {
                    // Enemy destroyed
                    score += 100;
                    updateScore();
                    addEnergyCharge(20);
                    enemies.splice(j, 1);
                    playExplosionSound();
                    // Check round completion (no more to spawn and none alive)
                    if (!bossActive() && enemiesToSpawn <= 0 && enemies.length === 0) {
                        scheduleNextRound();
                    }
                }
                break;
            }
        }

        // Check collision with boss
        if (bossActive()) {
            for (let b = bosses.length - 1; b >= 0; b--) {
                const bo = bosses[b];
                const bdx = bullet.x - bo.x;
                const bdy = bullet.y - bo.y;
                const bdist = Math.sqrt(bdx * bdx + bdy * bdy);
                if (bdist < bullet.radius + bo.width / 2) {
                    bo.health -= (bullet.damage || 1);
                    // spawn hit effect on boss
                    hitEffects.push({
                        x: bo.x,
                        y: bo.y,
                        angle: Math.atan2(bullet.vy, bullet.vx),
                        size: Math.max(62, bo.width * 0.5),
                        life: 20,
                        maxLife: 20
                    });
                    bullets.splice(i, 1);
                    playBossHitSound();
                    // Hit particles on boss
                    for (let k = 0; k < 20; k++) {
                        particles.push({
                            x: bo.x,
                            y: bo.y,
                            vx: (Math.random() - 0.5) * 10,
                            vy: (Math.random() - 0.5) * 10,
                            life: 35,
                            maxLife: 35
                        });
                    }
                    if (bo.health <= 0) {
                        score += 2000;
                        updateScore();
                        playBossExplosionSound();
                        addEnergyCharge(100);
                        bosses.splice(b, 1);
                        if (!bossActive()) {
                            stopBossTheme();
                            scheduleNextRound();
                        }
                    }
                    break;
                }
            }
        }
    }
}

function updateEnemies() {
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        
        // Move towards player
        const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
        
        // Base movement
        const baseVx = Math.cos(angle) * enemy.speed;
        const baseVy = Math.sin(angle) * enemy.speed;
        
        // Ground movement for all enemies (animated enemies get slight variation for organic feel)
        if (enemy.isAnimated) {
            // Slight speed variation for animated enemies to make movement more organic
            const speedVariation = Math.sin(Date.now() * 0.001 + enemy.spawnTime * 0.001) * 0.15;
            enemy.x += baseVx * (1 + speedVariation);
            enemy.y += baseVy * (1 + speedVariation);
        } else {
            enemy.x += baseVx;
            enemy.y += baseVy;
        }
        
        // Update animation for animated enemies
        if (enemy.isAnimated && enemy.animFrames) {
            enemy.frameTimer += 16; // ~60fps
            if (enemy.frameTimer >= enemy.frameInterval) {
                enemy.currentFrame = (enemy.currentFrame + 1) % enemy.animFrames.length;
                enemy.frameTimer = 0;
                // Update current img reference
                enemy.img = enemy.animFrames[enemy.currentFrame];
            }
        }
        
        // Check collision with player
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < player.width/2 + enemy.width/2) {
            // Player hit
            playerHealth -= 10;
            updateHealth();
            playHitSound();
            
            // Create hit particles
            for (let k = 0; k < 20; k++) {
                particles.push({
                    x: player.x,
                    y: player.y,
                    vx: (Math.random() - 0.5) * 10,
                    vy: (Math.random() - 0.5) * 10,
                    life: 40,
                    maxLife: 40
                });
            }
            
            // Enemy destroyed on collision
            playExplosionSound();
            enemies.splice(i, 1);
            
            if (playerHealth <= 0) {
                gameOver();
            }
        }
    }
}

function updatePowerups() {
    for (let i = powerups.length - 1; i >= 0; i--) {
        const powerup = powerups[i];
        
        // Check collision with player
        const dx = player.x - powerup.x;
        const dy = player.y - powerup.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < player.width/2 + powerup.radius) {
            // Player collected powerup
            playPowerupSound();
            
            // Apply powerup effect
            switch(powerup.type) {
                case 'health':
                    playerHealth = Math.min(100, playerHealth + 30);
                    updateHealth();
                    break;
                case 'triple':
                    activePowerup = 'triple';
                    powerupTimeLeft = 10000; // 10 seconds
                    powerupMaxTime = 10000;
                    break;
                case 'spread':
                    activePowerup = 'spread';
                    powerupTimeLeft = 8000; // 8 seconds
                    powerupMaxTime = 8000;
                    break;
                case 'rapid':
                    activePowerup = 'rapid';
                    powerupTimeLeft = 12000; // 12 seconds
                    powerupMaxTime = 12000;
                    // Scale from upgraded base cooldown
                    shootCooldown = Math.max(40, (baseShootCooldown * fireRateMult) * 0.5);
                    break;
                case 'autofire':
                    activePowerup = 'autofire';
                    powerupTimeLeft = 12000; // 12 seconds
                    powerupMaxTime = 12000;
                    shootCooldown = Math.max(35, (baseShootCooldown * fireRateMult) * 0.45); // fast cooldown during autofire
                    autoFiring = false; // will begin on next click
                    break;
                case 'shotgun':
                    hasShotgun = true;
                    shotgunAmmo = SHOTGUN_MAX_AMMO;
                    activePowerup = 'shotgun';
                    powerupTimeLeft = 999999; // Unlimited time until ammo runs out
                    powerupMaxTime = 999999;
                    break;
                case 'mystery':
                    applyMysteryEffect();
                    break;
            }
            
            updatePowerupDisplay();
            powerups.splice(i, 1);
        }
    }
}

function updatePowerupTimer() {
    if (activePowerup) {
        powerupTimeLeft -= 16; // Approximate frame time (60fps)
        
        if (powerupTimeLeft <= 0) {
            // Powerup expired
            activePowerup = null;
            autoFiring = false;
            // Restore to upgraded base cooldown
            shootCooldown = Math.max(60, baseShootCooldown * fireRateMult);
            // Restore movement speed to upgraded base as well
            player.speed = basePlayerSpeed * playerSpeedMult;
            updatePowerupDisplay();
        } else {
            updatePowerupDisplay();
        }
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        
        if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }
}

function drawPlayer() {
    ctx.save();
    ctx.translate(player.x, player.y);
    // Rotate entire player to face cursor, with calibration offset
    const angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);
    ctx.rotate(angle + PLAYER_ROT_OFFSET);

    // Draw tank body using image within rotated space (centered)
    const bodyW = player.width;
    const bodyH = player.height;
    ctx.drawImage(tankImg, -bodyW / 2, -bodyH / 2, bodyW, bodyH);

    // Draw and align gun to hands (show shotgun if equipped, otherwise regular gun if SHOW_GUN)
    if (hasShotgun || SHOW_GUN) {
        let gripX = GUN_CONFIG.gripOffsetX;
        let gripY = GUN_CONFIG.gripOffsetY;
        
        // Adjust grip position for shotgun
        if (hasShotgun) {
            gripX = -8; // Move shotgun more to the left (closer to center)
            gripY = -2; // Slightly adjust vertical position
        }
        
        ctx.save();
        ctx.translate(gripX, gripY);
        
        const gunImg = hasShotgun ? shotgunImg : turretImg;
        const gunW = Math.max(36, bodyW * (hasShotgun ? 0.7 : GUN_CONFIG.widthScale)); // Shotgun slightly smaller
        const aspect = (gunImg.naturalWidth && gunImg.naturalHeight)
            ? (gunImg.naturalHeight / gunImg.naturalWidth)
            : 0.5;
        const gunH = gunW * aspect;
        
        // Adjust pivot point for shotgun
        const pivotX = hasShotgun ? 0.15 : GUN_CONFIG.pivotX; // Shotgun pivot more to the left
        const pivotY = hasShotgun ? 0.45 : GUN_CONFIG.pivotY; // Slightly adjust vertical pivot
        
        const drawX = -gunW * pivotX;
        const drawY = -gunH * pivotY;
        
        // Add slight glow effect for shotgun
        if (hasShotgun) {
            ctx.shadowColor = 'rgba(141, 110, 99, 0.8)';
            ctx.shadowBlur = 8;
        }
        
        ctx.drawImage(gunImg, drawX, drawY, gunW, gunH);
        ctx.restore();
    }

    ctx.restore();
}

function drawBullets() {
    for (const bullet of bullets) {
        const angle = Math.atan2(bullet.vy, bullet.vx);
        const w = bullet.radius * 2 + 6; // scale sprite by bullet size
        const h = w;
        if (bulletImg && bulletImg.complete && bulletImg.naturalWidth) {
            ctx.save();
            ctx.translate(bullet.x, bullet.y);
            ctx.rotate(angle);
            ctx.drawImage(bulletImg, -w / 2, -h / 2, w, h);
            ctx.restore();
        } else {
            // Fallback to circle until image loads
            ctx.fillStyle = bullet.color;
            ctx.beginPath();
            ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
            ctx.fill();
        }
        // Draw bullet trail
        ctx.strokeStyle = '#8d6e63';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(bullet.x - bullet.vx * 2, bullet.y - bullet.vy * 2);
        ctx.lineTo(bullet.x, bullet.y);
        ctx.stroke();
    }
}

function drawEnemies() {
    for (const enemy of enemies) {
        ctx.save();
        
        // Calculate health-based pulsing
        let healthRatio = 1;
        if (enemy.maxHealth) {
            healthRatio = enemy.health / enemy.maxHealth;
        } else if (enemy.health !== undefined) {
            // Backward compatibility - assume current health was max health initially
            enemy.maxHealth = enemy.health;
            healthRatio = 1;
        }
        
        // Size pulsing based on health (lower health = more intense pulsing)
        const time = Date.now();
        const pulseIntensity = (1 - healthRatio) * 0.3; // 0 to 0.3 based on damage
        const pulseOffset = Math.sin((time - enemy.spawnTime) * 0.008) * pulseIntensity;
        const currentScale = 1 + pulseOffset;
        
        // Position (no rotation for animated enemies)
        ctx.translate(enemy.x, enemy.y);
        
        // Apply health-based scaling
        ctx.scale(currentScale, currentScale);
        
        // Draw enemy using image (centered)
        const w = enemy.width;
        const h = enemy.height;
        
        // Add subtle glow effect for animated enemies
        if (enemy.isAnimated) {
            ctx.shadowColor = 'rgba(255, 100, 100, 0.4)';
            ctx.shadowBlur = 8;
        }
        
        // Use the assigned sprite; default to enemyImg2 for older enemies without img
        ctx.drawImage(enemy.img || enemyImg2, -w / 2, -h / 2, w, h);
        
        ctx.restore();
    }
}

function drawBosses() {
    if (!bossActive()) return;
    for (const boss of bosses) {
        const w = boss.width;
        const h = boss.height;
        const img = (boss.imgs && boss.imgs.length)
            ? boss.imgs[boss.frame || 0]
            : (boss.img || enemyImg);
        ctx.drawImage(img, boss.x - w / 2, boss.y - h / 2, w, h);
    }
}

function drawBossHealthBar() {
    if (!bossActive()) return;
    const barWidth = 420;
    const barHeight = 24;
    const x = (canvas.width - barWidth) / 2;
    const y = 20;
    // Background
    ctx.fillStyle = '#d7ccc8';
    ctx.fillRect(x, y, barWidth, barHeight);
    // Border
    ctx.strokeStyle = '#5d4037';
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, barWidth, barHeight);
    // Fill
    // Sum health across bosses and display as aggregate
    const total = bosses.reduce((acc,b)=>acc + Math.max(0,b.health), 0);
    const max = bosses.reduce((acc,b)=>acc + b.maxHealth, 0);
    const pct = max > 0 ? Math.max(0, total / max) : 0;
    ctx.fillStyle = '#ff5722';
    ctx.fillRect(x, y, barWidth * pct, barHeight);
    // Label
    ctx.fillStyle = '#5d4037';
    ctx.font = "bold 18px 'Courier New', monospace";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(bosses.length > 1 ? 'BOSSES' : 'BOSS', x + barWidth / 2, y + barHeight / 2);
}

function drawPowerups() {
    const t = Date.now();
    for (const powerup of powerups) {
        // Animation offsets
        const bob = Math.sin((t / 420) + (powerup.x * 0.01)) * 3; // vertical bobbing
        const pulse = (Math.sin(t / 260) + 1) * 0.5; // 0..1
        const px = powerup.x;
        const py = powerup.y + bob;
        // Try to draw sprite first
        const sprite = getPowerupImage(powerup.type);
        if (sprite && sprite.complete && sprite.naturalWidth) {
            const size = powerup.radius * 3.5; // Reduced from 5 to 3.5 for smaller sprites
            // Draw a contrasting halo and outline behind the sprite
            ctx.save();
            // Soft dark halo
            const haloR = size * (0.50 + 0.10 * pulse); // Reduced halo size
            const grad = ctx.createRadialGradient(px, py, haloR * 0.2, px, py, haloR);
            grad.addColorStop(0, 'rgba(0,0,0,0.45)');
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(px, py, haloR, 0, Math.PI * 2);
            ctx.fill();
            // Bright ring matching powerup color for contrast (additive blend)
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.strokeStyle = powerup.color || '#ffffff';
            ctx.lineWidth = Math.max(1.5, size * 0.08); // Slightly thinner line
            ctx.beginPath();
            ctx.arc(px, py, size * (0.45 + 0.04 * pulse), 0, Math.PI * 2); // Smaller ring
            ctx.stroke();
            ctx.restore();
            ctx.restore();

            // Draw the sprite on top
            ctx.save();
            // Soft colored shadow to lift sprite from background
            ctx.shadowColor = powerup.color || 'rgba(255,255,255,0.8)';
            ctx.shadowBlur = Math.max(6, size * 0.15); // Reduced shadow blur
            ctx.drawImage(sprite, px - size / 2, py - size / 2, size, size);
            ctx.restore();
            // Skip vector fallback if we successfully drew a sprite
            continue;
        }

        // Fallback: draw colored orb with symbol
        ctx.save();
        // Halo
        const haloR2 = powerup.radius * (1.4 + 0.3 * pulse); // Reduced halo size
        const grad2 = ctx.createRadialGradient(px, py, haloR2 * 0.2, px, py, haloR2);
        grad2.addColorStop(0, 'rgba(0,0,0,0.45)');
        grad2.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad2;
        ctx.beginPath();
        ctx.arc(px, py, haloR2, 0, Math.PI * 2);
        ctx.fill();
        // Base orb with additive glow
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = powerup.color;
        ctx.beginPath();
        ctx.arc(px, py, powerup.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        // Outline
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(px, py, powerup.radius + 1, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // Draw powerup symbol
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.beginPath();

        switch(powerup.type) {
            case 'health':
                // Cross
                ctx.moveTo(px - 8, py);
                ctx.lineTo(px + 8, py);
                ctx.moveTo(px, py - 8);
                ctx.lineTo(px, py + 8);
                break;
            case 'triple':
                // Three lines
                ctx.moveTo(px - 8, py - 5);
                ctx.lineTo(px + 8, py - 5);
                ctx.moveTo(px - 8, py);
                ctx.lineTo(px + 8, py);
                ctx.moveTo(px - 8, py + 5);
                ctx.lineTo(px + 8, py + 5);
                break;
            case 'spread':
                // Star
                for (let i = 0; i < 5; i++) {
                    const angle = (i * 2 * Math.PI / 5) - Math.PI/2;
                    const x1 = px + Math.cos(angle) * 8;
                    const y1 = py + Math.sin(angle) * 8;
                    const x2 = px + Math.cos(angle + Math.PI) * 4;
                    const y2 = py + Math.sin(angle + Math.PI) * 4;
                    ctx.moveTo(x1, y1);
                    ctx.lineTo(x2, y2);
                }
                break;
            case 'rapid':
                // Lightning bolt
                ctx.moveTo(px - 6, py - 8);
                ctx.lineTo(px + 2, py - 2);
                ctx.lineTo(px - 4, py + 2);
                ctx.lineTo(px + 6, py + 8);
                break;
            case 'autofire':
                // Concentric arcs implying continuous fire
                for (let r = 4; r <= 8; r += 2) {
                    ctx.moveTo(px + r, py);
                    ctx.arc(px, py, r, 0, Math.PI * 2);
                }
                break;
            case 'shotgun':
                // Draw shotgun barrel lines
                ctx.moveTo(px - 8, py - 3);
                ctx.lineTo(px + 8, py - 3);
                ctx.moveTo(px - 8, py + 3);
                ctx.lineTo(px + 8, py + 3);
                // Draw grip
                ctx.moveTo(px - 6, py - 3);
                ctx.lineTo(px - 6, py + 6);
                ctx.lineTo(px - 2, py + 6);
                break;
            case 'mystery':
                // Draw a '?' character
                ctx.stroke(); // finish previous path before text
                ctx.save();
                ctx.fillStyle = '#ffffff';
                ctx.font = "bold 14px 'Courier New', monospace";
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('?', px, py + 1);
                ctx.restore();
                // restart path to avoid merging states
                ctx.beginPath();
                break;
        }
        
        ctx.stroke();
    }
}

function drawParticles() {
    for (const p of particles) {
        const alpha = p.life / p.maxLife;
        ctx.fillStyle = `rgba(93, 64, 55, ${alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
    }
}

function updateHitEffects() {
    for (let i = hitEffects.length - 1; i >= 0; i--) {
        const h = hitEffects[i];
        h.life--;
        if (h.life <= 0) hitEffects.splice(i, 1);
    }
}

function drawHitEffects() {
    for (const h of hitEffects) {
        const alpha = h.life / h.maxLife;
        const w = h.size;
        const hgt = h.size;
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
        ctx.translate(h.x, h.y);
        ctx.rotate(h.angle);
        if (hitEffectImg && hitEffectImg.complete && hitEffectImg.naturalWidth) {
            ctx.drawImage(hitEffectImg, -w / 2, -hgt / 2, w, hgt);
        } else {
            // fallback simple flash
            ctx.fillStyle = `rgba(255,255,255,${alpha})`;
            ctx.fillRect(-w / 2, -hgt / 2, w, hgt);
        }
        ctx.restore();
    }
}

function drawBackground() {
    // If arena image is loaded, draw it scaled to cover the canvas
    if (arenaFloorImg && arenaFloorImg.complete && arenaFloorImg.naturalWidth) {
        const iw = arenaFloorImg.naturalWidth;
        const ih = arenaFloorImg.naturalHeight;
        const cw = canvas.width;
        const ch = canvas.height;
        const scale = Math.max(cw / iw, ch / ih);
        const dw = iw * scale;
        const dh = ih * scale;
        const dx = (cw - dw) / 2;
        const dy = (ch - dh) / 2;
        ctx.drawImage(arenaFloorImg, dx, dy, dw, dh);
    } else {
        // Fallback: previous sketch-style background
        ctx.strokeStyle = '#d7ccc8';
        ctx.lineWidth = 1;
        for (let x = 0; x < canvas.width; x += 40) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }
        for (let y = 0; y < canvas.height; y += 40) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }
        ctx.strokeStyle = '#a1887f';
        ctx.beginPath();
        ctx.arc(100, 100, 30, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(700, 500);
        ctx.lineTo(750, 450);
        ctx.lineTo(780, 500);
        ctx.stroke();
        ctx.beginPath();
        ctx.rect(200, 150, 50, 50);
        ctx.stroke();
    }
}

function gameLoop() {
    if (!gameRunning) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background
    drawBackground();
    
    // Update game objects (skip while paused for upgrade or esc pause)
    if (!pausedForUpgrade && !isPaused) {
        updatePlayer();
        updateBullets();
        updateEnemies();
        updateBosses();
        updatePowerups();
        updateParticles();
        updateHitEffects();
        updatePowerupTimer();
        updateEnergyBall();
        // Fire while holding, or if autofire powerup is active
        if (holdingFire || autoFiring) {
            fireOnce();
        }
        spawnEnemy();
        spawnPowerup();
    }
    
    // Draw game objects
    drawPowerups();
    drawBosses();
    drawEnemies();
    drawBullets();
    drawHitEffects();
    drawEnergyBall();
    drawPlayer();
    drawParticles();
    drawBossHealthBar();
    drawRoundHUD();
    drawRoundBanner();
    if (isPaused) drawPauseOverlay();
    
    // Continue game loop
    requestAnimationFrame(gameLoop);
}

function togglePause() {
    if (!gameRunning) return;
    isPaused = !isPaused;
    if (isPaused) {
        pauseGame();
    } else {
        resumeGame();
    }
}

function pauseGame() {
    // stop continuous input and sounds
    holdingFire = false;
    stopAllShootSounds();
    if (bossActive()) stopBossTheme();
}

function resumeGame() {
    // resume boss theme if relevant and sound is enabled
    if (bossActive() && soundEnabled) startBossTheme();
}

function drawPauseOverlay() {
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1.0;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.font = "bold 48px 'Courier New', monospace";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2);
    ctx.restore();
}

// ------- Upgrade modal & effects -------
function openUpgradeModal() {
    pausedForUpgrade = true;
    // build three random unique upgrades
    const pool = getUpgradePool();
    const picks = [];
    while (picks.length < 3 && pool.length > 0) {
        const idx = Math.floor(Math.random() * pool.length);
        picks.push(pool.splice(idx, 1)[0]);
    }
    upgradeOptionsWrap.innerHTML = '';
    for (const upg of picks) {
        const btn = document.createElement('button');
        btn.style.cssText = 'flex:1 1 32%; min-width:150px; padding:12px; background:#424242; color:#fff; border:2px solid #9e9e9e; border-radius:8px; cursor:pointer; pointer-events:auto;';
        btn.innerHTML = `<div style="font-weight:bold; font-size:16px; margin-bottom:6px;">${upg.title}</div><div style="font-size:13px; opacity:0.85;">${upg.desc}</div>`;
        btn.onclick = () => {
            applyUpgrade(upg);
            closeUpgradeModal();
            startNextRoundAfterUpgrade();
        };
        upgradeOptionsWrap.appendChild(btn);
    }
    upgradeModal.style.display = 'flex';
}

function closeUpgradeModal() {
    upgradeModal.style.display = 'none';
}

function startNextRoundAfterUpgrade() {
    // small delay for UX
    setTimeout(() => {
        round += 1;
        pausedForUpgrade = false;
        startRound();
    }, 300);
}

function getUpgradePool() {
    return [
        {
            key: 'firerate',
            title: 'Faster Fire +20%',
            desc: 'Reduce time between shots.',
            apply: () => {
                fireRateMult *= 0.8; // 20% faster
                shootCooldown = Math.max(50, baseShootCooldown * fireRateMult);
            }
        },
        {
            key: 'damage',
            title: 'Damage +1',
            desc: 'Bullets deal more damage.',
            apply: () => { playerDamage += 1; }
        },
        {
            key: 'bulspeed',
            title: 'Bullet Speed +20%',
            desc: 'Bullets travel faster.',
            apply: () => { bulletSpeed *= 1.2; }
        },
        {
            key: 'multishot',
            title: 'Multi-Shot +1',
            desc: 'Fires an extra bullet.',
            apply: () => { multiShotBonus += 1; }
        },
        {
            key: 'movespeed',
            title: 'Move Speed +15%',
            desc: 'Increase player movement speed.',
            apply: () => { playerSpeedMult *= 1.15; player.speed = basePlayerSpeed * playerSpeedMult; }
        },
        {
            key: 'heal',
            title: 'Heal +30',
            desc: 'Restore some health.',
            apply: () => { playerHealth = Math.min(200, playerHealth + 30); updateHealth(); }
        }
    ];
}

function applyUpgrade(upg) {
    try { upg.apply(); } catch (_) {}
}

// --- HUD: Round indicator (always visible) ---
function drawRoundHUD() {
    ctx.save();
    ctx.fillStyle = '#263238';
    ctx.font = "bold 18px 'Courier New', monospace";
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`Round: ${round}`, 16, 16);
    ctx.restore();
}

// --- Banner at start of round ---
function drawRoundBanner() {
    if (!roundBannerStart) return;
    const elapsed = Date.now() - roundBannerStart;
    if (elapsed > ROUND_BANNER_DURATION) return;
    const alpha = 1 - elapsed / ROUND_BANNER_DURATION;
    const text = (round >= 3 && (round - 3) % 4 === 0)
        ? `Boss Round ${round}`
        : `Round ${round}`;
    ctx.save();
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.fillStyle = '#000000';
    ctx.fillRect(canvas.width * 0.25, canvas.height * 0.36, canvas.width * 0.5, 60);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(canvas.width * 0.25, canvas.height * 0.36, canvas.width * 0.5, 60);
    ctx.fillStyle = '#ffffff';
    ctx.font = "bold 28px 'Courier New', monospace";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height * 0.36 + 30);
    ctx.restore();
}

// Initial setup
drawBackground();

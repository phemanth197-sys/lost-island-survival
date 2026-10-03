const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const inventoryList = document.getElementById("inventoryList");
const craftingList = document.getElementById("craftingList");
const questList = document.getElementById("questList");
const statsBar = document.getElementById("statsBar");
const statusLine = document.getElementById("statusLine");
const dialogueBox = document.getElementById("dialogueBox");

const world = {
  width: 3200,
  height: 2200,
};

const itemInfo = {
  wood: { label: "Wood", icon: "🪵" },
  stone: { label: "Stone", icon: "🪨" },
  fiber: { label: "Fiber", icon: "🌿" },
  coconut: { label: "Coconut", icon: "🥥" },
  berries: { label: "Berries", icon: "🍓" },
  fish: { label: "Fish", icon: "🐟" },
  herbs: { label: "Herbs", icon: "🌱" },
  water: { label: "Water", icon: "💧" },
  medicine: { label: "Medicine", icon: "🧪" },
  coins: { label: "Coins", icon: "🪙" },
  stoneAxe: { label: "Stone Axe", icon: "🪓" },
  spear: { label: "Spear", icon: "🗡️" },
  campfire: { label: "Campfire", icon: "🔥" },
  shelter: { label: "Shelter", icon: "🛖" },
  relic: { label: "Ancient Relic", icon: "📿" },
};

const recipes = [
  {
    id: "stoneAxe",
    label: "Stone Axe",
    output: "stoneAxe",
    cost: { wood: 2, stone: 1 },
    description: "Basic cutting tool",
    buildType: null,
  },
  {
    id: "spear",
    label: "Spear",
    output: "spear",
    cost: { wood: 2, fiber: 1 },
    description: "Ranged melee weapon",
    buildType: null,
  },
  {
    id: "campfire",
    label: "Campfire",
    output: "campfire",
    cost: { wood: 4, stone: 2 },
    description: "Placeable campfire",
    buildType: "campfire",
  },
  {
    id: "medicine",
    label: "Medicine",
    output: "medicine",
    cost: { herbs: 2, water: 1 },
    description: "Restore health",
    buildType: null,
  },
];

const state = {
  time: 0.34,
  weather: "Sunny",
  weatherTimer: 0,
  selectedBuild: null,
  quest: {
    title: "Investigate the Northern Cave",
    active: false,
    completed: false,
    stage: 0,
    objective: "Talk to Juno on the beach.",
  },
  inventory: {
    wood: 0,
    stone: 0,
    fiber: 0,
    coconut: 0,
    berries: 0,
    fish: 0,
    herbs: 0,
    water: 0,
    medicine: 0,
    coins: 0,
    stoneAxe: 0,
    spear: 0,
    campfire: 0,
    shelter: 0,
    relic: 0,
  },
  player: {
    x: 240,
    y: 1660,
    radius: 18,
    speed: 140,
    runSpeed: 210,
    facingX: 1,
    facingY: 0,
    health: 100,
    hunger: 100,
    thirst: 100,
    stamina: 100,
    attackTimer: 0,
    dodgeTimer: 0,
    attackCooldown: 0,
    hurtFlash: 0,
    weapon: "spear",
  },
  buildings: [],
  resources: [],
  npcs: [],
  animals: [],
  enemies: [],
  treasure: [],
  interactionHint: "",
  lastSave: 0,
  dialogue: null,
};

const keys = {};
const pointer = { x: 0, y: 0 };

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function addInventory(item, amount) {
  if (!state.inventory[item] && state.inventory[item] !== 0) {
    state.inventory[item] = 0;
  }
  state.inventory[item] += amount;
  state.inventory[item] = Math.max(0, state.inventory[item]);
  updateUI();
}

function hasInventory(cost) {
  return Object.entries(cost).every(([name, amount]) => (state.inventory[name] || 0) >= amount);
}

function spendInventory(cost) {
  Object.entries(cost).forEach(([name, amount]) => {
    state.inventory[name] = Math.max(0, (state.inventory[name] || 0) - amount);
  });
  updateUI();
}

function showStatus(text) {
  statusLine.textContent = text;
}

function showDialogue(title, body) {
  dialogueBox.innerHTML = `<span class="dialogue-title">${title}</span><div class="dialogue-body">${body}</div>`;
  dialogueBox.classList.remove("hidden");
}

function hideDialogue() {
  dialogueBox.classList.add("hidden");
}

function getBiome(x, y) {
  if (x < 1200) return "beach";
  if (x < 2280) return "jungle";
  return "cave";
}

function createWorld() {
  const beachTrees = [];
  for (let i = 0; i < 18; i++) {
    beachTrees.push({
      id: `tree-${i}`,
      kind: "tree",
      x: 80 + i * 48 + (i % 3) * 12,
      y: 180 + (i % 5) * 210 + 40,
      radius: 25,
      resource: "wood",
    });
  }

  const rocks = [];
  for (let i = 0; i < 12; i++) {
    rocks.push({
      id: `rock-${i}`,
      kind: "rock",
      x: 240 + i * 82,
      y: 650 + (i % 3) * 160,
      radius: 20,
      resource: "stone",
    });
  }

  const bushes = [];
  for (let i = 0; i < 15; i++) {
    bushes.push({
      id: `bush-${i}`,
      kind: "bush",
      x: 680 + i * 60,
      y: 1020 + (i % 4) * 120,
      radius: 18,
      resource: "berries",
    });
  }

  const waters = [];
  for (let i = 0; i < 6; i++) {
    waters.push({
      id: `water-${i}`,
      kind: "water",
      x: 360 + i * 160,
      y: 1460 + (i % 2) * 140,
      radius: 20,
      resource: "water",
    });
  }

  const jungleTrees = [];
  for (let i = 0; i < 20; i++) {
    jungleTrees.push({
      id: `jungle-tree-${i}`,
      kind: "tree",
      x: 1280 + (i % 6) * 210 + Math.sin(i) * 35,
      y: 240 + Math.floor(i / 6) * 180 + (i % 3) * 40,
      radius: 32,
      resource: "wood",
    });
  }

  const jungleStones = [];
  for (let i = 0; i < 14; i++) {
    jungleStones.push({
      id: `jungle-rock-${i}`,
      kind: "rock",
      x: 1380 + i * 100,
      y: 860 + (i % 4) * 160,
      radius: 24,
      resource: "stone",
    });
  }

  const herbsPatch = [];
  for (let i = 0; i < 10; i++) {
    herbsPatch.push({
      id: `herb-${i}`,
      kind: "herb",
      x: 1650 + i * 90,
      y: 530 + (i % 3) * 120,
      radius: 18,
      resource: "herbs",
    });
  }

  const fishSpots = [];
  for (let i = 0; i < 8; i++) {
    fishSpots.push({
      id: `fish-${i}`,
      kind: "water",
      x: 1700 + i * 110,
      y: 1540 + (i % 2) * 180,
      radius: 20,
      resource: "fish",
    });
  }

  const caveZone = {
    id: "cave-entry",
    kind: "cave",
    x: 2480,
    y: 470,
    radius: 110,
    resource: "relic",
  };

  state.resources = [
    ...beachTrees,
    ...rocks,
    ...bushes,
    ...waters,
    ...jungleTrees,
    ...jungleStones,
    ...herbsPatch,
    ...fishSpots,
    caveZone,
  ];

  state.npcs = [
    {
      id: "juno",
      name: "Juno",
      x: 420,
      y: 1380,
      radius: 22,
      profession: "Fisherman",
      dialogue: [
        "The jungle has grown loud at dusk. Something is moving beyond the cave path.",
        "I heard whispers from the old ruins. You should investigate the northern cave.",
      ],
    },
  ];

  state.animals = [
    {
      id: "turtle",
      kind: "turtle",
      x: 690,
      y: 980,
      radius: 18,
      health: 18,
      speed: 32,
      directionX: 1,
      directionY: 0,
      wanderTimer: 0,
      state: "wander",
    },
  ];

  state.enemies = [
    {
      id: "beast-1",
      kind: "jungleBeast",
      x: 1880,
      y: 790,
      radius: 22,
      maxHealth: 58,
      health: 58,
      speed: 58,
      damage: 12,
      attackCooldown: 0,
      state: "patrol",
    },
  ];

  state.treasure = [
    {
      id: "hidden-cache",
      kind: "chest",
      x: 2570,
      y: 590,
      radius: 24,
      opened: false,
      reward: "relic",
    },
  ];

  state.buildings = [
    {
      id: "beach-camp",
      type: "campfire",
      x: 280,
      y: 1500,
      radius: 18,
      placed: true,
    },
  ];
}

function updateQuestUI() {
  const q = state.quest;
  let html = `
    <div class="quest-row">
      <div>
        <div class="quest-label">${q.title}</div>
        <div class="quest-detail">${q.objective}</div>
      </div>
    </div>
  `;

  if (q.completed) {
    html += '<div class="quest-row"><div class="quest-detail">Quest complete: reward received.</div></div>';
  }

  questList.innerHTML = html;
}

function renderInventory() {
  const rows = Object.entries(itemInfo)
    .filter(([key]) => (state.inventory[key] || 0) > 0)
    .map(([key, info]) => `
      <div class="inventory-row">
        <div class="inventory-name">${info.icon} ${info.label}</div>
        <div class="inventory-amount">×${state.inventory[key]}</div>
      </div>
    `)
    .join("");

  inventoryList.innerHTML = rows || '<div class="empty-note">Your pack is empty.</div>';
}

function renderCrafting() {
  craftingList.innerHTML = recipes
    .map((recipe) => `
      <div class="crafting-row">
        <button type="button" data-recipe="${recipe.id}">${recipe.label}</button>
      </div>
    `)
    .join("");

  craftingList.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => craftRecipe(button.dataset.recipe));
  });
}

function updateStatsUI() {
  const player = state.player;
  const stats = [
    { name: "❤️", color: "#f45466", value: player.health, label: "Health" },
    { name: "🍖", color: "#f0b262", value: player.hunger, label: "Hunger" },
    { name: "💧", color: "#60a5fa", value: player.thirst, label: "Thirst" },
    { name: "⚡", color: "#facc15", value: player.stamina, label: "Stamina" },
  ];

  statsBar.innerHTML = stats
    .map(
      (stat) => `
        <div class="stat-block">
          <span class="stat-name">${stat.name}</span>
          <div class="bar">
            <div class="bar-fill" style="width:${clamp(stat.value, 0, 100)}%; background:${stat.color};"></div>
          </div>
        </div>
      `,
    )
    .join("");
}

function updateUI() {
  renderInventory();
  renderCrafting();
  updateQuestUI();
  updateStatsUI();
}

function craftRecipe(recipeId) {
  const recipe = recipes.find((entry) => entry.id === recipeId);
  if (!recipe) return;

  if (!hasInventory(recipe.cost)) {
    showStatus(`Not enough materials for ${recipe.label}.`);
    return;
  }

  spendInventory(recipe.cost);
  addInventory(recipe.output, 1);

  if (recipe.buildType) {
    state.selectedBuild = recipe.buildType;
    showStatus(`${recipe.label} ready to place. Click on ground to set it.`);
  } else {
    showStatus(`${recipe.label} crafted.`);
  }

  updateUI();
}

function interact() {
  let nearby = null;

  for (const resource of state.resources) {
    if (distance(resource, state.player) < (resource.radius || 30) + 26) {
      nearby = resource;
      break;
    }
  }

  if (!nearby) {
    for (const npc of state.npcs) {
      if (distance(npc, state.player) < 60) {
        nearby = npc;
        break;
      }
    }
  }

  if (!nearby) {
    for (const chest of state.treasure) {
      if (!chest.opened && distance(chest, state.player) < 50) {
        nearby = chest;
        break;
      }
    }
  }

  if (!nearby) {
    if (state.quest.active && state.quest.stage >= 3 && distance({ x: state.npcs[0].x, y: state.npcs[0].y }, state.player) < 60) {
      completeQuest();
      return;
    }
    showStatus("Nothing nearby to interact with.");
    return;
  }

  if (nearby.kind === "tree" || nearby.kind === "rock" || nearby.kind === "bush" || nearby.kind === "herb" || nearby.kind === "water") {
    const resourceName = nearby.resource;
    if (resourceName === "water" || resourceName === "fish") {
      addInventory(resourceName, 1);
      showStatus(`${itemInfo[resourceName].label} gathered.`);
      return;
    }

    addInventory(resourceName, 1);
    showStatus(`${itemInfo[resourceName].label} collected.`);
    return;
  }

  if (nearby.kind === "cave") {
    const cave = "The cave opens beneath the jungle floor. A hidden cache waits deeper inside.";
    showDialogue("Northern Cave", cave);
    if (state.quest.active && state.quest.stage === 1) {
      state.quest.stage = 2;
      state.quest.objective = "Defeat the creature and recover the relic from the cave.";
      showStatus("Objective updated: defeat the cave beast.");
      updateUI();
    }
    return;
  }

  if (nearby.name === "Juno") {
    const q = state.quest;
    if (!q.active) {
      q.active = true;
      q.stage = 1;
      q.objective = "Find the northern cave and explore its hidden tunnel.";
      showDialogue("Juno", `"The cave north of the jungle is dangerous. Please find the lost explorer and bring back proof."`);
      showStatus("Quest started: Investigate the Northern Cave");
      updateUI();
    } else if (q.active && q.stage >= 3) {
      completeQuest();
    } else {
      showDialogue("Juno", `"The path is dangerous. Keep moving toward the cave and watch the trees."`);
    }
    return;
  }

  if (nearby.kind === "chest") {
    if (nearby.opened) return;
    nearby.opened = true;
    addInventory("relic", 1);
    state.quest.stage = 3;
    state.quest.objective = "Return the relic to Juno on the beach.";
    showStatus("Ancient relic recovered.");
    showDialogue("Treasure Found", "You found a strange island relic. The cave grows quieter, and the jungle spirits feel closer.");
    updateUI();
    return;
  }
}

function completeQuest() {
  if (state.quest.completed) return;
  state.quest.completed = true;
  state.quest.stage = 4;
  state.quest.objective = "Quest complete.";
  addInventory("coins", 18);
  addInventory("medicine", 1);
  showDialogue("Juno", `"The relic is real. You have proven your courage. Your next journey begins with the island's secret."`);
  showStatus("Quest complete: The island's mystery deepens.");
  updateUI();
}

function updatePlayer(dt) {
  const player = state.player;
  const inputX = (keys["d"] || keys["arrowright"] ? 1 : 0) - (keys["a"] || keys["arrowleft"] ? 1 : 0);
  const inputY = (keys["s"] || keys["arrowdown"] ? 1 : 0) - (keys["w"] || keys["arrowup"] ? 1 : 0);

  player.hunger = clamp(player.hunger - dt * 0.3, 0, 100);
  player.thirst = clamp(player.thirst - dt * 0.4, 0, 100);
  player.stamina = clamp(player.stamina + (player.hunger > 25 ? dt * 0.6 : -dt * 0.15), 0, 100);

  if (player.hunger < 30) {
    player.stamina = clamp(player.stamina - dt * 0.2, 0, 100);
  }

  if (player.thirst < 25) {
    player.speed = 95;
  } else {
    player.speed = 140;
  }

  if (player.hunger <= 5 || player.thirst <= 5) {
    player.health = clamp(player.health - dt * 0.5, 0, 100);
  }

  if (inputX !== 0 || inputY !== 0) {
    const length = Math.hypot(inputX, inputY) || 1;
    const moveX = (inputX / length) * (keys["shift"] && player.stamina > 10 ? player.runSpeed : player.speed) * dt;
    const moveY = (inputY / length) * (keys["shift"] && player.stamina > 10 ? player.runSpeed : player.speed) * dt;

    if (keys["shift"] && player.stamina > 0) {
      player.stamina = clamp(player.stamina - dt * 25, 0, 100);
    }

    player.x = clamp(player.x + moveX, 20, world.width - 20);
    player.y = clamp(player.y + moveY, 20, world.height - 20);

    player.facingX = inputX;
    player.facingY = inputY;
  }

  if (player.attackCooldown > 0) player.attackCooldown -= dt;
  if (player.attackTimer > 0) player.attackTimer -= dt;
  if (player.dodgeTimer > 0) player.dodgeTimer -= dt;
  if (player.hurtFlash > 0) player.hurtFlash -= dt;
}

function updateAnimal(dt) {
  for (const animal of state.animals) {
    animal.wanderTimer -= dt;
    if (animal.wanderTimer <= 0) {
      animal.directionX = Math.random() * 2 - 1;
      animal.directionY = Math.random() * 2 - 1;
      animal.wanderTimer = 2 + Math.random() * 2;
    }

    const dist = distance(animal, state.player);
    if (dist < 180) {
      const dirX = animal.x - state.player.x;
      const dirY = animal.y - state.player.y;
      const len = Math.hypot(dirX, dirY) || 1;
      animal.x += (dirX / len) * 35 * dt;
      animal.y += (dirY / len) * 35 * dt;
    } else {
      animal.x += animal.directionX * animal.speed * dt;
      animal.y += animal.directionY * animal.speed * dt;
    }

    animal.x = clamp(animal.x, 60, world.width - 60);
    animal.y = clamp(animal.y, 60, world.height - 60);
  }
}

function updateEnemies(dt) {
  for (const enemy of state.enemies) {
    const dist = distance(enemy, state.player);
    if (dist < 240) {
      const dx = state.player.x - enemy.x;
      const dy = state.player.y - enemy.y;
      const len = Math.hypot(dx, dy) || 1;
      enemy.x += (dx / len) * enemy.speed * dt;
      enemy.y += (dy / len) * enemy.speed * dt;
    }

    if (dist < 36 && enemy.attackCooldown <= 0) {
      state.player.health = clamp(state.player.health - enemy.damage, 0, 100);
      enemy.attackCooldown = 1.2;
      state.player.hurtFlash = 0.18;
      showStatus("You were hit by a jungle beast.");
    }

    enemy.attackCooldown = Math.max(0, enemy.attackCooldown - dt);
  }
}

function performAttack() {
  if (state.player.attackCooldown > 0) return;

  state.player.attackCooldown = 0.5;
  state.player.attackTimer = 0.16;

  const player = state.player;
  for (const enemy of state.enemies) {
    const dx = enemy.x - player.x;
    const dy = enemy.y - player.y;
    const dist = Math.hypot(dx, dy);
    const facingX = player.facingX || 1;
    const facingY = player.facingY || 0;
    const dot = (dx / (dist || 1)) * facingX + (dy / (dist || 1)) * facingY;
    if (dist < 54 && dot > -0.2) {
      enemy.health -= 18;
      if (enemy.health <= 0) {
        enemy.health = 0;
        if (state.quest.active && state.quest.stage === 2) {
          state.quest.stage = 3;
          state.quest.objective = "Return the relic to Juno on the beach.";
          showStatus("Creature defeated. Return to the beach camp.");
          updateUI();
        }
      }
    }
  }
}

function toggleWeather() {
  const weatherOrder = ["Sunny", "Cloudy", "Rain", "Storm", "Fog"];
  state.weatherTimer -= 1;
  if (state.weatherTimer <= 0) {
    const index = (weatherOrder.indexOf(state.weather) + 1) % weatherOrder.length;
    state.weather = weatherOrder[index];
    state.weatherTimer = 14;
    showStatus(`Weather shifts to ${state.weather}.`);
  }
}

function updateTime(dt) {
  state.time += dt * 0.015;
  if (state.time > 1) state.time -= 1;

  if (state.time < 0.22) {
    state.dayPhase = "Night";
  } else if (state.time < 0.42) {
    state.dayPhase = "Morning";
  } else if (state.time < 0.68) {
    state.dayPhase = "Afternoon";
  } else if (state.time < 0.85) {
    state.dayPhase = "Evening";
  } else {
    state.dayPhase = "Night";
  }

  if (state.weatherTimer <= 0) {
    toggleWeather();
  }
  state.weatherTimer -= dt;
}

function saveGame() {
  const save = {
    player: state.player,
    inventory: state.inventory,
    quest: state.quest,
    buildings: state.buildings,
    treasure: state.treasure,
    enemies: state.enemies,
  };
  localStorage.setItem("lost-island-save", JSON.stringify(save));
  showStatus("Game saved.");
}

function loadGame() {
  const raw = localStorage.getItem("lost-island-save");
  if (!raw) return;

  try {
    const save = JSON.parse(raw);
    if (!save) return;
    Object.assign(state.player, save.player || {});
    Object.assign(state.inventory, save.inventory || {});
    state.quest = save.quest || state.quest;
    state.buildings = save.buildings || [];
    state.treasure = save.treasure || [];
    state.enemies = save.enemies || [];
    showStatus("Save loaded.");
  } catch (error) {
    console.warn("Save failed to load.", error);
  }
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#7bc4ec");
  gradient.addColorStop(0.5, "#a7dec3");
  gradient.addColorStop(1, "#2d5f45");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawGround(camera) {
  ctx.save();
  ctx.translate(-camera.x, -camera.y);

  for (let y = 0; y < world.height; y += 96) {
    for (let x = 0; x < world.width; x += 96) {
      const biome = getBiome(x, y);
      ctx.fillStyle = biome === "beach" ? "#d6b77a" : biome === "jungle" ? "#3d8f4f" : "#283d42";
      ctx.fillRect(x, y, 96, 96);

      if (biome === "beach") {
        ctx.fillStyle = "rgba(255,255,255,0.05)";
        for (let i = 0; i < 4; i++) {
          ctx.fillRect(x + 18 + i * 22, y + 10 + (i % 2) * 22, 8, 8);
        }
      }

      if (biome === "jungle") {
        ctx.fillStyle = "rgba(18, 38, 21, 0.18)";
        for (let i = 0; i < 5; i++) {
          ctx.fillRect(x + 10 + i * 18, y + 50 + (i % 2) * 12, 8, 8);
        }
      }
    }
  }

  drawBiomeLabels();
  drawResources();
  drawBuildings();
  drawTreasure();
  drawEnemies();
  drawAnimals();
  drawNPCs();
  drawPlayer();

  ctx.restore();
}

function drawBiomeLabels() {
  ctx.fillStyle = "rgba(10,12,18,0.25)";
  ctx.fillRect(160, 120, 210, 44);
  ctx.fillStyle = "#f6fee8";
  ctx.font = "bold 28px Segoe UI";
  ctx.fillText("Beach", 180, 150);

  ctx.fillStyle = "rgba(10,12,18,0.25)";
  ctx.fillRect(1390, 120, 230, 44);
  ctx.fillStyle = "#eefede";
  ctx.fillText("Jungle", 1410, 150);

  ctx.fillStyle = "rgba(10,12,18,0.25)";
  ctx.fillRect(2440, 120, 220, 44);
  ctx.fillStyle = "#edf8ff";
  ctx.fillText("Cavern", 2460, 150);
}

function drawPlayer() {
  const p = state.player;
  ctx.save();
  ctx.translate(p.x, p.y);

  if (p.hurtFlash > 0) {
    ctx.shadowColor = "#ff6b6b";
    ctx.shadowBlur = 16;
  }

  ctx.fillStyle = "#f0d8c8";
  ctx.beginPath();
  ctx.arc(0, -12, 9, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#2e5d9f";
  ctx.fillRect(-10, -2, 20, 24);

  ctx.fillStyle = "#4c8f62";
  ctx.fillRect(-8, 22, 6, 18);
  ctx.fillRect(2, 22, 6, 18);

  if (p.attackTimer > 0) {
    const dirX = p.facingX || 1;
    const dirY = p.facingY || 0;
    ctx.strokeStyle = "#ffe29a";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(dirX * 34, dirY * 34);
    ctx.stroke();
  }

  ctx.restore();
}

function drawResources() {
  for (const resource of state.resources) {
    if (resource.kind === "tree") {
      ctx.fillStyle = "#6d4330";
      ctx.fillRect(resource.x - 8, resource.y, 16, 32);
      ctx.fillStyle = "#2e8d4d";
      ctx.beginPath();
      ctx.arc(resource.x, resource.y - 8, 24, 0, Math.PI * 2);
      ctx.fill();
    }

    if (resource.kind === "rock") {
      ctx.fillStyle = "#7a7d80";
      ctx.beginPath();
      ctx.moveTo(resource.x - 18, resource.y + 12);
      ctx.lineTo(resource.x - 4, resource.y - 16);
      ctx.lineTo(resource.x + 16, resource.y - 7);
      ctx.lineTo(resource.x + 18, resource.y + 14);
      ctx.closePath();
      ctx.fill();
    }

    if (resource.kind === "bush") {
      ctx.fillStyle = "#3a9d5d";
      ctx.beginPath();
      ctx.arc(resource.x, resource.y, 18, 0, Math.PI * 2);
      ctx.fill();
    }

    if (resource.kind === "herb") {
      ctx.fillStyle = "#52b36d";
      ctx.beginPath();
      ctx.arc(resource.x, resource.y, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#bfe66f";
      ctx.fillRect(resource.x - 2, resource.y - 10, 4, 20);
    }

    if (resource.kind === "water") {
      ctx.fillStyle = "rgba(84, 166, 255, 0.9)";
      ctx.beginPath();
      ctx.arc(resource.x, resource.y, resource.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    if (resource.kind === "cave") {
      ctx.fillStyle = "rgba(21, 33, 40, 0.7)";
      ctx.beginPath();
      ctx.arc(resource.x, resource.y, resource.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#f8f9d8";
      ctx.fillRect(resource.x - 12, resource.y - 70, 24, 30);
    }
  }
}

function drawBuildings() {
  for (const building of state.buildings) {
    if (building.type === "campfire") {
      ctx.fillStyle = "#ad5b24";
      ctx.beginPath();
      ctx.arc(building.x, building.y, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ff9f3e";
      ctx.beginPath();
      ctx.arc(building.x, building.y, 9, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawTreasure() {
  for (const chest of state.treasure) {
    if (chest.opened) continue;
    ctx.fillStyle = "#d4a767";
    ctx.fillRect(chest.x - 18, chest.y - 10, 36, 20);
    ctx.fillStyle = "#8b5e34";
    ctx.fillRect(chest.x - 4, chest.y - 18, 8, 12);
  }
}

function drawNPCs() {
  for (const npc of state.npcs) {
    ctx.fillStyle = "#d9c7a6";
    ctx.beginPath();
    ctx.arc(npc.x, npc.y, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#574a45";
    ctx.fillRect(npc.x - 14, npc.y + 7, 28, 16);
  }
}

function drawAnimals() {
  for (const animal of state.animals) {
    ctx.fillStyle = "#6f9d67";
    ctx.beginPath();
    ctx.ellipse(animal.x, animal.y, 18, 12, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawEnemies() {
  for (const enemy of state.enemies) {
    ctx.fillStyle = enemy.health > 20 ? "#ac5245" : "#7b2b2d";
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(enemy.x - 22, enemy.y - 30, 44, 6);
    ctx.fillStyle = "#ebf089";
    ctx.fillRect(enemy.x - 22, enemy.y - 30, 44 * (enemy.health / enemy.maxHealth), 6);
  }
}

function drawMinimap() {
  const mmX = canvas.width - 180;
  const mmY = 20;
  const w = 150;
  const h = 110;
  ctx.fillStyle = "rgba(6,14,18,0.65)";
  ctx.fillRect(mmX, mmY, w, h);

  ctx.fillStyle = "rgba(120, 205, 150, 0.7)";
  ctx.fillRect(mmX + 10, mmY + 12, 50, 30);
  ctx.fillStyle = "rgba(113, 161, 214, 0.8)";
  ctx.fillRect(mmX + 80, mmY + 15, 55, 28);
  ctx.fillStyle = "rgba(40, 48, 64, 0.9)";
  ctx.fillRect(mmX + 82, mmY + 62, 44, 38);

  const px = mmX + ((state.player.x / world.width) * w);
  const py = mmY + ((state.player.y / world.height) * h);
  ctx.fillStyle = "#fdf4b1";
  ctx.beginPath();
  ctx.arc(px, py, 5, 0, Math.PI * 2);
  ctx.fill();
}

function drawDialogHint() {
  const other = getNearbyInteractable();
  if (!other) return;
  ctx.fillStyle = "rgba(7,11,14,0.72)";
  ctx.fillRect(24, canvas.height - 52, 220, 28);
  ctx.fillStyle = "#eaf8ff";
  ctx.font = "16px Segoe UI";
  ctx.fillText("Press E to interact", 34, canvas.height - 32);
}

function getNearbyInteractable() {
  for (const resource of state.resources) {
    if (distance(resource, state.player) < (resource.radius || 30) + 26) return resource;
  }
  for (const npc of state.npcs) {
    if (distance(npc, state.player) < 60) return npc;
  }
  for (const chest of state.treasure) {
    if (!chest.opened && distance(chest, state.player) < 50) return chest;
  }
  return null;
}

function render() {
  const cameraX = clamp(state.player.x - canvas.width / 2, 0, world.width - canvas.width);
  const cameraY = clamp(state.player.y - canvas.height / 2, 0, world.height - canvas.height);
  const camera = { x: cameraX, y: cameraY };

  drawBackground();
  drawGround(camera);

  const overlay = ctx.createLinearGradient(0, 0, 0, canvas.height);
  const nightAlpha = state.dayPhase === "Night" ? 0.52 : state.dayPhase === "Morning" ? 0.18 : state.dayPhase === "Evening" ? 0.35 : 0.07;
  overlay.addColorStop(0, `rgba(8, 15, 28, ${nightAlpha})`);
  overlay.addColorStop(1, "rgba(4, 12, 16, 0.08)");
  ctx.fillStyle = overlay;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawMinimap();
  drawDialogHint();

  const target = getNearbyInteractable();
  if (target) {
    state.interactionHint = target.name ? `Talk to ${target.name}` : "Gather resources";
  } else {
    state.interactionHint = "Explore the island";
  }
}

function loop(timestamp) {
  const dt = Math.min(0.033, (timestamp - (loop.lastTime || timestamp)) / 1000 || 0.016);
  loop.lastTime = timestamp;

  updateTime(dt);
  updatePlayer(dt);
  updateAnimal(dt);
  updateEnemies(dt);
  render();
  updateUI();

  if (performance.now() - state.lastSave > 12000) {
    saveGame();
    state.lastSave = performance.now();
  }

  requestAnimationFrame(loop);
}

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  keys[key] = true;
  keys[event.key] = true;

  if (key === "e") {
    interact();
  }

  if (key === " ") {
    if (state.player.dodgeTimer <= 0) {
      state.player.dodgeTimer = 0.26;
      state.player.stamina = Math.max(0, state.player.stamina - 12);
    }
  }

  if (key === "m") {
    saveGame();
  }

  if (key === "1") {
    state.selectedBuild = "campfire";
    showStatus("Campfire selected. Click to place it.");
  }

  if (key === "2") {
    state.selectedBuild = "shelter";
    showStatus("Shelter selected. Click to place it.");
  }

  if (key === "j") {
    performAttack();
  }
});

window.addEventListener("keyup", (event) => {
  const key = event.key.toLowerCase();
  keys[key] = false;
  keys[event.key] = false;
});

canvas.addEventListener("pointerdown", (event) => {
  if (state.selectedBuild) {
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((event.clientY - rect.top) / rect.height) * canvas.height;
    const camX = clamp(state.player.x - canvas.width / 2, 0, world.width - canvas.width);
    const camY = clamp(state.player.y - canvas.height / 2, 0, world.height - canvas.height);
    const worldX = x + camX;
    const worldY = y + camY;

    if (state.inventory[state.selectedBuild] > 0) {
      state.buildings.push({
        id: `build-${Date.now()}`,
        type: state.selectedBuild,
        x: worldX,
        y: worldY,
        radius: 18,
        placed: true,
      });
      state.inventory[state.selectedBuild] -= 1;
      state.selectedBuild = null;
      showStatus(`${state.selectedBuild || "Structure"} placed.`);
      updateUI();
    }
    return;
  }

  performAttack();
});

createWorld();
loadGame();
updateUI();
requestAnimationFrame(loop);

showStatus("Beach camp established.");
showDialogue("Juno", `"The island is quiet for now, but the jungle is watching. Look for the northern cave and bring back proof."`);

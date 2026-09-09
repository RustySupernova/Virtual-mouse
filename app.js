const gameFrame = document.getElementById("gameFrame");
const gameUrl = document.getElementById("gameUrl");
const loadGame = document.getElementById("loadGame");
const welcome = document.getElementById("welcome");
const controller = document.getElementById("controller");
const settingsButton = document.getElementById("settingsButton");
const settingsPanel = document.getElementById("settingsPanel");
const closeSettings = document.getElementById("closeSettings");
const saveSettings = document.getElementById("saveSettings");
const opacitySlider = document.getElementById("opacitySlider");
const controllerScale = document.getElementById("controllerScale");
const joystickMode = document.getElementById("joystickMode");
const mouseSensitivity = document.getElementById("mouseSensitivity");
const toast = document.getElementById("toast");
const gameStatus = document.getElementById("gameStatus");

const MAD_MAGE_URL = "https://bluesquirrel.itch.io/caverns-of-the-mad-mage";
const MAD_MAGE_KEYS = { up: "w", down: "s", left: "a", right: "d" };

let currentConfig = {
    joystickMode: "wasd",
    mouseSensitivity: 8,
    opacity: 0.78,
    scale: 1
};

function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove("show"), 2200);
}

function normalizeUrl(value) {
    let url = value.trim();
    if (!url) return null;
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    try { return new URL(url).href; } catch { return null; }
}

function isMadMage(url) {
    try { return new URL(url).hostname === "bluesquirrel.itch.io" && new URL(url).pathname.includes("caverns-of-the-mad-mage"); }
    catch { return false; }
}

function updateStatus(text, state = "") {
    if (!gameStatus) return;
    gameStatus.textContent = text;
    gameStatus.dataset.state = state;
}

function loadGamePage() {
    const url = normalizeUrl(gameUrl.value);
    if (!url) {
        showToast("Please enter a valid URL.");
        return;
    }

    welcome.style.display = "none";
    gameFrame.style.display = "block";
    gameFrame.src = url;

    if (isMadMage(url)) {
        currentConfig.joystickMode = "wasd";
        joystickMode.value = "wasd";
        updateStatus("Caverns preset • WASD + Enter", "preset");
        showToast("Caverns of the Mad Mage preset loaded.");
    } else {
        updateStatus("Controller ready", "ready");
        showToast("Loading game...");
    }
}

loadGame.addEventListener("click", loadGamePage);
gameUrl.addEventListener("keydown", event => {
    if (event.key === "Enter") loadGamePage();
});

function dispatchIntoSameOriginFrame(message) {
    try {
        const doc = gameFrame.contentDocument;
        if (!doc) return false;
        const target = doc.activeElement || doc.body || doc.documentElement;
        if (!target) return false;

        if (message.type === "keyboard") {
            const init = {
                key: message.key,
                code: keyToCode(message.key),
                bubbles: true,
                cancelable: true,
                composed: true
            };
            target.dispatchEvent(new KeyboardEvent(message.action === "keydown" ? "keydown" : "keyup", init));
            return true;
        }

        if (message.type === "mouse" && message.action === "move") {
            target.dispatchEvent(new MouseEvent("mousemove", {
                bubbles: true,
                cancelable: true,
                clientX: window.innerWidth / 2 + message.dx,
                clientY: window.innerHeight / 2 + message.dy,
                movementX: message.dx,
                movementY: message.dy
            }));
            return true;
        }
    } catch (_) {
        return false;
    }
    return false;
}

function keyToCode(key) {
    if (key.length === 1 && /[a-z]/i.test(key)) return `Key${key.toUpperCase()}`;
    if (key.length === 1 && /[0-9]/.test(key)) return `Digit${key}`;
    return {
        ArrowUp: "ArrowUp", ArrowDown: "ArrowDown", ArrowLeft: "ArrowLeft", ArrowRight: "ArrowRight",
        Enter: "Enter", Escape: "Escape", " ": "Space"
    }[key] || key;
}

function sendToGame(message) {
    if (dispatchIntoSameOriginFrame(message)) return true;
    if (!gameFrame.contentWindow) return false;
    gameFrame.contentWindow.postMessage(message, "*");
    return false;
}

function sendKeyDown(key) { sendToGame({ type: "keyboard", action: "keydown", key }); }
function sendKeyUp(key) { sendToGame({ type: "keyboard", action: "keyup", key }); }

const buttons = document.querySelectorAll(".game-button, .shoulder, .utility");
buttons.forEach(button => {
    const key = button.dataset.key;
    button.addEventListener("pointerdown", event => {
        event.preventDefault();
        button.setPointerCapture?.(event.pointerId);
        sendKeyDown(key);
    });
    button.addEventListener("pointerup", event => {
        event.preventDefault();
        sendKeyUp(key);
    });
    button.addEventListener("pointercancel", () => sendKeyUp(key));
    button.addEventListener("lostpointercapture", () => sendKeyUp(key));
});

class Joystick {
    constructor(element, mode) {
        this.element = element;
        this.mode = mode;
        this.base = element.querySelector(".joystick-base");
        this.stick = element.querySelector(".joystick-stick");
        this.active = false;
        this.pointerId = null;
        this.center = { x: 0, y: 0 };
        this.maxDistance = 42;
        element.addEventListener("pointerdown", e => this.start(e));
        element.addEventListener("pointermove", e => this.move(e));
        element.addEventListener("pointerup", e => this.end(e));
        element.addEventListener("pointercancel", e => this.end(e));
        element.addEventListener("lostpointercapture", e => this.end(e));
    }
    start(e) {
        e.preventDefault();
        this.active = true;
        this.pointerId = e.pointerId;
        this.element.setPointerCapture?.(e.pointerId);
        const rect = this.base.getBoundingClientRect();
        this.center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        this.move(e);
    }
    move(e) {
        if (!this.active || e.pointerId !== this.pointerId) return;
        const dx = e.clientX - this.center.x;
        const dy = e.clientY - this.center.y;
        const distance = Math.hypot(dx, dy);
        const angle = Math.atan2(dy, dx);
        const limited = Math.min(distance, this.maxDistance);
        const x = Math.cos(angle) * limited;
        const y = Math.sin(angle) * limited;
        this.stick.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
        this.handleDirection(x / this.maxDistance, y / this.maxDistance);
    }
    end(e) {
        if (!this.active) return;
        if (e && this.pointerId !== null && e.pointerId !== undefined && e.pointerId !== this.pointerId) return;
        this.active = false;
        this.pointerId = null;
        this.stick.style.transform = "translate(-50%, -50%)";
        this.handleDirection(0, 0);
    }
    handleDirection(x, y) {
        if (this.mode === "right") return this.handleMouse(x, y);
        const deadzone = 0.25;
        const horizontal = Math.abs(x) > deadzone ? (x > 0 ? 1 : -1) : 0;
        const vertical = Math.abs(y) > deadzone ? (y > 0 ? 1 : -1) : 0;
        const keys = currentConfig.joystickMode === "arrows"
            ? { up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight" }
            : MAD_MAGE_KEYS;
        this.updateKey("up", vertical < 0, keys.up);
        this.updateKey("down", vertical > 0, keys.down);
        this.updateKey("left", horizontal < 0, keys.left);
        this.updateKey("right", horizontal > 0, keys.right);
    }
    updateKey(name, shouldPress, key) {
        const property = `_pressed_${name}`;
        if (shouldPress && !this[property]) { this[property] = true; sendKeyDown(key); }
        if (!shouldPress && this[property]) { this[property] = false; sendKeyUp(key); }
    }
    handleMouse(x, y) {
        if (Math.abs(x) < 0.08 && Math.abs(y) < 0.08) return;
        sendToGame({ type: "mouse", action: "move", dx: x * Number(currentConfig.mouseSensitivity), dy: y * Number(currentConfig.mouseSensitivity) });
    }
}

new Joystick(document.getElementById("leftJoystick"), "left");
new Joystick(document.getElementById("rightJoystick"), "right");

opacitySlider.addEventListener("input", () => {
    currentConfig.opacity = Number(opacitySlider.value);
    controller.style.opacity = currentConfig.opacity;
});

controllerScale.addEventListener("input", () => {
    currentConfig.scale = Number(controllerScale.value);
    controller.style.transform = `scale(${currentConfig.scale})`;
});

settingsButton.addEventListener("click", () => settingsPanel.classList.add("open"));
closeSettings.addEventListener("click", () => settingsPanel.classList.remove("open"));

saveSettings.addEventListener("click", () => {
    currentConfig.joystickMode = joystickMode.value;
    currentConfig.mouseSensitivity = Number(mouseSensitivity.value);
    localStorage.setItem("gameControllerSettings", JSON.stringify(currentConfig));
    showToast("Settings saved.");
    settingsPanel.classList.remove("open");
});

function loadSettings() {
    try {
        const saved = JSON.parse(localStorage.getItem("gameControllerSettings") || "null");
        if (saved) currentConfig = Object.assign(currentConfig, saved);
    } catch (_) {}
    joystickMode.value = currentConfig.joystickMode;
    mouseSensitivity.value = currentConfig.mouseSensitivity;
    opacitySlider.value = currentConfig.opacity;
    controllerScale.value = currentConfig.scale;
    controller.style.opacity = currentConfig.opacity;
    controller.style.transform = `scale(${currentConfig.scale})`;
}
loadSettings();

gameFrame.addEventListener("load", () => {
    updateStatus("Game loaded", "loaded");
    try { gameFrame.contentWindow.focus(); } catch (_) {}
});

document.addEventListener("keydown", event => {
    if (event.target.matches("input, select, textarea")) return;
    sendKeyDown(event.key);
});
document.addEventListener("keyup", event => {
    if (event.target.matches("input, select, textarea")) return;
    sendKeyUp(event.key);
});

document.addEventListener("touchmove", event => {
    if (event.target.closest("#controller")) event.preventDefault();
}, { passive: false });

window.addEventListener("message", event => {
    if (event.data?.type === "game-ready") updateStatus("Game connected", "connected");
});

// Default target for the current project.
gameUrl.value = MAD_MAGE_URL;
updateStatus("Ready • tap Load", "ready");

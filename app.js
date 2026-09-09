const gameFrame = document.getElementById(“gameFrame”);
const gameUrl = document.getElementById(“gameUrl”);
const loadGame = document.getElementById(“loadGame”);

const welcome = document.getElementById(“welcome”);

const controller = document.getElementById(“controller”);

const settingsButton = document.getElementById(“settingsButton”);
const settingsPanel = document.getElementById(“settingsPanel”);
const closeSettings = document.getElementById(“closeSettings”);
const saveSettings = document.getElementById(“saveSettings”);

const opacitySlider = document.getElementById(“opacitySlider”);
const controllerScale = document.getElementById(“controllerScale”);
const joystickMode = document.getElementById(“joystickMode”);
const mouseSensitivity = document.getElementById(“mouseSensitivity”);

const toast = document.getElementById(“toast”);

let currentConfig = {
joystickMode: “wasd”,
mouseSensitivity: 8,
opacity: 0.75,
scale: 1
};

/* =====================================
UTILITY
===================================== */

function showToast(message) {
toast.textContent = message;
toast.classList.add(“show”);

setTimeout(() => {
    toast.classList.remove("show");
}, 2200);

}

function normalizeUrl(url) {

url = url.trim();
if (!url) {
    return null;
}
if (!/^https?:\/\//i.test(url)) {
    url = "https://" + url;
}
try {
    return new URL(url).href;
} catch {
    return null;
}

}

/* =====================================
LOAD GAME
===================================== */

function loadGamePage() {

const url = normalizeUrl(gameUrl.value);
if (!url) {
    showToast("Please enter a valid URL.");
    return;
}
welcome.style.display = "none";
gameFrame.style.display = "block";
gameFrame.src = url;
showToast("Loading game...");

}

loadGame.addEventListener(“click”, loadGamePage);

gameUrl.addEventListener(“keydown”, event => {

if (event.key === "Enter") {
    loadGamePage();
}

});

/* =====================================
GAME INPUT COMMUNICATION
===================================== */

function sendToGame(message) {

if (!gameFrame.contentWindow) {
    return;
}
gameFrame.contentWindow.postMessage(
    message,
    "*"
);

}

/*
This attempts to send keyboard input
to the game iframe.

Cross-origin pages cannot normally be
directly manipulated by the parent page.

*/

function sendKeyDown(key) {

sendToGame({
    type: "keyboard",
    action: "keydown",
    key: key
});

}

function sendKeyUp(key) {

sendToGame({
    type: "keyboard",
    action: "keyup",
    key: key
});

}

/* =====================================
BUTTONS
===================================== */

const buttons = document.querySelectorAll(
“.game-button, .shoulder, .utility”
);

buttons.forEach(button => {

const key = button.dataset.key;
button.addEventListener(
    "pointerdown",
    event => {
        event.preventDefault();
        button.setPointerCapture(event.pointerId);
        sendKeyDown(key);
    }
);
button.addEventListener(
    "pointerup",
    event => {
        event.preventDefault();
        sendKeyUp(key);
    }
);
button.addEventListener(
    "pointercancel",
    event => {
        sendKeyUp(key);
    }
);

});

/* =====================================
JOYSTICK
===================================== */

class Joystick {

constructor(element, mode = "left") {
    this.element = element;
    this.mode = mode;
    this.base =
        element.querySelector(".joystick-base");
    this.stick =
        element.querySelector(".joystick-stick");
    this.active = false;
    this.pointerId = null;
    this.lastDirection = {
        x: 0,
        y: 0
    };
    this.center = {
        x: 0,
        y: 0
    };
    this.maxDistance = 42;
    element.addEventListener(
        "pointerdown",
        e => this.start(e)
    );
    element.addEventListener(
        "pointermove",
        e => this.move(e)
    );
    element.addEventListener(
        "pointerup",
        e => this.end(e)
    );
    element.addEventListener(
        "pointercancel",
        e => this.end(e)
    );
}
start(e) {
    e.preventDefault();
    this.active = true;
    this.pointerId = e.pointerId;
    this.element.setPointerCapture(e.pointerId);
    const rect =
        this.base.getBoundingClientRect();
    this.center.x =
        rect.left + rect.width / 2;
    this.center.y =
        rect.top + rect.height / 2;
    this.move(e);
}
move(e) {
    if (!this.active ||
        e.pointerId !== this.pointerId) {
        return;
    }
    const dx =
        e.clientX - this.center.x;
    const dy =
        e.clientY - this.center.y;
    const distance =
        Math.sqrt(dx * dx + dy * dy);
    const angle =
        Math.atan2(dy, dx);
    const limitedDistance =
        Math.min(distance, this.maxDistance);
    const x =
        Math.cos(angle) * limitedDistance;
    const y =
        Math.sin(angle) * limitedDistance;
    this.stick.style.transform =
        `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
    const normalizedX =
        x / this.maxDistance;
    const normalizedY =
        y / this.maxDistance;
    this.handleDirection(
        normalizedX,
        normalizedY
    );
}
end(e) {
    if (!this.active ||
        e.pointerId !== this.pointerId) {
        return;
    }
    this.active = false;
    this.stick.style.transform =
        "translate(-50%, -50%)";
    this.handleDirection(0, 0);
    this.pointerId = null;
}
handleDirection(x, y) {
    if (this.mode === "right") {
        this.handleMouse(x, y);
        return;
    }
    this.handleKeyboard(x, y);
}
handleKeyboard(x, y) {
    const deadzone = 0.25;
    let horizontal = 0;
    let vertical = 0;
    if (Math.abs(x) > deadzone) {
        horizontal = x > 0 ? 1 : -1;
    }
    if (Math.abs(y) > deadzone) {
        vertical = y > 0 ? 1 : -1;
    }
    let keys;
    if (currentConfig.joystickMode === "wasd") {
        keys = {
            up: "w",
            down: "s",
            left: "a",
            right: "d"
        };
    } else {
        keys = {
            up: "ArrowUp",
            down: "ArrowDown",
            left: "ArrowLeft",
            right: "ArrowRight"
        };
    }
    this.updateKey(
        "up",
        vertical < 0,
        keys.up
    );
    this.updateKey(
        "down",
        vertical > 0,
        keys.down
    );
    this.updateKey(
        "left",
        horizontal < 0,
        keys.left
    );
    this.updateKey(
        "right",
        horizontal > 0,
        keys.right
    );
}
updateKey(name, shouldPress, key) {
    const property =
        "_pressed_" + name;
    if (shouldPress &&
        !this[property]) {
        this[property] = true;
        sendKeyDown(key);
    }
    if (!shouldPress &&
        this[property]) {
        this[property] = false;
        sendKeyUp(key);
    }
}
handleMouse(x, y) {
    const sensitivity =
        Number(currentConfig.mouseSensitivity);
    if (Math.abs(x) < 0.08 &&
        Math.abs(y) < 0.08) {
        return;
    }
    sendToGame({
        type: "mouse",
        action: "move",
        dx: x * sensitivity,
        dy: y * sensitivity
    });
}

}

/* =====================================
CREATE JOYSTICKS
===================================== */

const leftJoystick =
new Joystick(
document.getElementById(“leftJoystick”),
“left”
);

const rightJoystick =
new Joystick(
document.getElementById(“rightJoystick”),
“right”
);

/* =====================================
OPACITY
===================================== */

opacitySlider.addEventListener(
“input”,
() => {

    currentConfig.opacity =
        Number(opacitySlider.value);
    controller.style.opacity =
        currentConfig.opacity;
}

);

/* =====================================
SCALE
===================================== */

controllerScale.addEventListener(
“input”,
() => {

    currentConfig.scale =
        Number(controllerScale.value);
    controller.style.transform =
        `scale(${currentConfig.scale})`;
}

);

/* =====================================
SETTINGS
===================================== */

settingsButton.addEventListener(
“click”,
() => {

    settingsPanel.classList.add("open");
}

);

closeSettings.addEventListener(
“click”,
() => {

    settingsPanel.classList.remove("open");
}

);

saveSettings.addEventListener(
“click”,
() => {

    currentConfig.joystickMode =
        joystickMode.value;
    currentConfig.mouseSensitivity =
        Number(mouseSensitivity.value);
    localStorage.setItem(
        "gameControllerSettings",
        JSON.stringify(currentConfig)
    );
    showToast("Settings saved.");
    settingsPanel.classList.remove("open");
}

);

/* =====================================
LOAD SETTINGS
===================================== */

function loadSettings() {

const saved =
    localStorage.getItem(
        "gameControllerSettings"
    );
if (!saved) {
    controller.style.opacity =
        currentConfig.opacity;
    return;
}
try {
    currentConfig =
        Object.assign(
            currentConfig,
            JSON.parse(saved)
        );
    joystickMode.value =
        currentConfig.joystickMode;
    mouseSensitivity.value =
        currentConfig.mouseSensitivity;
    opacitySlider.value =
        currentConfig.opacity;
    controllerScale.value =
        currentConfig.scale;
    controller.style.opacity =
        currentConfig.opacity;
    controller.style.transform =
        `scale(${currentConfig.scale})`;
} catch {
    console.warn(
        "Could not load controller settings."
    );
}

}

loadSettings();

/* =====================================
FULLSCREEN
===================================== */

gameFrame.addEventListener(
“dblclick”,
() => {

    const container =
        document.getElementById(
            "gameContainer"
        );
    if (!document.fullscreenElement) {
        container.requestFullscreen()
            .catch(() => {});
    } else {
        document.exitFullscreen();
    }
}

);

/* =====================================
KEYBOARD PASSTHROUGH
===================================== */

document.addEventListener(
“keydown”,
event => {

    if (
        event.target.tagName === "INPUT" ||
        event.target.tagName === "SELECT"
    ) {
        return;
    }
    sendKeyDown(event.key);
}

);

document.addEventListener(
“keyup”,
event => {

    if (
        event.target.tagName === "INPUT" ||
        event.target.tagName === "SELECT"
    ) {
        return;
    }
    sendKeyUp(event.key);
}

);

/* =====================================
PREVENT MOBILE SCROLL / ZOOM
===================================== */

document.addEventListener(
“touchmove”,
event => {

    if (
        event.target.closest("#controller")
    ) {
        event.preventDefault();
    }
},
{
    passive: false
}

);

/* =====================================
GAME FRAME EVENTS
===================================== */

window.addEventListener(
“message”,
event => {

    if (!event.data) {
        return;
    }
    if (
        event.data.type === "game-ready"
    ) {
        showToast(
            "Game connected."
        );
    }
}

);

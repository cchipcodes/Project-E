import * as J from "jamango";

let root: HTMLDivElement | undefined;
let styleElement: HTMLStyleElement | undefined;
let toastElement: HTMLDivElement | undefined;
let toastHideAt = 0;
let interactPromptElement: HTMLDivElement | undefined;
let interactPromptText = "";

export function ensureHUDRoot() {
    if (!J.uiElement) return undefined;

    if (root && root.isConnected) return root;

    injectStyles();

    root = document.createElement("div");
    root.className = "jt-hud-root";
    J.uiElement.appendChild(root);

    return root;
}

export function createHUDPanel(className: string) {
    const hudRoot = ensureHUDRoot();
    if (!hudRoot) return undefined;

    const panel = document.createElement("div");
    panel.className = className;
    hudRoot.appendChild(panel);
    return panel;
}

export function createText(parent: HTMLElement, className: string, value = "") {
    const element = document.createElement("div");
    element.className = className;
    element.textContent = value;
    parent.appendChild(element);
    return element;
}

export function setText(element: HTMLElement | undefined, value: string) {
    if (!element) return;
    if (element.textContent === value) return;
    element.textContent = value;
}

export function setDisplay(
    element: HTMLElement | undefined,
    visible: boolean,
    display = "block",
) {
    if (!element) return;

    const next = visible ? display : "none";
    if (element.style.display === next) return;
    element.style.display = next;
}

export function showToast(message: string, durationSeconds: number, time: number) {
    const hudRoot = ensureHUDRoot();
    if (!hudRoot) return;

    if (!toastElement || !toastElement.isConnected) {
        toastElement = document.createElement("div");
        toastElement.className = "jt-toast";
        hudRoot.appendChild(toastElement);
    }

    setText(toastElement, message);
    setDisplay(toastElement, true);
    toastHideAt = time + Math.max(0.5, durationSeconds);
}

export function tickToast(time: number) {
    if (!toastElement) return;
    if (toastHideAt <= 0 || time < toastHideAt) return;

    toastHideAt = 0;
    setDisplay(toastElement, false);
}

export function showWorldInteractPrompt(
    worldPosition: J.Vec3,
    text: string,
    yOffset = 0,
) {
    const hudRoot = ensureHUDRoot();
    if (!hudRoot) return;

    if (!interactPromptElement || !interactPromptElement.isConnected) {
        interactPromptElement = document.createElement("div");
        interactPromptElement.className = "jt-world-interact-prompt";
        hudRoot.appendChild(interactPromptElement);
    }

    const screenPosition: J.Vec2 = [0, 0];
    J.getScreenPosition(screenPosition, [
        worldPosition[0],
        worldPosition[1] + yOffset,
        worldPosition[2],
    ]);

    const viewport = getViewportSize();
    const isVisible =
        screenPosition[0] >= -80 &&
        screenPosition[1] >= -80 &&
        screenPosition[0] <= viewport.width + 80 &&
        screenPosition[1] <= viewport.height + 80;

    if (!isVisible) {
        hideWorldInteractPrompt();
        return;
    }

    interactPromptElement.style.left = `${screenPosition[0]}px`;
    interactPromptElement.style.top = `${screenPosition[1]}px`;

    if (interactPromptText !== text) {
        interactPromptText = text;
        renderInteractPrompt(interactPromptElement, text);
    }

    setDisplay(interactPromptElement, true);
}

export function hideWorldInteractPrompt() {
    setDisplay(interactPromptElement, false);
}

export function positionClass(position: string) {
    switch (position) {
        case "left-middle-top":
            return "jt-pos-left-middle-top";
        case "left-middle-bottom":
            return "jt-pos-left-middle-bottom";
        case "top-middle":
            return "jt-pos-top-middle";
        case "bottom-middle":
            return "jt-pos-bottom-middle";
        default:
            return "jt-pos-left-middle";
    }
}

function injectStyles() {
    if (!J.uiElement || (styleElement && styleElement.isConnected)) return;

    styleElement = document.createElement("style");
    styleElement.textContent = `
.jt-hud-root {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 1000;
    font-family: Inter, Arial, sans-serif;
    color: white;
}
.jt-panel {
    position: fixed;
    min-width: 128px;
    max-width: min(320px, calc(100vw - 32px));
    padding: 10px 12px;
    border-radius: 8px;
    background: rgba(14, 18, 26, 0.78);
    border: 1px solid rgba(255, 255, 255, 0.18);
}
.jt-pos-left-middle { top: 40%; left: 18px; transform: translateY(-50%); }
.jt-pos-left-middle-top { top: 20%; left: 18px; transform: translateY(-50%); }
.jt-pos-left-middle-bottom { top: 60%; left: 18px; transform: translateY(-50%); }
.jt-pos-top-middle { top: 18px; left: 50%; transform: translateX(-50%); }
.jt-pos-bottom-middle { bottom: 18px; left: 50%; transform: translateX(-50%); }
.jt-label {
    color: rgba(255, 255, 255, 0.72);
    font-size: 12px;
    line-height: 16px;
}
.jt-value {
    margin-top: 2px;
    font-size: 24px;
    line-height: 30px;
    font-weight: 800;
}
.jt-timer {
    top: 18px;
    left: 50%;
    transform: translateX(-50%);
    text-align: center;
    z-index: 100;
}
.jt-toast {
    position: fixed;
    top: 112px;
    left: 50%;
    transform: translateX(-50%);
    max-width: min(720px, calc(100vw - 24px));
    padding: 12px 16px;
    font-size: clamp(20px, 5vw, 34px);
    line-height: 1.2;
    text-align: center;
    font-weight: 800;
}
.jt-leaderboard {
    min-width: 0;
    width: min(220px, calc(50vw - 24px));
    padding: 8px 10px;
    background: rgba(14, 18, 26, 0.5);
}
.jt-leaderboard-title {
    font-size: 12px;
    line-height: 16px;
    font-weight: 800;
    margin-bottom: 5px;
}
.jt-leaderboard-row {
    display: grid;
    grid-template-columns: 18px minmax(0, 1fr) auto;
    gap: 6px;
    align-items: center;
    min-height: 19px;
    font-size: 12px;
    line-height: 16px;
}
.jt-lb-place { color: rgba(255, 255, 255, 0.55); }
.jt-lb-name {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.jt-lb-score {
    font-variant-numeric: tabular-nums;
    text-align: right;
}
@media (max-width: 640px) {
    .jt-leaderboard {
        width: min(150px, calc(50vw - 16px));
        padding: 6px 8px;
    }
    .jt-leaderboard-title {
        font-size: 10px;
        line-height: 14px;
        margin-bottom: 4px;
    }
    .jt-leaderboard-row {
        grid-template-columns: 14px minmax(0, 1fr) auto;
        gap: 4px;
        min-height: 15px;
        font-size: 10px;
        line-height: 14px;
    }
}
.jt-counter {
    min-width: 0;
    width: min(220px, calc(50vw - 24px));
    padding: 8px 10px;
    background: rgba(14, 18, 26, 0.5);
}
.jt-counter .jt-label {
    font-size: 12px;
    line-height: 16px;
    font-weight: 800;
    color: rgba(255, 255, 255, 0.72);
    margin-bottom: 5px;
}
.jt-counter .jt-value {
    margin-top: 0;
    font-size: 22px;
    line-height: 26px;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
}
@media (max-width: 640px) {
    .jt-counter {
        width: min(150px, calc(50vw - 16px));
        padding: 6px 8px;
    }
    .jt-counter .jt-label {
        font-size: 10px;
        line-height: 14px;
        margin-bottom: 4px;
    }
    .jt-counter .jt-value {
        font-size: 18px;
        line-height: 22px;
    }
}
.jt-dialogue-backdrop {
    position: fixed;
    inset: 0;
    display: none;
    align-items: flex-end;
    justify-content: center;
    padding: 24px;
}
.jt-dialogue-panel {
    width: min(420px, calc(100vw - 32px));
    padding: 14px 16px;
    border-radius: 8px;
    background: rgba(14, 18, 26, 0.78);
    border: 1px solid rgba(255, 255, 255, 0.18);
    pointer-events: auto;
    cursor: pointer;
}
.jt-dialogue-title {
    font-size: 15px;
    line-height: 20px;
    font-weight: 800;
    margin-bottom: 8px;
}
.jt-dialogue-line {
    min-height: 46px;
    font-size: 18px;
    line-height: 24px;
}
.jt-dialogue-hint {
    margin-top: 10px;
    color: rgba(255, 255, 255, 0.62);
    font-size: 12px;
    line-height: 16px;
}
.jt-vehicle-hint {
    position: fixed;
    left: 50%;
    bottom: 24px;
    transform: translateX(-50%);
    padding: 12px 18px;
    border-radius: 8px;
    background: rgba(14, 18, 26, 0.82);
    border: 1px solid rgba(255, 255, 255, 0.2);
    font-size: 15px;
    line-height: 20px;
    font-weight: 800;
    text-align: center;
}
.jt-world-interact-prompt {
    position: absolute;
    left: 0;
    top: 0;
    transform: translate(-50%, -120%);
    transform-origin: 50% 100%;
    color: #fff;
    font-size: 30px;
    font-weight: 800;
    white-space: pre-line;
    text-align: center;
    line-height: 1.05;
    letter-spacing: 0;
    -webkit-text-stroke: 1.5px #000;
    pointer-events: none;
    z-index: 60;
    display: none;
}
.jt-world-interact-line {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    flex-wrap: wrap;
}
.jt-world-interact-line + .jt-world-interact-line {
    margin-top: 6px;
}
.jt-world-interact-emoji {
    font-size: 56px;
    line-height: 0.95;
}
.jt-world-interact-key {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 44px;
    min-height: 44px;
    padding: 5px 12px;
    border-radius: 6px;
    border: 2px solid #888;
    background: linear-gradient(180deg, #f4f4f4 0%, #d4d4d4 100%);
    color: #20242b;
    font-size: 22px;
    font-weight: 900;
    text-shadow: none;
    -webkit-text-stroke: 0;
}
@media (max-width: 640px) {
    .jt-world-interact-prompt {
        font-size: 22px;
    }
    .jt-world-interact-emoji {
        font-size: 46px;
    }
    .jt-world-interact-key {
        min-width: 38px;
        min-height: 38px;
        font-size: 18px;
    }
}
`;
    J.uiElement.appendChild(styleElement);
}

function getViewportSize() {
    const uiElement = J.uiElement;
    const doc = uiElement?.ownerDocument ?? document;
    const rootElement = doc.documentElement;

    return {
        width:
            uiElement?.clientWidth ||
            rootElement?.clientWidth ||
            doc.body?.clientWidth ||
            1920,
        height:
            uiElement?.clientHeight ||
            rootElement?.clientHeight ||
            doc.body?.clientHeight ||
            1080,
    };
}

function renderInteractPrompt(container: HTMLElement, text: string) {
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }

    const lines = text.split("\n");
    for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index].trim();
        if (!line) continue;

        const isEmojiLine = index === 0 && Array.from(line).length <= 3;
        const lineElement = isEmojiLine
            ? renderEmojiLine(line)
            : renderPromptTextLine(line);
        container.appendChild(lineElement);
    }
}

function renderEmojiLine(line: string) {
    const element = document.createElement("div");
    element.className = "jt-world-interact-line jt-world-interact-emoji";
    element.textContent = line;
    return element;
}

function renderPromptTextLine(line: string) {
    const lineElement = document.createElement("div");
    lineElement.className = "jt-world-interact-line";

    const keyRegex = /\[([^\]]+)\]/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let foundKey = false;

    while ((match = keyRegex.exec(line)) !== null) {
        appendPromptText(lineElement, line.slice(lastIndex, match.index));
        appendPromptKey(lineElement, match[1]);
        lastIndex = keyRegex.lastIndex;
        foundKey = true;
    }

    appendPromptText(lineElement, line.slice(lastIndex));

    if (!foundKey && !lineElement.firstChild) {
        lineElement.textContent = line;
    }

    return lineElement;
}

function appendPromptText(parent: HTMLElement, value: string) {
    const text = value.trim();
    if (!text) return;

    const span = document.createElement("span");
    span.textContent = text;
    parent.appendChild(span);
}

function appendPromptKey(parent: HTMLElement, value: string) {
    const span = document.createElement("span");
    span.className = "jt-world-interact-key";
    span.textContent = value;
    parent.appendChild(span);
}

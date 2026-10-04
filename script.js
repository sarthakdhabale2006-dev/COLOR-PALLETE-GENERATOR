const $ = (selector) => document.querySelector(selector);
const paletteElement = $("#palette");
const toast = $("#toast");
const palettes = {
  "Creative & calm": ["#E8D5B7", "#B8D8D8", "#7A9E9F", "#4F6367", "#EEF5DB"],
  "Warm & optimistic": ["#F7E8A4", "#F4B942", "#E76F51", "#C44536", "#5B2A3D"],
  "Focused & bold": ["#F2F0EA", "#B8C0FF", "#6C63FF", "#3A2E5D", "#19152E"],
  "Earthy & grounded": ["#E9EDC9", "#CCD5AE", "#A3B18A", "#588157", "#344E41"]
};
const state = { colors: [], locked: [], mood: "Creative & calm", harmony: "random", collection: [], history: [], selected: 0 };
const randomHex = () => `#${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0").toUpperCase()}`;
const validHex = (value) => /^#[0-9A-F]{6}$/i.test(value);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const hexToRgb = (hex) => hex.slice(1).match(/.{2}/g).map((part) => parseInt(part, 16));
const rgbToHex = (rgb) => `#${rgb.map((value) => clamp(Math.round(value), 0, 255).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
const rgbToHsl = (hex) => {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255), max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2, d = max - min;
  if (d) { s = d / (1 - Math.abs(2 * l - 1)); h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; if (h < 0) h += 360; }
  return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
};
const hslToHex = (h, s, l) => {
  s /= 100; l /= 100; const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  return rgbToHex([255 * (l - a * Math.max(-1, Math.min(k(0) - 3, Math.min(9 - k(0), 1)))), 255 * (l - a * Math.max(-1, Math.min(k(8) - 3, Math.min(9 - k(8), 1)))), 255 * (l - a * Math.max(-1, Math.min(k(4) - 3, Math.min(9 - k(4), 1))))]);
};
const luminance = (hex) => {
  const transformed = hexToRgb(hex).map((v) => v / 255).map((v) => v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
  return .2126 * transformed[0] + .7152 * transformed[1] + .0722 * transformed[2];
};
const textColor = (hex) => luminance(hex) > .46 ? "#17211e" : "#FFFFFF";
const copy = async (value, message) => {
  try { await navigator.clipboard.writeText(value); showToast(message); } catch (error) { showToast("Clipboard permission was denied"); }
};
const showToast = (message) => { toast.textContent = message; toast.classList.add("show"); clearTimeout(showToast.timer); showToast.timer = setTimeout(() => toast.classList.remove("show"), 2200); };
const colorName = (hex) => {
  const [r, g, b] = hexToRgb(hex), names = [[255, 0, 0, "Red"], [0, 255, 0, "Green"], [0, 0, 255, "Blue"], [255, 255, 0, "Yellow"], [255, 165, 0, "Orange"], [128, 0, 128, "Purple"], [255, 255, 255, "White"], [0, 0, 0, "Black"]];
  const exact = names.find(([nr, ng, nb]) => Math.abs(r - nr) < 8 && Math.abs(g - ng) < 8 && Math.abs(b - nb) < 8);
  if (exact) return exact[3];
  const [h, s, l] = rgbToHsl(hex);
  if (s < 18) return l > 72 ? "Soft Gray" : "Charcoal";
  if (h < 20 || h >= 340) return l > 65 ? "Coral" : "Rose";
  if (h < 50) return "Golden Yellow";
  if (h < 80) return "Lime Green";
  if (h < 170) return l < 35 ? "Forest Green" : "Mint Green";
  if (h < 250) return l > 65 ? "Sky Blue" : "Ocean Blue";
  return l > 65 ? "Lavender" : "Deep Purple";
};
const saveHistory = () => {
  state.history = [{ colors: [...state.colors], mood: state.mood }, ...state.history.filter((item) => item.colors.join() !== state.colors.join())].slice(0, 8);
  renderHistory();
};
const renderHistory = () => {
  const row = $("#historyRow"); row.innerHTML = "";
  state.history.forEach((item) => { const button = document.createElement("button"); button.className = "history-item"; button.type = "button"; button.innerHTML = item.colors.map((color) => `<span style="background:${color}"></span>`).join(""); button.onclick = () => { state.colors = [...item.colors]; state.locked = state.colors.map(() => false); renderAll(); }; row.appendChild(button); });
};
const renderPalette = () => {
  paletteElement.innerHTML = "";
  state.colors.forEach((color, index) => {
    const column = document.createElement("div"); column.className = `color-column${state.locked[index] ? " is-locked" : ""}`; column.style.background = color; column.style.color = textColor(color);
    column.innerHTML = `<button class="lock-button" type="button" aria-label="${state.locked[index] ? "Unlock" : "Lock"} ${color}">${state.locked[index] ? "●" : "○"}</button><button class="copy-color" type="button">${color}</button><input class="color-picker" type="color" value="${color}" aria-label="Edit color ${index + 1}"><span class="color-name">${colorName(color)}</span><span class="color-hex">${color}</span>`;
    column.onclick = () => { state.selected = index; renderInfo(); };
    column.querySelector(".lock-button").onclick = (event) => { event.stopPropagation(); state.locked[index] = !state.locked[index]; renderPalette(); };
    column.querySelector(".copy-color").onclick = (event) => { event.stopPropagation(); copy(color, `Copied ${color}`); };
    column.querySelector(".color-picker").oninput = (event) => { state.colors[index] = event.target.value.toUpperCase(); renderAll(false); };
    paletteElement.appendChild(column);
  });
  $("#pickerTarget").innerHTML = state.colors.map((color, index) => `<option value="${index}">${colorName(color)}</option>`).join("");
};
const generateHarmony = () => {
  const count = Number($("#colorCount").value), base = state.colors[0] || randomHex(), [h, s, l] = rgbToHsl(base);
  const offsets = { random: [], monochromatic: Array.from({ length: count }, (_, i) => 0), analogous: Array.from({ length: count }, (_, i) => (i - Math.floor(count / 2)) * 28), complementary: [0, 180, 30, 210, 60, 240, 90], triadic: [0, 120, 240, 60, 180, 300, 30], split: [0, 150, 210, 30, 330, 90, 270], tetradic: [0, 90, 180, 270, 45, 135, 225], pastel: [0, 35, 70, 105, 140, 175, 210], neon: [0, 55, 110, 165, 220, 275, 330], dark: [0, 25, 50, 75, 100, 125, 150], light: [0, 25, 50, 75, 100, 125, 150] }[state.harmony] || [];
  return Array.from({ length: count }, (_, i) => {
    if (state.locked[i] && state.colors[i]) return state.colors[i];
    if (state.harmony === "random") return randomHex();
    const lightness = state.harmony === "pastel" ? 78 - i * 3 : state.harmony === "neon" ? 52 : state.harmony === "dark" ? 22 + i * 4 : state.harmony === "light" ? 78 + i * 2 : state.harmony === "monochromatic" ? 25 + i * (60 / Math.max(1, count - 1)) : l;
    return hslToHex((h + offsets[i % offsets.length]) % 360, clamp(state.harmony === "pastel" ? 65 : state.harmony === "neon" ? 100 : s, 20, 100), clamp(lightness, 8, 94));
  });
};
const generate = () => { state.colors = generateHarmony(); state.locked = state.colors.map((_, i) => Boolean(state.locked[i])); saveHistory(); renderAll(); };
const renderCollection = () => {
  const grid = $("#collectionGrid"); grid.innerHTML = "";
  if (!state.collection.length) { grid.innerHTML = `<div class="empty-collection">No saved palettes yet.</div>`; return; }
  state.collection.forEach((item, index) => {
    const card = document.createElement("article"); card.className = "collection-card"; card.innerHTML = `<div class="collection-swatches">${item.colors.map((color) => `<span style="background:${color}"></span>`).join("")}</div><div class="collection-card-footer"><div><b>${item.name || item.mood}</b><small>${new Date(item.date || Date.now()).toLocaleDateString()}</small></div><div class="collection-actions"><button type="button">Load</button><button type="button">Copy</button><button type="button">Rename</button><button type="button">Delete</button></div></div>`;
    const buttons = card.querySelectorAll("button"); buttons[0].onclick = () => { state.colors = [...item.colors]; state.locked = state.colors.map(() => false); renderAll(); }; buttons[1].onclick = () => copy(item.colors.join("\n"), "Palette copied"); buttons[2].onclick = () => { const name = prompt("Rename palette", item.name || item.mood); if (!name) return; item.name = name; localStorage.setItem("huecraft-collection", JSON.stringify(state.collection)); renderCollection(); }; buttons[3].onclick = () => { state.collection.splice(index, 1); localStorage.setItem("huecraft-collection", JSON.stringify(state.collection)); renderCollection(); renderProfile(); showToast("Palette deleted"); }; grid.appendChild(card);
  });
};
const renderProfile = () => { $("#savedCount").textContent = state.collection.length; $("#generatedCount").textContent = state.history.length; };
const renderInfo = () => {
  const hex = state.colors[state.selected] || "#000000", rgb = hexToRgb(hex), [h, s, l] = rgbToHsl(hex), max = Math.max(...rgb) / 255, min = Math.min(...rgb) / 255, v = Math.round(max * 100), c = max ? Math.round((max - min) / max * 100) : 0;
  $("#colorInfoName").textContent = colorName(hex); $("#colorInfo").innerHTML = [["HEX", hex], ["RGB", `rgb(${rgb.join(", ")})`], ["HSL", `hsl(${h}, ${s}%, ${l}%)`], ["HSV", `hsv(${h}, ${s}%, ${v}%)`], ["CMYK", `cmyk(${Math.round((1 - rgb[0] / 255) * 100)}%, ${Math.round((1 - rgb[1] / 255) * 100)}%, ${Math.round((1 - rgb[2] / 255) * 100)}%, ${100 - v}%)`], ["Brightness", `${Math.round((rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 2550)}%`], ["Saturation", `${s}%`], ["Hue", `${h}°`]].map(([label, value]) => `<div><span>${label}</span><code>${value}</code><button type="button" data-copy="${value}">Copy</button></div>`).join("");
  $("#colorInfo").querySelectorAll("[data-copy]").forEach((button) => button.onclick = () => copy(button.dataset.copy, "Color value copied")); renderVision();
};
const renderVision = () => {
  const mode = $("#visionMode").value, filters = { normal: "", protanopia: "saturate(.7) hue-rotate(18deg)", deuteranopia: "saturate(.75) hue-rotate(-18deg)", tritanopia: "saturate(.7) hue-rotate(55deg)", grayscale: "grayscale(1)" };
  $("#visionSwatches").style.filter = filters[mode]; $("#visionSwatches").innerHTML = state.colors.map((color) => `<span style="background:${color}" title="${color}"></span>`).join("");
};
const updateGradient = () => {
  const type = $("#gradientType").value.toLowerCase(), angle = $("#gradientAngle").value, colors = [$("#gradientColor1").value, $("#gradientColor2").value, $("#gradientColor3").value], value = `${type}-gradient(${type === "linear" ? `${angle}deg, ` : ""}${colors.join(", ")})`;
  $("#gradientPreview").style.background = value; $("#gradientCode").textContent = `background: ${value};`; $("#angleValue").textContent = `${angle}°`;
};
const contrast = () => {
  const ratio = (Math.max(luminance($("#contrastBackground").value), luminance($("#contrastText").value)) + .05) / (Math.min(luminance($("#contrastBackground").value), luminance($("#contrastText").value)) + .05), pass = (threshold) => ratio >= threshold ? "PASS" : "FAIL";
  $("#contrastResult").innerHTML = `<strong>Contrast ratio: ${ratio.toFixed(2)}:1</strong><span>AA Normal <b class="${pass(4.5).toLowerCase()}">${pass(4.5)}</b></span><span>AA Large <b class="${pass(3).toLowerCase()}">${pass(3)}</b></span><span>AAA Normal <b class="${pass(7).toLowerCase()}">${pass(7)}</b></span><span>AAA Large <b class="${pass(4.5).toLowerCase()}">${pass(4.5)}</b></span>`;
};
const renderPreview = () => {
  const [primary, secondary, background, text, accent] = state.colors;
  const preview = $("#uiPreview");
  const previewText = text || primary;
  const previewAccent = accent || secondary;
  preview.style.setProperty("--preview-primary", primary);
  preview.style.setProperty("--preview-secondary", secondary);
  preview.style.setProperty("--preview-bg", background);
  preview.style.setProperty("--preview-text", previewText);
  preview.style.setProperty("--preview-accent", previewAccent);
  preview.style.backgroundColor = background;
  preview.style.color = previewText;
  preview.querySelectorAll("button").forEach((button) => {
    button.style.backgroundColor = primary;
    button.style.color = textColor(primary);
  });
  preview.querySelector("nav b").style.color = primary;
  preview.querySelector(".preview-badge").style.color = secondary;
  preview.querySelector(".preview-card > span").style.backgroundColor = previewAccent;
  preview.querySelector(".preview-card").style.backgroundColor = secondary;
  preview.querySelector("input").style.borderColor = secondary;
  preview.className = `ui-preview mode-${$("#previewMode").value.toLowerCase().replace(/\s+/g, "-")}`;
  $("#previewTitle").textContent = $("#previewMode").value;
};
const renderAll = (save = true) => { renderPalette(); renderInfo(); renderVision(); renderPreview(); updateGradient(); contrast(); if (save) localStorage.setItem("huecraft-theme", document.body.classList.contains("dark") ? "dark" : "light"); };
const cssVariables = () => `:root {\n${state.colors.map((color, index) => `  --color-${index + 1}: ${color};`).join("\n")}\n}`;
const download = (content, name, type) => { const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([content], { type })); link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 0); };
$("#generateButton").onclick = generate; $("#shuffleButton").onclick = generate; $("#colorCount").onchange = () => { state.locked = state.colors.map((_, i) => Boolean(state.locked[i])); generate(); }; $("#harmonySelect").onchange = (event) => { state.harmony = event.target.value; generate(); };
document.querySelectorAll("[data-control]").forEach((button) => button.onclick = () => { state.harmony = button.dataset.control === "monochrome" ? "monochromatic" : button.dataset.control === "contrast" ? "complementary" : "random"; $("#harmonySelect").value = state.harmony; generate(); });
$("#saveButton").onclick = () => { const name = prompt("Name this palette", `${state.mood} palette`); if (!name) return; state.collection.unshift({ name, colors: [...state.colors], mood: state.mood, date: Date.now() }); state.collection = state.collection.slice(0, 20); localStorage.setItem("huecraft-collection", JSON.stringify(state.collection)); renderCollection(); renderProfile(); showToast("Palette saved"); };
$("#copyAllButton").onclick = () => copy(state.colors.join("\n"), "Palette copied"); $("#copyGradientButton").onclick = () => copy($("#gradientCode").textContent, "CSS copied"); $("#copyHexButton").onclick = () => copy(state.colors.join("\n"), "HEX values copied"); $("#copyCssButton").onclick = () => copy(cssVariables(), "CSS variables copied"); $("#copyJsonButton").onclick = () => copy(JSON.stringify({ colors: state.colors }, null, 2), "JSON copied");
$("#downloadPngButton").onclick = () => { const canvas = document.createElement("canvas"); canvas.width = state.colors.length * 240; canvas.height = 180; const context = canvas.getContext("2d"); state.colors.forEach((color, index) => { context.fillStyle = color; context.fillRect(index * 240, 0, 240, 180); }); download(canvas.toDataURL("image/png"), "palette.png", "image/png"); };
$("#downloadSvgButton").onclick = () => download(`<svg xmlns="http://www.w3.org/2000/svg" width="${state.colors.length * 240}" height="180">${state.colors.map((color, index) => `<rect width="240" height="180" x="${index * 240}" fill="${color}"/>`).join("")}</svg>`, "palette.svg", "image/svg+xml");
$("#clearCollectionButton").onclick = () => { state.collection = []; localStorage.removeItem("huecraft-collection"); renderCollection(); renderProfile(); showToast("Collection cleared"); };
["gradientType", "gradientAngle", "gradientColor1", "gradientColor2", "gradientColor3"].forEach((id) => $(`#${id}`).oninput = updateGradient); $("#previewMode").onchange = renderPreview; $("#visionMode").onchange = renderVision; ["contrastBackground", "contrastText"].forEach((id) => $(`#${id}`).oninput = contrast);
$("#imageInput").onchange = (event) => { const file = event.target.files[0]; if (!file) return; const image = new Image(); const objectUrl = URL.createObjectURL(file); image.onload = () => { const canvas = $("#imageCanvas"), context = canvas.getContext("2d"), size = 40; canvas.width = size; canvas.height = size; context.drawImage(image, 0, 0, size, size); $("#imagePreview").src = objectUrl; $("#imagePreview").hidden = false; const pixels = context.getImageData(0, 0, size, size).data, buckets = {}; for (let i = 0; i < pixels.length; i += 4) { const key = [pixels[i] >> 4, pixels[i + 1] >> 4, pixels[i + 2] >> 4].join(","); buckets[key] = (buckets[key] || 0) + 1; } state.extracted = Object.entries(buckets).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([key]) => rgbToHex(key.split(",").map((value) => Number(value) * 16 + 8))); $("#extractedSwatches").innerHTML = state.extracted.map((color) => `<span style="background:${color}" title="${color}"></span>`).join(""); $("#useExtractedButton").disabled = false; URL.revokeObjectURL(objectUrl); }; image.onerror = () => { URL.revokeObjectURL(objectUrl); showToast("That image could not be read"); }; image.src = objectUrl; };
$("#useExtractedButton").onclick = () => { state.colors = [...state.extracted]; state.locked = state.colors.map(() => false); $("#colorCount").value = state.colors.length; renderAll(); showToast("Image palette applied"); };
$("#pickerButton").onclick = () => { $("#colorPickerPopover").classList.toggle("open"); $("#nativeColorPicker").value = state.colors[state.selected]; $("#hexColorInput").value = state.colors[state.selected]; $("#pickerTarget").value = state.selected; };
$("#nativeColorPicker").oninput = (event) => $("#hexColorInput").value = event.target.value.toUpperCase(); $("#hexColorInput").oninput = (event) => { if (validHex(event.target.value)) $("#nativeColorPicker").value = event.target.value; }; $("#applyColorButton").onclick = () => { const value = $("#hexColorInput").value.toUpperCase(); if (!validHex(value)) return showToast("Enter a valid HEX color"); state.selected = Number($("#pickerTarget").value); state.colors[state.selected] = value; renderAll(); $("#colorPickerPopover").classList.remove("open"); };
$("#themeToggle").onclick = () => { document.body.classList.toggle("dark"); localStorage.setItem("huecraft-theme", document.body.classList.contains("dark") ? "dark" : "light"); showToast("Theme changed"); };
$("#menuButton").onclick = () => $(".top-nav").classList.toggle("mobile-open");
document.addEventListener("keydown", (event) => { if (event.code === "Space" && !["INPUT", "SELECT", "TEXTAREA", "BUTTON"].includes(event.target.tagName)) { event.preventDefault(); generate(); } });
try { state.collection = JSON.parse(localStorage.getItem("huecraft-collection") || "[]"); } catch (error) { state.collection = []; }
if (localStorage.getItem("huecraft-theme") === "dark") document.body.classList.add("dark");
state.colors = [...palettes[state.mood]]; state.locked = state.colors.map(() => false); ["gradientColor1", "gradientColor2", "gradientColor3"].forEach((id, index) => $(`#${id}`).value = state.colors[index]); $("#contrastBackground").value = state.colors[2]; $("#contrastText").value = state.colors[0];
renderCollection(); renderProfile(); renderAll(false);

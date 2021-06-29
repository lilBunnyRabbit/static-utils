function round(value, deicmals = 2) {
  const p = Math.pow(10, deicmals < 1 ? 1 : deicmals);
  return Math.round(value * p) / p;
}

function downloadCanvas(input, filename, extra) {
  if (!input || !Array.isArray(input)) return;
  createAlert(
    "Downloading",
    `Downloading ${input.length} images as "${filename}.zip"`
  );

  const zip = new JSZip();
  input.forEach((canvas, i) => {
    const data = canvas
      .toDataURL("image/png")
      .replace("data:image/png;base64,", "");
    return zip.file(`${filename}_${i + 1}.png`, data, { base64: true });
  });

  if (extra) zip.file(extra.name, extra.data);

  return zip.generateAsync({ type: "blob" }).then((blob) => {
    const link = document.createElement("a");
    link.target = "_blank";
    link.href = window.URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    return link.remove();
  });
}

function createImage(src, callback, options = {}) {
  const img = new Image();
  for (const key in options) img[key] = options[key];
  img.crossOrigin = "anonymous";
  img.onload = (...props) => callback(img, ...props);
  img.src = src;
}

function readFile(file, callback) {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = (e) => callback(e, file, reader);
}

function createCanvas() {
  const canvas = document.createElement("canvas");
  return [canvas, canvas.getContext("2d")];
}

function createAlert(title, message) {
  const parent = document.getElementById("alert-box");
  const alert = document.createElement("div");
  alert.classList.add("alert");
  parent.prepend(alert);

  const alertTitle = document.createElement("div");
  alertTitle.classList.add("alert-title");
  alertTitle.innerText = title;
  alert.appendChild(alertTitle);

  const alertDescription = document.createElement("div");
  alertDescription.classList.add("alert-description");
  alertDescription.innerText = message;
  alert.appendChild(alertDescription);

  return setInterval(() => alert.remove(), 4000);
}

function getCookie(cname) {
  let name = cname + "=";
  let decodedCookie = decodeURIComponent(document.cookie);
  let ca = decodedCookie.split(";");
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) == " ") {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return "";
}

function setCookie(cname, cvalue, exdays) {
  const d = new Date();
  d.setTime(d.getTime() + exdays * 24 * 60 * 60 * 1000);
  let expires = "expires=" + d.toUTCString();
  document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

function deleteAllCookies() {
  let cookies = document.cookie.split(";");

  for (let i = 0; i < cookies.length; i++) {
    let cookie = cookies[i];
    const eqPos = cookie.indexOf("=");
    const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
    document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT";
  }
}

class HandlerBase {
  constructor() {}

  addListeners(events) {
    for (const event of events) {
      document
        .getElementById(event[0])
        .addEventListener(event[1], event[2].bind(this));
    }
  }
}

function round(value, deicmals = 2) {
    const p = Math.pow(10, deicmals < 1 ? 1 : deicmals);
    return Math.round(value * p) / p;
}

function downloadCanvas(input, filename) {
    if(!input) return;
    const link = document.createElement("a");

    if(Array.isArray(input)) downloadMultiple([...input]);
    else download(input, filename);

    return link.remove();

    function downloadMultiple(canvases) {
        if(canvases.length < 1) return;
        const i = canvases.length;
        const canvas = canvases.pop();
        download(canvas, `${filename}_${i}`);
        return setInterval(() => downloadMultiple(canvases), 1500);
    }

    function download(canvas, name) {
        link.target = "_blank";
        link.href = canvas.toDataURL("image/png");
        link.download = name;
        return link.click();
    }
}

function createImage(src, callback, options = {}) {
    const img = new Image();
    for(const key in options) img[key] = options[key];
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
    return [ canvas, canvas.getContext("2d") ];
}

class HandlerBase {
    constructor() {}

    addListeners(events) {
        for(const event of events) {
            document.getElementById(event[0])
                    .addEventListener(event[1], event[2].bind(this));
        }
    }
}

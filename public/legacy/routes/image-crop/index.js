const canvas = document.getElementById("canvas-original");
const ctx = canvas.getContext("2d");

const canvasCrop = document.getElementById("canvas-crop");
const ctxCrop = canvasCrop.getContext("2d");

let filename = "";

document.getElementById("download-button").addEventListener("click", () => {
  downloadSingleCanvas(canvasCrop, `crop-${filename}`);
});
document.getElementById("image-upload").addEventListener("change", onImageUpload);

async function onImageUpload(e) {
  const imageUpload = e.target;
  if (!imageUpload.files || !imageUpload.files[0]) return;
  const file = imageUpload.files[0];
  let image = await readImage(file).catch(() => null);
  if (!image) return;
  document.getElementById("image-upload-label").innerText = file.name;
  filename = file.name;

  canvas.width = image.width;
  canvas.height = image.height;
  updateCanvasStyle(canvas);
  updateCanvasData(canvas, document.getElementById("canvas-original-data"));
  ctx.drawImage(image, 0, 0, image.width, image.height);


  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const limits = getCropLimits(data);

  await displayCrop(limits);

  canvasCrop.width = limits.right - limits.left;
  canvasCrop.height = limits.bottom - limits.top;
  updateCanvasStyle(canvasCrop);
  updateCanvasData(canvasCrop, document.getElementById("canvas-crop-data"));
  ctxCrop.drawImage(
    image,
    limits.left,
    limits.top,
    canvasCrop.width,
    canvasCrop.height,
    0,
    0,
    canvasCrop.width,
    canvasCrop.height
  );

  console.log(limits);
}

async function readImage(file) {
  const { url } = await readFile(file);
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = (e) => reject(e);
    image.src = url;
  });
}

async function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => resolve({ url: e.target.result, reader });
    reader.onerror = (e) => reject(e);
  });
}

function getCropLimits(data) {
  const getAlpha = (x, y) => data[(y * canvas.width + x) * 4 + 3];

  const getTopLimit = () => {
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        if (getAlpha(x, y) > 0) return y;
      }
    }
    return 0;
  };

  const getRightLimit = (top) => {
    for (let x = canvas.width - 1; x >= 0; x--) {
      for (let y = top; y < canvas.height; y++) {
        if (getAlpha(x, y) > 0) {
          return x === canvas.width ? canvas.width : x + 1;
        }
      }
    }
    console.log("return");
    return canvas.width;
  };

  const getBottomLimit = (right) => {
    for (let y = canvas.height - 1; y >= 0; y--) {
      for (let x = 0; x < right; x++) {
        if (getAlpha(x, y) > 0) {
          return y === canvas.height ? canvas.height : y + 1;
        }
      }
    }
    return canvas.height;
  };

  const getLeftLimit = (top, bottom) => {
    for (let x = 0; x < canvas.width; x++) {
      for (let y = top; y < bottom; y++) {
        if (getAlpha(x, y) > 0) return x;
      }
    }
    return 0;
  };

  const top = getTopLimit();
  const right = getRightLimit(top);
  const bottom = getBottomLimit(right);
  const left = getLeftLimit(top, bottom);

  return { top, bottom, left, right };
}

function updateCanvasData(canvas, canvasData) {
  canvasData.innerText = `${canvas.width}px X ${canvas.height}px`;
}

function updateCanvasStyle(canvas) {
  if (canvas.width >= canvas.height) {
    canvas.style.width = "100%";
    canvas.style.height = "auto";
  } else {
    canvas.style.width = "auto";
    canvas.style.height = "100%";
  }

  if (canvas.width * canvas.height <= 300 * 300) {
    canvas.style.imageRendering = "pixelated";
  }
}

async function displayCrop(limits) {
  ctx.fillStyle = "#90D627";

  if (canvas.width * canvas.height >= 1280 * 720) {
    ctx.fillRect(0, 0, canvas.width, limits.top); // Top
    ctx.fillRect(limits.right, limits.top, canvas.width - limits.right, canvas.height - limits.top); // Right
    ctx.fillRect(0, limits.bottom, limits.right, canvas.height - limits.bottom); // Bottom
    ctx.fillRect(0, limits.top, limits.left, limits.bottom - limits.top); // Left
    return;
  }

  const delay = 1;

  // Top
  if (limits.top > 0) {
    await delayedForI(
      0,
      limits.top,
      (i) => {
        ctx.fillRect(0, i, canvas.width, 1);
      },
      delay
    );
  }

  // Right
  if (limits.right !== canvas.width) {
    await delayedForI(
      1,
      canvas.width - limits.right + 1,
      (i) => {
        ctx.fillRect(canvas.width - i, limits.top, 1, canvas.height - limits.top);
      },
      delay
    );
  }

  // Bottom
  if (limits.bottom !== canvas.height) {
    await delayedForI(
      1,
      canvas.height - limits.bottom + 1,
      (i) => {
        ctx.fillRect(0, canvas.height - i, limits.right, 1);
      },
      delay
    );
  }

  // Left
  if (limits.left > 0) {
    await delayedForI(
      0,
      limits.left,
      (i) => {
        ctx.fillRect(i, limits.top, 1, limits.bottom - limits.top);
      },
      delay
    );
  }
}

async function delayedForI(from, to, callback, delay) {
  return new Promise((resolve) => {
    const loop = (i) => {
      callback(i);
      i++;

      if (i < to) {
        if (delay) {
          setTimeout(() => {
            loop(i);
          }, delay);
        } else {
          loop(i);
        }
      } else {
        resolve();
      }
    };

    loop(from);
  });
}
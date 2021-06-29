window.onload = () => {
  ["--primary", "--secondary", "--bg", "--alert"].forEach((name) => {
    const color = getCookie("color" + name);
    if (color) {
      document.querySelector(":root").style.setProperty(name, color);
      document.getElementById(`${name.substr(2)}-color`).value = color;
    }
  });

  document.getElementById("upload-page").style.display = "flex";

  new (class extends HandlerBase {
    constructor() {
      super();
      this.url = "";
      this.multiplier = 1;
      this.image = undefined;
      this.isHorizontal = false;
      this.columns = 1;
      this.rows = 1;
      this.size = 0;

      this.addListeners([
        ["initial-file-upload", "change", this.handleInitialFileUpload],
        ["file-upload", "change", this.handleFileUpload],
        ["multiplier", "input", this.handleSlider],
        ["toggle-direction", "click", this.handleOrientationToggle],
        [
          "primary-color",
          "input",
          (e) => this.handleColorChange(e.target.value, "--primary"),
        ],
        [
          "secondary-color",
          "input",
          (e) => this.handleColorChange(e.target.value, "--secondary"),
        ],
        [
          "bg-color",
          "input",
          (e) => this.handleColorChange(e.target.value, "--bg"),
        ],
        [
          "alert-color",
          "input",
          (e) => this.handleColorChange(e.target.value, "--alert"),
        ],
        ["download-button", "click", this.handleDownload],
        ["download-back-button", "click", this.handleReturnFromDownload],
        ["reset-colors", "click", this.handleResetColors],
      ]);
    }

    // Handlers
    handleInitialFileUpload(e) {
      document.getElementById("upload-page").style.display = "none";
      document.getElementById("main-page").style.display = "flex";
      return this.handleFileUpload(e);
    }

    handleFileUpload(e) {
      const input = e.target;

      if (!input.files || !input.files[0]) return;

      return readFile(input.files[0], (e, file) => {
        this.url = e.target.result;

        document.getElementById("filename").value = file.name
          .split(".")
          .slice(0, -1)
          .join(".");

        createImage.bind(this)(
          this.url,
          (image) => {
            this.image = image;
            this.isHorizontal = this.image.width >= this.image.height;
            this.setToggleOrientationButton();
            createAlert("Uploading", `${file.name} is being uploaded`);
            this.updateCanvas();
          },
          { crossOrigin: "anonymous" }
        );
      });
    }

    handleSlider() {
      this.multiplier = document.getElementById("multiplier").value;
      return this.updateCanvas();
    }

    handleOrientationToggle() {
      if (!this.image) return;
      this.isHorizontal = !this.isHorizontal;
      this.setToggleOrientationButton();
      return this.updateCanvas();
    }

    handleColorChange(color, variable) {
      setCookie("color" + variable, color, 365 * 5);
      return document.querySelector(":root").style.setProperty(variable, color);
    }

    handleDownload() {
      if (!this.image) return;
      document.getElementById("main-page").style.display = "none";
      document.getElementById("download-page").style.display = "flex";
      return setTimeout(() => this.downloadSplitCanvas(), 100);
    }

    handleReturnFromDownload() {
      document.getElementById("main-page").style.display = "flex";
      document.getElementById("download-page").style.display = "none";

      document.getElementById("download-list").textContent = "";
      document.getElementById("download-bar").style.width = "0%";

      document.getElementById("download-back-button").style.display = "none";

      Array.from(document.getElementsByClassName("download-link")).forEach(
        (link) => link.remove()
      );
    }

    handleResetColors() {
      [
        ["--primary", "#90D627"],
        ["--secondary", "#23272a"],
        ["--bg", "#2C2F33"],
        ["--alert", "#D63611"],
      ].forEach((color) => {
        setCookie("color" + color[0], color[1], -1);
        document.querySelector(":root").style.setProperty(color[0], color[1]);
        document.getElementById(`${color[0].substr(2)}-color`).value = color[1];
      });
    }

    // Logic
    setToggleOrientationButton() {
      document.getElementById("toggle-direction").innerHTML = `Set to ${
        this.isHorizontal ? "vertical" : "horizontal"
      }`;
    }

    createEmojiData(filename) {
      let data = "";
      for (let i = 0; i < this.rows; i++) {
        for (let j = 0; j < this.columns; j++) {
          data += `:${filename}_${i * this.columns + j + 1}:`;
        }
        if (i < this.rows) data += "\n";
      }
      return data;
    }

    updateCanvas() {
      if (this.isHorizontal) {
        this.columns = Number.parseInt(this.multiplier);
        this.size = this.image.width / this.columns;
        this.rows = Math.ceil(this.image.height / this.size);
      } else {
        this.rows = Number.parseInt(this.multiplier);
        this.size = this.image.height / this.rows;
        this.columns = Math.ceil(this.image.width / this.size);
      }

      const canvas = document.getElementById("canvas");
      const ctx = canvas.getContext("2d");

      let space = this.size / 10;
      if (space < 5) space = 5;
      else if (space > 15) space = 15;

      canvas.width = this.columns * this.size + (this.columns - 1) * space;
      canvas.height = this.rows * this.size + (this.rows - 1) * space;

      for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.columns; c++) {
          ctx.drawImage(
            this.image,
            c * this.size,
            r * this.size,
            this.size,
            this.size,
            c * (this.size + space),
            r * (this.size + space),
            this.size,
            this.size
          );
        }
      }

      document.getElementById(
        "ratio"
      ).innerText = `${this.columns}x${this.rows}`;
      document.getElementById("square-size").innerText = `${round(
        this.size,
        2
      )}px`;
      document.getElementById("download-display").innerText = `Download ${
        this.columns * this.rows
      } image${this.columns * this.rows === 1 ? "" : "s"}`;
    }

    addToDownladList(element) {
      const downloadList = document.getElementById("download-list");

      if (typeof element === "string") {
        const fileP = document.createElement("p");
        fileP.innerText = element;
        downloadList.appendChild(fileP);
      } else {
        downloadList.appendChild(element);
      }

      downloadList.scrollTop = downloadList.scrollHeight;
    }

    updateDownloadBar(percent) {
      const downloadBar = document.getElementById("download-bar");
      downloadBar.style.width = `${percent}%`;
      downloadBar.innerText = `${Math.round(percent)}%`;
    }

    downloadSplitCanvas() {
      const filename = document.getElementById("filename").value;

      const [canvas, ctx] = createCanvas();

      canvas.width = this.size;
      canvas.height = this.size;

      let totalFiles = this.rows * this.columns + 1;

      const zip = new JSZip();

      for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.columns; c++) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(
            this.image,
            c * this.size,
            r * this.size,
            this.size,
            this.size,
            0,
            0,
            this.size,
            this.size
          );

          const fileNumber = r * this.columns + c + 1;
          const fullName = `${filename}_${fileNumber}.png`;

          const data = canvas
            .toDataURL("image/png")
            .replace("data:image/png;base64,", "");
          zip.file(fullName, data, { base64: true });

          this.addToDownladList(`Created ${fullName}`);
          this.updateDownloadBar((fileNumber * 50) / totalFiles);
        }
      }

      zip.file("example.txt", this.createEmojiData(filename));
      this.addToDownladList("Created example.txt");
      this.updateDownloadBar(50);

      this.addToDownladList("Creating zip...");

      let zipDone = false;
      let lastFile;

      return zip
        .generateAsync({ type: "blob" }, ({ currentFile, percent }) => {
          if (currentFile) {
            if (currentFile != lastFile) {
              this.addToDownladList(`Zipped ${currentFile}`);
              lastFile = currentFile;
            }
            this.updateDownloadBar(50 + percent / 2);
          } else if (!zipDone) {
            this.addToDownladList("Creating download link...");
            zipDone = true;
          }
        })
        .then((blob) => {
          const link = document.createElement("a");
          link.classList = "download-link";
          link.target = "_blank";
          link.href = window.URL.createObjectURL(blob);
          link.download = filename;
          link.innerText = `${filename}.zip`;
          link.onclick = this.handleReturnFromDownload;
          this.addToDownladList(link);

          document.getElementById("download-back-button").style.display =
            "flex";
        });
    }
  })();
};

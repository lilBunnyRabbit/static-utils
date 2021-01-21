window.onload = () => new class extends HandlerBase {
    constructor() {
        super();
        this.canvases = [];
        this.url = "";
        this.multiplier = 1;
        this.image = undefined;
        this.isHorizontal = false;
        this.columns = 1;
        this.rows = 1;

        this.addListeners([
            [ "initial-file-upload", "change", this.handleInitialFileUpload ],
            [ "file-upload", "change", this.handleFileUpload ],
            [ "multiplier", "input", this.handleSlider ],
            [ "toggle-orientation", "click", this.handleOrientationToggle ],
            [ "primary-color", "input", (e) => this.handleColorChange(e.target.value, "--primary") ],
            [ "download-button", "click", this.handleDownload ]
        ]);
    }

    handleInitialFileUpload(e) {
        document.getElementById("initial").remove();
        return this.handleFileUpload(e);
    }

    handleFileUpload(e) {
        const input = e.target;

        if (!input.files || !input.files[0]) return;
    
        return readFile(input.files[0], (e, file) => {
            this.url = e.target.result;
    
            document.getElementById("filename").value = file.name.split('.').slice(0, -1).join('.');

            createImage.bind(this)(this.url, (image) => {
                this.image = image;
                this.isHorizontal = this.image.width >= this.image.height;
                Array.from(document.getElementsByClassName("hide")).forEach(element => element.classList.remove("hide"));
                createAlert("Uploading", `${file.name} is being uploaded`);
                this.updateCanvas();
            }, { crossOrigin: "anonymous" })
        });
    }
    
    handleSlider() {
        this.multiplier = document.getElementById("multiplier").value;
        return this.updateCanvas();
    }

    handleOrientationToggle() {
        this.isHorizontal = !this.isHorizontal;
        return this.updateCanvas();
    }

    handleColorChange(color, variable) {
        return document.querySelector(":root").style.setProperty(variable, color);
    }

    handleDownload() {
        const filename = document.getElementById("filename").value;
        return downloadCanvas(this.canvases, filename, { 
            name: "example.txt", 
            data: this.createEmojiData(filename) 
        });
    }

    createEmojiData(filename) {
        let data = "";
        for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.columns; j++) {
                data += `:${filename}_${i * this.columns + j + 1}:`
            }      
            if(i < this.rows) data += "\n";
        }
        return data;
    }

    updateCanvas() {
        const container = document.getElementById("canvas-container");
        container.innerHTML = "";
        this.canvases = [];
    
        const size = (this.isHorizontal ? this.image.height : this.image.width) / this.multiplier;
        const ratio = (((window.innerWidth + window.innerHeight) / 2) / ((this.image.width + this.image.height) / 2)) / 2.5;
        const canvas_size = size * ratio;

        const x_multiplier = Math.ceil(this.image.width / size);
        const y_multiplier = Math.ceil(this.image.height / size);

        this.columns = x_multiplier;
        this.rows = y_multiplier;

        container.style.gridTemplateColumns = "auto ".repeat(x_multiplier);
        container.style.gridTemplateRows = "auto ".repeat(y_multiplier);

        for (let y = 0; y < y_multiplier; y++) {
            for (let x = 0; x < x_multiplier; x++) {
                const [ canvas, ctx ] = createCanvas();

                canvas.width = canvas_size;
                canvas.height = canvas_size;
                canvas.style.border = "inherit";

                ctx.drawImage(this.image, x * size, y * size, size, size, 0, 0, canvas.width, canvas.height);

                container.appendChild(canvas);  
                this.canvases.push(canvas);         
            }                
        }

        document.getElementById("ratio").innerText = `${x_multiplier}x${y_multiplier}`;
        document.getElementById("square-size").innerText = `${round(canvas_size, 2)}px`;
        document.getElementById("download-display").innerText = `Download ${this.canvases.length} images`;
    }
}


window.onload = () => new class {
    constructor() {
        this.canvases = [];
        this.url = "";
        this.downloadElement = document.createElement("a");
        this.file = {
            name: "",
            size: 0
        }
        this.multiplier = 1;

        this.addEvents();
    }

    addEvents() {
        document.getElementById("multiplier").addEventListener("input", this.handleSlider.bind(this));
        document.getElementById("download-button").addEventListener("click", this.downloadCanvases.bind(this));
        document.getElementById("file-upload").addEventListener("change", this.uploadFile.bind(this));
    }

    uploadFile(e) {
        const input = e.target;
        if (!input.files || !input.files[0]) return;
    
        const file = input.files[0];
        const reader = new FileReader();
        reader.onload = (e) => {
            this.file.name = file.name;
            this.file.size = file.size;
            this.url = e.target.result;
    
            document.getElementById("filename").value = this.file.name.split('.').slice(0, -1).join('.');
            Array.from(document.getElementsByClassName("hide")).forEach(element => element.classList.remove("hide"))
            this.updateCanvas();
        };
    
        return reader.readAsDataURL(file);
    }
    
    handleSlider() {
        this.multiplier = document.getElementById("multiplier").value;
        this.updateCanvas();
    }
    
    updateCanvas() {
        const container = document.getElementById("canvas-container");
        container.innerHTML = "";
        this.canvases = [];
    
        const baseImage = new Image();
        baseImage.crossOrigin = "anonymous";
        baseImage.src = this.url;
        baseImage.onload = () => {
            const size = (baseImage.width >= baseImage.height ? baseImage.height : baseImage.width) / this.multiplier;
            const ratio = (((window.innerWidth + window.innerHeight) / 2) / ((baseImage.width + baseImage.height) / 2)) / 2.5;
            const canvas_size = size * ratio;
    
            const x_multiplier = Math.ceil(baseImage.width / size);
            const y_multiplier = Math.ceil(baseImage.height / size);
    
            container.style.gridTemplateColumns = "auto ".repeat(x_multiplier);
            container.style.gridTemplateRows = "auto ".repeat(y_multiplier);
    
            for (let y = 0; y < y_multiplier; y++) {
                for (let x = 0; x < x_multiplier; x++) {
                    const canvas = document.createElement("canvas");
                    const ctx = canvas.getContext("2d");
    
                    canvas.width = canvas_size;
                    canvas.height = canvas_size;
                    canvas.style.border = "inherit";
    
                    ctx.drawImage(baseImage, x * size, y * size, size, size, 0, 0, canvas.width, canvas.height);
    
                    container.appendChild(canvas);  
                    this.canvases.push(canvas);         
                }                
            }
    
            document.getElementById("ratio").innerText = `${x_multiplier}x${y_multiplier}`;
            document.getElementById("square-size").innerText = `${Math.round(canvas_size * 100) / 100}px`;
            document.getElementById("download-display").innerText = `Download ${this.canvases.length} images`;
        } 
    }
    
    downloadCanvases() {
        const download_canvases = [...this.canvases];
        const columns = this.columns;
        let filename = document.getElementById("filename").value;
    
        const timeoutRemove = () => {
            if(download_canvases.length < 1) return;
            const i = download_canvases.length;
    
            const canvas = download_canvases.pop();
    
            this.downloadElement.target = "_blank";
            this.downloadElement.href = canvas.toDataURL("image/png");
            this.downloadElement.download = `${filename}_${i}`;
            this.downloadElement.click();
    
            return setInterval(timeoutRemove, 1500);
        }
    
        timeoutRemove();
    }
}


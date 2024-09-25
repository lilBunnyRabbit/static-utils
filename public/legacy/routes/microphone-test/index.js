window.onload = () => new class {
    constructor() {
        this.canvas = document.getElementById("canvas");
        this.values = [];
        this.space = 2; 
        this.audioContext = new AudioContext();
        this.meter = null;

        window.onresize = this.adjustCanvasSize.bind(this);
        window.AudioContext = window.AudioContext || window.webkitAudioContext;

        document.getElementById("space-slider").addEventListener("input", this.handleSlider.bind(this));

        this.adjustCanvasSize();
        this.createAudioStream();
    }

    handleSlider() {
        this.space = parseInt(document.getElementById("space-slider").value);
    }

    adjustCanvasSize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight * 0.8;
        if(this.canvas.width < this.values.length) {
            this.values = this.values.slice(this.values.length - this.canvas.width , this.values.length - 1);
        }
    }

    createAudioStream() {
        try {
            navigator.getUserMedia = navigator.getUserMedia 
            || navigator.webkitGetUserMedia 
            || navigator.mozGetUserMedia;
    
            navigator.getUserMedia({
                "audio": {
                    "mandatory": {
                        "googEchoCancellation": "false",
                        "googAutoGainControl": "false",
                        "googNoiseSuppression": "false",
                        "googHighpassFilter": "false"
                    },
                    "optional": []
                }
            }, this.handleStream.bind(this), () => alert("Failed to listen to the microphone"));
        } catch (e) { alert("Failed to listen to the microphone") }
    }

    handleStream(stream) {
        const mediaStreamSource = this.audioContext.createMediaStreamSource(stream);
        this.meter = this.createAudioMeter.bind(this)();
        mediaStreamSource.connect(this.meter);
        this.draw();
    }

    createAudioMeter() {
        const processor = this.audioContext.createScriptProcessor(512);
        processor.onaudioprocess = this.volumeAudioProcess;
        processor.clipping = false;
        processor.lastClip = 0;
        processor.volume = 0;
        processor.clipLevel = 0.98;
        processor.averaging = 0.95;
        processor.clipLag = 750;
    
        processor.connect(this.audioContext.destination);
    
        processor.checkClipping = () => {
            if (!processor.clipping) return false;
            if ((processor.lastClip + processor.clipLag) < window.performance.now()) processor.clipping = false;
            return processor.clipping;
        }
    
        processor.shutdown = () => {
            processor.disconnect();
            processor.onaudioprocess = null;
        };
    
        return processor;
    }

    volumeAudioProcess(event) {
        let buf = event.inputBuffer.getChannelData(0);
        let bufLength = buf.length;
        let sum = 0;
        let x;
    
        for (let i = 0; i < bufLength; i++) {
            x = buf[i];
            if (Math.abs(x) >= this.clipLevel) {
                this.clipping = true;
                this.lastClip = window.performance.now();
            }
            sum += x * x;
        }
    
        let rms =  Math.sqrt(sum / bufLength);
        this.volume = Math.max(rms, this.volume * this.averaging);
    }

    draw() {
        const ctx = this.canvas.getContext("2d");

        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--primary');
        ctx.imageSmoothingEnabled = false;

        if(this.values.length > this.canvas.width) this.values.shift()
        this.values.push(this.meter.volume);

        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        for (let i = 0; i < this.values.length; i += this.space) {
            const value = this.values[i] * this.canvas.height;
            const difference = (this.canvas.height - value) / 2;
            ctx.fillRect((this.values.length - i - 1), difference, 1, value)
        }

        ctx.save();
        window.requestAnimationFrame(this.draw.bind(this));
    }
}
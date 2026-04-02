import { Assets } from './assets.js';
import { CONFIG } from './config.js';

export const CharacterMenu = {
    ui: document.getElementById('charMenuUI'),
    canvas: document.getElementById('cropCanvas'),
    ctx: document.getElementById('cropCanvas').getContext('2d'),
    video: document.getElementById('cameraFeed'),
    
    img: null, stream: null,
    imgX: 150, imgY: 150, 
    imgScale: 1, baseScale: 1, 
    isDragging: false, startX: 0, startY: 0,

    init() { this.bindEvents(); },
    open() { this.ui.classList.remove('hidden'); this.resetCanvas(); },
    close() { this.ui.classList.add('hidden'); this.stopCamera(); },

    resetCanvas() {
        this.img = null;
        this.imgX = 150; this.imgY = 150;
        this.imgScale = 1; this.baseScale = 1;
        const slider = document.getElementById('zoomSlider');
        if(slider) slider.value = 1;
        this.video.style.transform = 'scale(1)'; 
        this.ctx.clearRect(0, 0, 300, 300);
        this.ctx.fillStyle = "#555";
        this.ctx.fillRect(0, 0, 300, 300);
    },

    async startCamera() {
        this.resetCanvas();
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
            this.video.srcObject = this.stream;
            this.video.classList.remove('hidden');
            this.canvas.classList.add('hidden');
            document.getElementById('zoomSlider').disabled = false; 
        } catch (err) { alert("Camera access denied."); }
    },

    stopCamera() {
        if (this.stream) { this.stream.getTracks().forEach(track => track.stop()); this.stream = null; }
        this.video.classList.add('hidden');
        this.canvas.classList.remove('hidden');
    },

    handleUpload(e) {
        this.stopCamera();
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            let newImg = new Image();
            newImg.onload = () => {
                this.img = newImg;
                this.imgX = 150; this.imgY = 150;
                this.baseScale = 300 / Math.min(this.img.width, this.img.height); 
                this.imgScale = 1; 
                document.getElementById('zoomSlider').value = 1;
                document.getElementById('zoomSlider').disabled = false;
                this.draw();
            };
            newImg.src = event.target.result;
        };
        reader.readAsDataURL(file);
    },

    draw() {
        if (!this.img) return;
        this.ctx.clearRect(0, 0, 300, 300);
        this.ctx.save();
        this.ctx.translate(this.imgX, this.imgY);
        let finalScale = this.baseScale * this.imgScale;
        this.ctx.scale(finalScale, finalScale);
        this.ctx.drawImage(this.img, -this.img.width / 2, -this.img.height / 2);
        this.ctx.restore();
    },

    saveFace() {
        let finalCanvas = document.createElement('canvas');
        finalCanvas.width = 150; finalCanvas.height = 150;
        let fCtx = finalCanvas.getContext('2d');
        fCtx.beginPath(); fCtx.arc(75, 75, 75, 0, Math.PI * 2); fCtx.closePath(); fCtx.clip();

        if (this.stream) {
            let dim = Math.min(this.video.videoWidth, this.video.videoHeight);
            let sourceCropSize = dim / this.imgScale; 
            let sx = (this.video.videoWidth - sourceCropSize) / 2;
            let sy = (this.video.videoHeight - sourceCropSize) / 2;
            fCtx.drawImage(this.video, sx, sy, sourceCropSize, sourceCropSize, 0, 0, 150, 150);
        } else if (this.img) {
            fCtx.drawImage(this.canvas, 25, 25, 250, 250, 0, 0, 150, 150);
        } else { return alert("Please upload a photo or use the camera first!"); }

        const dataURL = finalCanvas.toDataURL('image/png');
        localStorage.setItem('flappyBinnieCustomFace', dataURL);
        let newBird = new Image();
        newBird.onload = () => { Assets.images.bird = newBird; this.close(); };
        newBird.src = dataURL;
    },
    
    resetDefault() {
        localStorage.removeItem('flappyBinnieCustomFace');
        let defaultImg = new Image();
        defaultImg.onload = () => { Assets.images.bird = defaultImg; this.close(); }
        defaultImg.src = CONFIG.CHAR_IMG;
    },

    bindEvents() {
        document.getElementById('btnCamera').onclick = () => this.startCamera();
        document.getElementById('imageUpload').onchange = (e) => this.handleUpload(e);
        document.getElementById('btnCancelChar').onclick = () => this.close();
        document.getElementById('btnSaveChar').onclick = () => this.saveFace();
        document.getElementById('btnResetChar').onclick = () => this.resetDefault();

        document.getElementById('zoomSlider').addEventListener('input', (e) => {
            this.imgScale = parseFloat(e.target.value);
            if (this.stream) this.video.style.transform = `scale(${this.imgScale})`;
            else if (this.img) this.draw();
        });

        const getPos = (e) => {
            let rect = this.canvas.getBoundingClientRect();
            let clientX = e.touches ? e.touches[0].clientX : e.clientX;
            let clientY = e.touches ? e.touches[0].clientY : e.clientY;
            return { x: clientX - rect.left, y: clientY - rect.top };
        };

        const startDrag = (e) => {
            if (!this.img) return; 
            this.isDragging = true;
            let pos = getPos(e);
            this.startX = pos.x - this.imgX;
            this.startY = pos.y - this.imgY;
        };

        const drag = (e) => {
            if (!this.isDragging) return;
            e.preventDefault(); 
            let pos = getPos(e);
            this.imgX = pos.x - this.startX;
            this.imgY = pos.y - this.startY;
            this.draw();
        };

        const stopDrag = () => { this.isDragging = false; };
        this.canvas.addEventListener('mousedown', startDrag);
        this.canvas.addEventListener('mousemove', drag);
        window.addEventListener('mouseup', stopDrag);
        this.canvas.addEventListener('touchstart', startDrag, {passive: false});
        this.canvas.addEventListener('touchmove', drag, {passive: false});
        window.addEventListener('touchend', stopDrag);
    }
};
CharacterMenu.init();
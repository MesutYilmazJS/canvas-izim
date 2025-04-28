class CanvasDrawer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.context = this.canvas.getContext('2d');
        this.lineWidth = 1;
        this.lineColor = 'black';
        this.isDrawing = false;
        this.drawMode = 'free';
        this.isErasing = false;
        this.undoStack = [];
        this.redoStack = [];
        this.startX = 0;
        this.startY = 0;
        this.brushStyle = 'free';
        this.textModeEnabled = false;
        this.showGrid = false;
        this.snapEnabled = false;
        this.gridSize = 25; // grid aralığı
        this.gridBackgroundColor = '#f2f2f2'; // Başlangıçta varsayılan renk

        this.initEventListeners();
    }

    initEventListeners() {
        // Fare olayları
        this.canvas.addEventListener("mousedown", (e) => {
            if (this.textModeEnabled) {
                this.addText(e);
            } else {
                this.startDrawing(e);
            }
        });
        this.canvas.addEventListener("mousemove", (e) => this.draw(e));
        this.canvas.addEventListener("mouseup", () => this.stopDrawing());
        this.canvas.addEventListener("mouseout", () => this.stopDrawing());

        // Dokunmatik olaylar
        this.canvas.addEventListener("touchstart", (e) => this.startDrawing(e, true), { passive: false });
        this.canvas.addEventListener("touchmove", (e) => this.draw(e, true), { passive: false });
        this.canvas.addEventListener("touchend", () => this.stopDrawing());
    }

    saveState() {
        const imageData = this.context.getImageData(0, 0, this.canvas.width, this.canvas.height);
        this.undoStack.push(imageData);
        this.redoStack = []; // her yeni çizimde redo sıfırlanır
    }

    saveImage() {
        const link = document.createElement('a');
        link.download = 'cizim.png';
        link.href = this.canvas.toDataURL('image/png');
        link.click();
    }

    undo() {
        if (this.undoStack.length > 0) {
            const current = this.context.getImageData(0, 0, this.canvas.width, this.canvas.height);
            this.redoStack.push(current);
            const prev = this.undoStack.pop();
            this.context.putImageData(prev, 0, 0);
        }
    }

    redo() {
        if (this.redoStack.length > 0) {
            const current = this.context.getImageData(0, 0, this.canvas.width, this.canvas.height);
            this.undoStack.push(current);
            const next = this.redoStack.pop();
            this.context.putImageData(next, 0, 0);
        }
    }

    startDrawing(e) {
        this.saveState(); // çizimden önce kaydet
        this.isDrawing = true;
        this.startX = this.getMouseX(e);
        this.startY = this.getMouseY(e);
        this.context.beginPath();
        if (this.drawMode === 'line') {
            this.context.moveTo(this.startX, this.startY);
        }
    }

    draw(e) {
        if (!this.isDrawing) return;

        const mouseX = this.getMouseX(e);
        const mouseY = this.getMouseY(e);

        this.context.lineWidth = this.lineWidth;
        this.context.strokeStyle = this.lineColor;
        this.context.fillStyle = this.lineColor;

        if (this.drawMode === 'free') {
            // Brush style: free, spray, circle
            switch (this.brushStyle) {
                case 'free':
                    this.context.lineTo(mouseX, mouseY);
                    this.context.stroke();
                    break;

                case 'spray':
                    for (let i = 0; i < 10; i++) {
                        const offsetX = (Math.random() - 0.5) * 20;
                        const offsetY = (Math.random() - 0.5) * 20;
                        this.context.beginPath();
                        this.context.arc(mouseX + offsetX, mouseY + offsetY, 1, 0, 2 * Math.PI);
                        this.context.fill();
                    }
                    break;

                case 'circle':
                    this.context.beginPath();
                    this.context.arc(mouseX, mouseY, this.lineWidth * 1.5, 0, 2 * Math.PI);
                    this.context.fill();
                    break;
            }

        } else if (this.drawMode === 'line') {
            this.context.putImageData(this.undoStack[this.undoStack.length - 1], 0, 0);
            this.context.beginPath();
            this.context.moveTo(this.startX, this.startY);
            this.context.lineTo(mouseX, mouseY);
            this.context.stroke();
        } else if (this.drawMode === 'rectangle') {
            this.context.fillStyle = this.lineColor;
            this.context.putImageData(this.undoStack[this.undoStack.length - 1], 0, 0);
            this.context.beginPath();
            this.context.rect(this.startX, this.startY, mouseX - this.startX, mouseY - this.startY);
            this.context.fill();
            this.context.stroke();
        }else if (this.drawMode === 'circle') {
            const radius = Math.sqrt(Math.pow(mouseX - this.startX, 2) + Math.pow(mouseY - this.startY, 2));  // Fare ile tıklanan nokta arasındaki mesafeyi hesapla    
            this.context.beginPath();
            this.context.arc(this.startX, this.startY, radius, 0, 2 * Math.PI); // Daire çizme
            this.context.fillStyle = this.lineColor;
            this.context.fill(); // Daireyi doldur
            this.context.lineWidth = this.lineWidth;
            this.context.strokeStyle = this.lineColor;
            this.context.stroke(); // Dairenin kenarlarını çiz
        }

        // Silgi modu aktifse silgi işlemi yapılacak
        if (this.isErasing) {
            this.erase(mouseX, mouseY);
        }
    }

    erase(x, y) {
        // Silgi işlemi grid'e göre hizalanacak
        if (this.showGrid) {
            x = Math.round(x / this.gridSize) * this.gridSize;
            y = Math.round(y / this.gridSize) * this.gridSize;
        }

        this.context.clearRect(x - this.lineWidth / 2, y - this.lineWidth / 2, this.lineWidth, this.lineWidth);
    }

    addText(e) {
        const text = document.getElementById('textInput').value.trim();
        const fontSize = document.getElementById('fontSizeSelector').value;
        const x = this.getMouseX(e);
        const y = this.getMouseY(e);

        if (text) {
            this.saveState();
            this.context.font = `${fontSize}px sans-serif`;
            this.context.fillStyle = this.lineColor;
            this.context.fillText(text, x, y);
        }
        this.textModeEnabled = false;
        const btn = document.querySelector('.text-mode-btn');
        if (btn) btn.classList.remove('active');
    }

    drawGrid() {
        const spacing = this.gridSize;
        this.context.strokeStyle =  this.lineColor;
        this.context.lineWidth = 0.5;

        for (let x = spacing; x < this.canvas.width; x += spacing) {
            this.context.beginPath();
            this.context.moveTo(x, 0);
            this.context.lineTo(x, this.canvas.height);
            this.context.stroke();
        }

        for (let y = spacing; y < this.canvas.height; y += spacing) {
            this.context.beginPath();
            this.context.moveTo(0, y);
            this.context.lineTo(this.canvas.width, y);
            this.context.stroke();
        }
    }

    redraw() {
        const current = this.context.getImageData(0, 0, this.canvas.width, this.canvas.height);
        this.clearCanvas();
        this.context.putImageData(current, 0, 0);
        if (this.showGrid) {
            this.drawGridWithBackground(); // Grid ile arka planı göster
        }
    }

    drawGridWithBackground() {
        const spacing = this.gridSize;
        const backgroundColor = this.gridBackgroundColor;
        this.context.lineWidth = 0.5;

        for (let x = 0; x < this.canvas.width; x += spacing) {
            for (let y = 0; y < this.canvas.height; y += spacing) {
                // Hücre arka planını çiz
                this.context.fillStyle = backgroundColor;
                this.context.fillRect(x, y, spacing, spacing);
            }
        }

        // Grid çizgilerini çiz
        this.context.strokeStyle = '#e0e0e0'; // Grid çizgilerinin rengini buradan değiştirebilirsiniz
        for (let x = spacing; x < this.canvas.width; x += spacing) {
            this.context.beginPath();
            this.context.moveTo(x, 0);
            this.context.lineTo(x, this.canvas.height);
            this.context.stroke();
        }

        for (let y = spacing; y < this.canvas.height; y += spacing) {
            this.context.beginPath();
            this.context.moveTo(0, y);
            this.context.lineTo(this.canvas.width, y);
            this.context.stroke();
        }
    }
    drawRectangle(e) {
        const mouseX = this.getMouseX(e);
        const mouseY = this.getMouseY(e);
        
        // Şekil çizmeye başlamadan önce, dolgu rengini belirliyoruz.
        this.context.fillStyle = this.fillColor || 'transparent';  // Eğer renk seçilmediyse saydam (transparent) kullan
        
        // Çizim işlemi
        this.context.beginPath();
        this.context.rect(this.startX, this.startY, mouseX - this.startX, mouseY - this.startY);
        
        // İçini doldur
        this.context.fill(); // Bu satır dolgu işlemi yapar
        
        // Kenarlık (stroke) rengi
        this.context.lineWidth = this.lineWidth;
        this.context.strokeStyle = this.lineColor;
        this.context.stroke();  // Şeklin kenarını çizin
    }
    

    stopDrawing() {
        this.isDrawing = false;
        this.context.closePath();
    }

    toggleGrid() {
        this.showGrid = !this.showGrid;
        this.redraw();
    }

    toggleSnap() {
        this.snapEnabled = !this.snapEnabled;
    }

    setEraserMode() {
        this.isErasing = !this.isErasing;
        this.lineColor = this.isErasing ? 'white' : 'black';
        const eraserBtn = document.querySelector('.eraser-btn');
        if (eraserBtn) {
            eraserBtn.classList.toggle('active', this.isErasing);
        }
    }

    setDrawMode(mode) {
        this.drawMode = mode;
    }

    getMouseX(e) {
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const x = clientX - this.canvas.getBoundingClientRect().left;
        return this.snap(x);
    }

    getMouseY(e) {
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const y = clientY - this.canvas.getBoundingClientRect().top;
        return this.snap(y);
    }

    setBrushStyle(style) {
        this.brushStyle = style;
    }

    setLineWidth(width) {
        this.lineWidth = parseInt(width);
    }

    setLineColor(color) {
        this.lineColor = color;
    }

    enableTextMode() {
        this.textModeEnabled = !this.textModeEnabled;
        const btn = document.querySelector('.text-mode-btn');
        if (btn) btn.classList.toggle('active', this.textModeEnabled);
    }

    snap(value) {
        return this.snapEnabled ? Math.round(value / this.gridSize) * this.gridSize : value;
    }

    clearCanvas() {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    setGridBackgroundColor(color) {
        this.gridBackgroundColor = color;
        this.redraw();
    }
    setFillColor(color) {
        this.fillColor = color;  // Doldurma rengini kaydediyoruz
    }
    
}

const canvasDrawer = new CanvasDrawer('canvas_ids');

class CanvasDrawer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.context = this.canvas.getContext('2d', { willReadFrequently: true });
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
        this.gridSize = 25;
        this.gridBackgroundColor = '#ffffff';

        // Initialize Pencil Cursor
        this.cursor = document.createElement('div');
        this.cursor.id = 'brushCursor';
        this.cursor.innerHTML = '<i data-lucide="pencil" style="width: 24px; height: 24px; color: var(--accent-color);"></i>';
        document.body.appendChild(this.cursor);
        if (window.lucide) lucide.createIcons();

        this.setupEventListeners();
        this.loadSettings();
    }

    loadSettings() {
        if (localStorage.getItem('darkMode') === 'true') {
            document.body.classList.add('dark');
            this.updateThemeIcon();
        }
    }

    toggleDarkMode() {
        const isDark = document.body.classList.toggle('dark');
        localStorage.setItem('darkMode', isDark);
        this.updateThemeIcon();
    }

    updateThemeIcon() {
        const icon = document.getElementById('themeIcon');
        if (icon && window.lucide) {
            const isDark = document.body.classList.contains('dark');
            icon.setAttribute('data-lucide', isDark ? 'sun' : 'moon');
            lucide.createIcons();
        }
    }

    setupEventListeners() {
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

        this.canvas.addEventListener("touchstart", (e) => {
            e.preventDefault();
            if (this.textModeEnabled) {
                this.addText(e);
            } else {
                this.startDrawing(e);
            }
        }, { passive: false });
        this.canvas.addEventListener("touchmove", (e) => {
            e.preventDefault();
            this.draw(e);
        }, { passive: false });
        this.canvas.addEventListener("touchend", () => this.stopDrawing());

        // Cursor Preview Listeners
        this.canvas.addEventListener('mousemove', (e) => this.updateCursor(e));
        this.canvas.addEventListener('mouseenter', () => this.cursor.style.display = 'block');
        this.canvas.addEventListener('mouseleave', () => this.cursor.style.display = 'none');
    }

    updateCursor(e) {
        this.cursor.style.left = `${e.clientX}px`;
        this.cursor.style.top = `${e.clientY}px`;
        
        const icon = this.cursor.querySelector('i');
        if (icon) {
            icon.style.color = this.isErasing ? 'var(--text-muted)' : this.lineColor;
        }
    }

    saveState() {
        const imageData = this.context.getImageData(0, 0, this.canvas.width, this.canvas.height);
        this.undoStack.push(imageData);
        if (this.undoStack.length > 50) this.undoStack.shift(); // Limit memory
        this.redoStack = [];
    }

    saveImage() {
        const link = document.createElement('a');
        link.download = 'premium-cizim.png';
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
        this.saveState();
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
        this.context.lineCap = 'round';
        this.context.lineJoin = 'round';

        if (this.isErasing) {
            this.erase(mouseX, mouseY);
            return;
        }

        if (this.drawMode === 'free') {
            this.context.lineTo(mouseX, mouseY);
            this.context.stroke();
        } else if (this.drawMode === 'spray') {
            const density = 20;
            const radius = this.lineWidth * 2;
            for (let i = 0; i < density; i++) {
                const offsetX = (Math.random() - 0.5) * radius * 2;
                const offsetY = (Math.random() - 0.5) * radius * 2;
                this.context.beginPath();
                this.context.arc(mouseX + offsetX, mouseY + offsetY, 0.5, 0, 2 * Math.PI);
                this.context.fill();
            }
        } else if (this.drawMode === 'stamp') {
            this.context.beginPath();
            this.context.arc(mouseX, mouseY, this.lineWidth * 2, 0, 2 * Math.PI);
            this.context.fillStyle = this.lineColor;
            this.context.fill();
        } else if (this.drawMode === 'line') {
            this.restoreLastState();
            this.context.beginPath();
            this.context.moveTo(this.startX, this.startY);
            this.context.lineTo(mouseX, mouseY);
            this.context.stroke();
        } else if (this.drawMode === 'rectangle') {
            this.restoreLastState();
            this.context.beginPath();
            this.context.rect(this.startX, this.startY, mouseX - this.startX, mouseY - this.startY);
            if (this.fillColor) {
                this.context.fillStyle = this.fillColor;
                this.context.fill();
            }
            this.context.stroke();
        } else if (this.drawMode === 'circle') {
            this.restoreLastState();
            const radius = Math.sqrt(Math.pow(mouseX - this.startX, 2) + Math.pow(mouseY - this.startY, 2));
            this.context.beginPath();
            this.context.arc(this.startX, this.startY, radius, 0, 2 * Math.PI);
            if (this.fillColor) {
                this.context.fillStyle = this.fillColor;
                this.context.fill();
            }
            this.context.stroke();
        }
    }

    restoreLastState() {
        if (this.undoStack.length > 0) {
            this.context.putImageData(this.undoStack[this.undoStack.length - 1], 0, 0);
        }
    }

    erase(x, y) {
        this.context.globalCompositeOperation = 'destination-out';
        this.context.beginPath();
        this.context.arc(x, y, this.lineWidth * 2, 0, Math.PI * 2);
        this.context.fill();
        this.context.globalCompositeOperation = 'source-over';
    }

    addText(e) {
        const text = document.getElementById('textInput').value.trim();
        const fontSize = document.getElementById('fontSizeSelector').value;
        const x = this.getMouseX(e);
        const y = this.getMouseY(e);

        if (text) {
            this.saveState();
            this.context.font = `bold ${fontSize}px Inter, sans-serif`;
            this.context.fillStyle = this.lineColor;
            this.context.fillText(text, x, y);
        }
        this.textModeEnabled = false;
        const btn = document.querySelector('.text-mode-btn');
        if (btn) btn.classList.remove('active');
    }

    redraw() {
        const current = this.context.getImageData(0, 0, this.canvas.width, this.canvas.height);
        this.clearCanvas();
        if (this.showGrid) {
            this.drawGridWithBackground();
        }
        this.context.putImageData(current, 0, 0);
    }

    drawGridWithBackground() {
        const spacing = this.gridSize;
        const backgroundColor = this.gridBackgroundColor;
        
        // Save current canvas content
        const current = this.context.getImageData(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw background
        this.context.fillStyle = backgroundColor;
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw grid lines
        this.context.strokeStyle = '#e2e8f0';
        this.context.lineWidth = 0.5;
        
        this.context.beginPath();
        for (let x = 0; x <= this.canvas.width; x += spacing) {
            this.context.moveTo(x, 0);
            this.context.lineTo(x, this.canvas.height);
        }
        for (let y = 0; y <= this.canvas.height; y += spacing) {
            this.context.moveTo(0, y);
            this.context.lineTo(this.canvas.width, y);
        }
        this.context.stroke();
    }

    stopDrawing() {
        if (!this.isDrawing) return;
        this.isDrawing = false;
        this.context.closePath();
    }

    toggleGrid() {
        this.showGrid = !this.showGrid;
        // In a real premium app, grid should be on a separate layer.
        // Here we just toggle the background.
        this.canvas.style.backgroundColor = this.showGrid ? this.gridBackgroundColor : 'white';
        this.canvas.style.backgroundImage = this.showGrid ? 
            `linear-gradient(#e2e8f0 0.5px, transparent 0.5px), linear-gradient(90deg, #e2e8f0 0.5px, transparent 0.5px)` : 
            'none';
        this.canvas.style.backgroundSize = `${this.gridSize}px ${this.gridSize}px`;
    }

    toggleSnap() {
        this.snapEnabled = !this.snapEnabled;
    }

    setEraserMode() {
        this.isErasing = !this.isErasing;
        const eraserBtn = document.querySelector('.eraser-btn');
        if (eraserBtn) {
            eraserBtn.classList.toggle('active', this.isErasing);
        }
    }

    setDrawMode(mode) {
        this.drawMode = mode;
        this.isErasing = false;
        const eraserBtn = document.querySelector('.eraser-btn');
        if (eraserBtn) eraserBtn.classList.remove('active');
    }

    getMouseX(e) {
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const rect = this.canvas.getBoundingClientRect();
        const x = (clientX - rect.left) * (this.canvas.width / rect.width);
        return this.snap(x);
    }

    getMouseY(e) {
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const rect = this.canvas.getBoundingClientRect();
        const y = (clientY - rect.top) * (this.canvas.height / rect.height);
        return this.snap(y);
    }

    setBrushStyle(style) {
        this.brushStyle = style;
        this.drawMode = 'free';
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
        this.undoStack = [];
        this.redoStack = [];
    }

    setGridBackgroundColor(color) {
        this.gridBackgroundColor = color;
        if (this.showGrid) {
            this.canvas.style.backgroundColor = color;
        }
    }

    setFillColor(color) {
        this.fillColor = color;
    }
}

const canvasDrawer = new CanvasDrawer('canvas_ids');

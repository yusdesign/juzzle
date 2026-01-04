// ========== GLOBAL CONFIGURATION ==========
const CONFIG = {
    BOARD_SIZE: 12,
    CELL_SIZE: 40, // Smaller for mobile
    EDGE_TYPES: { JACK: 1, NEST: -1, FLAT: 0 },
    ROTATION_ENABLED: false // Default OFF
};

// ========== GLOBAL STATE ==========
let allPieces = [];
let gameBoard = [];
let pieceBank = [];
let draggedPiece = null;
let dragOffset = { x: 0, y: 0 };
let currentRotation = 0;

// ========== CORE PIECE GENERATION ==========

function generatePiece(type, id) {
    const piece = {
        id: `piece_${id}`,
        type: type,
        color: 0,
        rotations: [],
        isPlaced: false,
        isLocked: false,
        currentRotation: 0
    };
    
    const baseShape = [CONFIG.EDGE_TYPES.FLAT, CONFIG.EDGE_TYPES.FLAT, 
                       CONFIG.EDGE_TYPES.FLAT, CONFIG.EDGE_TYPES.FLAT];
    
    switch(type) {
        case 'corner':
            // Corners: 1 Jack & 1 Nest on adjacent sides facing inward
            // For proper board edge alignment
            baseShape[0] = CONFIG.EDGE_TYPES.FLAT; // Top (board edge)
            baseShape[1] = CONFIG.EDGE_TYPES.JACK; // Right (inward)
            baseShape[2] = CONFIG.EDGE_TYPES.NEST; // Bottom (inward)
            baseShape[3] = CONFIG.EDGE_TYPES.FLAT; // Left (board edge)
            break;
            
        case 'border':
            // Border: 1 Flat (board edge), 3 connectors inward
            const flatSide = Math.floor(Math.random() * 4);
            baseShape[flatSide] = CONFIG.EDGE_TYPES.FLAT;
            
            for (let i = 0; i < 4; i++) {
                if (i !== flatSide) {
                    baseShape[i] = Math.random() > 0.5 ? 
                        CONFIG.EDGE_TYPES.JACK : CONFIG.EDGE_TYPES.NEST;
                }
            }
            break;
            
        case 'field':
            // Field: 4 random connectors
            for (let i = 0; i < 4; i++) {
                baseShape[i] = Math.random() > 0.5 ? 
                    CONFIG.EDGE_TYPES.JACK : CONFIG.EDGE_TYPES.NEST;
            }
            break;
    }
    
    // Generate rotations only if enabled
    for (let rot = 0; rot < 4; rot++) {
        const rotatedShape = [];
        for (let i = 0; i < 4; i++) {
            rotatedShape[i] = baseShape[(i + rot) % 4];
        }
        
        piece.rotations.push({
            rotation: rot,
            shape: rotatedShape,
            visualCode: rotatedShape.map(e => 
                e === CONFIG.EDGE_TYPES.JACK ? 'J' : 
                e === CONFIG.EDGE_TYPES.NEST ? 'N' : '-'
            ).join('')
        });
    }
    
    return piece;
}

function generateAllPieces() {
    allPieces = [];
    let id = 0;
    
    // 4 corners (top-left, top-right, bottom-left, bottom-right)
    for (let i = 0; i < 4; i++) {
        const piece = generatePiece('corner', id++);
        // Pre-set rotations for corners based on position
        piece.preferredRotation = i; // 0=TL, 1=TR, 2=BL, 3=BR
        allPieces.push(piece);
    }
    
    // 40 border pieces
    for (let i = 0; i < 40; i++) {
        allPieces.push(generatePiece('border', id++));
    }
    
    // 100 field pieces
    for (let i = 0; i < 100; i++) {
        allPieces.push(generatePiece('field', id++));
    }
    
    return allPieces;
}

// ========== BOARD MANAGEMENT ==========

function createEmptyBoard() {
    gameBoard = [];
    for (let row = 0; row < CONFIG.BOARD_SIZE; row++) {
        gameBoard[row] = [];
        for (let col = 0; col < CONFIG.BOARD_SIZE; col++) {
            gameBoard[row][col] = {
                piece: null,
                color: 0,
                isLocked: false
            };
        }
    }
    return gameBoard;
}

function getPieceTypeForPosition(row, col) {
    if ((row === 0 || row === CONFIG.BOARD_SIZE-1) && 
        (col === 0 || col === CONFIG.BOARD_SIZE-1)) {
        return 'corner';
    } else if (row === 0 || row === CONFIG.BOARD_SIZE-1 || 
               col === 0 || col === CONFIG.BOARD_SIZE-1) {
        return 'border';
    } else {
        return 'field';
    }
}

function getCornerRotation(row, col) {
    // Determine which rotation a corner piece needs based on position
    if (row === 0 && col === 0) return 0; // Top-left
    if (row === 0 && col === CONFIG.BOARD_SIZE-1) return 1; // Top-right
    if (row === CONFIG.BOARD_SIZE-1 && col === 0) return 2; // Bottom-left
    if (row === CONFIG.BOARD_SIZE-1 && col === CONFIG.BOARD_SIZE-1) return 3; // Bottom-right
    return 0;
}

// ========== PLACEMENT & VALIDATION ==========

function edgesCompatible(edge1, edge2) {
    return (edge1 === CONFIG.EDGE_TYPES.JACK && edge2 === CONFIG.EDGE_TYPES.NEST) ||
           (edge1 === CONFIG.EDGE_TYPES.NEST && edge2 === CONFIG.EDGE_TYPES.JACK);
}

function canPlacePiece(piece, row, col, rotation) {
    if (gameBoard[row][col].piece) return false;
    
    const edges = piece.rotations[rotation].shape;
    
    // Check borders for proper FLAT edges
    if (row === 0 && edges[0] !== CONFIG.EDGE_TYPES.FLAT) return false; // Top edge
    if (col === CONFIG.BOARD_SIZE-1 && edges[1] !== CONFIG.EDGE_TYPES.FLAT) return false; // Right edge
    if (row === CONFIG.BOARD_SIZE-1 && edges[2] !== CONFIG.EDGE_TYPES.FLAT) return false; // Bottom edge
    if (col === 0 && edges[3] !== CONFIG.EDGE_TYPES.FLAT) return false; // Left edge
    
    const neighbors = [
        { nRow: row-1, nCol: col, myEdge: edges[0], theirEdgeIdx: 2 },
        { nRow: row, nCol: col+1, myEdge: edges[1], theirEdgeIdx: 3 },
        { nRow: row+1, nCol: col, myEdge: edges[2], theirEdgeIdx: 0 },
        { nRow: row, nCol: col-1, myEdge: edges[3], theirEdgeIdx: 1 }
    ];
    
    for (const n of neighbors) {
        if (n.nRow < 0 || n.nRow >= CONFIG.BOARD_SIZE || 
            n.nCol < 0 || n.nCol >= CONFIG.BOARD_SIZE) {
            continue; // Already checked borders
        }
        
        const neighbor = gameBoard[n.nRow][n.nCol];
        if (neighbor.piece) {
            const theirEdges = neighbor.piece.rotations[neighbor.piece.currentRotation].shape;
            const theirEdge = theirEdges[n.theirEdgeIdx];
            
            if (n.myEdge === CONFIG.EDGE_TYPES.FLAT || theirEdge === CONFIG.EDGE_TYPES.FLAT) {
                return false;
            }
            
            if (!edgesCompatible(n.myEdge, theirEdge)) {
                return false;
            }
        }
    }
    
    return true;
}

// ========== DRAG & DROP (TOUCH SUPPORT) ==========

function startDrag(e) {
    e.preventDefault();
    
    // Get piece from clicked element
    const element = e.target;
    const pieceId = element.dataset.pieceId;
    draggedPiece = allPieces.find(p => p.id === pieceId);
    
    if (!draggedPiece) return;
    
    // Calculate offset
    const rect = element.getBoundingClientRect();
    if (e.type === 'mousedown') {
        dragOffset.x = e.clientX - rect.left;
        dragOffset.y = e.clientY - rect.top;
    } else if (e.touches) {
        dragOffset.x = e.touches[0].clientX - rect.left;
        dragOffset.y = e.touches[0].clientY - rect.top;
    }
    
    // Create drag visual
    createDragImage(draggedPiece, 
        e.clientX || e.touches[0].clientX, 
        e.clientY || e.touches[0].clientY);
    
    // Add event listeners for both mouse and touch
    document.addEventListener('mousemove', doDrag);
    document.addEventListener('mouseup', endDrag);
    document.addEventListener('touchmove', doDragTouch, { passive: false });
    document.addEventListener('touchend', endDrag);
    
    // Update UI
    element.style.opacity = '0.5';
}

function doDrag(e) {
    if (!draggedPiece) return;
    updateDragImage(e.clientX, e.clientY);
    highlightValidCells(e.clientX, e.clientY);
}

function doDragTouch(e) {
    if (!draggedPiece) return;
    e.preventDefault();
    updateDragImage(e.touches[0].clientX, e.touches[0].clientY);
    highlightValidCells(e.touches[0].clientX, e.touches[0].clientY);
}

function endDrag(e) {
    if (!draggedPiece) {
        cleanupDrag();
        return;
    }
    
    // Get drop coordinates
    let clientX, clientY;
    if (e.type === 'mouseup') {
        clientX = e.clientX;
        clientY = e.clientY;
    } else if (e.type === 'touchend' && e.changedTouches) {
        clientX = e.changedTouches[0].clientX;
        clientY = e.changedTouches[0].clientY;
    }
    
    // Try to place piece
    const success = tryPlacePiece(clientX, clientY);
    
    // Cleanup
    cleanupDrag();
    
    if (success) {
        updateDisplay();
    }
}

function cleanupDrag() {
    // Remove event listeners
    document.removeEventListener('mousemove', doDrag);
    document.removeEventListener('mouseup', endDrag);
    document.removeEventListener('touchmove', doDragTouch);
    document.removeEventListener('touchend', endDrag);
    
    // Remove drag image
    const dragImg = document.getElementById('dragImage');
    if (dragImg) dragImg.remove();
    
    // Reset dragged piece
    if (draggedPiece) {
        const element = document.querySelector(`[data-piece-id="${draggedPiece.id}"]`);
        if (element) element.style.opacity = '1';
    }
    
    draggedPiece = null;
    clearHighlights();
}

// ========== DRAG VISUAL & PLACEMENT ==========

function createDragImage(piece, x, y) {
    const dragImg = document.createElement('canvas');
    dragImg.id = 'dragImage';
    dragImg.width = CONFIG.CELL_SIZE * 1.5;
    dragImg.height = CONFIG.CELL_SIZE * 1.5;
    
    dragImg.style.cssText = `
        position: fixed;
        left: ${x - CONFIG.CELL_SIZE * 0.75}px;
        top: ${y - CONFIG.CELL_SIZE * 0.75}px;
        width: ${CONFIG.CELL_SIZE * 1.5}px;
        height: ${CONFIG.CELL_SIZE * 1.5}px;
        pointer-events: none;
        z-index: 1000;
        opacity: 0.9;
        filter: drop-shadow(0 4px 12px rgba(0,0,0,0.3));
        border-radius: 8px;
    `;
    
    const ctx = dragImg.getContext('2d');
    drawPieceOnCanvas(ctx, piece, 0, 0, CONFIG.CELL_SIZE * 1.5, currentRotation, false);
    document.body.appendChild(dragImg);
}

function updateDragImage(x, y) {
    const dragImg = document.getElementById('dragImage');
    if (dragImg) {
        dragImg.style.left = `${x - CONFIG.CELL_SIZE * 0.75}px`;
        dragImg.style.top = `${y - CONFIG.CELL_SIZE * 0.75}px`;
    }
}

function tryPlacePiece(clientX, clientY) {
    if (!draggedPiece) return false;
    
    const canvas = document.getElementById('boardCanvas');
    const rect = canvas.getBoundingClientRect();
    
    // Convert to board coordinates
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    const col = Math.floor(x / CONFIG.CELL_SIZE);
    const row = Math.floor(y / CONFIG.CELL_SIZE);
    
    // Validate
    if (row < 0 || row >= CONFIG.BOARD_SIZE || 
        col < 0 || col >= CONFIG.BOARD_SIZE) {
        console.log("Outside board");
        return false;
    }
    
    // Use rotation if enabled, otherwise 0
    const rotation = CONFIG.ROTATION_ENABLED ? currentRotation : 0;
    
    if (!canPlacePiece(draggedPiece, row, col, rotation)) {
        console.log("Invalid placement");
        return false;
    }
    
    // Place piece
    draggedPiece.isPlaced = true;
    draggedPiece.currentRotation = rotation;
    
    gameBoard[row][col].piece = draggedPiece;
    
    console.log(`Placed ${draggedPiece.id} at (${row}, ${col})`);
    return true;
}

// ========== DISPLAY FUNCTIONS ==========

function drawBoard() {
    const canvas = document.getElementById('boardCanvas');
    if (!canvas) return;
    
    // Adjust canvas size for mobile
    const isMobile = window.innerWidth < 768;
    const displaySize = CONFIG.CELL_SIZE * CONFIG.BOARD_SIZE;
    canvas.width = displaySize;
    canvas.height = displaySize;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid lines
    ctx.strokeStyle = '#e9ecef';
    ctx.lineWidth = 1;
    
    for (let i = 0; i <= CONFIG.BOARD_SIZE; i++) {
        ctx.beginPath();
        ctx.moveTo(i * CONFIG.CELL_SIZE, 0);
        ctx.lineTo(i * CONFIG.CELL_SIZE, canvas.height);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(0, i * CONFIG.CELL_SIZE);
        ctx.lineTo(canvas.width, i * CONFIG.CELL_SIZE);
        ctx.stroke();
    }
    
    // Draw placed pieces
    for (let row = 0; row < CONFIG.BOARD_SIZE; row++) {
        for (let col = 0; col < CONFIG.BOARD_SIZE; col++) {
            const cell = gameBoard[row][col];
            if (cell.piece) {
                const x = col * CONFIG.CELL_SIZE;
                const y = row * CONFIG.CELL_SIZE;
                drawPieceOnCanvas(ctx, cell.piece, x, y, CONFIG.CELL_SIZE, 
                    cell.piece.currentRotation, cell.isLocked);
            }
        }
    }
}

function drawPieceOnCanvas(ctx, piece, x, y, size, rotation, isLocked) {
    // Background
    ctx.fillStyle = isLocked ? '#495057' : 
                   piece.type === 'corner' ? '#ffeaa7' :
                   piece.type === 'border' ? '#a29bfe' : '#fd79a8';
    ctx.fillRect(x, y, size, size);
    
    // Border
    ctx.strokeStyle = isLocked ? '#212529' : '#495057';
    ctx.lineWidth = isLocked ? 2 : 1;
    ctx.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);
    
    // Edge connectors
    if (piece.rotations[rotation]) {
        drawEdgeConnectors(ctx, x, y, size, piece.rotations[rotation].shape, isLocked);
    }
    
    // ID (smaller on mobile)
    const fontSize = Math.max(8, size / 6);
    ctx.fillStyle = isLocked ? '#ffffff' : '#212529';
    ctx.font = `${fontSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(piece.id.replace('piece_', ''), 
                 x + size/2, 
                 y + size/2);
}

function drawEdgeConnectors(ctx, x, y, size, edges, isLocked) {
    const r = size / 10;
    const centerX = x + size/2;
    const centerY = y + size/2;
    
    // Top
    if (edges[0] === CONFIG.EDGE_TYPES.JACK) {
        ctx.fillStyle = isLocked ? '#ff922b' : '#ffa94d';
        ctx.beginPath();
        ctx.arc(centerX, y + r, r, 0, Math.PI * 2);
        ctx.fill();
    } else if (edges[0] === CONFIG.EDGE_TYPES.NEST) {
        ctx.fillStyle = isLocked ? '#4dabf7' : '#74c0fc';
        ctx.beginPath();
        ctx.arc(centerX, y + r, r/1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = isLocked ? '#1c7ed6' : '#339af0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(centerX, y + r, r, 0, Math.PI * 2);
        ctx.stroke();
    } else if (edges[0] === CONFIG.EDGE_TYPES.FLAT) {
        ctx.strokeStyle = isLocked ? '#868e96' : '#adb5bd';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + size/3, y);
        ctx.lineTo(x + 2*size/3, y);
        ctx.stroke();
    }
    
    // Right, Bottom, Left (similar pattern)...
    // [Implementation shortened for brevity - similar to top]
}

function displayPieces() {
    const container = document.getElementById('pieceContainer');
    if (!container) return;
    
    container.innerHTML = '<h3>Piece Bank</h3>';
    
    const unplacedPieces = allPieces.filter(p => !p.isPlaced);
    
    if (unplacedPieces.length === 0) {
        container.innerHTML += '<p class="empty-bank">All pieces placed!</p>';
        return;
    }
    
    // Responsive grid
    const isMobile = window.innerWidth < 768;
    const cols = isMobile ? 4 : 6;
    
    container.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    
    unplacedPieces.forEach(piece => {
        const canvas = document.createElement('canvas');
        const size = isMobile ? 45 : 60;
        canvas.width = size;
        canvas.height = size;
        canvas.className = 'piece-canvas';
        canvas.dataset.pieceId = piece.id;
        canvas.title = `${piece.type} - Drag to board`;
        
        const ctx = canvas.getContext('2d');
        drawPieceOnCanvas(ctx, piece, 0, 0, size, 0, false);
        
        // Event listeners for both mouse and touch
        canvas.addEventListener('mousedown', startDrag);
        canvas.addEventListener('touchstart', startDrag, { passive: false });
        
        container.appendChild(canvas);
    });
}

// ========== GAME CONTROLS ==========

function generatePieces() {
    generateAllPieces();
    createEmptyBoard();
    displayPieces();
    drawBoard();
    pieceBank = [...allPieces.filter(p => !p.isPlaced)];
    updateCounters();
    console.log("New game started");
}

function placeLockedPieces() {
    const numLocked = 18;
    
    for (let i = 0; i < numLocked; i++) {
        let placed = false;
        let attempts = 0;
        
        while (!placed && attempts < 100) {
            attempts++;
            const row = Math.floor(Math.random() * CONFIG.BOARD_SIZE);
            const col = Math.floor(Math.random() * CONFIG.BOARD_SIZE);
            
            if (gameBoard[row][col].piece) continue;
            
            const pieceType = getPieceTypeForPosition(row, col);
            const availablePieces = allPieces.filter(p => 
                !p.isPlaced && p.type === pieceType
            );
            
            if (availablePieces.length > 0) {
                const piece = availablePieces[Math.floor(Math.random() * availablePieces.length)];
                piece.isPlaced = true;
                piece.isLocked = true;
                
                // Set proper rotation for corners
                if (pieceType === 'corner') {
                    piece.currentRotation = getCornerRotation(row, col);
                } else {
                    piece.currentRotation = 0;
                }
                
                gameBoard[row][col].piece = piece;
                gameBoard[row][col].isLocked = true;
                placed = true;
            }
        }
    }
    
    pieceBank = allPieces.filter(p => !p.isPlaced);
    updateDisplay();
    console.log("Locked pieces placed");
}

function clearBoard() {
    createEmptyBoard();
    allPieces.forEach(p => {
        p.isPlaced = false;
        p.isLocked = false;
        p.currentRotation = 0;
    });
    pieceBank = [...allPieces];
    updateDisplay();
    console.log("Board cleared");
}

function toggleRotation() {
    CONFIG.ROTATION_ENABLED = !CONFIG.ROTATION_ENABLED;
    const btn = document.getElementById('toggleRotation');
    if (btn) {
        btn.textContent = `Rotation: ${CONFIG.ROTATION_ENABLED ? 'ON' : 'OFF'}`;
        btn.style.background = CONFIG.ROTATION_ENABLED ? '#51cf66' : '#ff6b6b';
    }
    console.log(`Rotation ${CONFIG.ROTATION_ENABLED ? 'enabled' : 'disabled'}`);
}

// ========== HELPER FUNCTIONS ==========

function highlightValidCells(clientX, clientY) {
    const canvas = document.getElementById('boardCanvas');
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    
    clearHighlights();
    
    if (!draggedPiece) return;
    
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const col = Math.floor(x / CONFIG.CELL_SIZE);
    const row = Math.floor(y / CONFIG.CELL_SIZE);
    
    if (row >= 0 && row < CONFIG.BOARD_SIZE && 
        col >= 0 && col < CONFIG.BOARD_SIZE) {
        
        const rotation = CONFIG.ROTATION_ENABLED ? currentRotation : 0;
        const isValid = canPlacePiece(draggedPiece, row, col, rotation);
        
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = isValid ? '#51cf66' : '#ff6b6b';
        ctx.fillRect(col * CONFIG.CELL_SIZE, row * CONFIG.CELL_SIZE, 
                    CONFIG.CELL_SIZE, CONFIG.CELL_SIZE);
        ctx.restore();
    }
}

function clearHighlights() {
    drawBoard();
}

function updateCounters() {
    const placed = allPieces.filter(p => p.isPlaced).length;
    const locked = allPieces.filter(p => p.isLocked).length;
    const bank = pieceBank.length;
    
    const counter = document.getElementById('counter');
    if (counter) {
        counter.textContent = `Pieces: ${placed}/144 (Locked: ${locked})`;
    }
}

function updateDisplay() {
    displayPieces();
    drawBoard();
    updateCounters();
}

// ========== INITIALIZATION ==========

function initGame() {
    console.log("Initializing Juzzle...");
    
    // Setup UI controls
    const rotationBtn = document.getElementById('toggleRotation');
    if (rotationBtn) {
        rotationBtn.addEventListener('click', toggleRotation);
        rotationBtn.textContent = `Rotation: ${CONFIG.ROTATION_ENABLED ? 'ON' : 'OFF'}`;
        rotationBtn.style.background = CONFIG.ROTATION_ENABLED ? '#51cf66' : '#ff6b6b';
    }
    
    // Setup board canvas for touch
    const canvas = document.getElementById('boardCanvas');
    if (canvas) {
        canvas.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
    }
    
    // Handle window resize
    window.addEventListener('resize', updateDisplay);
    
    // Start game
    generatePieces();
    
    console.log("Juzzle ready!");
}

// Start when page loads
window.addEventListener('DOMContentLoaded', initGame); 

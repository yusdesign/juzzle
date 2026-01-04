// juzzle.js a puzzle game script
// ========== CONSTANTS ==========
const EDGE_TYPES = {
    JACK: 1,    // Male connector
    NEST: -1,   // Female connector  
    FLAT: 0     // Border edge
};

const BOARD_SIZE = 12;
const CELL_SIZE = 50;

// ========== GLOBAL STATE ==========
let allPieces = [];
let gameBoard = [];
let pieceBank = [];

// ========== CORE FUNCTIONS ==========

// 1. Generate a single piece
function generatePiece(type, id) {
    const piece = {
        id: `piece_${id}`,
        type: type,
        color: 0,
        rotations: [],
        isPlaced: false,
        isLocked: false
    };
    
    // Start with all flat edges
    const baseShape = [EDGE_TYPES.FLAT, EDGE_TYPES.FLAT, EDGE_TYPES.FLAT, EDGE_TYPES.FLAT];
    
    // Apply edge rules based on type
    switch(type) {
        case 'corner':
            // Corners: 1 Jack & 1 Nest on adjacent sides
            const jackSide = Math.floor(Math.random() * 4);
            const nestSide = (jackSide + 1) % 4; // Next side (adjacent)
            
            baseShape[jackSide] = EDGE_TYPES.JACK;
            baseShape[nestSide] = EDGE_TYPES.NEST;
            break;
            
        case 'border':
            // Border: 1 Flat, 3 random connectors
            const flatSide = Math.floor(Math.random() * 4);
            baseShape[flatSide] = EDGE_TYPES.FLAT;
            
            for (let i = 0; i < 4; i++) {
                if (i !== flatSide) {
                    baseShape[i] = Math.random() > 0.5 ? EDGE_TYPES.JACK : EDGE_TYPES.NEST;
                }
            }
            break;
            
        case 'field':
            // Field: All 4 random connectors
            for (let i = 0; i < 4; i++) {
                baseShape[i] = Math.random() > 0.5 ? EDGE_TYPES.JACK : EDGE_TYPES.NEST;
            }
            break;
    }
    
    // Generate 4 rotations
    for (let rot = 0; rot < 4; rot++) {
        const rotatedShape = [];
        for (let i = 0; i < 4; i++) {
            rotatedShape[i] = baseShape[(i + rot) % 4];
        }
        
        piece.rotations.push({
            rotation: rot,
            shape: rotatedShape,
            visualCode: rotatedShape.map(e => 
                e === EDGE_TYPES.JACK ? 'J' : 
                e === EDGE_TYPES.NEST ? 'N' : '-'
            ).join('')
        });
    }
    
    return piece;
}

// 2. Generate ALL pieces for the board
function generateAllPieces() {
    allPieces = [];
    let id = 0;
    
    // 4 corners
    for (let i = 0; i < 4; i++) {
        allPieces.push(generatePiece('corner', id++));
    }
    
    // 40 border pieces (12*4 - 8 corners)
    for (let i = 0; i < 40; i++) {
        allPieces.push(generatePiece('border', id++));
    }
    
    // 100 field pieces (10x10 interior)
    for (let i = 0; i < 100; i++) {
        allPieces.push(generatePiece('field', id++));
    }
    
    // Total: 144 pieces for 12x12 board
    return allPieces;
}

// 3. Create empty board
function createEmptyBoard() {
    gameBoard = [];
    for (let row = 0; row < BOARD_SIZE; row++) {
        gameBoard[row] = [];
        for (let col = 0; col < BOARD_SIZE; col++) {
            gameBoard[row][col] = {
                piece: null,
                color: 0,
                isLocked: false
            };
        }
    }
    return gameBoard;
}

// 4. Display pieces in the grid
function displayPieces() {
    const container = document.getElementById('pieceContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    allPieces.forEach((piece, index) => {
        const canvas = document.createElement('canvas');
        canvas.width = 60;
        canvas.height = 60;
        canvas.className = 'piece-canvas';
        canvas.title = `${piece.type} - ${piece.id}`;
        
        // Draw the piece with connectors
        const ctx = canvas.getContext('2d');
        
        // Background based on type
        ctx.fillStyle = 
            piece.type === 'corner' ? '#ffeaa7' :
            piece.type === 'border' ? '#a29bfe' : '#fd79a8';
        ctx.fillRect(0, 0, 60, 60);
        
        // Draw border
        ctx.strokeStyle = '#495057';
        ctx.lineWidth = 1;
        ctx.strokeRect(0, 0, 60, 60);
        
        // Draw edge connectors (use first rotation)
        if (piece.rotations[0]) {
            // Scale down for display
            const displayEdges = piece.rotations[0].shape;
            drawEdgeConnectors(ctx, 0, 0, 60, displayEdges, false);
            
            // Draw piece ID
            ctx.fillStyle = '#212529';
            ctx.font = '8px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(piece.id.replace('piece_', ''), 30, 30);
            
            // Draw edge code
            ctx.font = '7px monospace';
            ctx.fillStyle = '#495057';
            ctx.fillText(piece.rotations[0].visualCode, 30, 45);
        }
        
        container.appendChild(canvas);
    });
}

// 5. Draw the game board
// Enhanced drawBoard function with visible Jacks & Nests
function drawBoard() {
    const canvas = document.getElementById('boardCanvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid background
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid lines
    ctx.strokeStyle = '#dee2e6';
    ctx.lineWidth = 1;
    
    for (let i = 0; i <= BOARD_SIZE; i++) {
        // Vertical lines
        ctx.beginPath();
        ctx.moveTo(i * CELL_SIZE, 0);
        ctx.lineTo(i * CELL_SIZE, BOARD_SIZE * CELL_SIZE);
        ctx.stroke();
        
        // Horizontal lines
        ctx.beginPath();
        ctx.moveTo(0, i * CELL_SIZE);
        ctx.lineTo(BOARD_SIZE * CELL_SIZE, i * CELL_SIZE);
        ctx.stroke();
    }
    
    // Draw placed pieces
    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            const cell = gameBoard[row][col];
            const x = col * CELL_SIZE;
            const y = row * CELL_SIZE;
            
            if (cell.piece) {
                // Draw piece background (darker for locked pieces)
                ctx.fillStyle = cell.isLocked ? '#495057' : '#adb5bd';
                ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
                
                // Highlight locked pieces with a border
                if (cell.isLocked) {
                    ctx.strokeStyle = '#212529';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2);
                }
                
                // Get the piece's current rotation (default to 0 for now)
                const rotation = cell.piece.currentRotation || 0;
                const edges = cell.piece.rotations[rotation];
                
                if (edges) {
                    // Draw edge connectors for locked pieces
                    drawEdgeConnectors(ctx, x, y, CELL_SIZE, edges.shape, cell.isLocked);
                    
                    // Draw piece ID (smaller for locked pieces)
                    ctx.fillStyle = cell.isLocked ? '#ffffff' : '#212529';
                    ctx.font = cell.isLocked ? '9px Arial' : '10px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText(cell.piece.id.replace('piece_', ''), 
                        x + CELL_SIZE/2, 
                        y + CELL_SIZE/2);
                    
                    // Draw edge code for debugging
                    if (cell.isLocked) {
                        ctx.font = '8px monospace';
                        ctx.fillStyle = '#ffd8a8';
                        ctx.fillText(edges.visualCode, 
                            x + CELL_SIZE/2, 
                            y + CELL_SIZE/2 + 10);
                    }
                }
            }
        }
    }
}

// New function to draw edge connectors
function drawEdgeConnectors(ctx, x, y, size, edges, isLocked = false) {
    const connectorSize = size / 5;
    const centerX = x + size/2;
    const centerY = y + size/2;
    
    // Draw each edge connector
    // Top edge (index 0)
    if (edges[0] === EDGE_TYPES.JACK) {
        ctx.fillStyle = isLocked ? '#ff922b' : '#ffa94d'; // Orange for Jack
        ctx.beginPath();
        ctx.arc(centerX, y + connectorSize/2, connectorSize/2, 0, Math.PI * 2);
        ctx.fill();
    } else if (edges[0] === EDGE_TYPES.NEST) {
        ctx.fillStyle = isLocked ? '#4dabf7' : '#74c0fc'; // Blue for Nest
        ctx.beginPath();
        ctx.arc(centerX, y + connectorSize/2, connectorSize/3, 0, Math.PI * 2);
        ctx.fill();
        // Draw ring for nest
        ctx.strokeStyle = isLocked ? '#1c7ed6' : '#339af0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(centerX, y + connectorSize/2, connectorSize/2, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    // Right edge (index 1)
    if (edges[1] === EDGE_TYPES.JACK) {
        ctx.fillStyle = isLocked ? '#ff922b' : '#ffa94d';
        ctx.beginPath();
        ctx.arc(x + size - connectorSize/2, centerY, connectorSize/2, 0, Math.PI * 2);
        ctx.fill();
    } else if (edges[1] === EDGE_TYPES.NEST) {
        ctx.fillStyle = isLocked ? '#4dabf7' : '#74c0fc';
        ctx.beginPath();
        ctx.arc(x + size - connectorSize/2, centerY, connectorSize/3, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = isLocked ? '#1c7ed6' : '#339af0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x + size - connectorSize/2, centerY, connectorSize/2, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    // Bottom edge (index 2)
    if (edges[2] === EDGE_TYPES.JACK) {
        ctx.fillStyle = isLocked ? '#ff922b' : '#ffa94d';
        ctx.beginPath();
        ctx.arc(centerX, y + size - connectorSize/2, connectorSize/2, 0, Math.PI * 2);
        ctx.fill();
    } else if (edges[2] === EDGE_TYPES.NEST) {
        ctx.fillStyle = isLocked ? '#4dabf7' : '#74c0fc';
        ctx.beginPath();
        ctx.arc(centerX, y + size - connectorSize/2, connectorSize/3, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = isLocked ? '#1c7ed6' : '#339af0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(centerX, y + size - connectorSize/2, connectorSize/2, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    // Left edge (index 3)
    if (edges[3] === EDGE_TYPES.JACK) {
        ctx.fillStyle = isLocked ? '#ff922b' : '#ffa94d';
        ctx.beginPath();
        ctx.arc(x + connectorSize/2, centerY, connectorSize/2, 0, Math.PI * 2);
        ctx.fill();
    } else if (edges[3] === EDGE_TYPES.NEST) {
        ctx.fillStyle = isLocked ? '#4dabf7' : '#74c0fc';
        ctx.beginPath();
        ctx.arc(x + connectorSize/2, centerY, connectorSize/3, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = isLocked ? '#1c7ed6' : '#339af0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x + connectorSize/2, centerY, connectorSize/2, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    // Draw flat edges (for border pieces)
    edges.forEach((edge, index) => {
        if (edge === EDGE_TYPES.FLAT) {
            ctx.strokeStyle = isLocked ? '#868e96' : '#adb5bd';
            ctx.lineWidth = 2;
            ctx.beginPath();
            
            switch(index) {
                case 0: // Top
                    ctx.moveTo(x + size/3, y);
                    ctx.lineTo(x + 2*size/3, y);
                    break;
                case 1: // Right
                    ctx.moveTo(x + size, y + size/3);
                    ctx.lineTo(x + size, y + 2*size/3);
                    break;
                case 2: // Bottom
                    ctx.moveTo(x + size/3, y + size);
                    ctx.lineTo(x + 2*size/3, y + size);
                    break;
                case 3: // Left
                    ctx.moveTo(x, y + size/3);
                    ctx.lineTo(x, y + 2*size/3);
                    break;
            }
            ctx.stroke();
        }
    });
}
// 6. Place random locked pieces
function placeLockedPieces() {
    const numLocked = 18; // ~1.5 per row
    
    for (let i = 0; i < numLocked; i++) {
        let placed = false;
        let attempts = 0;
        
        while (!placed && attempts < 50) {
            attempts++;
            const row = Math.floor(Math.random() * BOARD_SIZE);
            const col = Math.floor(Math.random() * BOARD_SIZE);
            
            // Skip if already occupied
            if (gameBoard[row][col].piece) continue;
            
            // Determine piece type based on position
            let pieceType;
            if ((row === 0 || row === BOARD_SIZE-1) && 
                (col === 0 || col === BOARD_SIZE-1)) {
                pieceType = 'corner';
            } else if (row === 0 || row === BOARD_SIZE-1 || 
                       col === 0 || col === BOARD_SIZE-1) {
                pieceType = 'border';
            } else {
                pieceType = 'field';
            }
            
            // Find an unplaced piece of this type
            const availablePieces = allPieces.filter(p => 
                !p.isPlaced && p.type === pieceType
            );
            
            if (availablePieces.length > 0) {
                const piece = availablePieces[Math.floor(Math.random() * availablePieces.length)];
                piece.isPlaced = true;
                
                gameBoard[row][col].piece = piece;
                gameBoard[row][col].isLocked = true;
                placed = true;
            }
        }
    }
    
    // Update piece bank (unplaced pieces)
    pieceBank = allPieces.filter(p => !p.isPlaced);
    
    // Update displays
    drawBoard();
    updateCounters();
}

// 7. Update counters display
function updateCounters() {
    const placedCount = allPieces.filter(p => p.isPlaced).length;
    const lockedCount = allPieces.filter(p => p.isLocked).length;
    const bankCount = pieceBank.length;
    
    console.log(`Placed: ${placedCount}, Locked: ${lockedCount}, Bank: ${bankCount}`);
}

// ========== CONTROL FUNCTIONS ==========

function generatePieces() {
    generateAllPieces();
    createEmptyBoard();
    displayPieces();
    drawBoard();
    pieceBank = [...allPieces]; // Start with all pieces in bank
    updateCounters();
    console.log("Generated 144 pieces");
}

function clearBoard() {
    createEmptyBoard();
    allPieces.forEach(p => {
        p.isPlaced = false;
        p.isLocked = false;
    });
    pieceBank = [...allPieces];
    drawBoard();
    updateCounters();
    console.log("Board cleared");
}

// ========== INITIALIZATION ==========
window.onload = function() {
    console.log("Page loaded - initializing...");
    generatePieces();
};

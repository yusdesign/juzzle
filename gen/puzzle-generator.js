// puzzle-generator.js
class JuzzlePieceGenerator {
  constructor() {
    this.squareSize = 355.32;
    this.knobRadius = 64.65;
    this.knobOffset = 41.72; // Distance from square edge to knob center
    
    // 8 connection points relative to square (0,0)
    this.connectionPoints = [
      // Left side
      { x: -this.knobOffset, y: 177.66 - this.knobOffset, side: 'left', pos: 'top' },
      { x: -this.knobOffset, y: 177.66 + this.knobOffset, side: 'left', pos: 'bottom' },
      // Right side  
      { x: this.squareSize + this.knobOffset, y: 177.66 - this.knobOffset, side: 'right', pos: 'top' },
      { x: this.squareSize + this.knobOffset, y: 177.66 + this.knobOffset, side: 'right', pos: 'bottom' },
      // Top side
      { x: 177.66 - this.knobOffset, y: -this.knobOffset, side: 'top', pos: 'left' },
      { x: 177.66 + this.knobOffset, y: -this.knobOffset, side: 'top', pos: 'right' },
      // Bottom side
      { x: 177.66 - this.knobOffset, y: this.squareSize + this.knobOffset, side: 'bottom', pos: 'left' },
      { x: 177.66 + this.knobOffset, y: this.squareSize + this.knobOffset, side: 'bottom', pos: 'right' }
    ];
  }

  // Generate random pattern (50% chance knob, 50% hole)
  generateRandomPattern() {
    return this.connectionPoints.map(() => 
      Math.random() > 0.5 ? 'knob' : 'hole'
    );
  }

  // Generate pattern with constraints (ensures solvability)
  generateBalancedPattern() {
    const pattern = this.generateRandomPattern();
    
    // Ensure each side has at least one knob and one hole for connectivity
    const sides = ['left', 'right', 'top', 'bottom'];
    sides.forEach(side => {
      const sideIndices = this.connectionPoints
        .map((cp, i) => cp.side === side ? i : -1)
        .filter(i => i !== -1);
      
      const sideTypes = sideIndices.map(i => pattern[i]);
      
      // If all same type, flip one
      if (sideTypes.every(t => t === 'knob')) {
        pattern[sideIndices[0]] = 'hole';
      } else if (sideTypes.every(t => t === 'hole')) {
        pattern[sideIndices[0]] = 'knob';
      }
    });
    
    return pattern;
  }

  // Create SVG for a single piece
  createPieceSVG(pattern, pieceId, color = '#7E8AA2') {
    const svgNS = "http://www.w3.org/2000/svg";
    const group = document.createElementNS(svgNS, 'g');
    group.setAttribute('id', `piece-${pieceId}`);
    group.setAttribute('class', 'puzzle-piece');
    
    // Create square
    const square = document.createElementNS(svgNS, 'rect');
    square.setAttribute('x', '0');
    square.setAttribute('y', '0');
    square.setAttribute('width', this.squareSize.toString());
    square.setAttribute('height', this.squareSize.toString());
    square.setAttribute('fill', color);
    square.setAttribute('stroke', '#4A5568');
    square.setAttribute('stroke-width', '8');
    group.appendChild(square);
    
    // Create knobs (only where pattern is 'knob')
    this.connectionPoints.forEach((point, i) => {
      if (pattern[i] === 'knob') {
        const knob = document.createElementNS(svgNS, 'circle');
        knob.setAttribute('cx', point.x.toString());
        knob.setAttribute('cy', point.y.toString());
        knob.setAttribute('r', this.knobRadius.toString());
        knob.setAttribute('fill', color);
        knob.setAttribute('stroke', '#4A5568');
        knob.setAttribute('stroke-width', '8');
        knob.setAttribute('class', `connector ${point.side} ${point.pos}`);
        knob.setAttribute('data-type', 'knob');
        group.appendChild(knob);
      }
    });
    
    return group;
  }

  // Generate N pieces and return as SVG document
  generatePiecesGrid(numPieces = 16, cols = 4) {
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('xmlns', svgNS);
    svg.setAttribute('width', '1200');
    svg.setAttribute('height', '800');
    svg.setAttribute('viewBox', '0 0 1200 800');
    
    const colors = [
      '#4A90E2', '#2ECC71', '#E74C3C', '#F39C12',
      '#9B59B6', '#1ABC9C', '#E67E22', '#34495E',
      '#3498DB', '#27AE60', '#D35400', '#8E44AD',
      '#16A085', '#2980B9', '#C0392B', '#7F8C8D'
    ];
    
    const rows = Math.ceil(numPieces / cols);
    const pieceWidth = this.squareSize + 100;
    const pieceHeight = this.squareSize + 100;
    
    for (let i = 0; i < numPieces; i++) {
      const pattern = this.generateBalancedPattern();
      const color = colors[i % colors.length];
      const piece = this.createPieceSVG(pattern, i, color);
      
      const col = i % cols;
      const row = Math.floor(i / cols);
      
      const translateX = 50 + col * pieceWidth;
      const translateY = 50 + row * pieceHeight;
      
      piece.setAttribute('transform', `translate(${translateX}, ${translateY})`);
      svg.appendChild(piece);
      
      // Add piece number
      const text = document.createElementNS(svgNS, 'text');
      text.setAttribute('x', (this.squareSize / 2).toString());
      text.setAttribute('y', (this.squareSize + 60).toString());
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('fill', '#4A5568');
      text.setAttribute('font-size', '20');
      text.textContent = `Piece ${i + 1}`;
      piece.appendChild(text);
    }
    
    return svg;
  }
}

// Usage
const generator = new JuzzlePieceGenerator();

// Generate 16 random pieces
const puzzleSVG = generator.generatePiecesGrid(16, 4);

// Insert into page
document.getElementById('puzzle-container').appendChild(puzzleSVG);

// Or save as SVG file
function saveAsSVG() {
  const svgString = new XMLSerializer().serializeToString(puzzleSVG);
  const blob = new Blob([svgString], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'juzzle-pieces.svg';
  a.click();
}

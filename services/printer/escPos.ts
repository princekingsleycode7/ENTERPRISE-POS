/**
 * Basic ESC/POS Command Builder
 * Handles standard formatting for 58mm/80mm thermal printers
 */

const ESC = '\x1B';
const GS = '\x1D';

export const COMMANDS = {
  INIT: `${ESC}@`,
  CUT: `${GS}V\x41\x03`, // Cut paper
  
  // Text Format
  TXT_NORMAL: `${ESC}!\x00`,
  TXT_2HEIGHT: `${ESC}!\x10`,
  TXT_2WIDTH: `${ESC}!\x20`,
  TXT_4SQUARE: `${ESC}!\x30`,
  
  // Alignment
  TXT_ALIGN_LT: `${ESC}a\x00`,
  TXT_ALIGN_CT: `${ESC}a\x01`,
  TXT_ALIGN_RT: `${ESC}a\x02`,
  
  // Font styles
  TXT_BOLD_ON: `${ESC}E\x01`,
  TXT_BOLD_OFF: `${ESC}E\x00`,
}

export class ReceiptBuilder {
  private buffer: string = '';
  private width: number = 32; // Default to 58mm (approx 32 chars)

  constructor(paperWidth: '58mm' | '80mm' = '58mm') {
    this.buffer = COMMANDS.INIT;
    this.width = paperWidth === '58mm' ? 32 : 48;
  }

  addText(text: string) {
    this.buffer += text;
    return this;
  }

  addTextLine(text: string) {
    this.buffer += text + '\n';
    return this;
  }

  alignCenter() {
    this.buffer += COMMANDS.TXT_ALIGN_CT;
    return this;
  }

  alignLeft() {
    this.buffer += COMMANDS.TXT_ALIGN_LT;
    return this;
  }

  alignRight() {
    this.buffer += COMMANDS.TXT_ALIGN_RT;
    return this;
  }

  bold(enabled: boolean) {
    this.buffer += enabled ? COMMANDS.TXT_BOLD_ON : COMMANDS.TXT_BOLD_OFF;
    return this;
  }

  styleNormal() {
    this.buffer += COMMANDS.TXT_NORMAL;
    return this;
  }

  styleHeader() {
    this.buffer += COMMANDS.TXT_2HEIGHT + COMMANDS.TXT_BOLD_ON;
    return this;
  }

  drawLine() {
    this.buffer += '-'.repeat(this.width) + '\n';
    return this;
  }

  addPair(left: string, right: string) {
    const leftLen = left.length;
    const rightLen = right.length;
    const spaceLen = this.width - leftLen - rightLen;
    
    if (spaceLen < 1) {
      // If text is too long, print left, newline, then right aligned
      this.buffer += left + '\n';
      this.alignRight().addTextLine(right).alignLeft();
    } else {
      this.buffer += left + ' '.repeat(spaceLen) + right + '\n';
    }
    return this;
  }

  feed(lines: number = 1) {
    this.buffer += '\n'.repeat(lines);
    return this;
  }

  cut() {
    this.buffer += COMMANDS.CUT;
    return this;
  }

  getBuffer(): Uint8Array {
    // Convert string buffer to Uint8Array for Web Serial
    const encoder = new TextEncoder();
    return encoder.encode(this.buffer);
  }
}
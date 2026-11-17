// Keyboard and mouse state, in canvas coordinates.
// The game reads this each frame; the DOM menus use their own buttons.

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.mouseX = 0;
    this.mouseY = 0;
    this.mouseDown = false;
    this._pressed = new Set(); // keys pressed since last poll (edge-triggered)
    this._onKeyDown = (event) => {
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
        event.preventDefault();
      }
      if (!this.keys.has(key)) this._pressed.add(key);
      this.keys.add(key);
    };
    this._onKeyUp = (event) => {
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      this.keys.delete(key);
    };
    this._onMouseMove = (event) => {
      const rect = this.canvas.getBoundingClientRect();
      // Canvas is letterboxed to a fixed logical size; map to that space.
      this.mouseX = ((event.clientX - rect.left) / rect.width) * this.canvas.width;
      this.mouseY = ((event.clientY - rect.top) / rect.height) * this.canvas.height;
    };
    this._onMouseDown = (event) => {
      if (event.button === 0) this.mouseDown = true;
      this._onMouseMove(event);
    };
    this._onMouseUp = (event) => {
      if (event.button === 0) this.mouseDown = false;
    };
    this._onBlur = () => {
      this.keys.clear();
      this.mouseDown = false;
    };
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('mousemove', this._onMouseMove);
    window.addEventListener('mousedown', this._onMouseDown);
    window.addEventListener('mouseup', this._onMouseUp);
    window.addEventListener('blur', this._onBlur);
  }

  // True while the key is held.
  held(key) {
    return this.keys.has(key);
  }

  // True only on the frame the key went down. Call once per frame.
  pressed(key) {
    return this._pressed.has(key);
  }

  endFrame() {
    this._pressed.clear();
  }

  get moveX() {
    const left = this.held('a') || this.held('ArrowLeft') ? 1 : 0;
    const right = this.held('d') || this.held('ArrowRight') ? 1 : 0;
    return right - left;
  }

  get moveY() {
    const up = this.held('w') || this.held('ArrowUp') ? 1 : 0;
    const down = this.held('s') || this.held('ArrowDown') ? 1 : 0;
    return down - up;
  }

  get firing() {
    return this.mouseDown || this.held(' ');
  }
}

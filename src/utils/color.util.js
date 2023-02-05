class lilColor {
  #rgb = null;
  #hsl = null;
  #alpha = 1;

  constructor({ rgb, hsl }, alpha) {
    if (rgb) this.#rgb = rgb;
    if (hsl) this.#hsl = hsl;
    if (typeof alpha === "number") this.#alpha = alpha;
  }

  static isValidRGB(r, g, b) {
    return [r, g, b].every((value) => {
      if (isNaN(value)) return false;
      if (value < 0 || value > 255) return false;
      return true;
    });
  }

  static isValidHSL(h, s, l) {
    return [h, s, l].every((value) => {
      if (isNaN(value)) return false;
      if (value < 0 || value > 1) return false;
      return true;
    });
  }

  static isValidAlpha(alpha) {
    if (isNaN(alpha)) return false;
    if (alpha < 0 || alpha > 1) return false;
    return true;
  }

  static fromHex(hex) {
    const r = parseInt(hex.substring(1, 3), 16);
    const g = parseInt(hex.substring(3, 5), 16);
    const b = parseInt(hex.substring(5, 7), 16);
    if (!Color.isValidRGB(r, g, b)) return null;

    let alpha = parseInt(hex.substring(7, 9), 16) / 255;
    if (isNaN(alpha)) alpha = 1;
    return new Color({ rgb: { r, g, b } }, alpha);
  }

  static fromRGB(r, g, b, alpha = 1) {
    if (!Color.isValidRGB(r, g, b)) return null;
    if (!Color.isValidAlpha(alpha)) return null;
    return new Color({ rgb: { r, g, b } }, alpha);
  }

  static fromHSL(h, s, l, alpha = 1) {
    if (!Color.isValidHSL(h, s, l)) return null;
    if (!Color.isValidAlpha(alpha)) return null;
    return new Color({ hsl: { h, s, l } }, alpha);
  }

  static RGBtoHSL({ r, g, b }) {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);

    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    // Achromatic
    if (max === min) return { h, s, l };

    const diff = max - min;
    s = l > 0.5 ? diff / (2 - max - min) : diff / (max + min);

    switch (max) {
      case r:
        h = (g - b) / diff + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / diff + 2;
        break;
      case b:
        h = (r - g) / diff + 4;
        break;
    }
    h /= 6;

    return { h, s, l };
  }

  static HSLtoRGB({ h, s, l }) {
    const hue2rgb = (p, q, t) => {
      return Math.round(
        (() => {
          if (t < 0) t += 1;
          if (t > 1) t -= 1;
          if (t < 1 / 6) return p + (q - p) * 6 * t;
          if (t < 1 / 2) return q;
          if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
          return p;
        })() * 255
      );
    };

    if (s == 0) return { r: l, g: l, b: l };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    return {
      r: hue2rgb(p, q, h + 1 / 3),
      g: hue2rgb(p, q, h),
      b: hue2rgb(p, q, h - 1 / 3),
    };
  }

  clone() {
    if (this.#rgb) return Color.fromRGB(this.#rgb.r, this.#rgb.g, this.#rgb.b, this.#alpha);
    if (this.#hsl) return Color.fromHSL(this.#hsl.h, this.#hsl.s, this.#hsl.l, this.#alpha);
    return null;
  }

  get rgb() {
    if (!this.#rgb) {
      this.#rgb = Color.HSLtoRGB(this.#hsl);
    }

    return this.#rgb;
  }

  get hsl() {
    if (!this.#hsl) {
      this.#hsl = Color.RGBtoHSL(this.#rgb);
    }

    return this.#hsl;
  }

  get alpha() {
    return this.#alpha;
  }

  set rgb(rgb) {
    this.#rgb = rgb;
    this.#hsl = null;
  }

  set hsl(hsl) {
    this.#hsl = hsl;
    this.#rgb = null;
  }

  get hex() {
    const { r, g, b } = this.rgb;
    const numToHex = (num) => num.toString(16).padStart(2, "0");
    let hex = `#${numToHex(r)}${numToHex(g)}${numToHex(b)}`;

    if (this.#alpha < 1) {
      hex += numToHex(Math.round(this.#alpha * 255));
    }

    return hex;
  }

  addHue(per) {
    const hsl = this.hsl;
    hsl.h += hsl.h * per;
    if (hsl.h < 0) hsl.h = 0;
    else if (hsl.h > 1) hsl.h = 1;
    this.hsl = hsl;
  }

  set hue(hue) {
    if (hue < 0 || hue > 1) return;
    const hsl = this.hsl;
    hsl.h = hue;
    this.hsl = hsl;
  }

  addSaturation(per) {
    const hsl = this.hsl;
    hsl.s += hsl.s * per;
    if (hsl.s < 0) hsl.s = 0;
    else if (hsl.s > 1) hsl.s = 1;
    this.hsl = hsl;
  }

  set saturation(saturation) {
    if (saturation < 0 || saturation > 1) return;
    const hsl = this.hsl;
    hsl.s = saturation;
    this.hsl = hsl;
  }

  addBrightness(per) {
    const hsl = this.hsl;
    hsl.l += hsl.l * per;
    if (hsl.l < 0) hsl.l = 0;
    else if (hsl.l > 1) hsl.l = 1;
    this.hsl = hsl;
  }

  set brightness(brightness) {
    if (brightness < 0 || brightness > 1) return;
    const hsl = this.hsl;
    hsl.l = brightness;
    this.hsl = hsl;
  }
}

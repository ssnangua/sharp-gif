const sharp = require("sharp");
const GifEncoder = require("gif-encoder");

class Gif {
  /**
   * Gif class
   * @param {Object} options
   * @param {Object} options.gifEncoder - GifEncoder options
   * @param {Number} options.gifEncoder.highWaterMark - Number, in bytes, to store in internal buffer. Defaults to 64kB.
   */
  constructor(options) {
    this.options = options;
    this.frames = [];
  }

  addFrame(frame) {
    if (Array.isArray(frame)) this.frames.push(...frame);
    else this.frames.push(frame);
    return this;
  }

  getEncoder(width, height, options = { highWaterMark: 64 }) {
    return new GifEncoder(width, height, options);
  }

  async toBuffer(progress = () => {}, encoder) {
    const { options, frames } = this;
    let {
      width,
      height,
      delay,
      repeat = 0,
      quality,
      transparent,
      resizeTo = "largest",
      resizeType = "zoom",
      resizeOptions = {},
      extendBackground = { r: 0, g: 0, b: 0, alpha: 0 },
      rawOptions,
    } = options;

    // Exclude inside and outside fit
    const { fit } = resizeOptions;
    if (fit === "inside" || fit === "outside") {
      resizeOptions.fit = "contain";
    }

    // Get width and height of output gif
    let meta;
    if (!encoder && (!width || !height)) {
      meta = await Promise.all(frames.map((frame) => frame.metadata()));
      const math = resizeTo === "largest" ? Math.max : Math.min;
      width = width || math(...meta.map((m) => m.width));
      height = height || math(...meta.map((m) => m.pageHeight || m.height));
    }

    // Get GifEncoder instance
    if (!encoder) {
      encoder = this.getEncoder(width, height, this.options.gifEncoder);
      if (delay) encoder.setDelay(delay);
      if (repeat) encoder.setRepeat(repeat);
      if (quality) encoder.setQuality(quality);
      if (transparent) encoder.setTransparent(transparent);
    }

    const _frames = [];
    const bufs = [];
    encoder.on("data", (buffer) => {
      bufs.push(buffer);
      // Call progress handler
      progress({ total: _frames.length + 2, encoded: bufs.length });
    });
    const promise = new Promise((resolve, reject) => {
      encoder.on("end", () => resolve(Buffer.concat(bufs)));
      encoder.on("error", reject);
    });

    // Write out header bytes.
    encoder.writeHeader();

    // Write out a new frame to the GIF.
    const addFrame = async (frame, frameWidth, frameHeight) => {
      if (frameWidth !== width && frameHeight !== height) {
        // Resize frame
        if (resizeType === "zoom") {
          frame.resize({
            ...resizeOptions,
            width,
            height,
          });
        }
        // Extend or extract frame
        else {
          const halfWidth = Math.abs(width - frameWidth) / 2;
          if (frameWidth < width) {
            frame.extend({
              left: halfWidth,
              right: halfWidth,
              background: extendBackground,
            });
          } else if (frameWidth > width) {
            frame.extract({ left: halfWidth, top: 0, width, height });
          }
          const halfHeight = Math.abs(height - frameHeight) / 2;
          if (frameHeight < height) {
            frame.extend({
              top: halfHeight,
              bottom: halfHeight,
              background: extendBackground,
            });
          } else if (frameHeight > height) {
            frame.extract({ left: 0, top: halfHeight, width, height });
          }
        }
      }

      const pixels = await frame.ensureAlpha(0).raw(rawOptions).toBuffer();
      encoder.addFrame(pixels);
    };

    // Parse animated frames
    for (let i = 0; i < frames.length; i++) {
      let frame = frames[i];
      const { pages, width, height, pageHeight } =
        (meta && meta[i]) || (await frame.metadata());
      if (pages > 1) {
        frame = sharp(await frame.png().toBuffer());
        for (let p = 0; p < pages; p++) {
          const cutFrame = frame.clone().extract({
            left: 0,
            top: pageHeight * p,
            width: width,
            height: pageHeight,
          });
          _frames.push({ frame: cutFrame, width, height: pageHeight });
        }
      } else {
        _frames.push({ frame, width, height });
      }
    }

    // Write all frames
    for (let i = 0; i < _frames.length; i++) {
      let { frame, width, height } = _frames[i];
      await addFrame(frame, width, height);
    }

    // Write out footer bytes.
    encoder.finish();

    return promise;
  }

  async toSharp(progress, encoder) {
    const buffer = await this.toBuffer(progress, encoder);
    return sharp(buffer, { animated: true, ...this.options.sharpOptions });
  }
}

module.exports = {
  createGif: (options = {}) => new Gif(options),
};

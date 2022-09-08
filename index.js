const sharp = require("sharp");
const GifEncoder = require("gif-encoder");

class GifReader {
  constructor(image) {
    this.image = image;
  }

  async toFrames() {
    let { image } = this;
    const { pages, width, pageHeight } = await image.metadata();
    const frames = [];
    if (pages > 1) {
      image = sharp(await image.png().toBuffer());
      for (let i = 0; i < pages; i++) {
        const frame = image.clone().extract({
          left: 0,
          top: pageHeight * i,
          width: width,
          height: pageHeight,
        });
        frames.push(sharp(await frame.toBuffer()));
      }
    } else {
      frames.push(image);
    }
    this.frames = frames;
    return frames;
  }

  async toGif(options = {}) {
    return new Gif(options).addFrame(this.frames || (await this.toFrames()));
  }
}

class Gif {
  constructor(options = {}) {
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
    const cutted = [];
    const bufs = [];

    // Exclude inside and outside fit
    const { fit } = resizeOptions;
    if (fit === "inside" || fit === "outside") {
      resizeOptions.fit = "contain";
    }

    // Parse frames
    for (let i = 0; i < frames.length; i++) {
      cutted.push(...(await new GifReader(frames[i]).toFrames()));
    }

    // Get width and height of output gif
    if (!encoder && (!width || !height)) {
      const meta = await Promise.all(frames.map((frame) => frame.metadata()));
      const math = resizeTo === "largest" ? Math.max : Math.min;
      width = width || math(...meta.map((m) => m.width));
      height = height || math(...meta.map((m) => m.pageHeight || m.height));
    }

    // Get GifEncoder instance
    if (!encoder) {
      encoder = this.getEncoder(width, height, this.options.gifEncoderOptions);
      if (delay) encoder.setDelay(delay);
      if (repeat) encoder.setRepeat(repeat);
      if (quality) encoder.setQuality(quality);
      if (transparent) encoder.setTransparent(transparent);
    }

    encoder.on("data", (buffer) => {
      bufs.push(buffer);
      // Call progress handler
      progress({ total: cutted.length + 2, encoded: bufs.length });
    });
    const promise = new Promise((resolve, reject) => {
      encoder.on("end", () => resolve(Buffer.concat(bufs)));
      encoder.on("error", reject);
    });

    // Write out header bytes.
    encoder.writeHeader();

    // Write out frames
    for (let i = 0; i < cutted.length; i++) {
      const frame = cutted[i];
      const { width: frameWidth, height: frameHeight } = await frame.metadata();
      if (frameWidth !== width || frameHeight !== height) {
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

      const pixels = await frame.ensureAlpha().raw(rawOptions).toBuffer();
      encoder.addFrame(pixels);
    }

    // Write out footer bytes.
    encoder.finish();

    return promise;
  }

  async toSharp(progress, encoder) {
    const buffer = await this.toBuffer(progress, encoder);
    return sharp(buffer, {
      animated: true,
      ...this.options.sharpOptions,
    }).gif({
      loop: this.options.repeat || 0,
      delay: this.options.delay,
    });
  }
}

module.exports = {
  createGif: (options = {}) => new Gif(options),
  readGif: (image) => new GifReader(image),
};

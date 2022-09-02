import GIFEncoder from "gif-encoder";
import { Color, RawOptions, ResizeOptions, Sharp, SharpOptions } from "sharp";

export declare interface GifEncoderOptions {
  /**
   * Number, in bytes, to store in internal buffer. Defaults to 64kB.
   */
  highWaterMark?: number | undefined;
}

export declare interface GifOptions {
  /**
   * gif-encoder constructor options
   */
  gifEncoderOptions?: GifEncoderOptions;
  /**
   * sharp constructor options
   */
  sharpOptions?: SharpOptions;
  /**
   * Width, in pixels, of the GIF to output.
   */
  width?: Number;
  /**
   * Height, in pixels, of the GIF to output.
   */
  height?: Number;
  /**
   * Amount of milliseconds to delay between frames
   */
  delay?: Number;
  /**
   * Amount of times to repeat GIF.
   * Default by `0`, loop indefinitely.
   */
  repeat?: Number;
  /**
   * GIF quality
   *  - `1` is best colors, worst performance.
   *  - `20` is suggested maximum but there is no limit.
   *  - `10` is the default, provided an even trade-off.
   */
  quality?: Number;
  /**
   * Define the color which represents transparency in the GIF.
   */
  transparent?: String;
  /**
   * Resize all frame to the `largest` frame or `smallest` frame size.
   */
  resizeTo?: "largest" | "smallest";
  /**
   * Resize type, `zoom` or `crop`
   */
  resizeType?: "zoom" | "crop";
  /**
   * sharp resize options
   */
  resizeOptions?: ResizeOptions;
  /**
   * sharp extend background option
   */
  extendBackground?: Color;
  /**
   * sharp raw options
   */
  rawOptions?: RawOptions;
}

export declare interface ProgressHandler {
  (progress: { total: Number; encoded: Number }): void;
}

export declare class Gif {
  constructor(options?: GifOptions);
  /**
   * Add new frames
   * @param frame
   */
  addFrame(frame: Sharp | Sharp[]): Gif;
  /**
   * Create a GIFEncoder instance
   * @param width
   * @param height
   * @param gifEncoderOptions
   */
  getEncoder(
    width: Number,
    height: Number,
    gifEncoderOptions?: GifEncoderOptions
  ): GIFEncoder;
  /**
   * Encode all frames and resolve with an animated GIF buffer
   * @param encoder
   */
  toBuffer(progress?: ProgressHandler, encoder?: GIFEncoder): Promise<Buffer>;
  /**
   * Encode all frames and resolve with an animated sharp instance
   * @param encoder
   */
  toSharp(progress?: ProgressHandler, encoder?: GIFEncoder): Promise<Sharp>;
}

export declare class GifReader {
  constructor(image: Sharp);
  /**
   * Cut GIF frames
   */
  toFrames(): Promise<Sharp[]>;
  /**
   * Create Gif from cutted frames
   * @param options
   */
  toGif(options?: GifOptions): Promise<Gif>;
}

/**
 * Create Gif
 */
export declare function createGif(options?: GifOptions): Gif;

/**
 * Read Gif
 */
export declare function readGif(image: Sharp): GifReader;

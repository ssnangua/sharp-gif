const fs = require("fs");
const sharp = require("sharp");
const GIF = require("./index");

if (!fs.existsSync("./output")) fs.mkdirSync("./output");

(async () => {
  /**
   * Simple use case
   */
  // const image = await GIF.createGif()
  //   .addFrame([
  //     sharp("./frames/0000.png"),
  //     sharp("./frames/0001.png"),
  //     sharp("./frames/0002.png"),
  //   ])
  //   .toSharp();
  // image.toFile("./output/frames.gif");
  /**
   * Trace encoding progress
   */
  // const image = await GIF.createGif({ delay: 20 })
  //   .addFrame(
  //     fs.readdirSync("./frames").map((file) => sharp(`./frames/${file}`))
  //   )
  //   .toSharp(({ total, encoded }) => {
  //     console.log(`${encoded}/${total}`);
  //   });
  // image.toFile("./output/frames.gif");
  /**
   * Concat animated GIFs
   */
  const image = await GIF.createGif({
    transparent: "#FFFFFF",
  })
    .addFrame([
      sharp("./1.gif", { animated: true }),
      sharp("./2.gif", { animated: true }),
      sharp("./3.gif", { animated: true }),
    ])
    .toSharp();
  image.toFile("./output/concat.gif");
})();

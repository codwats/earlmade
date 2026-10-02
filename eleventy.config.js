export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({
    "node_modules/@web.awesome.me/webawesome-pro/dist-cdn": "webawesome",
    woff2: "fonts",
  });
}

export const config = {
  dir: { input: "src" },
};

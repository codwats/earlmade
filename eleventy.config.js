export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({
    "node_modules/@web.awesome.me/webawesome-pro/dist-cdn": "webawesome",
  });
}

export const config = {
  dir: { input: "src" },
};

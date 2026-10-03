export default {
  eleventyComputed: {
    permalink: (data) => (data.isServe ? "/inbox/" : false),
  },
};

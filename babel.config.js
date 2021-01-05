const presets = [];
const plugins = [["@babel/plugin-syntax-optional-chaining"]];

if (process.env.NODE_ENV === "production") {
  // plugins.push(...);
}

module.exports = { presets, plugins };

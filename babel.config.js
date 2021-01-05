const presets = [];
const plugins = [["@babel/plugin-syntax-optional-chaining"]];

if (process.env["ENV"] === "prod") {
  // plugins.push(...);
}

module.exports = { presets, plugins };

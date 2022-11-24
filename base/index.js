import { createRequire } from "module";
const require = createRequire(import.meta.url);

const core = require("./core");
const display = require("./display");
const shared = require("./shared");

module.exports = {
  core,
  display,
  shared,
};

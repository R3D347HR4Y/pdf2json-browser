import { createRequire } from "module";
const require = createRequire(import.meta.url);

const api = require("./api");
const canvas = require("./canvas");
const fontLoader = require("./font_loader");
const metadata = require("./metadata");

module.exports = {
  api,
  canvas,
  fontLoader,
  metadata,
};

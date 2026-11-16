import { U as Utils, F as Color } from "../app.CRu3CliF.js";
const channel = (color, channel2) => {
  return Utils.lang.round(Color.parse(color)[channel2]);
};
export {
  channel as c
};

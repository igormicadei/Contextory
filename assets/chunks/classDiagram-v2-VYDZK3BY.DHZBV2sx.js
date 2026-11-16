import { s as styles_default, c as classRenderer_v3_unified_default, a as classDiagram_default, C as ClassDB } from "./chunk-TICWLB2K.C548PBJN.js";
import { _ as __name } from "../app.DVFJgQyE.js";
import "./chunk-5VM5RSS4.CcN7fnI2.js";
import "./chunk-XXDRQBXY.B4kFAzCa.js";
import "./chunk-POPQ4Y6H.BvD_stTX.js";
import "./chunk-F27PBJKO.B8_2oeZo.js";
import "./framework.jTK6_58R.js";
import "./theme.cUih1qFl.js";
var diagram = {
  parser: classDiagram_default,
  get db() {
    return new ClassDB();
  },
  renderer: classRenderer_v3_unified_default,
  styles: styles_default,
  init: /* @__PURE__ */ __name((cnf) => {
    if (!cnf.class) {
      cnf.class = {};
    }
    cnf.class.arrowMarkerAbsolute = cnf.arrowMarkerAbsolute;
  }, "init")
};
export {
  diagram
};

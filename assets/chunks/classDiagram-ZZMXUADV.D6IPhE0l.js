import { s as styles_default, c as classRenderer_v3_unified_default, a as classDiagram_default, C as ClassDB } from "./chunk-TICWLB2K.BQhJHp_7.js";
import { _ as __name } from "../app.CRu3CliF.js";
import "./chunk-5VM5RSS4.DV8ESRGh.js";
import "./chunk-XXDRQBXY.CwhzAR0N.js";
import "./chunk-POPQ4Y6H.DIr_LA7Y.js";
import "./chunk-F27PBJKO.B4xkvjtn.js";
import "./framework.jTK6_58R.js";
import "./theme.IoSdND7m.js";
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

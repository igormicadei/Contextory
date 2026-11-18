import { s as styles_default, c as classRenderer_v3_unified_default, a as classDiagram_default, C as ClassDB } from "./chunk-TICWLB2K.u7PVBeh4.js";
import { _ as __name } from "../app.gf-94PyH.js";
import "./chunk-5VM5RSS4.CAHFA8Dk.js";
import "./chunk-XXDRQBXY.D-HpZj4e.js";
import "./chunk-POPQ4Y6H.DgewDL6X.js";
import "./chunk-F27PBJKO.Cbvo8eHA.js";
import "./framework.jTK6_58R.js";
import "./theme.UCiBwvgQ.js";
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

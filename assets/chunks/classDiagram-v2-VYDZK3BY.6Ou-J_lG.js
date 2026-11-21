import { s as styles_default, c as classRenderer_v3_unified_default, a as classDiagram_default, C as ClassDB } from "./chunk-TICWLB2K.Dl_gSqe8.js";
import { _ as __name } from "../app.BLuEM-Wb.js";
import "./chunk-5VM5RSS4.ByVetnYN.js";
import "./chunk-XXDRQBXY.D3MYmI39.js";
import "./chunk-POPQ4Y6H.BxrSvyIV.js";
import "./chunk-F27PBJKO.DLjITJbs.js";
import "./framework.jTK6_58R.js";
import "./theme.DrJPW6QC.js";
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

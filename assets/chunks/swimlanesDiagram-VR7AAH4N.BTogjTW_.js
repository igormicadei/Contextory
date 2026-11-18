import { c as createFlowDiagram, s as styles_default } from "./flowDiagram-HODETNUW.B-D590en.js";
import { _ as __name } from "../app.DU8CzkSb.js";
import "./chunk-5VM5RSS4.DVoZQgSU.js";
import "./chunk-XXDRQBXY.wFoeXJC0.js";
import "./chunk-POPQ4Y6H.DAy4LQuM.js";
import "./chunk-F27PBJKO.Dvfp43Ym.js";
import "./channel.DYeV55Iv.js";
import "./framework.jTK6_58R.js";
import "./theme.BXtjRCEW.js";
var getStyles = /* @__PURE__ */ __name((options) => `${styles_default(options)}
  .swimlane.cluster rect {
    stroke: ${options.clusterBorder} !important;
  }
  [data-look="neo"].cluster rect {
    filter: none;
  }
`, "getStyles");
var styles_default2 = getStyles;
var diagram = createFlowDiagram({ defaultLayout: "swimlane", styles: styles_default2 });
export {
  diagram
};

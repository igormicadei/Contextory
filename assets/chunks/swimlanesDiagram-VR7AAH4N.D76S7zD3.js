import { c as createFlowDiagram, s as styles_default } from "./flowDiagram-HODETNUW.CI7VnHA7.js";
import { _ as __name } from "../app.gf-94PyH.js";
import "./chunk-5VM5RSS4.CAHFA8Dk.js";
import "./chunk-XXDRQBXY.D-HpZj4e.js";
import "./chunk-POPQ4Y6H.DgewDL6X.js";
import "./chunk-F27PBJKO.Cbvo8eHA.js";
import "./channel.B2OKeCFA.js";
import "./framework.jTK6_58R.js";
import "./theme.UCiBwvgQ.js";
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

import { c as createFlowDiagram, s as styles_default } from "./flowDiagram-HODETNUW.B6DIhw0q.js";
import { _ as __name } from "../app.CRu3CliF.js";
import "./chunk-5VM5RSS4.DV8ESRGh.js";
import "./chunk-XXDRQBXY.CwhzAR0N.js";
import "./chunk-POPQ4Y6H.DIr_LA7Y.js";
import "./chunk-F27PBJKO.B4xkvjtn.js";
import "./channel.CxhdNc9A.js";
import "./framework.jTK6_58R.js";
import "./theme.IoSdND7m.js";
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

import { c as createFlowDiagram, s as styles_default } from "./flowDiagram-HODETNUW.DQzpdMh-.js";
import { _ as __name } from "../app.DVFJgQyE.js";
import "./chunk-5VM5RSS4.CcN7fnI2.js";
import "./chunk-XXDRQBXY.B4kFAzCa.js";
import "./chunk-POPQ4Y6H.BvD_stTX.js";
import "./chunk-F27PBJKO.B8_2oeZo.js";
import "./channel.BScVMSn3.js";
import "./framework.jTK6_58R.js";
import "./theme.cUih1qFl.js";
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

import type { Plugin } from "unified";
import type { Node } from "slate";
import type { Root } from "mdast";
import {
  OverridedMdastBuilders,
  mdastToSlate,
} from "../transformers/mdast-to-slate";

export type Options = {
  overrides?: OverridedMdastBuilders;
};

const plugin: Plugin<[Options?], Root, Node[]> = function ({
  overrides = {},
} = {}) {
  this.Compiler = function (node) {
    return mdastToSlate(node, overrides);
  };
};
export default plugin;

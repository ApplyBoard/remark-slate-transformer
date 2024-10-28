import type { Plugin } from "unified";
import type * as mdast from "../models/mdast";
import type * as slate from "../models/slate";
import {
  slateToMdast,
  OverridedSlateBuilders,
  SlateToMdastOptions,
} from "../transformers/slate-to-mdast";

export type Options = {
  overrides?: OverridedSlateBuilders;
  textDecorationProcessors?: SlateToMdastOptions['textDecorationProcessors']
};

const plugin: Plugin<[Options?], slate.Node, mdast.Root> = ({
  overrides = {},
  textDecorationProcessors = {},
} = {}) => {
  return function (node) {
    return slateToMdast(node, overrides, {
      textDecorationProcessors
    });
  };
};
export default plugin;
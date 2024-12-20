import { describe, it, expect } from "@jest/globals";
import fs from "fs";
import path from "path";
import { unified } from "unified";
import markdown from "remark-parse";
import remarkDirective from 'remark-directive';
import gfm from "remark-gfm";
import footnotes from "remark-footnotes";
import frontmatter from "remark-frontmatter";
import math from "remark-math";
import stringify from "remark-stringify";
// @ts-expect-error No type declarations for this version :(
import directive from 'mdast-util-directive';
import toMarkdown from 'mdast-util-to-markdown';
import { remarkToSlate, slateToRemark } from ".";

const FIXTURE_PATH = "../fixtures";

describe("e2e", () => {
  const toSlateProcessor = unified()
    .use(markdown)
    .use(remarkDirective)
    .use(gfm)
    .use(footnotes, { inlineNotes: true })
    .use(frontmatter, ["yaml", "toml"])
    .use(math)
    .use(remarkToSlate, {
      overrides: {
        textDirective: (node, next) => {
          const n = node as {
            attributes: {
              color: string;
            }
            children: unknown[];
            name: string;
          }
          const attrs: Record<string, unknown> = {};
          if (n.name === 'notice') {
            // @ts-expect-error Not sure why this is complaining
            attrs.color = n.attributes.color;
            // @ts-expect-error Not sure why this is complaining
            attrs.directive = 'notice';
          }
          return next(n.children, attrs);
        }
      }
    })

  const toRemarkProcessor = unified()
    // @ts-expect-error I don't understand this one
    .use(slateToRemark, {
      textDecorationProcessors: {
        directive: (node, children) => {
          if (node.directive === 'notice') {
            return ({
              attributes: {
                color: node.color,
              },
              children: [children],
              name: 'notice',
              type: 'textDirective',
            })
          }
          return null;
        }
      }
    })
    .use(gfm)
    .use(footnotes, { inlineNotes: true })
    .use(frontmatter, ["yaml", "toml"])
    .use(math)
    // @ts-expect-error `handlers` is supported but for some reason complains about its properties
    .use(stringify, {
      bullet: "-",
      emphasis: "_",
      handlers: {
        textDirective: (node: any) => {
          return toMarkdown(node, {
            extensions: [directive.toMarkdown]
          })
        }
      }
    });

  const fixturesDir = path.join(__dirname, FIXTURE_PATH);
  const filenames = fs.readdirSync(fixturesDir);
  filenames.forEach((filename) => {
    it(filename, () => {
      const slateNodes = toSlateProcessor.processSync(
        fs.readFileSync(path.join(fixturesDir, filename))
      ).result;
      expect(slateNodes).toMatchSnapshot();

      const mdastTree = toRemarkProcessor.runSync({
        type: "root",
        children: slateNodes,
      });
      expect(mdastTree).toMatchSnapshot();

      const text = toRemarkProcessor.stringify(mdastTree);
      expect(text).toMatchSnapshot();
    });
  });
});

describe("options", () => {
  it("override builders", () => {
    const mdText = `
  - AAAA
    - BBBB
  - CCCC
    `;
    const toSlateProcessor = unified()
      .use(markdown)
      .use(remarkToSlate, {
        overrides: {
          list: (node, next) => ({
            type: "foo",
            children: next(node.children),
          }),
          text: (node) => ({ type: "bar", bar: node.value }),
        },
      });
    const toRemarkProcessor = unified()
      .use(slateToRemark, {
        overrides: {
          foo: (node: any, next) => ({
            type: "list",
            children: next(node.children),
          }),
          bar: (node: any) => ({ type: "text", value: node.bar }),
        },
      })
      .use(stringify, { bullet: "-" });

    const slateTree = toSlateProcessor.processSync(mdText).result;
    expect(slateTree).toMatchSnapshot();
    const mdastTree = toRemarkProcessor.runSync({
      type: "root",
      children: slateTree,
    });

    expect(mdastTree).toMatchSnapshot();
    const text = toRemarkProcessor.stringify(mdastTree);
    expect(text).toMatchSnapshot();
  });
});

describe("issues", () => {
  it("issue42", () => {
    const mdText = `
- list
  - list
- list
- list
-
  `;
    const toSlateProcessor = unified().use(markdown).use(remarkToSlate);
    const toRemarkProcessor = unified()
      .use(slateToRemark)
      .use(stringify, { bullet: "-" });
    const slateTree = toSlateProcessor.processSync(mdText).result;
    expect(slateTree).toMatchSnapshot();
    const mdastTree = toRemarkProcessor.runSync({
      type: "root",
      children: slateTree,
    });
    const text = toRemarkProcessor.stringify(mdastTree);
    expect(text).toMatchSnapshot();
  });

  it("issue44", () => {
    const slateNodes = [
      {
        type: "paragraph",
        children: [
          {
            text: "Naoki Urasawa is a ",
          },
          {
            text: "Japanese ",
            strong: true,
          },
          {
            text: "manga artist and musician. He has been ",
          },
          {
            emphasis: true,
            text: "drawing ",
          },
          {
            text: "manga since he ",
          },
          {
            strong: true,
            text: " was",
          },
          {
            text: " four years old, and for most of his career has created two series simultaneously. ",
          },
          {
            strong: true,
            text: "So there ",
          },
        ],
      },
    ];
    const toSlateProcessor = unified().use(markdown).use(remarkToSlate);
    const toRemarkProcessor = unified()
      .use(slateToRemark)
      .use(stringify, { emphasis: "*" });
    const mdastTree = toRemarkProcessor.runSync({
      type: "root",
      children: slateNodes,
    });
    expect(mdastTree).toMatchSnapshot();
    const text = toRemarkProcessor.stringify(mdastTree);
    expect(text).toMatchSnapshot();
    const slateTree = toSlateProcessor.processSync(text).result;
    expect(slateTree).toMatchSnapshot();
  });

  it("issue90", () => {
    const slateNodes = [
      {
        type: "paragraph",
        children: [
          {
            text: "Italic",
            strong: true,
            emphasis: true,
          },
          {
            strong: true,
            text: " in a bold paragraph",
          },
        ],
      },
      {
        type: "paragraph",
        children: [
          {
            strong: true,
            text: "This is an ",
          },
          {
            text: "Italic",
            strong: true,
            emphasis: true,
          },
          {
            strong: true,
            text: " in a bold paragraph",
          },
        ],
      },
    ];
    const toSlateProcessor = unified().use(markdown).use(remarkToSlate);
    const toRemarkProcessor = unified()
      .use(slateToRemark)
      .use(stringify, { emphasis: "*" });
    const mdastTree = toRemarkProcessor.runSync({
      type: "root",
      children: slateNodes,
    });
    expect(mdastTree).toMatchSnapshot();
    const text = toRemarkProcessor.stringify(mdastTree);
    expect(text).toMatchSnapshot();
    const slateTree = toSlateProcessor.processSync(text).result;
    expect(slateTree).toMatchSnapshot();
  });

  it("issue129", () => {
    const toSlateProcessor = unified().use(markdown).use(remarkToSlate);
    const slateTree = toSlateProcessor.processSync("").result;
    expect(slateTree).toMatchSnapshot();
    const slateTreeWithSpace = toSlateProcessor.processSync(" ").result;
    expect(slateTreeWithSpace).toMatchSnapshot();
  });

  it("issue145", () => {
    const processor = unified()
      .use(slateToRemark)
      .use(stringify, { emphasis: "_" });
    const ast = processor.runSync({
      type: "root",
      children: [{ text: "inline code", strong: true, emphasis: true }],
    } as any);
    expect(ast).toMatchSnapshot();
    const text = processor.stringify(ast);
    expect(text).toMatchSnapshot();
  });

  it("issue145-2", () => {
    const processor = unified()
      .use(markdown)
      .use(slateToRemark)
      .use(stringify, { emphasis: "_" });
    const ast = processor.runSync({
      type: "root",
      children: [
        {
          type: "paragraph",
          children: [{ emphasis: true, inlineCode: true, text: "code" }],
        },
      ],
    } as any);
    expect(ast).toMatchSnapshot();
    const text = processor.stringify(ast);
    expect(text).toMatchSnapshot();
  });
});

import { StoryObj } from "@storybook/react";
import React, { useMemo, useRef, useState } from "react";
import { Node } from "slate";
import { unified } from "unified";
import markdown from "remark-parse";
import gfm from "remark-gfm";
import remarkDirective from 'remark-directive';
import frontmatter from "remark-frontmatter";
import stringify from "remark-stringify";
import { remarkToSlate, slateToRemark } from "../../src";
import SlateEditor from "../components/slate-editor";
import TextEditor from "../components/text-editor";
import Text from "../components/text";
import text from "../../fixtures/article.md?raw";
import directive from 'mdast-util-directive'
import toMarkdown from 'mdast-util-to-markdown'

const toSlateProcessor = unified()
  .use(markdown)
  .use(remarkDirective)
  .use(gfm)
  .use(frontmatter)
  .use(remarkToSlate, {
    overrides: {
      textDirective: (node, next) => {
        const attrs: Record<string, unknown> = { position: node.position };
        if (node.name === 'notice') {
          attrs.color = node.attributes.color;
          attrs.directive = 'notice';
        }
        return next(node.children, attrs);
      }
    }
  })

const toRemarkProcessor = unified()
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
      }
    }
  })
  .use(gfm)
  .use(frontmatter)
  .use(stringify, {
    handlers: {
      textDirective: (node) => {
        return toMarkdown(node, {
          extensions: [directive.toMarkdown]
        })
      }
    }
  });

const toSlate = (s: string) => toSlateProcessor.processSync(s).result as Node[];
const toMd = (value: Node[]) => {
  const mdast = toRemarkProcessor.runSync({
    type: "root",
    children: value,
  });
  return toRemarkProcessor.stringify(mdast);
};

export default {
  title: "Playground/Slate 0.50+",
};

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <div
    style={useMemo(
      () => ({
        width: "100vw",
        height: "100vh",
        display: "flex",
        flexDirection: "row",
        fontSize: "10.5pt",
      }),
      []
    )}
  >
    {children}
  </div>
);

export const MarkdownToSlate: StoryObj = {
  render: () => {
    const [value, setValue] = useState(toSlate(text));
    const ref = useRef<HTMLTextAreaElement>(null);
    return (
      <Wrapper>
        <TextEditor ref={ref} initialValue={text} />
        <div style={{ padding: 10 }}>
          <button
            style={{ height: "100%" }}
            onClick={() => {
              if (!ref.current) return;
              setValue(toSlate(ref.current.value));
            }}
          >
            {"md -> slate"}
          </button>
        </div>
        <SlateEditor ref={useRef(null)} initialValue={value} />
      </Wrapper>
    );
  },
};

export const MarkdownToSlateJson: StoryObj = {
  render: () => {
    const [value, setValue] = useState(toSlate(text));
    const ref = useRef<HTMLTextAreaElement>(null);
    return (
      <Wrapper>
        <TextEditor ref={ref} initialValue={text} />
        <div style={{ padding: 10 }}>
          <button
            style={{ height: "100%" }}
            onClick={() => {
              if (!ref.current) return;
              setValue(toSlate(ref.current.value));
            }}
          >
            {"md -> slate"}
          </button>
        </div>
        <Text>{JSON.stringify(value, null, 2)}</Text>
      </Wrapper>
    );
  },
};

export const SlateToMarkdown: StoryObj = {
  render: () => {
    const [value, setValue] = useState(toSlate(text));
    const [md, setMd] = useState(toMd(value));
    const ref = useRef<Node[]>(null);
    return (
      <Wrapper>
        <SlateEditor ref={ref} initialValue={value} />
        <div style={{ padding: 10 }}>
          <button
            style={{ height: "100%" }}
            onClick={() => {
              if (!ref.current) return;
              setMd(toMd(ref.current));
            }}
          >
            {"slate -> md"}
          </button>
        </div>
        <Text>{md}</Text>
      </Wrapper>
    );
  },
};

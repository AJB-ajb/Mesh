import { mergeAttributes, Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { MetadataChipView } from "../metadata-chip-view";

export interface MetadataChipOptions {
  HTMLAttributes: Record<string, string>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    metadataChip: {
      insertMetadataChip: (attrs: {
        metadataKey: string;
        chipType: string;
        display: string;
      }) => ReturnType;
    };
  }
}

export const MetadataChip = Node.create<MetadataChipOptions>({
  name: "metadataChip",

  group: "inline",

  inline: true,

  atom: true,

  selectable: true,

  draggable: false,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      metadataKey: {
        default: null,
        parseHTML: (element: HTMLElement) =>
          element.getAttribute("data-metadata-key"),
        renderHTML: (attributes: Record<string, unknown>) => ({
          "data-metadata-key": attributes.metadataKey,
        }),
      },
      chipType: {
        default: null,
        parseHTML: (element: HTMLElement) =>
          element.getAttribute("data-chip-type"),
        renderHTML: (attributes: Record<string, unknown>) => ({
          "data-chip-type": attributes.chipType,
        }),
      },
      display: {
        default: "",
        parseHTML: (element: HTMLElement) => element.textContent,
        renderHTML: () => ({}),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="metadata-chip"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    return [
      "span",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-type": "metadata-chip",
      }),
      node.attrs.display,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MetadataChipView);
  },

  addCommands() {
    return {
      insertMetadataChip:
        (attrs) =>
        ({ chain }) => {
          return chain()
            .insertContent({
              type: this.name,
              attrs,
            })
            .run();
        },
    };
  },

  addStorage() {
    return {
      markdown: {
        serialize(
          state: { write: (text: string) => void },
          node: { attrs: { display?: string } },
        ) {
          state.write(node.attrs.display || "");
        },
      },
    };
  },
});

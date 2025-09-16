declare module "react-syntax-highlighter" {
  import type * as React from "react";

  export interface SyntaxHighlighterProps {
    language?: string;
    style?: unknown;
    showLineNumbers?: boolean;
    lineNumberStyle?: React.CSSProperties | React.CSSProperties[];
    codeTagProps?: React.HTMLAttributes<HTMLElement>;
    customStyle?: React.CSSProperties;
    className?: string;
    children?: React.ReactNode;
  }

  export const Prism: React.FC<SyntaxHighlighterProps>;
  export const Light: React.FC<SyntaxHighlighterProps>;
  const SyntaxHighlighter: React.FC<SyntaxHighlighterProps>;
  export default SyntaxHighlighter;
}

declare module "react-syntax-highlighter/dist/esm/styles/prism" {
  export const oneDark: unknown;
  export const oneLight: unknown;
}


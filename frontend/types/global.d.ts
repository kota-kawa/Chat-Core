import type { DetailedHTMLProps, HTMLAttributes } from "react";

type HtmlTagProps = DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>;

declare global {
  interface Window {
    switchToLogin?: () => void;
    switchToRegister?: () => void;
  }

  namespace JSX {
    interface IntrinsicElements {
      "action-menu": HtmlTagProps;
      "chat-action-menu": HtmlTagProps;
      "my-spinner": HtmlTagProps;
      "user-icon": HtmlTagProps;
    }
  }
}

export {};

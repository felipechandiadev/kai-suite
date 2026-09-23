import type { NavAdapter } from "./NavProvider";

/** Vite / react-router friendly adapter using window.history. */
export function createBrowserNavAdapter(): NavAdapter {
  return {
    push(href) {
      window.history.pushState({}, "", href);
      window.dispatchEvent(new PopStateEvent("popstate"));
    },
    replace(href) {
      window.history.replaceState({}, "", href);
      window.dispatchEvent(new PopStateEvent("popstate"));
    },
    back() {
      window.history.back();
    },
    pathname() {
      return window.location.pathname;
    },
  };
}

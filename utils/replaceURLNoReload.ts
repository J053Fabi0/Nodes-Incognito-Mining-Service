export default function replaceURLNoReload(url: string) {
  window.history.pushState("", "", url);
}

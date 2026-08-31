/** Floor must not steal /floor/wide/ — longer prefix wins. */
export function navActive(pathname: string, href: string, hrefs: string[]): boolean {
  if (href === "/") return pathname === "/" || pathname === "";
  const prefix = href.replace(/\/$/, "");
  if (!pathname.startsWith(prefix)) return false;
  return !hrefs.some((other) => {
    if (other === href) return false;
    const op = other.replace(/\/$/, "");
    return op.length > prefix.length && op.startsWith(prefix) && pathname.startsWith(op);
  });
}

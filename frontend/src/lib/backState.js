/** The `state` a list puts on links to its items, so their Back link (BackLink) returns here. */
export function backState(location) {
  return { backTo: `${location.pathname}${location.search}` }
}

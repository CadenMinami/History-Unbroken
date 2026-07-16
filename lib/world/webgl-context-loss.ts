export function subscribeToWebGLContextLoss(
  target: Pick<EventTarget, "addEventListener" | "removeEventListener">,
  onContextLost: () => void,
): () => void {
  const handleContextLost = (event: Event) => {
    event.preventDefault();
    onContextLost();
  };

  target.addEventListener("webglcontextlost", handleContextLost);
  return () => target.removeEventListener("webglcontextlost", handleContextLost);
}

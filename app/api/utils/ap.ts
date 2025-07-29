export const nowISO = () => new Date().toISOString();
export function isLocalActor(_iri: string) {
  return true;
}
export function buildStoryIRI(actorIri: string) {
  const id = crypto.randomUUID();
  return `${actorIri}/stories/${id}`;
}

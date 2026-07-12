import type {
  GovernanceCitation,
  PolicyDocument,
} from "@/features/governance/types/governance";

export function findCitationDocument(
  citation: GovernanceCitation,
  documentsByPolicy: Record<string, PolicyDocument[]>,
) {
  const policyDocuments = documentsByPolicy[citation.policy_id] ?? [];

  return (
    policyDocuments.find(
      (document) => document.document_id === citation.document_id,
    ) ??
    policyDocuments.find(
      (document) => document.filename === citation.document_name,
    ) ??
    policyDocuments.find((document) => document.secure_url) ??
    null
  );
}

export function hasViewablePdf(document: PolicyDocument | null | undefined) {
  return Boolean(document?.secure_url);
}

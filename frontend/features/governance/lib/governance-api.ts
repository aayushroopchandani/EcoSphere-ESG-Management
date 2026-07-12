import type {
  ComplianceIssue,
  CreateAuditPayload,
  CreateComplianceIssuePayload,
  CreatePolicyPayload,
  GovernanceAudit,
  GovernanceChatResponse,
  GovernancePolicy,
  GovernanceRiskSummaryResponse,
  GovernanceSummary,
  PolicyAcknowledgement,
  PolicyDocument,
  UpdateComplianceIssuePayload,
} from "@/features/governance/types/governance";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:8000";

export class GovernanceApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "GovernanceApiError";
  }
}

async function parseErrorMessage(response: Response) {
  let message = response.statusText || "Unable to complete request";

  try {
    const body = (await response.json()) as {
      detail?: string | Array<{ msg?: string }>;
    };

    if (typeof body.detail === "string") {
      message = body.detail;
    } else if (Array.isArray(body.detail)) {
      message = body.detail
        .map((item) => item.msg)
        .filter(Boolean)
        .join(", ");
    }
  } catch {
    return message;
  }

  return message || "Unable to complete request";
}

async function request<T>(
  path: string,
  token: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

  if (!response.ok) {
    throw new GovernanceApiError(
      await parseErrorMessage(response),
      response.status,
    );
  }

  return response.json() as Promise<T>;
}

async function multipartRequest<T>(
  path: string,
  token: string,
  formData: FormData,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new GovernanceApiError(
      await parseErrorMessage(response),
      response.status,
    );
  }

  return response.json() as Promise<T>;
}

function toQueryString(params: Record<string, string | number | undefined>) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      searchParams.set(key, String(value));
    }
  }

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

export function getGovernanceSummary(token: string) {
  return request<GovernanceSummary>("/api/governance/summary", token);
}

export function getGovernancePolicies(
  token: string,
  params: { status?: string; category?: string; limit?: number } = {},
) {
  return request<GovernancePolicy[]>(
    `/api/governance/policies${toQueryString(params)}`,
    token,
  );
}

export function createGovernancePolicy(
  token: string,
  payload: CreatePolicyPayload,
) {
  return request<GovernancePolicy>("/api/governance/policies", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function uploadPolicyDocument(
  token: string,
  policyId: string,
  file: File,
) {
  const formData = new FormData();
  formData.set("file", file);

  return multipartRequest<PolicyDocument>(
    `/api/governance/policies/${policyId}/documents`,
    token,
    formData,
  );
}

export function uploadPolicyWithRag(token: string, formData: FormData) {
  return multipartRequest<PolicyDocument>(
    "/api/governance/rag/upload",
    token,
    formData,
  );
}

export function getPolicyDocuments(token: string, policyId: string) {
  return request<PolicyDocument[]>(
    `/api/governance/policies/${policyId}/documents`,
    token,
  );
}

export function acknowledgePolicy(token: string, policyId: string) {
  return request<PolicyAcknowledgement>(
    `/api/governance/policies/${policyId}/acknowledge`,
    token,
    { method: "POST" },
  );
}

export function getMyPolicyAcknowledgements(token: string) {
  return request<PolicyAcknowledgement[]>(
    "/api/governance/my-acknowledgements",
    token,
  );
}

export function getGovernanceAudits(token: string) {
  return request<GovernanceAudit[]>("/api/governance/audits", token);
}

export function createGovernanceAudit(
  token: string,
  payload: CreateAuditPayload,
) {
  return request<GovernanceAudit>("/api/governance/audits", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getComplianceIssues(token: string) {
  return request<ComplianceIssue[]>("/api/governance/compliance-issues", token);
}

export function createComplianceIssue(
  token: string,
  payload: CreateComplianceIssuePayload,
) {
  return request<ComplianceIssue>("/api/governance/compliance-issues", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateComplianceIssue(
  token: string,
  issueId: string,
  payload: UpdateComplianceIssuePayload,
) {
  return request<ComplianceIssue>(
    `/api/governance/compliance-issues/${issueId}`,
    token,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}

export function askGovernanceCopilot(
  token: string,
  payload: {
    question: string;
    policy_ids?: string[] | null;
    document_ids?: string[] | null;
  },
) {
  return request<GovernanceChatResponse>("/api/governance/rag/chat", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function generateGovernanceRiskSummary(
  token: string,
  payload: {
    issue_id?: string | null;
    issue_title?: string | null;
    issue_description?: string | null;
    policy_ids?: string[] | null;
  },
) {
  return request<GovernanceRiskSummaryResponse>(
    "/api/governance/rag/risk-summary",
    token,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

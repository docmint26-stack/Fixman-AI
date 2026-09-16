import { DiagnosisResult } from "@/components/diagnose/diagnosis-result";

export default async function CaseDetailPage({ params }: PageProps<"/cases/[id]">) {
  const { id } = await params;
  return <DiagnosisResult caseId={id} />;
}
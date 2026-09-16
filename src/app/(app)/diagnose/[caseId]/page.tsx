import { DiagnosisResult } from "@/components/diagnose/diagnosis-result";

export default async function DiagnoseResultPage({ params }: PageProps<"/diagnose/[caseId]">) {
  const { caseId } = await params;
  return <DiagnosisResult caseId={caseId} />;
}
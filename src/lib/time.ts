export function formatTimeAgoMalayalam(iso: string | null): string {
  if (!iso) return "";

  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);

  if (minutes < 1) return "ഇപ്പോൾ";
  if (minutes < 60) return `${minutes} മിനിറ്റ് മുമ്പ്`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} മണിക്കൂർ മുമ്പ്`;

  const days = Math.floor(hours / 24);
  return `${days} ദിവസം മുമ്പ്`;
}

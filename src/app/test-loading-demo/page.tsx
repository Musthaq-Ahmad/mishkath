export default async function TestLoadingDemoPage() {
  await new Promise((resolve) => setTimeout(resolve, 3000));
  return <div>Loaded</div>;
}

import LoginForm from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { sebagai } = await searchParams;
  return <LoginForm awal={sebagai === "siswa" ? "siswa" : "guru"} />;
}

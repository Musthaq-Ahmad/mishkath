import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SignupForm } from "./signup-form";

export default function SignupPage() {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <Card className="card-elevated animate-fade-in-up w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Create an organizer account</CardTitle>
        </CardHeader>
        <CardContent>
          <SignupForm />
        </CardContent>
      </Card>
    </div>
  );
}

import { cn } from "@/lib/utils";

interface AuthCardProps {
  children: React.ReactNode;
  className?: string;
}

export function AuthCard({ children, className }: AuthCardProps) {
  return (
    <div
      className={cn(
        "w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-lg",
        "dark:border-slate-700 dark:bg-slate-800",
        className
      )}
    >
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">OntoKit</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Collaborative ontology curation
        </p>
      </div>
      {children}
    </div>
  );
}

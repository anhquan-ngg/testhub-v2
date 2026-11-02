/** Full-screen loading indicator shown while the exam session is loading. */
export function ExamLoadingSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-100">
      <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-[#0066cc]" />
    </div>
  );
}

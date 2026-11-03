/** Tailwind classes for the exam type badge (practice vs. official). */
export function examTypeClass(practice: boolean): string {
  return practice
    ? "border-sky-200 bg-sky-50 text-sky-700"
    : "border-violet-200 bg-violet-50 text-violet-700";
}

/** Tailwind classes for the exam ACTIVE/INACTIVE status control. */
export function examStatusClass(status: string): string {
  return status === "ACTIVE"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
    : "border-red-200 bg-red-50 text-red-700 hover:bg-red-100";
}

/** Tailwind classes for an exam registration status badge. */
export function registrationStatusClass(status: string): string {
  switch (status) {
    case "PENDING":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "APPROVED":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    default:
      return "border-red-200 bg-red-50 text-red-700";
  }
}

/** Tailwind classes for a submission rating badge (excellent/good/average/poor). */
export function ratingClass(rating: string | null | undefined): string {
  switch (rating) {
    case "EXCELLENT":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "GOOD":
      return "border-sky-200 bg-sky-50 text-sky-700";
    case "AVERAGE":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "POOR":
      return "border-red-200 bg-red-50 text-red-700";
    default:
      return "border-gray-200 bg-gray-50 text-gray-700";
  }
}

/** Tailwind classes for a user role badge (admin/lecturer/student). */
export function userRoleClass(role: string): string {
  switch (role) {
    case "ADMIN":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "LECTURER":
      return "border-violet-200 bg-violet-50 text-violet-700";
    default:
      return "border-sky-200 bg-sky-50 text-sky-700";
  }
}

/** Tailwind classes for a question format (cognitive level) badge. */
export function questionFormatClass(format: string): string {
  switch (format) {
    case "ADVANCED":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "APPLYING":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "UNDERSTANDING":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    default:
      return "border-sky-200 bg-sky-50 text-sky-700";
  }
}

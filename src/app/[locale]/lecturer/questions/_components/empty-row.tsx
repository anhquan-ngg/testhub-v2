import { FileQuestion } from "lucide-react";
import { TableCell, TableRow } from "@/components/ui/table";

export function EmptyRow({ colSpan, text }: { colSpan: number; text: string }) {
  return (
    <TableRow className="border-gray-300">
      <TableCell colSpan={colSpan} className="h-72 text-center">
        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="p-4 bg-gray-50 rounded-full">
            <FileQuestion className="h-10 w-10 text-gray-400" />
          </div>
          <div className="space-y-1">
            <p className="text-lg font-medium text-gray-900">{text}</p>
          </div>
        </div>
      </TableCell>
    </TableRow>
  );
}

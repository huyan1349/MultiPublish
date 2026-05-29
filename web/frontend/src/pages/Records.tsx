import { FileText } from 'lucide-react';

export default function Records() {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center">
        <FileText size={40} className="mx-auto text-slate-600 mb-3" />
        <p className="text-slate-400 text-sm">发布记录功能即将上线</p>
        <p className="text-slate-600 text-xs mt-1">发布历史将通过 Chrome 扩展同步</p>
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    <div dir="rtl" className="min-h-svh bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 py-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="inline-flex items-center px-3 py-2 rounded-lg border border-slate-200 bg-white">
            <div className="w-12 h-4 bg-slate-200 rounded animate-pulse" />
          </div>
          <div className="h-5 w-44 bg-slate-200 rounded animate-pulse" />
        </div>
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex">
              <div className="w-1.5 bg-amber-200" />
              <div className="flex-1 p-4">
                <div className="h-4 w-56 bg-slate-200 rounded animate-pulse" />
                <div className="mt-3 flex items-center gap-3">
                  <div className="h-3 w-24 bg-slate-200 rounded animate-pulse" />
                  <div className="h-3 w-28 bg-slate-200 rounded animate-pulse" />
                </div>
              </div>
              <div className="p-3">
                <div className="h-9 w-20 bg-slate-200 rounded-lg animate-pulse" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex">
              <div className="w-1.5 bg-amber-200" />
              <div className="flex-1 p-4">
                <div className="h-4 w-48 bg-slate-200 rounded animate-pulse" />
                <div className="mt-3 flex items-center gap-3">
                  <div className="h-3 w-20 bg-slate-200 rounded animate-pulse" />
                  <div className="h-3 w-24 bg-slate-200 rounded animate-pulse" />
                </div>
              </div>
              <div className="p-3">
                <div className="h-9 w-20 bg-slate-200 rounded-lg animate-pulse" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex">
              <div className="w-1.5 bg-amber-200" />
              <div className="flex-1 p-4">
                <div className="h-4 w-64 bg-slate-200 rounded animate-pulse" />
                <div className="mt-3 flex items-center gap-3">
                  <div className="h-3 w-28 bg-slate-200 rounded animate-pulse" />
                  <div className="h-3 w-24 bg-slate-200 rounded animate-pulse" />
                </div>
              </div>
              <div className="p-3">
                <div className="h-9 w-20 bg-slate-200 rounded-lg animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


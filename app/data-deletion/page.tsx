export default function DataDeletionPage({
  searchParams,
}: {
  searchParams: { code?: string };
}) {
  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "#F8FAFC" }}>
      <div className="max-w-md w-full rounded-2xl border bg-white p-8 text-center" style={{ borderColor: "#E2E8F0" }}>
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: "#ECFDF5" }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <h1 className="text-slate-950 text-2xl font-black mb-3">Data Deletion Confirmed</h1>
        <p className="text-slate-600 text-sm leading-relaxed mb-6">
          Your request to delete all personal data associated with your Facebook account on Hinilas Pro has been received and processed.
        </p>

        {searchParams.code && (
          <div className="rounded-xl px-4 py-3 mb-6 text-left" style={{ background: "#F1F5F9", border: "1px solid #E2E8F0" }}>
            <p className="text-slate-500 text-xs mb-1">Confirmation Code</p>
            <p className="text-slate-700 text-xs font-mono break-all">{searchParams.code}</p>
          </div>
        )}

        <p className="text-slate-500 text-xs">
          If you have questions, contact us at{" "}
          <span className="font-semibold text-slate-700">support@hinilas.pro</span>
        </p>
      </div>
    </div>
  );
}

export default function DataDeletionPage({
  searchParams,
}: {
  searchParams: { code?: string };
}) {
  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "#0B1120" }}>
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: "#1E2D45" }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <h1 className="text-white text-xl font-bold mb-3">Data Deletion Confirmed</h1>
        <p className="text-gray-400 text-sm leading-relaxed mb-6">
          Your request to delete all personal data associated with your Facebook account on Hinilas Pro has been received and processed.
        </p>

        {searchParams.code && (
          <div className="rounded-xl px-4 py-3 mb-6 text-left" style={{ background: "#0F172A", border: "1px solid #1E2D45" }}>
            <p className="text-gray-500 text-xs mb-1">Confirmation Code</p>
            <p className="text-gray-300 text-xs font-mono break-all">{searchParams.code}</p>
          </div>
        )}

        <p className="text-gray-600 text-xs">
          If you have questions, contact us at{" "}
          <span className="text-gray-400">support@hinilas.pro</span>
        </p>
      </div>
    </div>
  );
}
